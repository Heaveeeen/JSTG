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

/**
 * @async 加载 JSTG 预置的弹幕贴图（主要来源于 Simple 的弹幕引擎250724）
 * @example
 * const danTextures = jstg.LoadPrefabDanmakuTextures();
 * const myBubbleDanmaku = new jstg.Danmaku(danTextures.bubble);
 */
export async function LoadPrefabDanmakuTextures(options: {
    /**
     * 如果路径错误，请填写此参数，改变预置弹幕贴图的根目录
     * @default "assets/images/danmaku/"
     */
    baseURL?: string,
    /** 默认值为 {@linkcode loadSvgDefaultResolution} 的值 */
    resolution?: number,
} = {}) {
    const base = options.baseURL ?? "assets/images/danmaku/";
    const res = options.resolution;
    return {
        smallball: await LoadSvg(`${base}smallball.svg`, res),
        ringball: await LoadSvg(`${base}ringball.svg`, res),
        glowball: await LoadSvg(`${base}glowball.svg`, res),
        fireball: await LoadSvg(`${base}fireball.svg`, res),
        dot: await LoadSvg(`${base}dot.svg`, res),
        grain: await LoadSvg(`${base}grain.svg`, res),
        chain: await LoadSvg(`${base}chain.svg`, res),
        seed: await LoadSvg(`${base}seed.svg`, res),
        scale: await LoadSvg(`${base}scale.svg`, res),
        bullet: await LoadSvg(`${base}bullet.svg`, res),
        drip: await LoadSvg(`${base}drip.svg`, res),
        card: await LoadSvg(`${base}card.svg`, res),
        note: await LoadSvg(`${base}note.svg`, res),
        arrow: await LoadSvg(`${base}arrow.svg`, res),
        butterfly: await LoadSvg(`${base}butterfly.svg`, res),
        smallstar: await LoadSvg(`${base}smallstar.svg`, res),
        bigstar: await LoadSvg(`${base}bigstar.svg`, res),
        ellipse: await LoadSvg(`${base}ellipse.svg`, res),
        heart: await LoadSvg(`${base}heart.svg`, res),
        middleball: await LoadSvg(`${base}middleball.svg`, res),
        lightball: await LoadSvg(`${base}lightball.svg`, res),
        bubble: await LoadSvg(`${base}bubble.svg`, res),
        nuclear: await LoadSvg(`${base}nuclear.svg`, res),
        crystal: await LoadSvg(`${base}crystal.svg`, res),
        particle: await LoadSvg(`${base}particle.svg`, res),
        nova: await LoadSvg(`${base}nova.svg`, res),
        needle: await LoadSvg(`${base}needle.svg`, res),
        coin: await LoadSvg(`${base}coin.svg`, res),
        knife: await LoadSvg(`${base}knife.svg`, res),
        sword: await LoadSvg(`${base}sword.svg`, res),
    }
}

type ExtractPromiseType<U> = U extends Promise<infer T> ? T : never

export type PrefabDanmakuNames = keyof ExtractPromiseType<ReturnType<typeof LoadPrefabDanmakuTextures>>
