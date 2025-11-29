import * as pixi from "pixi";

/** @async 加载一个素材（如图像）。加载 svg 时请使用 {@linkcode LoadSvg} */
export function LoadAsset<T = pixi.Texture>(url: string, options?: pixi.LoadOptions): Promise<T> {
    return pixi.Assets.load(url, options);
}

/** @private */
let svgRes = 2;

/**
 * {@linkcode LoadSvg} 的默认分辨率  
 * ⚠️请使用 set() 和 get() 方法访问该数值  
 * @default 2
 * @example
 * console.log(JSTG.loadSvgDefaultResolution.get()); // 2
 * JSTG.loadSvgDefaultResolution.set(4); // 可能会让加载出来的矢量图更清晰一些
 */
export const loadSvgDefaultResolution = {
    get: () => svgRes,
    set: (resolution: number) => svgRes = resolution,
}

/** @async 加载一个 svg 图像。加载其他图像时请使用 {@linkcode LoadAsset} */
export function LoadSvg(
    /** ⚠️该路径是基于 index.html 的！别问我到底是怎么回事，我也不太懂这玩意。请自行开控制台调试。 */
    svgUrl: string,
    /**
     * 加载分辨率倍数。如果发现图像是糊的，请调高该参数。  
     * 默认值为 {@linkcode loadSvgDefaultResolution} 的值
     */
    resolution?: number
): Promise<pixi.Texture> {
    return pixi.loadSvg.load!(svgUrl, {
        data: {
            resolution: resolution ?? svgRes,
            crossOrigin: null,
            parseAsGraphicsContext: false,
        }
    }) as Promise<pixi.Texture>;
}

export interface LoadPrefabTexturesOptions {
    /**
     * 如果路径错误，请填写此参数，改变预置贴图的根目录
     * @default "assets/images/"
     */
    baseUrl?: string,
    /** 默认值为 {@linkcode loadSvgDefaultResolution} 的值 */
    resolution?: number,
}

/**
 * @async 加载 JSTG 预置的各种贴图（主要来源于 Simple 的弹幕引擎250724）
 */
export async function LoadPrefabTextures(options: LoadPrefabTexturesOptions = {}) {
    const base = options.baseUrl ?? "assets/images/";
    const res = options.resolution;
    return {
        danmaku: {
            smallball: await LoadSvg(`${base}danmaku/danmaku/smallball.svg`, res),
            ringball: await LoadSvg(`${base}danmaku/danmaku/ringball.svg`, res),
            glowball: await LoadSvg(`${base}danmaku/danmaku/glowball.svg`, res),
            fireball: await LoadSvg(`${base}danmaku/danmaku/fireball.svg`, res),
            dot: await LoadSvg(`${base}danmaku/danmaku/dot.svg`, res),
            grain: await LoadSvg(`${base}danmaku/danmaku/grain.svg`, res),
            chain: await LoadSvg(`${base}danmaku/danmaku/chain.svg`, res),
            seed: await LoadSvg(`${base}danmaku/danmaku/seed.svg`, res),
            scale: await LoadSvg(`${base}danmaku/danmaku/scale.svg`, res),
            bullet: await LoadSvg(`${base}danmaku/danmaku/bullet.svg`, res),
            drip: await LoadSvg(`${base}danmaku/danmaku/drip.svg`, res),
            card: await LoadSvg(`${base}danmaku/danmaku/card.svg`, res),
            note: await LoadSvg(`${base}danmaku/danmaku/note.svg`, res),
            arrow: await LoadSvg(`${base}danmaku/danmaku/arrow.svg`, res),
            butterfly: await LoadSvg(`${base}danmaku/danmaku/butterfly.svg`, res),
            smallstar: await LoadSvg(`${base}danmaku/danmaku/smallstar.svg`, res),
            bigstar: await LoadSvg(`${base}danmaku/danmaku/bigstar.svg`, res),
            ellipse: await LoadSvg(`${base}danmaku/danmaku/ellipse.svg`, res),
            heart: await LoadSvg(`${base}danmaku/danmaku/heart.svg`, res),
            middleball: await LoadSvg(`${base}danmaku/danmaku/middleball.svg`, res),
            lightball: await LoadSvg(`${base}danmaku/danmaku/lightball.svg`, res),
            bubble: await LoadSvg(`${base}danmaku/danmaku/bubble.svg`, res),
            nuclear: await LoadSvg(`${base}danmaku/danmaku/nuclear.svg`, res),
            crystal: await LoadSvg(`${base}danmaku/danmaku/crystal.svg`, res),
            particle: await LoadSvg(`${base}danmaku/danmaku/particle.svg`, res),
            nova: await LoadSvg(`${base}danmaku/danmaku/nova.svg`, res),
            needle: await LoadSvg(`${base}danmaku/danmaku/needle.svg`, res),
            coin: await LoadSvg(`${base}danmaku/danmaku/coin.svg`, res),
            knife: await LoadSvg(`${base}danmaku/danmaku/knife.svg`, res),
            sword: await LoadSvg(`${base}danmaku/danmaku/sword.svg`, res),
        },
        particle: {
            fog: await LoadSvg(`${base}danmaku/particle/fog.svg`, res),
        },
        ingameUI: {
            window: await LoadSvg(`${base}ingameUI/window.svg`, res),
        },
        player: {
            Simple: await LoadSvg(`${base}player/Simple.svg`, res),
            hitbox: await LoadSvg(`${base}player/hitbox.svg`, res),
            invincible_ring: await LoadSvg(`${base}player/invincible_ring.svg`, res),
            slow_mode: await LoadSvg(`${base}player/slow_mode.svg`, res),
        },
    }
}

type ExtractPromiseType<U> = U extends Promise<infer T> ? T : never;

export type PrefabTextures = ExtractPromiseType<ReturnType<typeof LoadPrefabTextures>>;

export type PrefabDanmakuNames = keyof ExtractPromiseType<ReturnType<typeof LoadPrefabTextures>>["danmaku"];
