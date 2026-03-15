import { LooperFn, LoopOptions, CoDoGenFn } from "../looper.js";
import { AbstractEntity, EraseEntityOptions } from "./abstractEntity.js";
import * as utils from "../utils.js";


export interface newAbstractEnemyOptions<T extends AbstractEntity> {
    entity: T,
    /**
     * 所有敌人在刚出生时，都会有一个持续一小段时间的减伤护盾。在此期间，敌人所受的伤害会大大减少。
     * 可以防止敌人在刚出生时立马被秒杀。
     * 这个参数是出生保护减伤持续的帧数。
     */
    birthProtectDuration: number,
}

/** Enemy 就是一个能被攻击的东西，必须依附于 Entity */
export abstract class AbstractEnemy<T extends AbstractEntity = AbstractEntity> {
    entity: T;
    /** @internal */
    private _birthClockTS: number;
    private _birthProtectDuration: number;
    get _birthProtectCoef() {
        if (this._birthProtectDuration <= 0) { return 1; }
        const t = (this.entity.game.clock - this._birthClockTS) / this._birthProtectDuration - 1;
        if (t >= 0) {
            return 1;
        } else {
            return (this._birthProtectDuration * 0.2 + 20) ** t;
        }
    }

    constructor(options: newAbstractEnemyOptions<T>) {
        this.entity = options.entity;
        this.entity.enemy = this;
        this.entity.board.enemyPool.push(this);
        this._birthClockTS = this.entity.game.clock;
        this._birthProtectDuration = options.birthProtectDuration;
    }

    get x() { return this.entity.x; }
    set x(n: number) { this.entity.x = n; }
    get y() { return this.entity.y; }
    set y(n: number) { this.entity.y = n; }
    get rotation() { return this.entity.rotation; }
    set rotation(n: number) { this.entity.rotation = n; }
    get visible() { return this.entity.visible; }
    set visible(b: boolean) { this.entity.visible = b; }
    get zIndex() { return this.entity.zIndex; }
    set zIndex(n: number) { this.entity.zIndex = n; }

    abstract drawDebugHitbox(): void;
    
    abstract beHurt(options: {
        /** 造成了多少点伤害。原则上，这个值不应当小于0。 */
        num: number,
        // TODO: damageType
    }): void;

    abstract kill(options?: {
        forEachCorpse?: EraseEntityOptions["forEachCorpse"],
    }): void;

    abstract destroy(): void;
    abstract readonly destroyed: boolean;

    forever(fn: LooperFn, options: LoopOptions = {}) {
        const loop = this.entity.board.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }
    coDo(genFn: CoDoGenFn, options: LoopOptions = {}) {
        const loop = this.entity.board.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}
