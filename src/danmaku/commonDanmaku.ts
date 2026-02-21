import * as pixi from "pixi";
import { Board, Game, LoopController } from "../jstg.js";
import { Player } from "../player/player.js";
import { alphaTo, getPointToSegmentDist2, staticAssert, Vec2 } from "../utils.js";
import { PrefabDanmakuNames } from "../textures.js";
import { AbstractDanmaku } from "./abstractDanmaku.js";



export interface NewCommonDanmakuOptions {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    type: string;
    game: Game;
    board: Board;
    /** 弹幕判定圆的半径 */
    hitboxRadius: number;
    /** 弹幕所对应的 Sprite */
    mainSprite: pixi.Sprite;
}

export class CommonDanmaku extends AbstractDanmaku {
    private _hitboxRadius: number;
    /* 弹幕判定圆的半径 */
    get hitboxRadius() { return this._hitboxRadius; }
    set hitboxRadius(n: number) {
        this._hitboxRadius = n;
        this.clearHitboxGraphics();
    }

    /** @private 弹幕在上一次判定时的 x */
    private _lastX: number;
    /** @private 弹幕在上一次判定时的 y */
    private _lastY: number;
    /** 弹幕所对应的 Sprite */
    readonly sprite: pixi.Sprite;

    constructor(options: NewCommonDanmakuOptions) {
        super(options);
        this._hitboxRadius = options.hitboxRadius;
        this.sprite = options.mainSprite;
        
        this._lastX = this.sprite.x;
        this._lastY = this.sprite.y;
    }

    /** 更新调试用的那个碰撞箱 */
    updateDebugHitbox(player: Player) {
        if (!this.isDamageToPlayer) {
            this.clearHitboxGraphics();
        }
        const { showHitbox } = this.game.debug;
        if (showHitbox.isOn) {
            if (this.hitboxGraphics === null) {
                // 如果没有碰撞圆，就画一个
                this.hitboxGraphics = new pixi.Graphics({
                    parent: this.sprite.parent ?? undefined,
                    x: this.x,
                    y: this.y,
                });
                this.hitboxGraphics.circle(
                    0, 0, this.hitboxRadius + player.hitboxRadius
                ).fill("hsla(180, 100%, 60%, 0.50)").stroke("#ffffff");
            }
            this.visible = showHitbox.isShowDanmakuBoth;
        } else {
            this.clearHitboxGraphics();
            this.visible = true;
        }
    }

    update(player: Player) {
        if (!this.isDamageToPlayer) { return; }

        this.updateDebugHitbox(player);

        // 这里的判定和弹幕引擎一样是动对动判定
        const isHit = ( // 先粗判
            Math.abs(player.x - this.x) <= this.hitboxRadius + 30 &&
            Math.abs(player.y - this.y) <= this.hitboxRadius + 30
        ) && getPointToSegmentDist2(
            { // D'D - P'P
                x: (this.x - this._lastX) - (player.x - player._lastX),
                y: (this.y - this._lastY) - (player.y - player._lastY)
            },
            { // D'->P'
                x: (player._lastX - this._lastX), y: (player._lastY - this._lastY)
            }
        ) < (this.hitboxRadius + player.hitboxRadius) ** 2;

        this._lastX = this.x;
        this._lastY = this.y;

        if (isHit) {
            player.hitByDanmaku(this);
        }
        // TODO: 擦弹
    }

    get x() { return this.sprite.x; }
    set x(n: number) {
        this.sprite.x = n;
        if (this.hitboxGraphics) { this.hitboxGraphics.x = n; }
    }
    get y() { return this.sprite.y; }
    set y(n: number) {
        this.sprite.y = n;
        if (this.hitboxGraphics) { this.hitboxGraphics.y = n; }
    }
    get rotation() { return this.sprite.rotation; }
    set rotation(n: number) { this.sprite.rotation = n; }
    get visible() { return this.sprite.visible; }
    set visible(v: boolean) { this.sprite.visible = v; }

    /**
     * 预置的消弹效果，立即摧毁该弹幕，并生成一个消弹特效  
     * 如果 canBeErase 为 false ，则该函数什么也不做
     */
    erase(options: {
        /** 根据 this.type 自动决定。对于一般的弹幕，消弹特效为雾化消失；对于大玉和核弹，缩小虚化至消失。 */
        eraseEffectType?: "fog" | "reduce",
        /**
         * 消弹时的回调函数。可以利用这个回调函数，把消掉的弹幕转换成别的东西。例如，转化为得分道具，或者死尸弹。  
         * 如果该弹幕最终没有被消除（例如因为这个该弹幕无法被消除），则该回调函数不会被调用。  
         */
        forEachCorpse?: (corpseInfo: { x: number, y: number }) => unknown,
    } = {}) {
        if (!this.canBeErase || this.destroyed) { return };
        options.forEachCorpse?.({ x: this.x, y: this.y });
        if (this.isInBoundary() && this.sprite.visible && this.sprite.alpha > 0) {
            // 如果能看见，则生成消弹特效，之后再删除
            const eraseEffectType: "fog" | "reduce" = options.eraseEffectType ?? (this.type === "bubble" || this.type === "nuclear" ? "reduce" : "fog");
            if (eraseEffectType === "fog") {
                // 常规雾化消弹
                this.game.coDo(this._EraseEffectBehaviorFog.bind(this));
            } else {
                // 缩小消弹
                this.game.coDo(this._EraseEffectBehaviorReduce.bind(this));
            }
        } else {
            // 如果看不见，直接删除
            this.destroy();
        }
    }

    /** @internal @generator 雾化消失 */
    *_EraseEffectBehaviorFog() {
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseLayer,
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

    /** @internal @generator 缩小虚化至消失 */
    *_EraseEffectBehaviorReduce() {
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseLayer,
            texture: this.sprite.texture,
            anchor: 0.5,
            x: this.x, y: this.y, 
            scale: { x: this.sprite.scale.x * 0.5, y: this.sprite.scale.y * 0.5 },
            rotation: this.sprite.rotation,
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

    isInBoundary() {
        const r = this.hitboxRadius * 1.5 + 5;
        return (Math.abs(this.x) - r <= this.board.width) && (Math.abs(this.y) - r <= this.board.height);
    }

    destroy() {
        if (this.destroyed) { return };
        this.hitboxGraphics?.destroy();
        this.sprite.destroy();
    }

    get destroyed() {
        return this.sprite.destroyed;
    }
}

/** 此处的数值与弹幕引擎有所不同 */
export const prefabDanmakuHitboxRadius = {
    smallball: 4,
    ringball: 4,
    glowball: 4,
    fireball: 4,
    dot: 2.8,
    grain: 3.1,
    chain: 3.1,
    seed: 3.1,
    scale: 3.1,
    bullet: 3.1,
    drip: 3.1,
    card: 3.4,
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
    // TODO: 菌弹，杆菌弹，激光段
    // MAY TODO: 阴阳玉，休止符
} as const;

export const makePrefabDanmaku = (options: {
    game: Game, board: Board, type: PrefabDanmakuNames,
    x: number | null, y: number | null, rotation: number | null,
    parent: pixi.Container | null,
    radius: number | null,
    // TODO: zIndex
}) => {
    const { type, game, board, x, y, rotation } = options;
    const parent = options.parent ?? board.commonDanmakuLayer;
    const hitboxRadius = options.radius ?? prefabDanmakuHitboxRadius[type];
    const danmaku = new CommonDanmaku({
        type, game, board,
        hitboxRadius,
        mainSprite: new pixi.Sprite({
            parent, x: x ?? undefined, y: y ?? undefined, rotation: rotation ?? undefined,
            texture: game.prefabTextures.danmaku.danmaku[type],
            anchor: 0.5,
            scale: hitboxRadius / prefabDanmakuHitboxRadius[type],
        }),
    });
    return danmaku;
}