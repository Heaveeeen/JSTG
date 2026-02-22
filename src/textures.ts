import * as pixi from "pixi";

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

/** 给定一个红色的贴图（通常是弹幕），为它染成几种不同的颜色，并输出这些染色过的纹理。 */
export function makeDyedTextures(options: {
    app: pixi.Application, redTexture: pixi.Texture,
}) {
    const h0 = options.redTexture;
    const dye = (hue: number) => {
        const hueFilter = new pixi.ColorMatrixFilter({ resolution: "inherit", });
        hueFilter.hue(hue, false);
        const spr = new pixi.Sprite({ texture: h0, filters: hueFilter, });
        const dyedTexture = options.app.renderer.generateTexture(spr);
        spr.destroy();
        hueFilter.destroy();
        return dyedTexture;
    }
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
        // TODO: DOC 给颜色加注释
        red: h0, pink: h300, purple: h270, blue: h240, cyan: h180, green: h150, yellowGreen: h90, yellow: h60, orange: h30,
        black: dyeGray(0.3), white: dyeGray(0.7),
        h0, h30, h60, h90, h120, h150, h180, h210, h240, h270, h300, h330,
    };
};

export type DyedTextures = ReturnType<typeof makeDyedTextures>;

export interface LoadPrefabTexturesOptions {
    app: pixi.Application;
    /**
     * 如果路径错误，请填写此参数，改变预置贴图的根目录
     * @default "./assets/images/"
     */
    baseUrl?: string;
    /** @default 2 */
    resolution?: number;
}

/**
 * @async 加载 JSTG 预置的各种贴图（主要来源于 Simple 的弹幕引擎250724）
 */
export async function LoadPrefabTextures(options: LoadPrefabTexturesOptions) {
    const { app } = options;
    const base = options.baseUrl ?? "./assets/images/";
    const res = options.resolution ?? 2;
    const danBase = base + "danmaku/danmaku/";
    return {
        danmaku: {
            danmaku: {
                smallball: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}smallball.svg`, res), app }) as DyedTextures, // 这里断言一下是为了折叠悬停提示
                ringball: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}ringball.svg`, res), app }) as DyedTextures,
                glowball: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}glowball.svg`, res), app }) as DyedTextures,
                fireball: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}fireball.svg`, res), app }) as DyedTextures,
                dot: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}dot.svg`, res), app }) as DyedTextures,
                grain: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}grain.svg`, res), app }) as DyedTextures,
                chain: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}chain.svg`, res), app }) as DyedTextures,
                seed: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}seed.svg`, res), app }) as DyedTextures,
                scale: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}scale.svg`, res), app }) as DyedTextures,
                bullet: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}bullet.svg`, res), app }) as DyedTextures,
                drip: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}drip.svg`, res), app }) as DyedTextures,
                card: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}card.svg`, res), app }) as DyedTextures,
                note: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}note.svg`, res), app }) as DyedTextures,// TODO: 音符动画
                arrow: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}arrow.svg`, res), app }) as DyedTextures,
                butterfly: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}butterfly.svg`, res), app }) as DyedTextures,
                smallstar: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}smallstar.svg`, res), app }) as DyedTextures,
                bigstar: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}bigstar.svg`, res), app }) as DyedTextures,
                ellipse: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}ellipse.svg`, res), app }) as DyedTextures,
                heart: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}heart.svg`, res), app }) as DyedTextures,
                middleball: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}middleball.svg`, res), app }) as DyedTextures,
                lightball: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}lightball.svg`, res), app }) as DyedTextures,
                bubble: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}bubble.svg`, res), app }) as DyedTextures,
                nuclear: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}nuclear.svg`, res), app }) as DyedTextures,
                crystal: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}crystal.svg`, res), app }) as DyedTextures,
                particle: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}particle.svg`, res), app }) as DyedTextures,
                nova: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}nova.svg`, res), app }) as DyedTextures,
                coin: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}coin.svg`, res), app }) as DyedTextures,
                knife: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}knife.svg`, res), app }) as DyedTextures,
                sword: makeDyedTextures({ redTexture: await LoadSvg(`${danBase}sword.svg`, res), app }) as DyedTextures,
            },
            particle: {
                fog: makeDyedTextures({ redTexture: await LoadSvg(`${base}danmaku/particle/fog.svg`, res), app }) as DyedTextures,
            },
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

export type PrefabDanmakuNames = keyof ExtractPromiseType<ReturnType<typeof LoadPrefabTextures>>["danmaku"]["danmaku"];
