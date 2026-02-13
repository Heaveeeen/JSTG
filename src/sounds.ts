import { Destroyable } from "./jstg";


const ctx = new AudioContext();

export interface PlaySoundOptions {
    /** @default 1 */
    volume?: number,
    /** @default true */
    autoStart?: boolean,
}

const globalMusicGain = ctx.createGain();
globalMusicGain.connect(ctx.destination);
const globalSfxGain = ctx.createGain();
globalSfxGain.connect(ctx.destination);

interface PlaySoundPoolItem {
    controller: PlaySoundController | null,
    localGain: GainNode,
}

export interface PlaySoundController extends Destroyable {
    source: AudioBufferSourceNode;
    localGain: GainNode;
}

export async function LoadSound(loadOptions: { src: string, poolSize: number, globalGainType: "music" | "sfx" }) {
    const { src, poolSize, globalGainType } = loadOptions;
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const globalGain = globalGainType === "music" ? globalMusicGain : globalSfxGain
    const sourcePool: PlaySoundPoolItem[] = [];

    for (let i = 0; i < poolSize; i++) {
        // source -> localGain -> globalGain -> destination

        const localGain = ctx.createGain();
        localGain.connect(globalGain);

        sourcePool.push({ controller: null, localGain });
    }

    let nextPoolItemIdx = 0;

    function play(options: PlaySoundOptions = {}) {
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
    poolSize?: number
}

export async function LoadPrefabSounds(options: LoadPrefabSoundsOptions = {}) {
    const base = options.baseUrl ?? "./assets/sounds/";
    const poolSize = options.poolSize ?? 1;
    return {
        thse: {
            big: await LoadSound({ src: `${base}thse/big.wav`, poolSize, globalGainType: "sfx" }),
            bonus: await LoadSound({ src: `${base}thse/bonus.wav`, poolSize, globalGainType: "sfx" }),
            bonus2: await LoadSound({ src: `${base}thse/bonus2.wav`, poolSize, globalGainType: "sfx" }),
            bonus4: await LoadSound({ src: `${base}thse/bonus4.wav`, poolSize, globalGainType: "sfx" }),
            boon00: await LoadSound({ src: `${base}thse/boon00.wav`, poolSize, globalGainType: "sfx" }),
            boon01: await LoadSound({ src: `${base}thse/boon01.wav`, poolSize, globalGainType: "sfx" }),
            cancel00: await LoadSound({ src: `${base}thse/cancel00.wav`, poolSize, globalGainType: "sfx" }),
            cardget: await LoadSound({ src: `${base}thse/cardget.wav`, poolSize, globalGainType: "sfx" }),
            cat00: await LoadSound({ src: `${base}thse/cat00.wav`, poolSize, globalGainType: "sfx" }),
            ch00: await LoadSound({ src: `${base}thse/ch00.wav`, poolSize, globalGainType: "sfx" }),
            ch01: await LoadSound({ src: `${base}thse/ch01.wav`, poolSize, globalGainType: "sfx" }),
            ch02: await LoadSound({ src: `${base}thse/ch02.wav`, poolSize, globalGainType: "sfx" }),
            ch03: await LoadSound({ src: `${base}thse/ch03.wav`, poolSize, globalGainType: "sfx" }),
            changeitem: await LoadSound({ src: `${base}thse/changeitem.wav`, poolSize, globalGainType: "sfx" }),
            damage00: await LoadSound({ src: `${base}thse/damage00.wav`, poolSize, globalGainType: "sfx" }),
            damage01: await LoadSound({ src: `${base}thse/damage01.wav`, poolSize, globalGainType: "sfx" }),
            don00: await LoadSound({ src: `${base}thse/don00.wav`, poolSize, globalGainType: "sfx" }),
            enep00: await LoadSound({ src: `${base}thse/enep00.wav`, poolSize, globalGainType: "sfx" }),
            enep01: await LoadSound({ src: `${base}thse/enep01.wav`, poolSize, globalGainType: "sfx" }),
            enep02: await LoadSound({ src: `${base}thse/enep02.wav`, poolSize, globalGainType: "sfx" }),
            etbreak: await LoadSound({ src: `${base}thse/etbreak.wav`, poolSize, globalGainType: "sfx" }),
            extend: await LoadSound({ src: `${base}thse/extend.wav`, poolSize, globalGainType: "sfx" }),
            extend2: await LoadSound({ src: `${base}thse/extend2.wav`, poolSize, globalGainType: "sfx" }),
            fault: await LoadSound({ src: `${base}thse/fault.wav`, poolSize, globalGainType: "sfx" }),
            graze: await LoadSound({ src: `${base}thse/graze.wav`, poolSize, globalGainType: "sfx" }),
            gun00: await LoadSound({ src: `${base}thse/gun00.wav`, poolSize, globalGainType: "sfx" }),
            heal: await LoadSound({ src: `${base}thse/heal.wav`, poolSize, globalGainType: "sfx" }),
            invalid: await LoadSound({ src: `${base}thse/invalid.wav`, poolSize, globalGainType: "sfx" }),
            item00: await LoadSound({ src: `${base}thse/item00.wav`, poolSize, globalGainType: "sfx" }),
            item01: await LoadSound({ src: `${base}thse/item01.wav`, poolSize, globalGainType: "sfx" }),
            kira00: await LoadSound({ src: `${base}thse/kira00.wav`, poolSize, globalGainType: "sfx" }),
            kira01: await LoadSound({ src: `${base}thse/kira01.wav`, poolSize, globalGainType: "sfx" }),
            kira02: await LoadSound({ src: `${base}thse/kira02.wav`, poolSize, globalGainType: "sfx" }),
            lazer00: await LoadSound({ src: `${base}thse/lazer00.wav`, poolSize, globalGainType: "sfx" }),
            lazer01: await LoadSound({ src: `${base}thse/lazer01.wav`, poolSize, globalGainType: "sfx" }),
            lazer02: await LoadSound({ src: `${base}thse/lazer02.wav`, poolSize, globalGainType: "sfx" }),
            lgods1: await LoadSound({ src: `${base}thse/lgods1.wav`, poolSize, globalGainType: "sfx" }),
            lgods2: await LoadSound({ src: `${base}thse/lgods2.wav`, poolSize, globalGainType: "sfx" }),
            lgods3: await LoadSound({ src: `${base}thse/lgods3.wav`, poolSize, globalGainType: "sfx" }),
            lgods4: await LoadSound({ src: `${base}thse/lgods4.wav`, poolSize, globalGainType: "sfx" }),
            lgodsget: await LoadSound({ src: `${base}thse/lgodsget.wav`, poolSize, globalGainType: "sfx" }),
            msl: await LoadSound({ src: `${base}thse/msl.wav`, poolSize, globalGainType: "sfx" }),
            msl2: await LoadSound({ src: `${base}thse/msl2.wav`, poolSize, globalGainType: "sfx" }),
            msl3: await LoadSound({ src: `${base}thse/msl3.wav`, poolSize, globalGainType: "sfx" }),
            nep00: await LoadSound({ src: `${base}thse/nep00.wav`, poolSize, globalGainType: "sfx" }),
            nodamage: await LoadSound({ src: `${base}thse/nodamage.wav`, poolSize, globalGainType: "sfx" }),
            noise: await LoadSound({ src: `${base}thse/noise.wav`, poolSize, globalGainType: "sfx" }),
            notice: await LoadSound({ src: `${base}thse/notice.wav`, poolSize, globalGainType: "sfx" }),
            ok00: await LoadSound({ src: `${base}thse/ok00.wav`, poolSize, globalGainType: "sfx" }),
            pause: await LoadSound({ src: `${base}thse/pause.wav`, poolSize, globalGainType: "sfx" }),
            pin00: await LoadSound({ src: `${base}thse/pin00.wav`, poolSize, globalGainType: "sfx" }),
            pin01: await LoadSound({ src: `${base}thse/pin01.wav`, poolSize, globalGainType: "sfx" }),
            pldead00: await LoadSound({ src: `${base}thse/pldead00.wav`, poolSize, globalGainType: "sfx" }),
            pldead01: await LoadSound({ src: `${base}thse/pldead01.wav`, poolSize, globalGainType: "sfx" }),
            plst00: await LoadSound({ src: `${base}thse/plst00.wav`, poolSize, globalGainType: "sfx" }),
            power0: await LoadSound({ src: `${base}thse/power0.wav`, poolSize, globalGainType: "sfx" }),
            power1: await LoadSound({ src: `${base}thse/power1.wav`, poolSize, globalGainType: "sfx" }),
            powerup: await LoadSound({ src: `${base}thse/powerup.wav`, poolSize, globalGainType: "sfx" }),
            release: await LoadSound({ src: `${base}thse/release.wav`, poolSize, globalGainType: "sfx" }),
            select00: await LoadSound({ src: `${base}thse/select00.wav`, poolSize, globalGainType: "sfx" }),
            slash: await LoadSound({ src: `${base}thse/slash.wav`, poolSize, globalGainType: "sfx" }),
            tan00: await LoadSound({ src: `${base}thse/tan00.wav`, poolSize, globalGainType: "sfx" }),
            tan01: await LoadSound({ src: `${base}thse/tan01.wav`, poolSize, globalGainType: "sfx" }),
            tan02: await LoadSound({ src: `${base}thse/tan02.wav`, poolSize, globalGainType: "sfx" }),
            tan03: await LoadSound({ src: `${base}thse/tan03.wav`, poolSize, globalGainType: "sfx" }),
            timeout: await LoadSound({ src: `${base}thse/timeout.wav`, poolSize, globalGainType: "sfx" }),
            timeout2: await LoadSound({ src: `${base}thse/timeout2.wav`, poolSize, globalGainType: "sfx" }),
            trophy: await LoadSound({ src: `${base}thse/trophy.wav`, poolSize, globalGainType: "sfx" }),
            ufo: await LoadSound({ src: `${base}thse/ufo.wav`, poolSize, globalGainType: "sfx" }),
            ufoalert: await LoadSound({ src: `${base}thse/ufoalert.wav`, poolSize, globalGainType: "sfx" }),
            warpl: await LoadSound({ src: `${base}thse/warpl.wav`, poolSize, globalGainType: "sfx" }),
            warpr: await LoadSound({ src: `${base}thse/warpr.wav`, poolSize, globalGainType: "sfx" }),
            wolf: await LoadSound({ src: `${base}thse/wolf.wav`, poolSize, globalGainType: "sfx" }),
        }
    }
}