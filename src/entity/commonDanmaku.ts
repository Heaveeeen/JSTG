import * as pixi from "pixi";
import { Board, Combat, Game } from "../jstg.js";
import { Player } from "../player/player.js";
import { alphaTo, decibel, getPointToSegmentDist2, select, SelectItem, staticAssert, Vec2 } from "../utils.js";
import { DyedTextureColors, DyedTextures, makeCommonOrAnimatedSprite, PrefabDanmakuNames } from "../textures.js";
import { AbstractEntity, EraseEntityOptions, NewAbstractEntityOptions, prefabDanmakuHitboxRadius } from "./abstractEntity.js";



export interface NewCommonDanmakuOptions extends NewAbstractEntityOptions {
    /** 弹幕判定圆的半径 */
    hitboxRadius: number;
    /** 弹幕所对应的 Sprite */
    sprite: pixi.Sprite;
}

export class CommonDanmaku extends AbstractEntity {
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
        this.sprite = options.sprite;
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
        let isHit = false;
        this.isGrazing = false;
        if ( // 先粗判
            Math.abs(player.x - this.x) <= this.hitboxRadius + 40 &&
            Math.abs(player.y - this.y) <= this.hitboxRadius + 40
        ) {
            let dist = getPointToSegmentDist2(
                { // D'D - P'P
                    x: (this.x - this._lastX) - (player.x - player._lastX),
                    y: (this.y - this._lastY) - (player.y - player._lastY)
                },
                { // D'->P'
                    x: (player._lastX - this._lastX), y: (player._lastY - this._lastY)
                }
            );
            isHit = dist < (this.hitboxRadius + player.hitboxRadius) ** 2;
            if (this.grazeCd <= 0) {
                this.isGrazing = dist < (this.hitboxRadius + 24 + player.hitboxRadius) ** 2;
            }
        }
        
        if (isHit) {
            player.getHurt({ entity: this });
        } else if (this.isGrazing) {
            // 擦弹
            this.game.prefabSounds.thse.graze.play({ volume: decibel(-6), });
            this.grazeCd = 200;
        }

        if (!this.destroyed) {
            this._lastX = this.x;
            this._lastY = this.y;
            this.grazeCd -= this.game.timeScale;
        }
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
    get zIndex() { return this.sprite.zIndex; }
    set zIndex(v: number) { this.sprite.zIndex = v; }

    erase(options: EraseEntityOptions & {
        /**
         * 消弹的特效种类。
         * 若不填写此参数，则会根据 this.type 自动决定。对于一般的弹幕，消弹特效为雾化消失；对于大玉和核弹，缩小虚化至消失。
         */
        effectType?: "fog" | "reduce",
    } = {}) {
        if (!this._getIsCanBeEraseByPermissionType(options.permissionType ?? "common")) { return };
        this.enemy?.destroy();
        options.forEachCorpse?.({ x: this.x, y: this.y });
        if (this.isInBoundary() && this.visible && this.sprite.alpha > 0) {
            // 如果能看见，则生成消弹特效，之后再删除
            const eraseEffectType: "fog" | "reduce" = options.effectType ?? (this.type === "bubble" || this.type === "nuclear" ? "reduce" : "fog");
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
        if (this.destroyed) { return; }
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseLayer,
            texture: this.game.prefabTextures.danmaku.particle.fog[this.color],
            anchor: 0.5,
            x: this.x, y: this.y, 
            scale: { x: this.sprite.scale.x * 0.5, y: this.sprite.scale.y * 0.5 },
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
        if (this.destroyed) { return; }
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseLayer,
            texture: this.sprite.texture,
            anchor: 0.5,
            x: this.x, y: this.y, 
            scale: this.sprite.scale,
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
        this.enemy?.destroy();
    }

    get destroyed() {
        return this.sprite.destroyed;
    }
}

export const makePrefabDanmaku = (options: {
    game: Game, combat: Combat, board: Board,
    type: PrefabDanmakuNames, color: DyedTextureColors,
    x: number, y: number, rotation: number,
    /** @default board.commonDanmakuLayer */
    parent: pixi.Container | null,
    /** @default prefabDanmakuHitboxRadius[type] */
    radius: number | null,
    /** @default -radius */
    zIndex: number | null,
    /** @default true */
    canBeErase: boolean | null,
}) => {
    const { type, color, game, combat, board, x, y, rotation } = options;
    const parent = options.parent ?? board.commonDanmakuLayer;
    const hitboxRadius = options.radius ?? prefabDanmakuHitboxRadius[type];
    const texture = game.prefabTextures.danmaku.danmaku[type][color];
    const zIndex = options.zIndex ?? -hitboxRadius;
    const canBeErase = options.canBeErase ?? true;
    const sprite = makeCommonOrAnimatedSprite({
        game, combat, texture,
        sprite: new pixi.Sprite({
            parent, x, y, rotation,
            anchor: 0.5,
            scale: hitboxRadius / prefabDanmakuHitboxRadius[type],
            zIndex,
        }),
    });
    const danmaku = new CommonDanmaku({
        type, color, game, combat, board,
        hitboxRadius, sprite,
    });
    danmaku.canBeErase = canBeErase;
    combat.danmakuPool.push(danmaku);
    return danmaku;
}