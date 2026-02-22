import * as pixi from "pixi";
import { Game, Board, Player } from "../jstg.js";


export abstract class AbstractDanmaku {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    readonly type: string;
    readonly game: Game;
    readonly board: Board;

    constructor(options: {
        /**
         * 弹幕的种类名称
         * @example
         * "smallball"
         */
        type: string;
        game: Game;
        board: Board;
    }) {
        this.type = options.type;
        this.game = options.game;
        this.board = options.board;
        this.game.danmakuPool.push(this);
    }

    abstract x: number;
    abstract y: number;
    abstract rotation: number;
    abstract visible: boolean;
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

    /**
     * 该弹幕是否会与玩家交互并造成伤害
     * @example
     * myDanmaku.isDamageToPlayer = false; // 让这个弹幕不再与玩家产生交互，取消伤害判定
     * myDanmaku.isDamageToPlayer = true; // 重新启用伤害判定
     */
    isDamageToPlayer: boolean = true;
    /**
     * 该弹幕是否能够被消弹效果消除
     * @example
     * myDanmaku.canBeErase = false; // 让这个弹幕无法被消弹效果消除
     * myDanmaku.canBeErase = true; // 又能消掉了
     */
    canBeErase: boolean = true;

    /**
     * 预置的消弹效果，立即摧毁该弹幕，并生成一个消弹特效。  
     * 如果该弹幕无法被消除，则该函数什么也不做。  
     * 必须注意：调用该函数之后，该弹幕的生死是未知的。它可能会立即被摧毁，或者等下一帧才被摧毁，也有可能不会被摧毁。  
     */
    abstract erase(options?: {
        /**
         * 消弹时的回调函数。可以利用这个回调函数，把消掉的弹幕转换成别的东西。例如，转化为得分道具，或者死尸弹。  
         * 对于普通弹幕，该回调函数只会调用一次；对于激光，该回调函数会对激光的每一个“体节”都调用一次。  
         * 如果该弹幕最终没有被消除（例如因为这个该弹幕无法被消除），则该回调函数不会被调用。  
         */
        forEachCorpse?: (corpseInfo: { x: number, y: number }) => unknown,
    }): void;

    /**
     * 更新该弹幕，每帧都会调用一次这个函数。
     * 会更新与玩家的交互逻辑（即伤害判定），除非 isDamageToPlayer 属性为 false。
     */
    abstract update(player: Player): void;

    /**
     * 判断该弹幕是否在版面内。
     * 注意，该判断是必要不充分的。如果弹幕刚刚离开版面但离得不远，该函数仍然有可能返回 true。
     */
    abstract isInBoundary(): boolean;

    /** 如果该弹幕超出版面边界，摧毁该弹幕 */
    boundaryDelete() {
        if (!this.isInBoundary()) {
            this.destroy();
        }
    }

    abstract destroy(): void;
    /**
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃
     * 例如：一个跟踪弹保留了一个敌人的引用，并且追踪敌人的位置；那么，该跟踪弹应该在每帧都检查目标敌人是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    abstract readonly destroyed: boolean;
}
