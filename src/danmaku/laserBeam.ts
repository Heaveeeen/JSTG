import * as pixi from "pixi";
import { NewCommonDanmakuOptions, prefabDanmakuHitboxRadius } from "./commonDanmaku.js";
import { AbstractDanmaku } from "./abstractDanmaku.js";
import { Game, Board, Player } from "../jstg.js";
import { cast, getPointToSegmentDist2, rotateVec, staticAssert } from "../utils.js";
import { PrefabDanmakuNames } from "../textures.js";
import * as utils from '../utils.js';


/** 激光上附带的一个端点 */
interface LaserPoint {
    sprite: pixi.Sprite;
    /** 该端点的位置，0代表激光的根部，1代表激光的头部 */
    pos: number;
}

export interface NewLaserBeamOptions {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    type: string;
    game: Game;
    board: Board;
    /** 激光的判定宽度的一半 */
    hitboxHalfWidth: number;
    /** 激光的判定长度 */
    hitboxLength: number;
    /** 激光本体所对应的 Sprite */
    mainSprite: pixi.Sprite;
    /** 激光起点 */
    startPoint: LaserPoint | null;
    /** 激光终点 */
    endPoint: LaserPoint | null;
}

/**
 * 直线激光。
 * 与车万原作不同，但与弹幕引擎类似。
 * 这种直线激光不像车万原作那样能够被截断。
 * 这种直线激光的判定是个矩形。
 */
export class LaserBeam extends AbstractDanmaku {

    private _hitboxHalfWidth: number;
    /* 激光的判定宽度的一半 */
    get hitboxHalfWidth() { return this._hitboxHalfWidth; }
    set hitboxHalfWidth(n: number) {
        this._hitboxHalfWidth = n;
        if (this.hitboxGraphics) {// TODO: clearHitboxGraphics()
            this.hitboxGraphics.destroy();
            this.hitboxGraphics = null;
        }
    }

    private _hitboxLength: number;
    /** 激光的判定长度 */
    get hitboxLength() { return this._hitboxLength; }
    set hitboxLength(n: number) {
        this._hitboxLength = n;
        if (this.hitboxGraphics) {
            this.hitboxGraphics.destroy();
            this.hitboxGraphics = null;
        }
    }

    /** 激光本体所对应的 Sprite */
    readonly mainSprite: pixi.Sprite;
    /** 激光本体所对应的 Sprite */
    readonly startPoint: LaserPoint | null;
    /** 激光本体所对应的 Sprite */
    readonly endPoint: LaserPoint | null;

    constructor(options: NewLaserBeamOptions) {
        super(options);
        this._hitboxHalfWidth = options.hitboxHalfWidth;
        this._hitboxLength = options.hitboxLength;
        this.mainSprite = options.mainSprite;
        this.startPoint = options.startPoint;
        this.endPoint = options.endPoint;
        this.updateLaserPoints();
    }

    get x() { return this.mainSprite.x }
    set x(n: number) {
        this.mainSprite.x = n;
        if (this.hitboxGraphics) { this.hitboxGraphics.x = n; }
    }
    get y() { return this.mainSprite.y; }
    set y(n: number) {
        this.mainSprite.y = n;
        if (this.hitboxGraphics) { this.hitboxGraphics.y = n; }
    }
    get rotation() { return this.mainSprite.rotation; }
    set rotation(n: number) {
        this.mainSprite.rotation = n;
        if (this.hitboxGraphics) { this.hitboxGraphics.rotation = n; }
    }

    updateLaserPoints() {
        for (const point of [this.startPoint, this.endPoint]) {
            if (point === null) { continue; }
            const len = this.hitboxLength * point.pos;
            point.sprite.x = this.x + len * Math.cos(this.rotation);
            point.sprite.y = this.y + len * Math.sin(this.rotation);
            point.sprite.rotation = this.rotation;
            // 端点还得会闪烁
        }
    }

    /** 更新调试用的那个碰撞箱 */
    updateDebugHitbox(player: Player) {
        if (!this.isDamageToPlayer) {
            if (this.hitboxGraphics) {
                this.hitboxGraphics.destroy();
                this.hitboxGraphics = null;
            }
        }
        const { showHitbox } = this.game.debug;
        if (showHitbox.isOn) {
            if (this.hitboxGraphics === null) {
                // 如果没有碰撞矩形，就画一个
                this.hitboxGraphics = new pixi.Graphics({
                    parent: this.mainSprite.parent ?? undefined,
                    x: this.x,
                    y: this.y,
                });
                this.hitboxGraphics.rect(
                    0, -(this.hitboxHalfWidth + player.hitboxRadius), this.hitboxLength, 2 * (this.hitboxHalfWidth + player.hitboxRadius)
                ).fill("hsla(180, 100%, 60%, 0.50)").stroke("#ffffff");
                this.hitboxGraphics.rotation = this.rotation
            }
            this.mainSprite.visible = showHitbox.isShowDanmakuBoth;
        } else {
            if (this.hitboxGraphics) {
                this.hitboxGraphics.destroy();
                this.hitboxGraphics = null;
            }
            this.mainSprite.visible = true;
        }
    }

    update(player: Player) {
        this.updateLaserPoints();
        if (!this.isDamageToPlayer) { return; }

        this.updateDebugHitbox(player);

        const { x: dx, y: dy } = rotateVec({ x: player.x - this.x, y: player.y - this.y }, this.rotation);
        const radius = this.hitboxHalfWidth + player.hitboxRadius;

        const isHit = (dx >= 0) && (dx <= this.hitboxLength) && (Math.abs(dy) <= radius);

        if (isHit) {
            player.hitByDanmaku(this);
        }
        // TODO: 擦弹
    }

    erase() {
        // TODO: 激光消弹
        if (!this.canBeErase || this.destroyed) return;
        this.destroy();
    }

    isInBoundary() {
        const cosR = Math.cos(this.rotation);
        const sinR = Math.sin(this.rotation);
        // 把激光装进一个矩形盒子里，判断这个盒子是否完全在版面矩形之外
        const boxCX = this.x + this.hitboxLength * 0.5 * cosR;
        const boxCY = this.y + this.hitboxLength * 0.5 * sinR;
        const w = this.hitboxHalfWidth  * 1.5 + 5;
        const l = this.hitboxLength * 1.5 + 5;
        const boxW = 2 * w * sinR + l * cosR;
        const boxH = 2 * w * cosR + l * sinR;
        return (Math.abs(boxCX) - 0.5 * boxW <= this.board.width) &&
               (Math.abs(boxCY) - 0.5 * boxH <= this.board.height);
    }

    destroy() {
        if (this.destroyed) return;
        this.hitboxGraphics?.destroy();
        this.startPoint?.sprite.destroy();
        this.endPoint?.sprite.destroy();
        this.mainSprite.destroy();
    }

    get destroyed() {
        return this.mainSprite.destroyed;
    }
}

export const makePrefabLaserBeam = (options: {
    game: Game, board: Board, type: PrefabDanmakuNames,
    x: number | null, y: number | null, rotation: number | null
    parent: pixi.Container | null,
    /** @default 2 */
    halfWidth: number | null,
    /** @default 400 */
    length: number | null,
    startPoint: { type?: PrefabDanmakuNames, scale?: number, pos?: number, } | null,
    endPoint: { type?: PrefabDanmakuNames, scale?: number, pos?: number, } | null,
    // TODO: zIndex
}) => {
    const { type, game, board, x, y, rotation } = options;
    const parent = options.parent ?? board.commonDanmakuLayer;
    const texture = game.prefabTextures.danmaku.danmaku[type];
    const baseHalfWidth = prefabDanmakuHitboxRadius[type]; // TODO: 把这几个数据改成 PrefabDanmakuLaserWidth 啥的，手写一套高质量数据
    const baseHalfLength = prefabDanmakuHitboxRadius[type] + 2;
    const hitboxHalfWidth = options.halfWidth ?? 2;
    const hitboxLength = options.length ?? 400;

    const getLaserPointByOpt = (point: { type?: PrefabDanmakuNames, scale?: number, pos?: number, } | null, defaultPos: number) => {
        if (point === null) {
            return null
        } else {
            const type = point.type ?? "nova";
            const texture = game.prefabTextures.danmaku.danmaku[type];
            const pointBaseRadius = prefabDanmakuHitboxRadius[type];
            const pos = point.pos ?? defaultPos;
            const scale = point.scale ?? (1 * hitboxHalfWidth / pointBaseRadius) + 0.3;// 这里可以考虑加个sqrt，防止端点大的太大、小的太小；另外，这个尺寸应当能够随激光尺寸的变化而变化0
            return {
                sprite: new pixi.Sprite({
                    parent, texture,
                    anchor: 0.5,
                    scale,
                    blendMode: "add",
                }), pos
            };
        }
    };

    // 这里明确三者的构造顺序，因为这玩意图层是有讲究的，后来居上
    let mainSprite = new pixi.Sprite({
        parent, texture,
        x: x ?? undefined, y: y ?? undefined, rotation: rotation ?? undefined,
        anchor: { x: 0.5 - (baseHalfLength / texture.width), y: 0.5 },
        scale: { x: hitboxLength * 0.5 / baseHalfLength, y: hitboxHalfWidth / baseHalfWidth },
    });
    let startPoint = getLaserPointByOpt(options.startPoint, 0);
    let endPoint = getLaserPointByOpt(options.endPoint, 1);

    return new LaserBeam({
        type, game, board,
        hitboxHalfWidth: hitboxHalfWidth, hitboxLength,
        mainSprite, startPoint, endPoint,
    });
}