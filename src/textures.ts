import * as pixi from "pixi";
import * as utils from "./utils.js";
import { Board, Combat, Game } from "./jstg.js";

/** @async 加载一个素材（如图像）。加载 svg 时请使用 {@linkcode LoadSvg} */
export function LoadPixiAsset<T = pixi.Texture>(url: string, options?: pixi.LoadOptions): Promise<T> {
    return pixi.Assets.load(url, options);
}

/** @async 加载一个 svg 图像。加载其他图像时请使用 {@linkcode LoadPixiAsset} */
export function LoadSvg(
    /** ⚠️该路径是基于 index.html 的！别问我到底是怎么回事，我也不太懂这玩意。请自行开控制台调试。 */
    svgUrl: string,
    /** 加载分辨率倍数。如果发现图像是糊的，请调高该参数。 */
    resolution: number
): Promise<pixi.Texture> {
    return pixi.loadSvg.load!(svgUrl, {
        data: {
            resolution: resolution,
            crossOrigin: null,
            parseAsGraphicsContext: false,
        }
    }) as Promise<pixi.Texture>;
}

const dyeTexture = (app: pixi.Application, redTexture: pixi.Texture, hue: number) => {
    const hueFilter = new pixi.ColorMatrixFilter({ resolution: "inherit", });
    hueFilter.hue(hue, false);
    const spr = new pixi.Sprite({ texture: redTexture, filters: hueFilter, });
    const dyedTexture = app.renderer.generateTexture(spr);
    spr.destroy();
    hueFilter.destroy();
    return dyedTexture;
};

export const dyedTextureColors = [
    "red", "pink", "purple", "blue", "cyan", "green", "yellowGreen", "yellow", "orange", "black", "white",
    "h0", "h30", "h60", "h90", "h120", "h150", "h180", "h210", "h240", "h270", "h300", "h330",
] as const;

export type DyedTextureColors = typeof dyedTextureColors[number];

export type DyedTextures<T = pixi.Texture> = Record<DyedTextureColors, T>;

/** 给定一个红色的贴图（通常是弹幕），为它染成几种不同的颜色，并输出这些染色过的纹理。 */
export function makeDyedTextures(options: {
    app: pixi.Application, redTexture: pixi.Texture,
}): DyedTextures {
    const h0 = options.redTexture;
    const dye = (hue: number) => dyeTexture(options.app, h0, hue);

    const h30 = dye(30),   h60 = dye(60),   h90 = dye(90),   h120 = dye(120),
          h150 = dye(150), h180 = dye(180), h210 = dye(210), h240 = dye(240),
          h270 = dye(270), h300 = dye(300), h330 = dye(330);

    const dyeGray = (scale: number) => {
        const grayScaleFilter = new pixi.ColorMatrixFilter({ resolution: "inherit", });
        grayScaleFilter.grayscale(scale, false);
        const spr = new pixi.Sprite({ texture: h0, filters: grayScaleFilter, });
        const dyedTexture = options.app.renderer.generateTexture(spr);
        spr.destroy();
        grayScaleFilter.destroy();
        return dyedTexture;
    }

    return {
        red: h0, pink: h300, purple: h270, blue: h240, cyan: h180, green: h150, yellowGreen: h90, yellow: h60, orange: h30,
        black: dyeGray(0.25), white: dyeGray(0.4),
        h0, h30, h60, h90, h120, h150, h180, h210, h240, h270, h300, h330,
    };
};

/**
 * redFrames 的结构像这样：
 * [
 *   {texture, time: 100},
 *   {texture, time: 200},
 *   ...
 * ]
 * 输出这样：
 * {
 *   red: [ {texture, time: 100}, {texture, time: 200}, ... ],
 *   pink: [ {texture, time: 100}, {texture, time: 200}, ... ],
 *   purple: [ {texture, time: 100}, {texture, time: 200}, ... ],
 *   ...
 * }
 * 换句话说，就是把给定的序列帧染色成几份不同颜色的序列帧，每一种颜色都能单独取出来，取出来的东西类型等同于输入。
 */
export function makeDyedFrames<T extends pixi.FrameObject[]>(options: {
    app: pixi.Application, redFrames: T,
}): DyedTextures<T> {
    const { app, redFrames } = options;
    /**
     * dyed 的结构像这样：
     * [
     *   {dyedTextures: {red, pink, purple...}, time: 100},
     *   {dyedTextures: {red, pink, purple...}, time: 200},
     *   ...
     * ]
     */
    const dyed = redFrames.map(({ texture, time }) => ({
        dyedTextures: makeDyedTextures({ app, redTexture: texture }),
        time,
    }));
    const dyedFrames: DyedTextures<T> = {} as any;
    for (const color of dyedTextureColors) {
        dyedFrames[color] = dyed.map(({dyedTextures, time}) => ({
            texture: dyedTextures[color], time,
        })) as any;
    }
    return dyedFrames;
}

export interface LoadPrefabTexturesOptions {
    app: pixi.Application;
    /**
     * 如果路径错误，请填写此参数，改变预置贴图的根目录
     * @default "./assets/images/"
     */
    baseUrl?: string;
    /** @default 1 */
    resolutionScale?: number;
}

// MAYDO: 懒加载，有静态和动态两种办法。静态的是把贴图劈成几半，用上哪一半就构造哪一半；动态的则是所有贴图全部动态加载，随地大小便阻断控制流，或者说加载完毕之前用一个棍母贴图顶着啥的……
/**
 * @async 加载 JSTG 预置的各种贴图（主要来源于 Simple 的弹幕引擎250724）
 */
export async function LoadPrefabTextures(options: LoadPrefabTexturesOptions) {
    const { app } = options;
    const base = options.baseUrl ?? "./assets/images/";
    const resScale = options.resolutionScale ?? 1;
    const lsvg = async (url: string, res = 2) => await LoadSvg(base + url, res * resScale);
    const lsdye = async (url: string, res = 2) => makeDyedTextures({ redTexture: await lsvg(url, res), app });
    return { // MAYDO: 改用 Promise.all
        danmaku: {
            danmaku: {
                smallball: await lsdye(`danmaku/danmaku/smallball.svg`),
                ringball: await lsdye(`danmaku/danmaku/ringball.svg`),
                glowball: await lsdye(`danmaku/danmaku/glowball.svg`),
                fireball: makeDyedFrames({ app, redFrames: [
                    { texture: await lsvg(`danmaku/danmaku/fireball.svg`), time: 100, },
                    // MAYDO: 炎弹的动画我不会画，喵😇
                ] as const}),
                dot: await lsdye(`danmaku/danmaku/dot.svg`),
                popcorn: await lsdye(`danmaku/danmaku/popcorn.svg`),
                darkpill: await lsdye(`danmaku/danmaku/darkpill.svg`),
                grain: await lsdye(`danmaku/danmaku/grain.svg`),
                chain: await lsdye(`danmaku/danmaku/chain.svg`),
                seed: await lsdye(`danmaku/danmaku/seed.svg`),
                scale: await lsdye(`danmaku/danmaku/scale.svg`),
                bullet: await lsdye(`danmaku/danmaku/bullet.svg`),
                drip: await lsdye(`danmaku/danmaku/drip.svg`),
                card: await lsdye(`danmaku/danmaku/card.svg`),
                note: makeDyedFrames({ app, redFrames: [
                    { texture: await lsvg(`danmaku/danmaku/note2.svg`), time: 120, },
                    { texture: await lsvg(`danmaku/danmaku/note1.svg`), time: 120, },
                    { texture: await lsvg(`danmaku/danmaku/note2.svg`), time: 120, },// 此处有两个相同的路径加载了两次，姑且先这么写，以后考虑优化一下。
                    { texture: await lsvg(`danmaku/danmaku/note3.svg`), time: 120, },
                ] as const}),
                arrow: await lsdye(`danmaku/danmaku/arrow.svg`),
                butterfly: await lsdye(`danmaku/danmaku/butterfly.svg`),
                smallstar: await lsdye(`danmaku/danmaku/smallstar.svg`),
                bigstar: await lsdye(`danmaku/danmaku/bigstar.svg`),
                ellipse: await lsdye(`danmaku/danmaku/ellipse.svg`),
                heart: await lsdye(`danmaku/danmaku/heart.svg`),
                middleball: await lsdye(`danmaku/danmaku/middleball.svg`),
                lightball: await lsdye(`danmaku/danmaku/lightball.svg`),
                bubble: await lsdye(`danmaku/danmaku/bubble.svg`),
                nuclear: await lsdye(`danmaku/danmaku/nuclear.svg`),
                crystal: await lsdye(`danmaku/danmaku/crystal.svg`),
                particle: await lsdye(`danmaku/danmaku/particle.svg`),
                nova: await lsdye(`danmaku/danmaku/nova.svg`),
                coin: await lsdye(`danmaku/danmaku/coin.svg`),
                knife: await lsdye(`danmaku/danmaku/knife.svg`),
                sword: await lsdye(`danmaku/danmaku/sword.svg`),
                laserseg: await lsdye(`danmaku/danmaku/laserseg.svg`),
                yinyang: await lsdye(`danmaku/danmaku/yinyang.svg`),
                bigyinyang: await lsdye(`danmaku/danmaku/bigyinyang.svg`),
            },
            particle: {
                fog: await lsdye(`danmaku/particle/fog.svg`),
            },
        },
        boardFrameUi: {
            window: await lsvg(`boardFrameUi/window.svg`),
            plStateBarIcon: {
                bombFull: await lsvg(`boardFrameUi/plStateBarIcon/bombFull.svg`, 3),
                bombEmpty: await lsvg(`boardFrameUi/plStateBarIcon/bombEmpty.svg`, 3),
                hpFull: await lsvg(`boardFrameUi/plStateBarIcon/hpFull.svg`, 3),
                hpEmpty: await lsvg(`boardFrameUi/plStateBarIcon/hpEmpty.svg`, 3),
            },
            plStateBarFrame: {
                spdeCommon: await lsvg(`boardFrameUi/plStateBarFrame/spdeCommon.svg`, 3),
                spdeWideScreen: await lsvg(`boardFrameUi/plStateBarFrame/spdeWideScreen.svg`),
            }
        },
        player: {
            hitbox: await lsvg(`player/hitbox.svg`),
            invincibleRing: await lsvg(`player/invincibleRing.svg`),
            slowMode: await lsvg(`player/slowMode.svg`),
            missFilter: await lsvg(`player/missFilter.svg`),
            reigekiRing: await lsvg(`player/reigekiRing.svg`),
            drone: {
                simpleDrone: await lsvg(`player/drone/simpleDrone.svg`),
            },
            playerBullet: {
                hit: await lsvg(`player/playerBullet/hit.svg`),
                laserAndNova: await lsvg(`player/playerBullet/laserAndNova.svg`),
                nova: await lsvg(`player/playerBullet/nova.svg`),
                simpleBullet: {
                    head: await lsvg(`player/playerBullet/simpleBullet/head.svg`),
                    trail: await lsvg(`player/playerBullet/simpleBullet/trail.svg`),
                }
            },
        },
        avatar: {
            simple: await lsvg(`avatar/simple.svg`),
            maple: await lsvg(`avatar/maple.svg`),
            icu: await lsvg(`avatar/icu.svg`),
            ran: await lsvg(`avatar/ran.svg`),
            wriggle: await lsvg(`avatar/wriggle.svg`),
            unknown: await lsvg(`avatar/unknown.svg`),
        },
        charFigure: {
            simple: {
                spellcard: await lsvg(`charFigure/simple/spellcard.svg`),
            },
            maple: {
                spellcard: await lsvg(`charFigure/maple/spellcard.svg`),
            },
            unknown: await lsvg(`charFigure/unknown.svg`),
        },
        enemy: {
            yinYangOrb: {
                // TODO: 改成类似 makeDyedFrames 的风格，现在是每个贴图里有很多 color ，应该改成每个 color 里都有一组贴图
                main: await lsdye(`enemy/yinYangOrb/main.svg`),
                innerRing: await lsdye(`enemy/yinYangOrb/innerRing.svg`),
                outerRing: await lsdye(`enemy/yinYangOrb/outerRing.svg`),
            },
            shield: await lsvg(`enemy/shield.svg`),
        },
        spellcardUi: {
            targetPointer: await lsvg(`spellcardUi/targetPointer.svg`),
            spellcardTitleLine: await lsvg(`spellcardUi/spellcardTitleLine.svg`),
            bossNameLine: await lsvg(`spellcardUi/bossNameLine.svg`),
            scCounterIcon: {
                nonSpellcard: await lsvg(`spellcardUi/scCounterIcon/nonSpellcard.svg`),
                spellcard: await lsvg(`spellcardUi/scCounterIcon/spellcard.svg`),
            },
            summaryPopup: {
                get: await lsvg(`spellcardUi/summaryPopup/get.svg`),
                pass: await lsvg(`spellcardUi/summaryPopup/pass.svg`),
                dodge: await lsvg(`spellcardUi/summaryPopup/dodge.svg`),
                godMode: await lsvg(`spellcardUi/summaryPopup/godMode.svg`),
            },
        }
    }
}

type ExtractPromiseType<U> = U extends Promise<infer T> ? T : never;

export type PrefabTextures = ExtractPromiseType<ReturnType<typeof LoadPrefabTextures>>;

export type PrefabDanmakuNames = keyof ExtractPromiseType<ReturnType<typeof LoadPrefabTextures>>["danmaku"]["danmaku"];

export function makeCommonOrAnimatedSprite(options: {
    game: Game, combat: Combat, board: Board,
    sprite: pixi.Sprite,
    texture: pixi.Texture | pixi.FrameObject[],
}) {
    const { game, combat, board, sprite, texture } = options;
    if (texture instanceof pixi.Texture) {
        sprite.texture = texture;
    } else {
        let t = 0;
        let loopLength = 0;
        for (const { time } of texture) { loopLength += time; }
        // ASSERTS: 帧列表不为空，loopLength > 0
        const selectTextures = texture.map(frame => ({
            weight: frame.time,
            value: frame.texture
        }));
        board.forever(loop => {
            sprite.texture = utils.select((1000 * t / game.standardFps) % loopLength, selectTextures);
            t += game.timeScale;
        }, { refs: sprite });
    }
    return sprite;
}