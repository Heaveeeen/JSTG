import * as pixi from "pixi";
import { NewCommonDanmakuOptions, prefabDanmakuHitboxRadius } from "./commonDanmaku.js";
import { AbstractDanmaku, NewAbstractDanmakuOptions } from "./abstractDanmaku.js";
import { Game, Board, Player, Combat } from "../jstg.js";
import { cast, getPointToSegmentDist2, rotateVec, staticAssert } from "../utils.js";
import { DyedTextures, PrefabDanmakuNames } from "../textures.js";
import * as utils from '../utils.js';


/** 激光上附带的一个端点 */
interface LaserPoint {
    sprite: pixi.Sprite;
    /** 该端点的位置，0代表激光的根部，1代表激光的头部 */
    pos: number;
}

export interface NewLaserBeamOptions extends NewAbstractDanmakuOptions {
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
        this.clearHitboxGraphics();
    }

    private _hitboxLength: number;
    /** 激光的判定长度 */
    get hitboxLength() { return this._hitboxLength; }
    set hitboxLength(n: number) {
        this._hitboxLength = n;
        this.clearHitboxGraphics();
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
    get visible() { return this.mainSprite.visible; }
    set visible(v: boolean) {
        this.mainSprite.visible = v;
        if (this.startPoint !== null) { this.startPoint.sprite.visible = v; }
        if (this.endPoint !== null) { this.endPoint.sprite.visible = v; }
    }
    get zIndex() { return this.mainSprite.zIndex; }
    set zIndex(v: number) {
        this.mainSprite.zIndex = v;
        if (this.startPoint) { this.startPoint.sprite.zIndex = v; }
        if (this.endPoint) { this.endPoint.sprite.zIndex = v; }
    }

    updateLaserPoints() {
        for (const point of [this.startPoint, this.endPoint]) {
            if (point === null) { continue; }
            const len = this.hitboxLength * point.pos;
            point.sprite.x = this.x + len * Math.cos(this.rotation);
            point.sprite.y = this.y + len * Math.sin(this.rotation);
            point.sprite.rotation = this.rotation;
            // TODO: 端点还得会闪烁
        }
    }

    /** 更新调试用的那个碰撞箱 */
    updateDebugHitbox(player: Player) {
        if (!this.isDamageToPlayer) {
            this.clearHitboxGraphics();
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
            this.visible = showHitbox.isShowDanmakuBoth;
        } else {
            this.clearHitboxGraphics();
            this.visible = true;
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

    erase(options: {
        /**
         * 每隔多长的距离算作一个“体节”并调用一次消弹回调函数。  
         * 例如：长度为70的激光，每隔20的距离就算作一个体节并调用一次回调函数，最终会产生3个“尸体”；  
         * 再例如，长度为160的激光，每隔10的距离就算作一个体节并调用一次回调函数，最终会产生16个“尸体”。  
         * 第一个“尸体”总是位于激光的起点，至少有一个“尸体”。  
         * @default 10
         */
        stepPerCorpse?: number,
        /**
         * 消弹时的回调函数。可以利用这个回调函数，把消掉的弹幕转换成别的东西。例如，转化为得分道具，或者死尸弹。  
         * 该回调函数会对激光的每一个“体节”都调用一次。  
         * 如果该弹幕最终没有被消除（例如因为这个该弹幕无法被消除），则该回调函数不会被调用。  
         */
        forEachCorpse?: (corpseInfo: { x: number, y: number }) => unknown,
    } = {}) {
        // TODO: TEST
        if (!this.canBeErase || this.destroyed) { return; }
        if (options.forEachCorpse !== undefined) {
            const stepPerCorpse = options.stepPerCorpse ?? 10;
            for (let pos = 0; pos <= this.hitboxLength; pos += stepPerCorpse) {
                options.forEachCorpse({
                    x: this.x + pos * Math.cos(this.rotation),
                    y: this.y + pos * Math.sin(this.rotation),
                });
            }
        }
        if (this.isInBoundary() && this.visible && this.mainSprite.alpha > 0) {
            // 如果能看见，则生成消弹特效，之后再删除
            this.game.coDo(this._EraseEffectBehaviorGhost.bind(this));
        } else {
            // 如果看不见，直接删除
            this.destroy();
        }
    }
    
    /** @internal @generator 虚化至消失 */
    *_EraseEffectBehaviorGhost() {
        const eraseEffectSprite = new pixi.Sprite({
            parent: this.board.danmakuEraseLayer,
            texture: this.mainSprite.texture,
            anchor: 0.5,
            x: this.x, y: this.y, 
            scale: this.mainSprite.scale,
            rotation: this.mainSprite.rotation,
            filters: this.mainSprite.filters,
        });
        this.destroy();
        while (eraseEffectSprite.alpha > 0) {
            eraseEffectSprite.scale.x -= 0.05 * this.game.timeScale;
            eraseEffectSprite.scale.y -= 0.05 * this.game.timeScale;
            utils.alphaTo(eraseEffectSprite, 0, 0.05 * this.game.timeScale);
            yield;
        }
        eraseEffectSprite.destroy();
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
        if (this.destroyed) { return };
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
    game: Game, combat: Combat, board: Board,
    type: PrefabDanmakuNames, color: keyof DyedTextures,
    x: number, y: number, rotation: number,
    /** @default board.commonDanmakuLayer */
    parent: pixi.Container | null,
    halfWidth: number,
    length: number,
    startPoint: { type?: PrefabDanmakuNames, scale?: number, pos?: number, } | null,
    endPoint: { type?: PrefabDanmakuNames, scale?: number, pos?: number, } | null,
    zIndex: number | null,
}) => {
    const { type, color, game, combat, board, x, y, rotation } = options;
    const parent = options.parent ?? board.commonDanmakuLayer;
    const texture = game.prefabTextures.danmaku.danmaku[type][color];
    const baseHalfWidth = prefabDanmakuHitboxRadius[type]; // MAY TODO: 把这几个数据改成 PrefabDanmakuLaserWidth 啥的，手写一套高质量数据
    const baseHalfLength = prefabDanmakuHitboxRadius[type] + 2;
    const hitboxHalfWidth = options.halfWidth;
    const hitboxLength = options.length;
    const zIndex = options.zIndex ?? -(hitboxHalfWidth + 0.5 * hitboxLength);

    const makeLaserPoint = (point: { type?: PrefabDanmakuNames, scale?: number, pos?: number, } | null, defaultPos: number) => {
        if (point === null) {
            return null;
        } else {
            const type = point.type ?? "nova";
            const texture = game.prefabTextures.danmaku.danmaku[type][color];
            const pointBaseRadius = prefabDanmakuHitboxRadius[type];
            const pos = point.pos ?? defaultPos;
            const scale = point.scale ?? (1 * hitboxHalfWidth / pointBaseRadius) + 0.3;// 这里可以考虑加个sqrt，防止端点大的太大、小的太小；另外，这个尺寸应当能够随激光尺寸的变化而变化0
            return {
                sprite: new pixi.Sprite({
                    parent, texture,
                    anchor: 0.5,
                    scale, zIndex,
                    blendMode: "add",
                }), pos
            };
        }
    };

    // 这里明确三者的构造顺序，因为这玩意图层是有讲究的，后来居上
    let mainSprite = new pixi.Sprite({
        parent, texture, x, y, rotation,
        anchor: { x: 0.5 - (baseHalfLength / texture.width), y: 0.5 },
        scale: { x: hitboxLength * 0.5 / baseHalfLength, y: hitboxHalfWidth / baseHalfWidth },
        zIndex,
    });
    let startPoint = makeLaserPoint(options.startPoint, 0);
    let endPoint = makeLaserPoint(options.endPoint, 1);

    const beam = new LaserBeam({
        type, color, game, combat, board,
        hitboxHalfWidth: hitboxHalfWidth, hitboxLength,
        mainSprite, startPoint, endPoint,
    });
    combat.danmakuPool.push(beam);
    return beam;
}