import * as pixi from "pixi";
import { Board, Game, LoopController } from "./jstg.js";
import { Player } from "./player/player.js";
import { alphaTo } from "./utils.js";
import { PrefabDanmakuNames } from "./assets.js";

interface Point {
    x: number,
    y: number,
}

/** 计算点 P 到线段 AB 距离的平方 */
const getPointToSegmentDist2 = (AB: Point, AP: Point) => {
    /** AB * AP */
    const dot = AB.x * AP.x + AB.y * AP.y;
    if (dot <= 0) {
        return AP.x ** 2 + AP.y ** 2;
    }
    /** AB^2 */
    const len2 = AB.x ** 2 + AB.y ** 2;
    if (dot >= len2) {
        return (AP.x - AB.x) ** 2 + (AP.y - AB.y) ** 2;
    }
    return (AB.y * AP.x - AB.x * AP.y) ** 2 / (AB.x ** 2 + AB.y ** 2);
}

export class Danmaku {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    readonly type: string;
    readonly game: Game;
    readonly board: Board;
    /** 弹幕判定圆的半径 */
    readonly hitboxRadius: number;
    /** 弹幕所对应的 Sprite */
    readonly sprite: pixi.Sprite;

    /** @private 弹幕在上一次判定时的 x */
    private _lastX: number;
    /** @private 弹幕在上一次判定时的 y */
    private _lastY: number;
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

    constructor(options: {
        /**
         * 弹幕的种类名称
         * @example
         * "smallball"
         */
        type: string,
        game: Game,
        board: Board,
        /** 弹幕判定圆的半径 */
        hitboxRadius: number,
        /** 弹幕所对应的 Sprite */
        sprite: pixi.Sprite,
        /** 弹幕的缩放倍数，弹幕在构造时会自动把 sprite 的尺寸和弹幕的碰撞半径都乘此值 */
        scale: number,
    }) {
        this.type = options.type;
        this.game = options.game;
        this.board = options.board;
        this.hitboxRadius = options.hitboxRadius * options.scale;
        this.sprite = options.sprite;
        this.sprite.scale.x *= options.scale;
        this.sprite.scale.y *= options.scale;
        
        this._lastX = this.sprite.x;
        this._lastY = this.sprite.y;
        this.game.danmakuPool.push(this);
    }

    /** 更新该弹幕与玩家的交互逻辑（即伤害判定），如果 isHasDamage 属性为 true ，该函数什么也不会做 */
    updateDamageToPlayer(player: Player) {
        if (!this.isDamageToPlayer) return;
        const isHit = ( // 先粗判
            Math.abs(player.x - this.x) <= 30 && Math.abs(player.y - this.y) <= 30
        ) && getPointToSegmentDist2(
            { // D'D - P'P
                x: (this.x - this._lastX) - (player.x - player._lastX),
                y: (this.y - this._lastY) - (player.y - player._lastY)
            },
            { // D'->P'
                x: (player._lastX - this._lastX), y: (player._lastY - this._lastY)
            }// TODO: 改成相交圆判定
        ) < this.hitboxRadius ** 2 + player.hitboxRadius ** 2; // 牢 zun 的神秘正交圆判定

        this._lastX = this.x;
        this._lastY = this.y;
        player._lastX = player.x;
        player._lastY = player.y;

        if (isHit) {
            player.hitByDanmaku(this);
        }
    }

    get x() { return this.sprite.x; }
    set x(n: number) { this.sprite.x = n; }
    get y() { return this.sprite.y; }
    set y(n: number) { this.sprite.y = n; }
    get rotation() { return this.sprite.rotation; }
    set rotation(n: number) { this.sprite.rotation = n; }
    speed = 0;

    /** 向着 this.sprite 的方向前进 d 步，若 d 留空则为 this.speed * game.timeScale */
    move(/** @default this.speed * game.timeScale */d: number = this.speed * this.game.timeScale) {
        this.x += Math.cos(this.rotation) * d;
        this.y += Math.sin(this.rotation) * d;
    }

    /** 匀变速至目标速度 */
    speedToA(/** 目标速度 */dst: number, /** 加速度 */a: number) {
        if (Math.abs(dst - this.speed) < a * this.game.timeScale) {
            this.speed = dst;
        } else if (dst > this.speed) {
            this.speed += a * this.game.timeScale;
        } else {
            this.speed -= a * this.game.timeScale;
        }
    }

    /** 指数衰减地变速至目标速度 */
    speedToK(/** 目标速度 */dst: number, /** 每次变速的比 */k: number) {
        this.speed += (dst - this.speed * k * this.game.timeScale);
    }

    /**
     * 如果该弹幕超出版面边界，摧毁该弹幕  
     * 可以传入一个 loop ，在摧毁弹幕时自动终止循环
     */
    boundaryDelete(loop?: LoopController) {
        if (!this.board.isDanmakuInBoundary(this)) {
            this.destroy();
            loop?.stop();
        }
    }

    /**
     * 预置的消弹效果，立即摧毁该弹幕，并生成一个消弹特效  
     * 如果 canBeErase 为 false ，则该函数什么也不做
     */
    erase(options: {
        /** 根据 this.type 自动决定。对于一般的弹幕，消弹特效为特定的消弹造型；对于大玉和核弹，缩小虚化至消失。 */
        eraseEffectType?: "common" | "bubble",
    } = {}) {
        if (!this.canBeErase || this.destroyed) return;
        if (this.board.isDanmakuInBoundary(this)) {
            options.eraseEffectType ??= this.type === "bubble" || this.type === "nuclear" ? "bubble" : "common";
            if (this.sprite.visible && this.sprite.alpha > 0) {
                if (options.eraseEffectType === "common") {
                    // 常规消弹
                    this.game.coDo(this._EraseEffectBehaviorCommon.bind(this));
                } else {
                    // 大玉消弹
                    this.game.coDo(this._EraseEffectBehaviorBubble.bind(this));
                }
            }
        }
    }

    /** @internal @generator 普通消弹特效的行为，雾化消失 */
    *_EraseEffectBehaviorCommon() {
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseSprites,
            texture: this.game.prefabTextures.danmaku.particle.fog,
            anchor: 0.5,
            x: this.x, y: this.y, 
            scale: this.sprite.scale,
            rotation: Math.random() * 2 * Math.PI,
            filters: this.sprite.filters,
        });
        this.destroy();
        while (eraseEffectSprite.alpha > 0) {
            eraseEffectSprite.scale.x += 0.1 * this.game.timeScale;
            eraseEffectSprite.scale.y += 0.1 * this.game.timeScale;
            alphaTo(eraseEffectSprite, 0, 0.05 * this.game.timeScale);
            yield;
        }
        eraseEffectSprite.destroy();
    }

    /** @internal @generator 大玉和核弹消弹特效的行为，缩小虚化至消失 */
    *_EraseEffectBehaviorBubble() {
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseSprites,
            texture: this.sprite.texture,
            anchor: 0.5,
            x: this.x, y: this.y, 
            scale: 0.5,
            //rotation: this.sprite.rotation,
            filters: this.sprite.filters,
        });
        this.destroy();
        while (eraseEffectSprite.alpha > 0) {
            eraseEffectSprite.scale.x -= 0.05 * this.game.timeScale;
            eraseEffectSprite.scale.y -= 0.05 * this.game.timeScale;
            alphaTo(eraseEffectSprite, 0, 0.05 * this.game.timeScale);
            yield;
        }
        eraseEffectSprite.destroy();
    }

    destroy() {
        if (this.destroyed) return;
        this.sprite.destroy();
    }

    /**
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃  
     * 例如：一个跟踪弹保留了一个敌人的引用，并且追踪敌人的位置；那么，该跟踪弹应该在每帧都检查目标敌人是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    get destroyed() {
        return this.sprite.destroyed;
    }
}

/** 此处的数值与弹幕引擎有所不同 */ //TODO: 改成圆相交判定
export const prefabDanmakuHitboxRadius = {
    smallball: 4,
    ringball: 4,
    glowball: 4,
    fireball: 4,
    dot: 2.4,
    grain: 3,
    chain: 3,
    seed: 3,
    scale: 3,
    bullet: 3,
    drip: 3,
    card: 3.2,
    note: 4,
    arrow: 4,
    butterfly: 4,
    smallstar: 4,
    bigstar: 8,
    ellipse: 5,
    heart: 8,
    middleball: 8,
    lightball: 8,
    bubble: 16,
    crystal: 3,
    particle: 3,
    nova: 4,
    needle: 2,
    coin: 4,
    knife: 4,
    sword: 6,
    /** 弹幕引擎里没填这个，我姑且这么填 */
    nuclear: 48,
};

export const makePrefabDanmaku = (game: Game, board: Board, type: PrefabDanmakuNames, parent?: pixi.Container, scale: number = 1) => new Danmaku({
    type, game, board,
    hitboxRadius: prefabDanmakuHitboxRadius[type],
    sprite: new pixi.Sprite({
        parent: parent ?? board.commonDanmakuSprites,
        texture: game.prefabTextures.danmaku.danmaku[type],
        anchor: 0.5,
    }),
    scale
})