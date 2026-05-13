import * as pixi from "pixi";
import { prefabGraphicEffectsFactory } from "../graphicEffects.js";
import { Board, Combat, Game } from "../jstg.js";
import { CoDoGenFn, LoopController, LooperFn, LoopOptions } from "../looper.js";
import * as utils from "../utils.js";


// MAYDO: 更多缓动模式
type GlideToMode = {
    type: "jstgExp";
    /**
     * @default 0.04
     * 弹幕引擎中，这个值默认为 0.05
     */
    minK?: number;
};

type GlideToOptions = {
    x: number;
    y: number;
    /** @default{ type: "jstgExp" } */
    mode?: GlideToMode;
};

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

    /**
     * 向着 rotation 的方向前进 dist 步。  
     * 默认为向 this.rotation 方向前进 this.speed * game.timeScale 步。  
     * ⚠️注意，第一个参数是前进的距离，第二个参数是前进的方向，不要搞混了！  
     * 为防止搞混，建议使用 `step({ dist: xxx, rotation: xxx })` 这样的风格。  
     */
    step(options: {
        /** @default this.speed * game.timeScale */dist?: number,
        /** @default this.rotation */rotation?: number,
    }): void;
    step(
        /** @default this.speed * game.timeScale */dist?: number,
        /** @default this.rotation */rotation?: number
    ): void;
    step(arg1: number | { dist?: number, rotation?: number } = {}, arg2?: number) {
        let dist, rotation;
        if (typeof arg1 !== "number") {
            dist = arg1.dist ?? this.speed * this.game.timeScale;
            rotation = arg1.rotation ?? this.rotation;
        } else {
            dist = arg1;
            rotation = arg2 as number | undefined ?? this.rotation;
        }
        this.x += Math.cos(rotation) * dist;
        this.y += Math.sin(rotation) * dist;
    }

    /** 匀变速至目标速度。 */
    speedToA(dst: number, a: number) {
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
    private _glideLoop: LoopController<void> | null = null;

    /** @internal */
    private _updateGlide() {
        if (!this.glideState.isGliding) {
            this._glideLoop?.destroy();
            this._glideLoop = null;
            return;
        }
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

    /**
     * 可以利用这个东西，让 boss 随机游荡。  
     * @example
     * // 让 boss 每 4 秒就在一定范围内随机移动一小步。
     * spellcard.forever(loop => {
     *     if (loop.clock % 240 === 200) { boss.glideTo(boss.wander.getStepd()); }
     * });
     * 
     * boss.wander.limit.center = { x: 0, y: -50 }; // 重设的游荡中心点。
     * boss.wander.limit.halfRange = { x: 120, y: 10 }; // 重设游荡的范围。
     * boss.wander.limit.center.y = -60; // 当然这样写也是可以的。
     * 
     * // 横向随机移动 ±20~50 ，纵向随机移动 ±0~10 ，返回移动后的新坐标，但不会改变 boss 当前的坐标。
     * const pos1 = boss.wander.getMoved(rand.float(20, 50), rand.float(0, 10));
     * boss.glideTo(pos1); // 移动到刚才获取的这个位置。
     * 
     * // 获取向随机方向随机移动 10~30 步后的坐标。这个“随机方向”不是均匀随机，而是跟范围的形状有关。
     * // 例如：限制在一个扁胖的范围内（默认情况下）就更容易横向移动。
     * const pos2 = boss.wander.getStepd(rand.float(10, 30));
     * boss.x = pos2.x; boss.y = pos2.y; // 瞬移到刚才获取的这个位置。
     */
    readonly wander = new Wanderer(this);

    glideState: {
        isGliding: true,
        x: number, y: number,
        mode: Required<GlideToMode>,
    } | { isGliding: false } = { isGliding: false };

    stopGlide() {
        this.glideState = { isGliding: false };
    }

    /** TODO: 封装出一个类似 LoopController 的结构 */
    /** TODOC: glideTo */
    glideTo(x: number, y: number, mode?: GlideToMode): void;
    glideTo(options: GlideToOptions): void;
    glideTo(arg1: GlideToOptions | number, arg2?: number, arg3?: GlideToMode) {
        const options: GlideToOptions = typeof arg1 === "number" ? { x: arg1, y: arg2 as number, mode: arg3 } : arg1;
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
        if (this._glideLoop === null) { this._glideLoop = this.forever(this._updateGlide.bind(this)); }
    }

    get xy() { return { x: this.x, y: this.y }; }
    get xyr() { return { x: this.x, y: this.y, rotation: this.rotation }; }

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

    // MAYDO: 弹链发射器？弹链日文叫 ワインダー ，好像是 winder ？这个貌似没有现成的英文词汇。

    /**
     * 旋转并面向一个点。  
     * @example
     * danmaku.aimTo(50, -100);
     * danmaku.aimTo({ x: 50, y: -100 });
     * danmaku.aimTo(player);
     */
    aimTo(targetPos: utils.Vec2): void;
    aimTo(x: number, y: number): void;
    aimTo(arg1: utils.Vec2 | number, arg2?: number) {
        const { x, y } = typeof arg1 === "number" ? { x: arg1, y: arg2 as number } : arg1;
        this.rotation = Math.atan2(y - this.y, x - this.x);
    }

    /**
     * 原地创建一个发弹点。
     * @example
     * boss.makeGun(); // 在 boss 脸上原地创建一个发弹点。
     * boss.makeGun({ sr: utils.deg(90) }); // 在 boss 脸上原地创建一个发弹点，指向正下方。
     * boss.makeGun({ ox: -40, oy: -40 }); // 在 boss 左上方创建一个发弹点。
     * boss.makeGun({ aim: player }); // 在 boss 脸上原地创建一个发弹点，指向玩家。
     * boss.makeGun({ aim: { x: 0, y: 240 } }); // 在 boss 脸上原地创建一个发弹点，指向版底正中间。
     */
    makeGun(options: {
        /** 新的 x 坐标。 */
        sx?: number,
        /** 偏移的 x 坐标。 */
        ox?: number,
        /** 新的 y 坐标。 */
        sy?: number,
        /** 偏移的 y 坐标。 */
        oy?: number,
        /** 新的方向。 */
        sr?: number,
        /** 偏移的方向。 */
        or?: number,
        /** 面向的方向。 */
        aim?: utils.Vec2,
    } = {}) {
        const gun = this.board.makeGun(this);
        if (options.sx) { gun.x = options.sx; }
        if (options.sy) { gun.y = options.sy; }
        if (options.sr) { gun.rotation = options.sr; }
        if (options.aim) { gun.aimTo(options.aim); }
        if (options.ox) { gun.x += options.ox; }
        if (options.oy) { gun.y += options.oy; }
        if (options.or) { gun.rotation += options.or; }
        return gun;
    }

    /**
     * 原地创建一个瞄准目标的发弹点。
     * @example
     * makeDanmaku({ type: "smallball", ...boss.aimedGun(player) }); // 从 boss 身上发射一个自机狙小玉
     */
    aimedGun(targetPos: utils.Vec2) {
        return this.board.makeGun({ ...this.xy, rotation: Math.atan2(targetPos.y - this.y, targetPos.x - this.x) });
    } // 这个方法没必要删，感觉还挺方便的。

    /**
     * 判断该实体是否在版面内。  
     * 注意，该判断是必要不充分的。false 则实体一定在版面外，true 则该实体不一定在版面内。  
     * 如果弹幕刚刚离开版面但离得不远，该函数仍然有可能返回 true。  
     */
    abstract getIsInBoundary(): boolean;

    /** 如果该实体超出版面边界，摧毁该实体 */
    boundaryDelete() {
        if (!this.getIsInBoundary()) {
            this.destroy();
        }
    }

    // MAYDO: 给这些方法加个命名空间，effects 啥的，但那样就有不少抽象成本了……
    /** TODOC: Entity effects */
    chargeIn(options: {
        /** @default "thse_ch02" */
        sound?: "none" | "thse_ch02",
        /** @default prefabGraphicEffectsFactory.defaultWhiteFilter */
        filters?: pixi.Filter | readonly pixi.Filter[] | "none",
    } = {}) {
        if (options.sound === "thse_ch02" || options.sound === undefined) {
            this.game.prefabSounds.thse.ch02.play();
        } else {
            utils.staticAssert<"none">(options.sound);
        }
        return prefabGraphicEffectsFactory.chargeIn({
            game: this.game, combat: this.combat, board: this.board,
            refPos: this,
            filters: options.filters === "none" ? null : options.filters ?? prefabGraphicEffectsFactory.defaultWhiteFilter,
        });
    }

    chargeOut(options: {
        /** @default "thse_enep02" */
        sound?: "none" | "thse_enep02"
        /** @default prefabGraphicEffectsFactory.defaultWhiteFilter */
        filters?: pixi.Filter | readonly pixi.Filter[] | "none",
    } = {}) {
        if (options.sound === "thse_enep02" || options.sound === undefined) {
            this.game.prefabSounds.thse.enep02.play();
        } else {
            utils.staticAssert<"none">(options.sound);
        }
        return prefabGraphicEffectsFactory.chargeOut({
            game: this.game, combat: this.combat, board: this.board,
            refPos: this,
            filters: options.filters === "none" ? null : options.filters ?? prefabGraphicEffectsFactory.defaultWhiteFilter,
        });
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

class Wanderer {

    constructor(readonly entity: Entity) {}

    limit = {
        center: { x: 0, y: -110 },
        halfRange: { x: 90, y: 20 },
    };

    // RAND: wander
    // TODO: 自动往玩家脑袋顶上跑，利好直线机跟枪的移动方式
    getMoved({ x, y }: utils.Vec2): utils.Vec2;
    getMoved(x: number, y: number): utils.Vec2;
    getMoved(arg1: utils.Vec2 | number, arg2?: number) {
        let { x: dx, y: dy } = typeof arg1 === "number" ? { x: arg1, y: arg2 as number } : arg1;
        const { glideState, combat } = this.entity;
        const { center, halfRange } = this.limit;
        const target = glideState.isGliding ? glideState : this.entity.xy;
        // 弹幕引擎中 boss 随机移动的逻辑
        dx *= combat.rand.select([-1, 1]);
        dy *= combat.rand.select([-1, 1]);
        if (Math.abs(target.x + dx - center.x) > halfRange.x) { dx *= -1; }
        if (Math.abs(target.y + dy - center.y) > halfRange.y) { dy *= -1; }
        // 弹幕引擎里没有这个，所以移动距离过长会导致 boss 跑出范围
        target.x = utils.clamp(target.x + dx, center.x - halfRange.x, center.x + halfRange.x);
        target.y = utils.clamp(target.y + dy, center.y - halfRange.y, center.y + halfRange.y);
        return target;
    }

    getStepd(dist?: number) {
        const { glideState, combat } = this.entity;
        const { center, halfRange } = this.limit;
        const { x, y } = glideState.isGliding ? glideState : this.entity.xy;
        dist ??= combat.rand.float(20, 50);
        let tx = combat.rand.float(center.x - halfRange.x, center.x + halfRange.x) - x;
        let ty = combat.rand.float(center.y - halfRange.y, center.y + halfRange.y) - y;
        const scale = dist / Math.sqrt(tx * tx + ty * ty);
        tx *= scale;
        ty *= scale;
        return this.getMoved({ x: tx, y: ty });
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

    constructor(options: {
        game: Game, combat: Combat, board: Board
    }) {
        super(options);
        this.board.gunRegList.push(this);
    }

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
