import * as pixi from "pixi";
import { Board, Game, Player } from "./jstg.js";

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
     * myDanmaku.isHasDamage = false; // 让这个弹幕不再与玩家产生交互，取消伤害判定
     * myDanmaku.isHasDamage = true; // 重新启用伤害判定
     */
    isHasDamage: boolean = true;
    /**
     * 该弹幕是否能够被消弹效果消除
     * @example
     * myDanmaku.canBeErase = false; // 让这个弹幕无法被消弹效果消除
     * myDanmaku.canBeErase = true; // 又能消掉了
     */
    canBeErase: boolean = true;

    constructor(
        game: Game,
        /**
         * 弹幕的种类名称
         * @example
         * "smallball"
         */
        readonly type: string,
        /** 弹幕判定圆的半径 */
        readonly hitboxRadius: number,
        /** 弹幕所用到的 Sprite */
        readonly sprite: pixi.Sprite
    ) {
        this._lastX = sprite.x;
        this._lastY = sprite.y;
        this._index = pushDanmaku(this);
    }

    /** 更新该弹幕与玩家的交互逻辑（即伤害判定），该函数不会自动检查 isHasDamage 属性 */
    updateDamageToPlayer(player: Player) {
        const isHit = getPointToSegmentDist2(
            { // D'D - P'P
                x: (this.x - this._lastX) - (player.x - player._lastX),
                y: (this.y - this._lastY) - (player.y - player._lastY)
            },
            { // P'
                x: player._lastX, y: player._lastY
            }
        );

        this._lastX = this.sprite.x;
        this._lastY = this.sprite.y;
        player._lastX = player.x;
        player._lastY = player.y;

        if (isHit) {
            // TODO: player.miss(); this.erase();
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
}