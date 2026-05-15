import * as pixi from "pixi";
import { AbstractDanmaku, EraseDanmakuOptions, NewAbstractDanmakuOptions, prefabDanmakuHitboxRadius } from "./abstractDanmaku.js";
import { Game, Board, Player, Combat } from "../jstg.js";
import * as utils from "../utils.js";
import { DyedTextures, PrefabDanmakuNames, DyedTextureColors, makeCommonOrAnimatedSprite } from "../textures.js";
import { LoopController } from "../looper.js";


/** 激光上附带的一个端点 */
interface LaserPoint {
    sprite: pixi.Sprite;
    /** 该端点的位置，-1代表激光的根部，0代表激光的头部（本体） */
    pos: number;
}

export interface NewLaserBeamOptions extends NewAbstractDanmakuOptions {
    /** 激光的判定宽度的一半 */
    hitboxHalfWidth: number;
    /** 激光的判定长度 */
    hitboxLength: number;
    foldedLength: number;
    /** 激光本体所对应的 Sprite */
    mainSprite: pixi.Sprite;
    baseHalfLength: number;
    baseHalfWidth: number;
}

/**
 * 直线激光。  
 * 与车万原作不同，但与弹幕引擎类似。  
 * 这种激光的本体在脑袋上。  
 * 这种直线激光不像车万原作那样能够被截断。  
 * 这种直线激光的判定是个矩形。  
 */
export class LaserBeam extends AbstractDanmaku {

    /** @internal */
    private _baseHalfLength: number;
    /** @internal */
    private _baseHalfWidth: number;

    /** @internal */
    private _hitboxHalfWidth: number;
    /* 激光的判定宽度的一半 */
    get hitboxHalfWidth() { return this._hitboxHalfWidth; }
    set hitboxHalfWidth(n: number) {
        this._hitboxHalfWidth = n;
        this.mainSprite.scale.y = this.hitboxHalfWidth / this._baseHalfWidth;
        this.clearHitboxGraphics();
    }

    /** @internal */
    private _hitboxLength: number;
    /** 激光的判定长度，也就是从脑袋（本体）开始往屁股后边延伸的长度 */
    get hitboxLength() { return this._hitboxLength; }
    set hitboxLength(n: number) {
        this._hitboxLength = n;
        this.mainSprite.scale.x = this._hitboxLength * 0.5 / this._baseHalfLength;
        this.clearHitboxGraphics();
    }

    /** @internal */
    _totalLength: number;

    /** 激光本体所对应的 Sprite */
    readonly mainSprite: pixi.Sprite;
    /** 激光末端（屁股上）的端点所对应的 Sprite */
    tailPoint: LaserPoint | null = null;
    makeTailPoint(point: { type?: PrefabDanmakuNames, scale?: number, pos?: number } | null) {
        this.tailPoint?.sprite.destroy();
        this.tailPoint = makeLaserPoint(this, point, -1);
    }
    /** 激光头部（本体）的端点所对应的 Sprite */
    headPoint: LaserPoint | null = null;
    makeHeadPoint(point: { type?: PrefabDanmakuNames, scale?: number, pos?: number } | null) {
        this.headPoint?.sprite.destroy();
        this.headPoint = makeLaserPoint(this, point, 0);
    }

    constructor(options: NewLaserBeamOptions) {
        super(options);
        this._hitboxHalfWidth = options.hitboxHalfWidth;
        this._hitboxLength = options.hitboxLength;
        this._totalLength = options.foldedLength;
        this.mainSprite = options.mainSprite;
        this._baseHalfLength = options.baseHalfLength;
        this._baseHalfWidth = options.baseHalfWidth;
        this.updateLaserPoints();
    }

    /** 激光脑袋的 x 坐标 */
    get x() { return this.mainSprite.x }
    set x(n: number) {
        this.mainSprite.x = n;
        if (this.hitboxGraphics) { this.hitboxGraphics.x = n; }
    }
    /** 激光脑袋的 y 坐标 */
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
        if (this.tailPoint !== null) { this.tailPoint.sprite.visible = v; }
        if (this.headPoint !== null) { this.headPoint.sprite.visible = v; }
    }
    get zIndex() { return this.mainSprite.zIndex; }
    set zIndex(v: number) {
        this.mainSprite.zIndex = v;
        if (this.tailPoint) { this.tailPoint.sprite.zIndex = v; }
        if (this.headPoint) { this.headPoint.sprite.zIndex = v; }
    }
    get alpha() { return this.mainSprite.alpha }
    set alpha(n: number) { this.mainSprite.alpha = n; }

    updateLaserPoints() {
        for (const point of [this.tailPoint, this.headPoint]) {
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
            }
            if (this.isHitboxGraphicsDirty) {
                this.hitboxGraphics.clear();
                this.hitboxGraphics.rect(
                    -this.hitboxLength, -(this.hitboxHalfWidth + player.hitboxRadius), this.hitboxLength, 2 * (this.hitboxHalfWidth + player.hitboxRadius)
                ).fill("hsla(180, 100%, 60%, 0.50)").stroke("#ffffff");
                this.hitboxGraphics.rotation = this.rotation;
                this.isHitboxGraphicsDirty = false;
            }
            this.visible = showHitbox.isShowDanmakuBoth;
        } else {
            this.clearHitboxGraphics();
            this.visible = true;
        }
    }

    update(player: Player) {
        this.updateLaserPoints();
        this.updateDebugHitbox(player);

        if (!this.isDamageToPlayer) { return; }

        this.isGrazing = false;

        const { x: rx, y: ry } = utils.rotateVec({ x: player.x - this.x, y: player.y - this.y }, this.rotation);
        
        const radius = this.hitboxHalfWidth + player.hitboxRadius;
        const isHit = (rx >= -this.hitboxLength) && (rx <= 0) && (Math.abs(ry) <= radius);
        if (this.grazeCd <= 0) {
            this.isGrazing = (rx >= -this.hitboxLength - 24) && (rx <= 24) && (Math.abs(ry) <= radius + 24);
        }

        if (isHit) {
            player.beHurt({ danmaku: this });
        } else if (this.isGrazing) {
            // 擦弹
            this.game.prefabSounds.thse.graze.play(utils.decibel(-3));
            this.grazeCd = 4;
        }

        if (!this.destroyed) {
            this.grazeCd -= this.game.timeScale;
        }
    }

    erase(options: EraseDanmakuOptions & {
        /**
         * 每隔多长的距离算作一个“体节”并调用一次消弹回调函数。  
         * 例如：长度为70的激光，每隔20的距离就算作一个体节并调用一次回调函数，最终会产生3个“尸体”；  
         * 再例如，长度为160的激光，每隔10的距离就算作一个体节并调用一次回调函数，最终会产生16个“尸体”。  
         * 第一个“尸体”总是位于激光的本体（脑袋），至少有一个“尸体”。  
         * 未完全展开的激光会在末端（屁股）处额外产生一些“尸体”。  
         * @default 10
         */
        stepPerCorpse?: number,
    } = {}) {
        // TODO: 测试激光消弹功能
        if (!this._getIsCanBeEraseByPermissionType(options.permissionType ?? "common")) { return; }
        this._erased = true;
        this.enemy?.destroy();
        if (options.forEachCorpse !== undefined) {
            const stepPerCorpse = options.stepPerCorpse ?? 10;
            for (let pos = 0; pos <= Math.max(this.hitboxLength, this._totalLength); pos += stepPerCorpse) {
                options.forEachCorpse({
                    x: this.x + pos * Math.cos(this.rotation),
                    y: this.y + pos * Math.sin(this.rotation),
                });
            }
        }
        options.effectType ??= "reduce";
        if (options.effectType !== "none" && this.getIsInBoundary() && this.visible && this.alpha > 0) {
            // 如果能看见，则生成消弹特效，之后再删除
            utils.staticAssert<"reduce" | "fog">(options.effectType); // MAYDO: 激光的雾化消弹效果
            this.board.coDo(this._EraseEffectBehaviorGhost.bind(this));
        } else {
            // 如果看不见，直接删除
            this.destroy();
        }
    }
    
    /** @internal @generator 虚化至消失 */
    *_EraseEffectBehaviorGhost(loop: LoopController<void>) {
        if (this.mainSprite.destroyed) { return; }
        // 激光消弹姑且不做音效
        const makeEff = (spr: pixi.Sprite) => {
            const effSpr = new pixi.Sprite({
                parent: this.board.danmakuEraseLayer,
                texture: spr.texture,
                anchor: spr.anchor,
                x: spr.x, y: spr.y,
                scale: spr.scale,
                rotation: spr.rotation,
                filters: spr.filters,
            });
            loop.addDestroys(effSpr);
            return effSpr;
        };
        const eraseMain = makeEff(this.mainSprite);
        const eraseStartPoint = this.tailPoint ? makeEff(this.tailPoint.sprite) : null;
        const eraseEndPoint = this.headPoint ? makeEff(this.headPoint.sprite) : null;
        this.destroy();
        const anim = (spr: pixi.Sprite) => {
            spr.scale.y -= 0.05 * this.game.timeScale;
            this.game.alphaTo(spr, 0, 0.05);
        }
        while (eraseMain.alpha > 0) {
            anim(eraseMain);
            if (eraseStartPoint) { anim(eraseStartPoint); }
            if (eraseEndPoint) { anim(eraseEndPoint); }
            yield;
        }
        eraseMain.destroy({ children: true });
        eraseStartPoint?.destroy({ children: true });
        eraseEndPoint?.destroy({ children: true });
    }

    getIsInBoundary() {
        const cosR = Math.cos(this.rotation);
        const sinR = Math.sin(this.rotation);
        // 把激光装进一个矩形盒子里，判断这个盒子是否完全在版面矩形之外
        const boxCX = this.x + this.hitboxLength * 0.5 * cosR;
        const boxCY = this.y + this.hitboxLength * 0.5 * sinR;
        const w = this.hitboxHalfWidth  * 1.5 + 5;
        const l = this.hitboxLength * 1.5 + 5;
        const boxW = 2 * w * sinR + l * cosR;
        const boxH = 2 * w * cosR + l * sinR;
        return (Math.abs(boxCX) - 0.5 * boxW <= this.board.halfWidth) &&
               (Math.abs(boxCY) - 0.5 * boxH <= this.board.halfHeight);
    }

    getIsCrossCircle(circle: { x: number; y: number; radius: number; }) {
        const { x: rx, y: ry } = utils.rotateVec({ x: circle.x - this.x, y: circle.y - this.y }, this.rotation);
        const radius = this.hitboxHalfWidth + circle.radius;
        return (rx >= 0) && (rx <= this.hitboxLength) && (Math.abs(ry) <= radius);
    }

    destroy() {
        if (this.mainSprite.destroyed) { return };
        this.hitboxGraphics?.destroy({ children: true });
        this.tailPoint?.sprite.destroy({ children: true });
        this.headPoint?.sprite.destroy({ children: true });
        this.mainSprite.destroy({ children: true });
        this.enemy?.destroy();
    }

    get destroyed() {
        return this.mainSprite.destroyed || this._erased;
    }
}

const makeLaserPoint = (options: {
    game: Game, combat: Combat, board: Board,
    color: DyedTextureColors | "noColor",
    hitboxHalfWidth: number,
    mainSprite: pixi.Sprite,
}, point: { type?: PrefabDanmakuNames, scale?: number, pos?: number, } | null, defaultPos: number) => {
    if (point === null) {
        return null;
    } else {
        const type = point.type ?? "nova";
        const color = options.color === "noColor" ? "red" : options.color;
        const texture = options.game.prefabTextures.danmaku.danmaku[type][color];
        const pointBaseRadius = prefabDanmakuHitboxRadius[type];
        const pos = point.pos ?? defaultPos;
        const scale = point.scale ?? (1 * options.hitboxHalfWidth / pointBaseRadius) + 0.3;// 这里可以考虑加个sqrt，防止端点大的太大、小的太小；另外，这个尺寸应当能够随激光尺寸的变化而变化0
        return {
            sprite: makeCommonOrAnimatedSprite({
                game: options.game, combat: options.combat, board: options.board, texture,
                sprite: new pixi.Sprite({
                    parent: options.mainSprite.parent ?? undefined,
                    anchor: 0.5,
                    scale, zIndex: options.mainSprite.zIndex,
                    blendMode: "add",
                }),
            }), pos
        };
    }
}

export interface BaseMakePrefabLaserBeamOptions {
    game: Game;
    combat: Combat;
    board: Board;
    type: PrefabDanmakuNames;
    color: DyedTextureColors;
    x: number;
    y: number;
    rotation: number;
    speed: number;
    /** @default board.commonDanmakuLayer */
    parent: pixi.Container | null;
    halfWidth: number;
    length: number;
    tailPoint: {
        type?: PrefabDanmakuNames;
        scale?: number;
        pos?: number;
    } | null;
    headPoint: {
        type?: PrefabDanmakuNames;
        scale?: number;
        pos?: number;
    } | null;
    zIndex: number | null;
    /** @default true */
    canBeErase: boolean | null;
};

export const baseMakePrefabLaserBeam = (options: BaseMakePrefabLaserBeamOptions) => {
    const { type, color, game, combat, board, x, y, rotation, speed } = options;
    const parent = options.parent ?? board.commonDanmakuLayer;
    const texture = game.prefabTextures.danmaku.danmaku[type][color];
    const baseHalfWidth = prefabDanmakuHitboxRadius[type];
    // MAYDO: PrefabDanmakuLaserWidth 啥的，手写一套高质量数据
    const baseHalfLength = prefabDanmakuHitboxRadius[type] + 2;
    const hitboxHalfWidth = options.halfWidth;
    const hitboxLength = options.length;
    const zIndex = options.zIndex ?? -(hitboxHalfWidth + 0.5 * hitboxLength);
    const canBeErase = options.canBeErase ?? true;

    // 这里明确三者的构造顺序，因为这玩意图层是有讲究的，后来居上
    let anchor: pixi.PointData;
    if (texture instanceof pixi.Texture) {
        anchor = { x: 0.5 + (baseHalfLength / texture.width), y: 0.5 };
    } else {
        // ASSERTS: texture 不为空，至少有一个贴图，且所有贴图尺寸均相同
        // 此处不需要增加运行时判断，因为如果 texture 是空的，texture[0].texture 自己就会报错
        anchor = { x: 0.5 + (baseHalfLength / texture[0].texture.width), y: 0.5 };
    }
    let mainSprite = makeCommonOrAnimatedSprite({
        game, combat, board, texture,
        sprite: new pixi.Sprite({
            parent, x, y, rotation,
            anchor,
            scale: { x: hitboxLength * 0.5 / baseHalfLength, y: hitboxHalfWidth / baseHalfWidth },
            zIndex,
        })
    });

    const beam = new LaserBeam({
        type, color, game, combat, board,
        hitboxHalfWidth: hitboxHalfWidth, hitboxLength,
        mainSprite, foldedLength: 0, baseHalfLength, baseHalfWidth,
    });
    beam.makeTailPoint(options.tailPoint);
    beam.makeHeadPoint(options.headPoint);
    beam.canBeErase = canBeErase;
    beam.speed = speed;
    return beam;
}

export const baseMakeGrowingLaserBeam = (options: {
    beam: LaserBeam,
    targetLength: number,
    growSpeed: number,
}) => {
    const { beam, targetLength, growSpeed } = options;
    beam._totalLength = targetLength;
    const initLength = beam.hitboxLength;
    const dur = (targetLength - initLength) / growSpeed;
    const loop = beam.forever(loop => {
        if (loop.clock < dur) {
            beam.hitboxLength = utils.lerp(initLength, targetLength, loop.clock / dur);
        } else {
            beam.hitboxLength = targetLength;
            loop.destroy();
        }
    });
    return {
        beam, loop,
        then: (callback: () => void) => loop.then(callback),
    };
};

export type MakeGrowingLaserBeamResult = ReturnType<typeof baseMakeGrowingLaserBeam>;