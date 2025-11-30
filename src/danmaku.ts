import * as pixi from "pixi";
import { Board, Game } from "./jstg.js";
import { Player } from "./player/player.js";
import { alphaTo } from "./utils.js";

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
    /** |AB| */
    const len2 = AB.x ** 2 + AB.y ** 2;
    if (dot >= len2) {
        return (AP.x - AB.x) ** 2 + (AP.y - AB.y) ** 2;
    }
    return (AB.y * AP.x - AB.x * AP.y) ** 2 / (AB.x ** 2 + AB.y ** 2);
}

/** @readonly 所有接受判定的弹幕，⚠️可能含有已经摧毁的无效弹幕 */
export const danmakusToUpdate: Danmaku[] = [];
const danmakusFreeIndexs: number[] = [];
const pushDanmaku = (danmaku: Danmaku) => {
    const newIndex = danmakusFreeIndexs.pop()
    if (newIndex === undefined) {
        return danmakusToUpdate.push(danmaku) - 1;
    } else {
        danmakusToUpdate[newIndex] = danmaku;
        return newIndex;
    }
}

export class Danmaku {
    /** @private 弹幕在上一次判定时的 x */
    private _lastX: number;
    /** @private 弹幕在上一次判定时的 y */
    private _lastY: number;
    /** @private 弹幕在 danmakusToUpdate 中的索引 */
    private _index: number;
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

    constructor(
        readonly game: Game,
        readonly board: Board,
        /**
         * 弹幕的种类名称
         * @example
         * "smallball"
         */
        readonly type: string,
        /** 弹幕判定圆的半径 */
        readonly hitboxRadius: number,
        /** 弹幕所对应的 Sprite */
        readonly sprite: pixi.Sprite
    ) {
        this._lastX = sprite.x;
        this._lastY = sprite.y;
        this._index = pushDanmaku(this);
    }

    /** 更新该弹幕与玩家的交互逻辑（即伤害判定），如果 isHasDamage 属性为 true ，该函数什么也不会做 */
    updateDamageToPlayer(player: Player) {
        if (!this.isDamageToPlayer) return;
        const isHit = ( // 先粗判
            Math.abs(player.x - this.x) <= 30 && Math.abs(player.y - this.y) <= 30
        ) || getPointToSegmentDist2(
            { // D'D - P'P
                x: (this.x - this._lastX) - (player.x - player._lastX),
                y: (this.y - this._lastY) - (player.y - player._lastY)
            },
            { // P'
                x: player._lastX, y: player._lastY
            }
        ) < this.hitboxRadius ** 2 + player.hitboxRadius ** 2; // 牢 zun 的神秘正交圆判定

        this._lastX = this.sprite.x;
        this._lastY = this.sprite.y;
        player._lastX = player.x;
        player._lastY = player.y;

        if (isHit) {
            // TODO: player.miss();
        }
    }

    get x() { return this.sprite.x; }
    set x(n: number) { this.sprite.x = n; }
    get y() { return this.sprite.y; }
    set y(n: number) { this.sprite.y = n; }

    destroy() {
        if (this.destroyed) return;
        this.sprite.destroy();
        danmakusFreeIndexs.push(this._index);
    }

    /**
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃  
     * 例如：一个跟踪弹保留了一个敌人的引用，并且追踪敌人的位置；那么，该跟踪弹应该在每帧都检查目标敌人是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    get destroyed() {
        return this.sprite.destroyed;
    }

    /**
     * 预置的消弹效果，立即摧毁该弹幕，并生成一个消弹特效  
     * 如果 canBeErase 为 false ，则该函数什么也不做
     */
    erase(options: {
        /** 根据 this.type 自动决定。对于一般的弹幕，消弹特效为特定的消弹造型；对于大玉和核弹，缩小虚化至消失。 */
        eraseEffectType?: "common" | "bubble",
    }) {
        if (!this.canBeErase) return;
        if (this.board.isDanmakuInBoundary(this)) {
            options.eraseEffectType ??= this.type === "bubble" || this.type === "nuclear" ? "bubble" : "common";
            if (this.sprite.visible && this.sprite.alpha > 0) {
                if (options.eraseEffectType === "common") {
                    // 常规消弹
                    this.game.coDo(this._EraseEffectBehaviorCommon());
                } else {
                    // 大玉消弹
                    this.game.coDo(this._EraseEffectBehaviorBubble());
                }
            }
        }
        this.destroy();
    }

    /** @internal @generator 普通消弹特效的行为，雾化消失 */
    *_EraseEffectBehaviorCommon() {
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseSprites,
            texture: this.game.prefabTextures.danmaku.particle.fog,
            anchor: 0.5,
            x: this.x, y: this.y, 
            scale: this.sprite.scale.x,
            rotation: Math.random() * 2 * Math.PI,
        });
        while (eraseEffectSprite.alpha > 0) {
            eraseEffectSprite.scale.x += 0.2 * this.game.ts;
            eraseEffectSprite.scale.y += 0.2 * this.game.ts;
            alphaTo(eraseEffectSprite, 0, 0.1 * this.game.ts);
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
        });
        while (eraseEffectSprite.alpha > 0) {
            eraseEffectSprite.scale.x -= 0.1 * this.game.ts;
            eraseEffectSprite.scale.y -= 0.1 * this.game.ts;
            alphaTo(eraseEffectSprite, 0, 0.1 * this.game.ts);
            yield;
        }
        eraseEffectSprite.destroy();
    }
}
