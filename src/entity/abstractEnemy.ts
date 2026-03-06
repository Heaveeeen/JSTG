import { Board, Combat, Game } from "../jstg.js";
import { LooperFn, LoopOptions, CoDoGenFn } from "../looper.js";
import { AbstractEntity } from "./abstractEntity.js";


export interface newAbstractEnemyOptions<T extends AbstractEntity> {
    entity: T,
}

/** Enemy 就是一个能被攻击的东西，必须依附于 Entity */
export abstract class AbstractEnemy<T extends AbstractEntity> {
    entity: T;

    constructor(options: newAbstractEnemyOptions<T>) {
        this.entity = options.entity;
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

    abstract destroy(): void;
    abstract readonly destroyed: boolean;

    forever(fn: LooperFn, options: LoopOptions = {}) {
        const loop = this.entity.combat.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }
    coDo(genFn: CoDoGenFn, options: LoopOptions = {}) {
        const loop = this.entity.combat.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}
