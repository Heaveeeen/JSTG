import { LooperFn, LoopOptions, CoDoGenFn } from "../looper.js";
import { AbstractDanmaku, EraseDanmakuOptions } from "./abstractDanmaku.js";
import * as utils from "../utils.js";


export interface newAbstractEnemyOptions<T extends AbstractDanmaku> {
    danmaku: T,
    /**
     * 所有敌人在刚出生时，都会有一个持续一小段时间的减伤护盾。在此期间，敌人所受的伤害会大大减少。
     * 可以防止敌人在刚出生时立马被秒杀。
     * 这个参数是出生保护减伤持续的帧数。
     */
    birthProtectDuration: number,
}

export type EnemyBeHurtOptions = {
    // TODO: damageType
};

/** Enemy 就是一个能被攻击的东西，必须依附于 AbstractDanmaku */
export abstract class AbstractEnemy<T extends AbstractDanmaku = AbstractDanmaku> {
    /** 敌人的本体其实是一个 danmaku */
    danmaku: T;
    /** @internal */
    private _birthClockTS: number;
    private _birthProtectDuration: number;
    get _birthProtectCoef() {
        if (this._birthProtectDuration <= 0) { return 1; }
        const t = (this.danmaku.game.clock - this._birthClockTS) / this._birthProtectDuration - 1;
        if (t >= 0) {
            return 1;
        } else {
            return (this._birthProtectDuration * 0.2 + 20) ** t;
        }
    }

    constructor(options: newAbstractEnemyOptions<T>) {
        this.danmaku = options.danmaku;
        this.danmaku.enemy = this;
        this.danmaku.board.enemyRegList.push(this);
        this._birthClockTS = this.danmaku.game.clock;
        this._birthProtectDuration = options.birthProtectDuration;
    }

    get x() { return this.danmaku.x; }
    set x(n: number) { this.danmaku.x = n; }
    get y() { return this.danmaku.y; }
    set y(n: number) { this.danmaku.y = n; }
    get rotation() { return this.danmaku.rotation; }
    set rotation(n: number) { this.danmaku.rotation = n; }
    get visible() { return this.danmaku.visible; }
    set visible(b: boolean) { this.danmaku.visible = b; }
    get zIndex() { return this.danmaku.zIndex; }
    set zIndex(n: number) { this.danmaku.zIndex = n; }

    abstract drawDebugHitbox(): void;
    
    abstract beHurt(
        /** 造成了多少点伤害。原则上，这个值不应当小于0。 */
        value: number,
        options?: EnemyBeHurtOptions
    ): void;

    abstract kill(options?: {
        forEachCorpse?: EraseDanmakuOptions["forEachCorpse"],
    }): void;

    abstract destroy(): void;
    abstract readonly destroyed: boolean;

    forever(fn: LooperFn, options: LoopOptions = {}) {
        const loop = this.danmaku.board.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }
    coDo(genFn: CoDoGenFn, options: LoopOptions = {}) {
        const loop = this.danmaku.board.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}
