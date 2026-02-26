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
        red: h0, pink: h300, purple: h270, blue: h240, cyan: h180, green: h150, yellowGreen: h90, yellow: h60, orange: h30,
        black: dyeGray(0.25), white: dyeGray(0.4),
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
    /** @default 1 */
    resolutionScale?: number;
}

/**
 * @async 加载 JSTG 预置的各种贴图（主要来源于 Simple 的弹幕引擎250724）
 */
export async function LoadPrefabTextures(options: LoadPrefabTexturesOptions) {
    const { app } = options;
    const base = options.baseUrl ?? "./assets/images/";
    const resScale = options.resolutionScale ?? 1;
    const lsvg = async (url: string, res = 2) => await LoadSvg(base + url, res * resScale);
    const lsd = async (url: string, res = 2) => makeDyedTextures({ redTexture: await lsvg(url, res), app });
    return {
        danmaku: {
            danmaku: {
                smallball: await lsd(`danmaku/danmaku/smallball.svg`) as DyedTextures, // 这里断言一下是为了折叠悬停提示
                ringball: await lsd(`danmaku/danmaku/ringball.svg`) as DyedTextures,
                glowball: await lsd(`danmaku/danmaku/glowball.svg`) as DyedTextures,
                fireball: await lsd(`danmaku/danmaku/fireball.svg`) as DyedTextures,
                dot: await lsd(`danmaku/danmaku/dot.svg`) as DyedTextures,
                bacteria: await lsd(`danmaku/danmaku/bacteria.svg`) as DyedTextures,
                bacillus: await lsd(`danmaku/danmaku/bacillus.svg`) as DyedTextures,
                grain: await lsd(`danmaku/danmaku/grain.svg`) as DyedTextures,
                chain: await lsd(`danmaku/danmaku/chain.svg`) as DyedTextures,
                seed: await lsd(`danmaku/danmaku/seed.svg`) as DyedTextures,
                scale: await lsd(`danmaku/danmaku/scale.svg`) as DyedTextures,
                bullet: await lsd(`danmaku/danmaku/bullet.svg`) as DyedTextures,
                drip: await lsd(`danmaku/danmaku/drip.svg`) as DyedTextures,
                card: await lsd(`danmaku/danmaku/card.svg`) as DyedTextures,
                note: await lsd(`danmaku/danmaku/note.svg`) as DyedTextures,
                // TODO: 音符和炎弹的动画
                arrow: await lsd(`danmaku/danmaku/arrow.svg`) as DyedTextures,
                butterfly: await lsd(`danmaku/danmaku/butterfly.svg`) as DyedTextures,
                smallstar: await lsd(`danmaku/danmaku/smallstar.svg`) as DyedTextures,
                bigstar: await lsd(`danmaku/danmaku/bigstar.svg`) as DyedTextures,
                ellipse: await lsd(`danmaku/danmaku/ellipse.svg`) as DyedTextures,
                heart: await lsd(`danmaku/danmaku/heart.svg`) as DyedTextures,
                middleball: await lsd(`danmaku/danmaku/middleball.svg`) as DyedTextures,
                lightball: await lsd(`danmaku/danmaku/lightball.svg`) as DyedTextures,
                bubble: await lsd(`danmaku/danmaku/bubble.svg`) as DyedTextures,
                nuclear: await lsd(`danmaku/danmaku/nuclear.svg`) as DyedTextures,
                crystal: await lsd(`danmaku/danmaku/crystal.svg`) as DyedTextures,
                particle: await lsd(`danmaku/danmaku/particle.svg`) as DyedTextures,
                nova: await lsd(`danmaku/danmaku/nova.svg`) as DyedTextures,
                coin: await lsd(`danmaku/danmaku/coin.svg`) as DyedTextures,
                knife: await lsd(`danmaku/danmaku/knife.svg`) as DyedTextures,
                sword: await lsd(`danmaku/danmaku/sword.svg`) as DyedTextures,
                laserseg: await lsd(`danmaku/danmaku/laserseg.svg`) as DyedTextures,
            },
            particle: {
                fog: await lsd(`danmaku/particle/fog.svg`) as DyedTextures,
            },
        },
        ingameUI: {
            window: await lsvg(`ingameUI/window.svg`),
            enemy_sc_bar_icon: {
                non_spellcard: await lsvg(`ingameUI/enemy_sc_bar_icon/non_spellcard.svg`),
                spellcard: await lsvg(`ingameUI/enemy_sc_bar_icon/spellcard.svg`),
            },
            pl_state_bar_icon: {
                bomb_full: await lsvg(`ingameUI/pl_state_bar_icon/bomb_full.svg`, 3),
                bomb_empty: await lsvg(`ingameUI/pl_state_bar_icon/bomb_empty.svg`, 3),
                hp_full: await lsvg(`ingameUI/pl_state_bar_icon/hp_full.svg`, 3),
                hp_empty: await lsvg(`ingameUI/pl_state_bar_icon/hp_empty.svg`, 3),
            },
            pl_state_bar_frame: {
                spde_common: await lsvg(`ingameUI/pl_state_bar_frame/spde_common.svg`, 3),
                spde_wide_screen: await lsvg(`ingameUI/pl_state_bar_frame/spde_wide_screen.svg`),
            }
        },
        player: {
            Simple: await lsvg(`player/Simple.svg`),
            hitbox: await lsvg(`player/hitbox.svg`),
            invincible_ring: await lsvg(`player/invincible_ring.svg`),
            slow_mode: await lsvg(`player/slow_mode.svg`),
            miss_filter: await lsvg(`player/miss_filter.svg`),
        },
    }
}

type ExtractPromiseType<U> = U extends Promise<infer T> ? T : never;

export type PrefabTextures = ExtractPromiseType<ReturnType<typeof LoadPrefabTextures>>;

export type PrefabDanmakuNames = keyof ExtractPromiseType<ReturnType<typeof LoadPrefabTextures>>["danmaku"]["danmaku"];
