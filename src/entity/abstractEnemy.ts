import { LooperFn, LoopOptions, CoDoGenFn } from "../looper.js";
import { AbstractDanmaku, EraseDanmakuOptions } from "./abstractDanmaku.js";
import * as utils from "../utils.js";


export interface newAbstractEnemyOptions<T extends AbstractDanmaku> {
    danmaku: T,
}

export type EnemyBeHurtOptions = {
    // TODO: damageType
};

/** Enemy 就是一个能被攻击的东西，必须依附于 AbstractDanmaku */
export abstract class AbstractEnemy<T extends AbstractDanmaku = AbstractDanmaku> {
    /** 敌人的本体其实是一个 danmaku */
    danmaku: T;

    constructor(options: newAbstractEnemyOptions<T>) {
        this.danmaku = options.danmaku;
        this.danmaku.enemy = this;
        this.danmaku.board.enemyRegList.push(this);
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

    forever<T>(fn: LooperFn<T>, options: LoopOptions = {}) {
        const loop = this.danmaku.board.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }
    coDo<T>(genFn: CoDoGenFn<T>, options: LoopOptions = {}) {
        const loop = this.danmaku.board.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}
