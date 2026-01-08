import * as pixi from "pixi";

/** @async 加载一个素材（如图像）。加载 svg 时请使用 {@linkcode LoadSvg} */
export function LoadAsset<T = pixi.Texture>(url: string, options?: pixi.LoadOptions): Promise<T> {
    return pixi.Assets.load(url, options);
}

/** @async 加载一个 svg 图像。加载其他图像时请使用 {@linkcode LoadAsset} */
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

export interface LoadPrefabTexturesOptions {
    /**
     * 如果路径错误，请填写此参数，改变预置贴图的根目录
     * @default "./assets/images/"
     */
    baseUrl?: string,
    /** @default 2 */
    resolution?: number,
}

/**
 * @async 加载 JSTG 预置的各种贴图（主要来源于 Simple 的弹幕引擎250724）
 */
export async function LoadPrefabTextures(options: LoadPrefabTexturesOptions = {}) {
    const base = options.baseUrl ?? "./assets/images/";
    const res = options.resolution ?? 2;
    return {
        danmaku: {
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

export interface LoadPrefabSoundsOptions {
    /**
     * 如果路径错误，请填写此参数，改变预置音效的根目录
     * @default "./assets/sounds/"
     */
    baseUrl?: string,
    /**
     * @see {@linkcode Howler.HowlOptions.pool}
     * @default 1
     */
    pool?: number
    /**
     * @see {@linkcode Howler.HowlOptions.volume}
     * @default 0.8
     */
    volume?: number
}
// TODO: 把 Howler 改成别的库，或者自己用 web audio 实现一个
// 因为 Howler 不能在播放一个音频前改变它的音量，要么在它播出来的一瞬间之后再改，要么就得把这个音频的所有实例全改了
// 而且音频池（？）没有上限也有点恶心
export async function LoadPrefabSounds(options: LoadPrefabSoundsOptions = {}) {
    const base = options.baseUrl ?? "./assets/sounds/";
    const pool = options.pool ?? 1;
    const volume = options.volume ?? 0.8;
    return {
        thse: {
            big: new Howl({ src: `${base}thse/big.wav`, pool, volume, }),
            bonus: new Howl({ src: `${base}thse/bonus.wav`, pool, volume, }),
            bonus2: new Howl({ src: `${base}thse/bonus2.wav`, pool, volume, }),
            bonus4: new Howl({ src: `${base}thse/bonus4.wav`, pool, volume, }),
            boon00: new Howl({ src: `${base}thse/boon00.wav`, pool, volume, }),
            boon01: new Howl({ src: `${base}thse/boon01.wav`, pool, volume, }),
            cancel00: new Howl({ src: `${base}thse/cancel00.wav`, pool, volume, }),
            cardget: new Howl({ src: `${base}thse/cardget.wav`, pool, volume, }),
            cat00: new Howl({ src: `${base}thse/cat00.wav`, pool, volume, }),
            ch00: new Howl({ src: `${base}thse/ch00.wav`, pool, volume, }),
            ch01: new Howl({ src: `${base}thse/ch01.wav`, pool, volume, }),
            ch02: new Howl({ src: `${base}thse/ch02.wav`, pool, volume, }),
            ch03: new Howl({ src: `${base}thse/ch03.wav`, pool, volume, }),
            changeitem: new Howl({ src: `${base}thse/changeitem.wav`, pool, volume, }),
            damage00: new Howl({ src: `${base}thse/damage00.wav`, pool, volume, }),
            damage01: new Howl({ src: `${base}thse/damage01.wav`, pool, volume, }),
            don00: new Howl({ src: `${base}thse/don00.wav`, pool, volume, }),
            enep00: new Howl({ src: `${base}thse/enep00.wav`, pool, volume, }),
            enep01: new Howl({ src: `${base}thse/enep01.wav`, pool, volume, }),
            enep02: new Howl({ src: `${base}thse/enep02.wav`, pool, volume, }),
            etbreak: new Howl({ src: `${base}thse/etbreak.wav`, pool, volume, }),
            extend: new Howl({ src: `${base}thse/extend.wav`, pool, volume, }),
            extend2: new Howl({ src: `${base}thse/extend2.wav`, pool, volume, }),
            fault: new Howl({ src: `${base}thse/fault.wav`, pool, volume, }),
            graze: new Howl({ src: `${base}thse/graze.wav`, pool, volume, }),
            gun00: new Howl({ src: `${base}thse/gun00.wav`, pool, volume, }),
            heal: new Howl({ src: `${base}thse/heal.wav`, pool, volume, }),
            invalid: new Howl({ src: `${base}thse/invalid.wav`, pool, volume, }),
            item00: new Howl({ src: `${base}thse/item00.wav`, pool, volume, }),
            item01: new Howl({ src: `${base}thse/item01.wav`, pool, volume, }),
            kira00: new Howl({ src: `${base}thse/kira00.wav`, pool, volume, }),
            kira01: new Howl({ src: `${base}thse/kira01.wav`, pool, volume, }),
            kira02: new Howl({ src: `${base}thse/kira02.wav`, pool, volume, }),
            lazer00: new Howl({ src: `${base}thse/lazer00.wav`, pool, volume, }),
            lazer01: new Howl({ src: `${base}thse/lazer01.wav`, pool, volume, }),
            lazer02: new Howl({ src: `${base}thse/lazer02.wav`, pool, volume, }),
            lgods1: new Howl({ src: `${base}thse/lgods1.wav`, pool, volume, }),
            lgods2: new Howl({ src: `${base}thse/lgods2.wav`, pool, volume, }),
            lgods3: new Howl({ src: `${base}thse/lgods3.wav`, pool, volume, }),
            lgods4: new Howl({ src: `${base}thse/lgods4.wav`, pool, volume, }),
            lgodsget: new Howl({ src: `${base}thse/lgodsget.wav`, pool, volume, }),
            msl: new Howl({ src: `${base}thse/msl.wav`, pool, volume, }),
            msl2: new Howl({ src: `${base}thse/msl2.wav`, pool, volume, }),
            msl3: new Howl({ src: `${base}thse/msl3.wav`, pool, volume, }),
            nep00: new Howl({ src: `${base}thse/nep00.wav`, pool, volume, }),
            nodamage: new Howl({ src: `${base}thse/nodamage.wav`, pool, volume, }),
            noise: new Howl({ src: `${base}thse/noise.wav`, pool, volume, }),
            notice: new Howl({ src: `${base}thse/notice.wav`, pool, volume, }),
            ok00: new Howl({ src: `${base}thse/ok00.wav`, pool, volume, }),
            pause: new Howl({ src: `${base}thse/pause.wav`, pool, volume, }),
            pin00: new Howl({ src: `${base}thse/pin00.wav`, pool, volume, }),
            pin01: new Howl({ src: `${base}thse/pin01.wav`, pool, volume, }),
            pldead00: new Howl({ src: `${base}thse/pldead00.wav`, pool, volume, }),
            pldead01: new Howl({ src: `${base}thse/pldead01.wav`, pool, volume, }),
            plst00: new Howl({ src: `${base}thse/plst00.wav`, pool, volume, }),
            power0: new Howl({ src: `${base}thse/power0.wav`, pool, volume, }),
            power1: new Howl({ src: `${base}thse/power1.wav`, pool, volume, }),
            powerup: new Howl({ src: `${base}thse/powerup.wav`, pool, volume, }),
            release: new Howl({ src: `${base}thse/release.wav`, pool, volume, }),
            select00: new Howl({ src: `${base}thse/select00.wav`, pool, volume, }),
            slash: new Howl({ src: `${base}thse/slash.wav`, pool, volume, }),
            tan00: new Howl({ src: `${base}thse/tan00.wav`, pool, volume, }),
            tan01: new Howl({ src: `${base}thse/tan01.wav`, pool, volume, }),
            tan02: new Howl({ src: `${base}thse/tan02.wav`, pool, volume, }),
            tan03: new Howl({ src: `${base}thse/tan03.wav`, pool, volume, }),
            timeout: new Howl({ src: `${base}thse/timeout.wav`, pool, volume, }),
            timeout2: new Howl({ src: `${base}thse/timeout2.wav`, pool, volume, }),
            trophy: new Howl({ src: `${base}thse/trophy.wav`, pool, volume, }),
            ufo: new Howl({ src: `${base}thse/ufo.wav`, pool, volume, }),
            ufoalert: new Howl({ src: `${base}thse/ufoalert.wav`, pool, volume, }),
            warpl: new Howl({ src: `${base}thse/warpl.wav`, pool, volume, }),
            warpr: new Howl({ src: `${base}thse/warpr.wav`, pool, volume, }),
            wolf: new Howl({ src: `${base}thse/wolf.wav`, pool, volume, }),
        }
    }
}