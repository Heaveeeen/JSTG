import * as pixi from "pixi";
import { Game, Board, Player, Combat } from "../jstg.js";
import { DyedTextureColors, DyedTextures } from "../textures.js";
import { AbstractEnemy } from "./abstractEnemy.js";
import { staticAssert } from "../utils.js";
import { LooperFn, LoopOptions, CoDoGenFn } from "../looper.js";


export interface NewAbstractEntityOptions {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    type: string;
    color: DyedTextureColors;
    game: Game;
    combat: Combat;
    board: Board;
}

export interface EraseEntityOptions {
    /**
     * 本次消弹的来源种类。决定本次消弹是否能够生效。
     * * "common" - 最低级别的权限，本次消弹会被 canBeErase 拦住。
     * * "thisEnemyDie" - 本次消弹的原因是“击破了该实体绑定的敌人”，本次消弹无视 canBeErase 。  
     * * "force" - 本次消弹不会被任何因素阻止。  
     * @default "common"
     */
    permissionType?: "common" | "thisEnemyDie" | "force";
    /**
     * 消弹时的回调函数。可以利用这个回调函数，把消掉的弹幕转换成别的东西。例如，转化为得分道具，或者死尸弹。
     * 对于普通弹幕，该回调函数只会调用一次；对于激光，该回调函数会对激光的每一个“体节”都调用一次。
     * 如果该实体最终没有被消除（例如因为这个该弹幕无法被消除），则该回调函数不会被调用。
     */
    forEachCorpse?: (corpseInfo: { x: number, y: number }) => unknown;
    /**
     * 消弹的特效种类。  
     * 对于普通弹幕，若不填写此参数，则根据 this.type 自动决定。一般的弹幕为雾化消失，大玉和核弹为缩小虚化至消失。  
     * 对于直线激光，默认为 "reduce"。  
     * 直线激光暂不支持 "fog" ，其效果和 "reduce" 相同。  
     */
    effectType?: "fog" | "reduce" | "none",
}

export abstract class AbstractEntity {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    readonly type: string;
    readonly color: DyedTextureColors;
    readonly game: Game;
    readonly combat: Combat;
    readonly board: Board;

    /**
     * @readonly  
     * 与该实体绑定的敌人。  
     * 绑定了敌人时，该实体会随着敌人的击破而消除。
     */
    enemy: AbstractEnemy<this> | null = null;

    constructor(options: NewAbstractEntityOptions) {
        this.type = options.type;
        this.color = options.color;
        this.game = options.game;
        this.combat = options.combat;
        this.board = options.board;
        options.board.entityPool.push(this);
    }

    abstract x: number;
    abstract y: number;
    abstract rotation: number;
    abstract visible: boolean;
    abstract zIndex: number;
    speed = 0;

    /** 向着 this.rotation 的方向前进 d 步，若 d 留空则为 this.speed * game.timeScale */
    move(/** @default this.speed * game.timeScale */ d: number = this.speed * this.game.timeScale) {
        this.x += Math.cos(this.rotation) * d;
        this.y += Math.sin(this.rotation) * d;
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

    /** 指数衰减地变速至目标速度 */
    speedToK(/** 目标速度 */ dst: number, /** 每次变速的比 */ k: number) {
        this.speed += (dst - this.speed * k * this.game.timeScale);
    }

    hitboxGraphics: pixi.Graphics | null = null;
    clearHitboxGraphics() {
        if (this.hitboxGraphics) {
            this.hitboxGraphics.destroy();
            this.hitboxGraphics = null;
        }
    }

    grazeCd: number = 0;
    isGrazing: boolean = false;

    /**
     * 该实体是否会与玩家交互并造成伤害
     * @example
     * myDanmaku.isDamageToPlayer = false; // 让这个实体不再与玩家产生交互，取消伤害判定
     * myDanmaku.isDamageToPlayer = true; // 重新启用伤害判定
     */
    isDamageToPlayer: boolean = true;
    /**
     * 该实体是否能够被通常的消弹效果消除。  
     * 此属性为 false 时，该实体不会被通常的消弹效果（如 Bomb）消除，但依然会在击破符卡时消除。
     * 如果该实体是一个敌人，在击破该敌人时，哪怕 canBeErase 为 false ，此实体也会被消除。
     * 构造一个敌人时，此值会被默认设置为 false 。
     * @example
     * myDanmaku.canBeErase = false; // 让这个实体无法被消弹效果消除
     * myDanmaku.canBeErase = true; // 又能消掉了
     */
    canBeErase: boolean = true;

    /**
     * 预置的消弹效果，摧毁该实体，并生成一个消弹特效。  
     * 如果该实体无法被消除，则该函数什么也不做。  
     * 必须注意：调用该函数之后，该实体的生死是未知的。它可能会立即被摧毁，或者等下一帧才被摧毁，也有可能不会被摧毁。  
     */
    abstract erase(options?: EraseEntityOptions): void;

    /** @internal */
    _getIsCanBeEraseByPermissionType(permissionType: Exclude<EraseEntityOptions["permissionType"], undefined>) {
        if (this.destroyed) {
            return false;
        } else if (permissionType === "force") {
            return true;
        } else if (permissionType === "thisEnemyDie") {
            // ASSERTS: this.enemy !== null
            return true;
        } else {
            staticAssert<"common">(permissionType);
            return this.canBeErase;
        }
    }

    // MAYDO: 加入一种延迟消弹效果，暂时取消弹幕的攻击性，但会照常虚化显示，还会进行攻击判定，一段时间后才会消除。但该状态下的攻击判定不会造成伤害，只会播放音效。有助于让玩家知道放这个B放得到底赚不赚。

    /**
     * 更新该实体，每帧都会调用一次这个函数。
     * 会更新与玩家的交互逻辑（即伤害判定），除非 isDamageToPlayer 属性为 false。
     */
    abstract update(player: Player): void;

    /**
     * 判断该实体是否在版面内。  
     * 注意，该判断是必要不充分的。false 则实体一定在版面外，true 则该实体不一定在版面内。  
     * 如果弹幕刚刚离开版面但离得不远，该函数仍然有可能返回 true。  
     */
    abstract isInBoundary(): boolean;

    /** 如果该实体超出版面边界，摧毁该实体 */
    boundaryDelete() {
        if (!this.isInBoundary()) {
            this.destroy();
        }
    }

    abstract getIsCrossCircle(circle: { x: number, y: number, radius: number }): boolean;

    abstract destroy(): void;
    /**
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃
     * 例如：一个跟踪弹保留了一个敌人的引用，并且追踪敌人的位置；那么，该跟踪弹应该在每帧都检查目标敌人是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    abstract readonly destroyed: boolean;
    
    forever(fn: LooperFn, options: LoopOptions = {}) {
        const loop = this.board.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }
    coDo(genFn: CoDoGenFn, options: LoopOptions = {}) {
        const loop = this.board.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}

/** 此处的数值与弹幕引擎有所不同 */
export const prefabDanmakuHitboxRadius = {
    smallball: 4,
    ringball: 4,
    glowball: 4,
    fireball: 4,
    dot: 2.8,
    bacteria: 2.8,
    bacillus: 3,
    grain: 3,
    chain: 3,
    seed: 3,
    scale: 3,
    bullet: 3,
    drip: 2.8,
    card: 3.25,
    note: 4,
    arrow: 4,
    butterfly: 4,
    smallstar: 4,
    bigstar: 8,
    ellipse: 5.7,
    heart: 8,
    middleball: 8,
    lightball: 10.4,
    bubble: 15,
    crystal: 3.25,
    particle: 3.25,
    nova: 4,
    coin: 4,
    knife: 4,
    sword: 5.7,
    nuclear: 46.6,
    laserseg: 4,
    yinyang: 9.5,
    bigyinyang: 27,
    // MAYDO: 休止符，宝珠（大水滴？），岩石（木糖醇）
} as const;