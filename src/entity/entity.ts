import { Board, Combat, Game } from "../jstg.js";
import { CoDoGenFn, LoopController, LooperFn, LoopOptions } from "../looper.js";
import * as utils from "../utils.js";


export abstract class Entity {
    readonly game: Game;
    readonly combat: Combat;
    readonly board: Board;

    constructor(options: {
        game: Game, combat: Combat, board: Board,
    }) {
        this.game = options.game;
        this.combat = options.combat;
        this.board = options.board;
        this.stopGlide = this.stopGlide.bind(this);
        this.forever(this._updateGlide.bind(this));
    }

    abstract x: number;
    abstract y: number;
    abstract rotation: number;
    abstract visible: boolean;
    abstract zIndex: number;
    abstract alpha: number;
    speed = 0;

    /** 弹幕引擎 ghost to 同款 */
    alphaTo(dst: number, speed: number) {
        this.game.alphaTo(this, dst, speed);
    }

    // TODO: 重载，direction
    /** 向着 this.rotation 的方向前进 dist 步，若 dist 留空则为 this.speed * game.timeScale */
    step(/** @default this.speed * game.timeScale */ dist: number = this.speed * this.game.timeScale) {
        this.x += Math.cos(this.rotation) * dist;
        this.y += Math.sin(this.rotation) * dist;
    }

    /** 匀变速至目标速度 */
    speedToA(/** 目标速度 */ dst: number, /** 加速度 */ a: number) {
        if (Math.abs(dst - this.speed) < a * this.game.timeScale) {
            this.speed = dst;
        } else if (dst > this.speed) {
            this.speed += a * this.game.timeScale;
        } else {
            this.speed -= a * this.game.timeScale;
        }
    }

    /**
     * 指数衰减地变速至目标速度。  
     * @param dst 目标速度。
     * @param k 速度变化量与当前速度的比。例如 0.05 。
     */
    speedToK(dst: number, k: number) {
        this.speed += (dst - this.speed) * k * this.game.timeScale;
    }

    /** @internal */
    private _updateGlide() {
        if (!this.glideState.isGliding) { return; }
        const { x: tx, y: ty, mode } = this.glideState;
        if (mode.type === "jstgExp") {
            const { minK } = mode;
            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist_2 = dx ** 2 + dy ** 2;
            if (dist_2 <= 0.01) {
                this.x = tx;
                this.y = ty;
                this.stopGlide();
            } else {
                const k = Math.max((100 - Math.sqrt(dist_2)) / 50, 1) * minK * this.game.timeScale;
                this.x += dx * k;
                this.y += dy * k;
            }
        } else {
            utils.staticAssert<never>(mode.type);
        }
    }

    glideState: {
        isGliding: true,
        x: number, y: number,
        mode: {// MAYDO: 更多缓动模式
            type: "jstgExp", minK: number,
        }
    } | { isGliding: false } = { isGliding: false };

    stopGlide() {
        this.glideState = { isGliding: false };
    };

    /** TODO: 封装出一个类似 LoopController 的结构 */
    /** TODOC: glideTo */
    glideTo(options: {
        x: number, y: number,
        /** @default{ type: "jstgExp" } */
        mode?: {// MAYDO: 更多缓动模式
            type: "jstgExp",
            /**
             * @default 0.04
             * 弹幕引擎中，这个值默认为 0.05
             */
            minK?: number,
        }
    }) {
        // 能够允许 glideTo 并发吗……？从逻辑上就不太可能。
        const { x, y } = options;
        const optMode = options.mode ?? { type: "jstgExp" };
        if (optMode.type === "jstgExp") {
            this.glideState = {
                isGliding: true, x, y,
                mode: { type: "jstgExp", minK: optMode.minK ?? 0.04 },
            };
        } else {
            utils.staticAssert<never>(optMode.type);
        }
    }

    get xy() { return { x: this.x, y: this.y }; }

    /** TODOC: scatter */
    scatter(options: {
        amount: number, angle: number, deg?: void
    } | {
        amount: number, angle?: void, deg: number
    }): Gun[];
    scatter(angle: number, amount: number): Gun[];
    scatter(arg1: {
        amount: number, angle: number, deg?: void
    } | {
        amount: number, angle?: void, deg: number
    } | number, arg2?: number) {
        const options = typeof arg1 === "number" ? { amount: arg1, angle: arg2, deg: undefined } : arg1;
        const { amount } = options;
        const angle = options.angle ?? utils.deg(options.deg as number);
        const step = angle / (amount - 1);
        let r = this.rotation - angle / 2;
        const result: Gun[] = [];
        for (let i = 0; i < amount; i++) {
            result.push(this.board.makeGun({ ...this.xy, rotation: r }));
            r += step;
        }
        return result;
    }

    /** TODOC: ringBlast */
    ringBlast(amount: number) {
        const step = utils.deg(360) / amount;
        let r = this.rotation;
        const result: Gun[] = [];
        for (let i = 0; i < amount; i++) {
            result.push(this.board.makeGun({ ...this.xy, rotation: r }));
            r += step;
        }
        return result;
    }

    /**
     * 旋转并面向一个点。  
     * @example
     * danmaku.faceTo({ x: 50, y: -100 });
     * danmaku.faceTo(player);
     */
    faceTo(targetPos: utils.Vec2) {
        this.rotation = Math.atan2(targetPos.y - this.y, targetPos.x - this.x);
    }

    /** 原地创建一个发弹点。 */
    makeGun() {
        return this.board.makeGun(this);
    }

    /**
     * 原地创建一个瞄准目标的发弹点。
     * @example
     * makeDanmaku({ type: "smallball", ...boss.aimedGun(player) }); // 从 boss 身上发射一个自机狙小玉
     */
    aimedGun(targetPos: utils.Vec2) {
        return this.board.makeGun({ ...this.xy, rotation: Math.atan2(targetPos.y - this.y, targetPos.x - this.x) });
    }

    /**
     * 判断该实体是否在版面内。  
     * 注意，该判断是必要不充分的。false 则实体一定在版面外，true 则该实体不一定在版面内。  
     * 如果弹幕刚刚离开版面但离得不远，该函数仍然有可能返回 true。  
     */
    abstract getIsInBoundary(): boolean;

    /** 如果该实体超出版面边界，摧毁该实体 */
    boundaryDelete() {
        if (!this.getIsInBoundary) {
            this.destroy();
        }
    }
    
    abstract destroy(): void;
    /**
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃
     * 例如：一个跟踪弹保留了一个敌人的引用，并且追踪敌人的位置；那么，该跟踪弹应该在每帧都检查目标敌人是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    abstract readonly destroyed: boolean;
    
    forever<T>(fn: LooperFn<T>, options: LoopOptions = {}) {
        const loop = this.board.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }

    coDo<T>(genFn: CoDoGenFn<T>, options: LoopOptions = {}) {
        const loop = this.board.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}

export class Gun extends Entity {
    x = 0;
    y = 0;
    rotation = 0;
    /** 提示：Gun 自身没有外观 */
    visible = true;
    /** 提示：Gun 自身没有外观 */
    zIndex = 0;
    /** 提示：Gun 自身没有外观 */
    alpha = 1;

    getIsInBoundary() { return (Math.abs(this.x) <= this.board.halfWidth) && (Math.abs(this.y) <= this.board.halfHeight); }

    destroy(): void { this.destroyed = true; }
    destroyed = false;
}

export const baseMakeGun = (options: {
    game: Game, combat: Combat, board: Board,
    x: number, y: number, rotation: number,
}) => {
    const gun = new Gun(options);
    gun.x = options.x;
    gun.y = options.y;
    gun.rotation = options.rotation;
    return gun;
};
