import { Destroyable } from "./jstg.js";
import * as utils from "./utils.js"


const ctx = new AudioContext();

export interface PlaySoundOptions {
    /** @default 1 */
    volume?: number,
    /** @default true */
    autoStart?: boolean,
}

export const globalMusicGain = ctx.createGain();
globalMusicGain.connect(ctx.destination);
globalMusicGain.gain.value = utils.decibel(-4);
export const globalSfxGain = ctx.createGain();
globalSfxGain.connect(ctx.destination);
globalSfxGain.gain.value = utils.decibel(-6);

interface PlaySoundPoolItem {
    controller: PlaySoundController | null,
    localGain: GainNode,
}

export interface PlaySoundController extends Destroyable {
    source: AudioBufferSourceNode;
    localGain: GainNode;
}

export async function LoadSound(loadOptions: {
    src: string,
    /** @default 1 */
    poolSize?: number,
    /** @default "sfx" */
    globalGainType?: "music" | "sfx"
}) {
    const { src } = loadOptions;
    const poolSize = loadOptions.poolSize ?? 1;
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const globalGain = (loadOptions.globalGainType ?? "sfx") === "music" ? globalMusicGain : globalSfxGain
    const sourcePool: PlaySoundPoolItem[] = [];

    for (let i = 0; i < poolSize; i++) {
        // source -> localGain -> globalGain -> destination

        const localGain = ctx.createGain();
        localGain.connect(globalGain);

        sourcePool.push({ controller: null, localGain });
    }

    let nextPoolItemIdx = 0;

    function play(volume: number): PlaySoundController;
    function play(options?: PlaySoundOptions): PlaySoundController;
    function play(options: PlaySoundOptions | number = {}) {
        if (typeof options === "number") { options = { volume: options }; }
        const item = sourcePool[nextPoolItemIdx];
        nextPoolItemIdx ++;
        if (nextPoolItemIdx >= poolSize) {
            nextPoolItemIdx = 0;
        }

        if (item.controller !== null) {
            item.controller.destroy();
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(item.localGain);
        item.localGain.gain.value = options.volume ?? 1;
        if (options.autoStart ?? true) { source.start(); }

        let destroyed = false;
        function destroy() {
            if (destroyed) { return; }
            source.stop();
            destroyed = true;
        }

        const controller: PlaySoundController = { source, localGain: item.localGain, destroy, destroyed };
        item.controller = controller;
        return controller;
    }

    return { buffer, play };
}



export interface LoadPrefabSoundsOptions {
    /**
     * 如果路径错误，请填写此参数，改变预置音效的根目录
     * @default "./assets/sounds/"
     */
    baseUrl?: string,
    /**
     * @default 1
     */
    poolSizeScale?: number
}

export async function LoadPrefabSounds(options: LoadPrefabSoundsOptions = {}) {
    const base = options.baseUrl ?? "./assets/sounds/";
    const poolSizeScale = options.poolSizeScale ?? 1;
    const lsfx = (url: string, poolSize: number = 1) => LoadSound({ src: base + url, poolSize: poolSize * poolSizeScale, globalGainType: "sfx", })
    return {
        // TODOC: thse
        /** 东方原作中的音效 */
        thse: {
            big: await lsfx(`thse/big.wav`),
            bonus: await lsfx(`thse/bonus.wav`),
            bonus2: await lsfx(`thse/bonus2.wav`),
            bonus4: await lsfx(`thse/bonus4.wav`),
            boon00: await lsfx(`thse/boon00.wav`),
            boon01: await lsfx(`thse/boon01.wav`),
            cancel00: await lsfx(`thse/cancel00.wav`),
            cardget: await lsfx(`thse/cardget.wav`),
            cat00: await lsfx(`thse/cat00.wav`),
            ch00: await lsfx(`thse/ch00.wav`),
            ch01: await lsfx(`thse/ch01.wav`),
            ch02: await lsfx(`thse/ch02.wav`),
            ch03: await lsfx(`thse/ch03.wav`),
            changeitem: await lsfx(`thse/changeitem.wav`),
            damage00: await lsfx(`thse/damage00.wav`),
            damage01: await lsfx(`thse/damage01.wav`),
            don00: await lsfx(`thse/don00.wav`),
            enep00: await lsfx(`thse/enep00.wav`),
            enep01: await lsfx(`thse/enep01.wav`),
            enep02: await lsfx(`thse/enep02.wav`),
            etbreak: await lsfx(`thse/etbreak.wav`),
            extend: await lsfx(`thse/extend.wav`),
            extend2: await lsfx(`thse/extend2.wav`),
            fault: await lsfx(`thse/fault.wav`),
            graze: await lsfx(`thse/graze.wav`),
            gun00: await lsfx(`thse/gun00.wav`),
            heal: await lsfx(`thse/heal.wav`),
            invalid: await lsfx(`thse/invalid.wav`),
            item00: await lsfx(`thse/item00.wav`),
            item01: await lsfx(`thse/item01.wav`),
            kira00: await lsfx(`thse/kira00.wav`),
            kira01: await lsfx(`thse/kira01.wav`),
            kira02: await lsfx(`thse/kira02.wav`),
            lazer00: await lsfx(`thse/lazer00.wav`),
            lazer01: await lsfx(`thse/lazer01.wav`),
            lazer02: await lsfx(`thse/lazer02.wav`),
            lgods1: await lsfx(`thse/lgods1.wav`),
            lgods2: await lsfx(`thse/lgods2.wav`),
            lgods3: await lsfx(`thse/lgods3.wav`),
            lgods4: await lsfx(`thse/lgods4.wav`),
            lgodsget: await lsfx(`thse/lgodsget.wav`),
            msl: await lsfx(`thse/msl.wav`),
            msl2: await lsfx(`thse/msl2.wav`),
            msl3: await lsfx(`thse/msl3.wav`),
            nep00: await lsfx(`thse/nep00.wav`),
            nodamage: await lsfx(`thse/nodamage.wav`),
            noise: await lsfx(`thse/noise.wav`),
            notice: await lsfx(`thse/notice.wav`),
            ok00: await lsfx(`thse/ok00.wav`),
            pause: await lsfx(`thse/pause.wav`),
            pin00: await lsfx(`thse/pin00.wav`),
            pin01: await lsfx(`thse/pin01.wav`),
            pldead00: await lsfx(`thse/pldead00.wav`),
            pldead01: await lsfx(`thse/pldead01.wav`),
            plst00: await lsfx(`thse/plst00.wav`),
            power0: await lsfx(`thse/power0.wav`),
            power1: await lsfx(`thse/power1.wav`),
            powerup: await lsfx(`thse/powerup.wav`),
            release: await lsfx(`thse/release.wav`),
            select00: await lsfx(`thse/select00.wav`),
            slash: await lsfx(`thse/slash.wav`),
            tan00: await lsfx(`thse/tan00.wav`),
            tan01: await lsfx(`thse/tan01.wav`),
            tan02: await lsfx(`thse/tan02.wav`),
            tan03: await lsfx(`thse/tan03.wav`),
            timeout: await lsfx(`thse/timeout.wav`),
            timeout2: await lsfx(`thse/timeout2.wav`),
            trophy: await lsfx(`thse/trophy.wav`),
            ufo: await lsfx(`thse/ufo.wav`),
            ufoalert: await lsfx(`thse/ufoalert.wav`),
            warpl: await lsfx(`thse/warpl.wav`),
            warpr: await lsfx(`thse/warpr.wav`),
            wolf: await lsfx(`thse/wolf.wav`),
        }
    }
}