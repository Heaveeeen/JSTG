import * as pixi from "pixi";
import { LoadAsset, LoadPrefabSounds, LoadPrefabSoundsOptions, LoadPrefabTextures, LoadPrefabTexturesOptions, LoadSvg, loadSvgDefaultResolution, PrefabDanmakuNames } from "./assets.js";
import { Key, makeInput } from "./Input.js";
import { MakePlayerOptions, Player } from "./player/player.js";
import { makeSimple } from "./player/simple.js";
import { makeRng } from "./random.js";
import * as utils from './utils.js';
import { Danmaku, makePrefabDanmaku } from "./danmaku.js";
import { makeObjPool } from "./objPool.js";

/**
 * 循环的控制器对象，用于控制该循环
 * @example
 * loop.stop(); // 从下一帧开始，停止该循环
 */
export interface LoopController {
    /** 从下一帧起，停止该循环 */
    stop(): void,
    /**
     * @readonly
     * 该循环进行到了第几帧。  
     * 会考虑 timeScale，并且尽可能根据 timeScale 向下取整。（取整机制与弹幕引擎略有不同，我感觉我写的这个应该稍微好点）
     */
    get clock(): number,
    // TODO: then(): void,
}

export interface Destroyable {
    destroy(): any;
    get destroyed(): boolean;
}

interface LoopOptions {
    /**
     * 执行优先级，每帧都会先执行优先级较大的脚本
     * @default 0
     */
    priority?: number,
    /** 借用，或者说依赖的对象，这些对象只要死了任意一个，该脚本就会停止。 */
    refs?: Destroyable | Destroyable[],
    /** 该脚本停止时，自动摧毁这些对象。 */
    kills?: Destroyable | Destroyable[],
    /**
     * 绑定所有权的对象。  
     * 这些对象只要死了任意一个，该脚本就会停止；  
     * 该脚本停止时，自动摧毁这些对象。
     */
    owns?: Destroyable | Destroyable[],
}

export type CoDoGenerator = Generator<void, void, void>;

type ExtractPromiseType<U> = U extends Promise<infer T> ? T : never
export type Game = ExtractPromiseType<ReturnType<typeof LaunchGame>>;

export type Board = Game["board"];
export type IngameUI = Game["ingameUI"];

/** @async 启动 JSTG 游戏 */
export async function LaunchGame(/** 不建议填参数，想干啥自己去改源码吧 */options: {
    /** @default 640 */
    stageWidth?: number,
    /** @default 480 */
    stageHeight?: number,
    /**
     * 此值为假时，不会自动调用 input.update()  
     * 默认的优先级是 30000
     * @default true
     */
    autoUpdateInput?: boolean,
    pixiApplicationOptions?: Partial<pixi.ApplicationOptions>,
    onResizeWindow?: (app: pixi.Application) => any,
    loadPrefabTexturesOptions?: LoadPrefabTexturesOptions,
    loadPrefabSoundsOptions?: LoadPrefabSoundsOptions,
} = {}) {

    const app = new pixi.Application();

    const stageWidth = options.stageWidth ?? 640;
    const stageHeight = options.stageHeight ?? 480;
    /** 宽高比 */
    const stageProportion = stageWidth / stageHeight;

    let rendererResolution = Math.min(globalThis.innerWidth, globalThis.innerHeight * stageProportion) / stageWidth;
    if (options.onResizeWindow) {
        globalThis.addEventListener("resize", () => options.onResizeWindow!(app));
    } else {
        let isResizing = false;
        globalThis.addEventListener("resize", () => {
            if (isResizing) return;
            isResizing = true;
            setTimeout(() => {
                rendererResolution = Math.min(globalThis.innerWidth, globalThis.innerHeight * stageProportion) / stageWidth;
                app.renderer.resize(stageWidth, stageHeight, rendererResolution);
                isResizing = false;
            }, 200);
        });
    }

    await app.init(options.pixiApplicationOptions ?? {
        backgroundColor: "#000000",
        preference: "webgpu",
        useBackBuffer: true,
        hello: true,
    });
    // 重设画面尺寸，填充整个窗口
    app.renderer.resize(stageWidth, stageHeight, rendererResolution);
    //app.renderer.resize(stageWidth, stageHeight, 1);
    app.canvas.style.display = "flex";
    document.body.appendChild(app.canvas);


    await pixi.Assets.init({
        texturePreference: {
            resolution: globalThis.devicePixelRatio,
            format: ["avif", "webp", "png", "jpg", "jpeg"],
        },
    });

    app.ticker.maxFPS = 60;

    //#region game

    const rand = makeRng();

    let timeScale: number = 1;

    function forever(
        /** 要循环执行的回调函数 */
        fn: (loop: LoopController) => any,
        options: LoopOptions = {}
    ): LoopController {
        const owns = utils.makeElements(options.owns);

        const refs = [...new Set([...utils.makeElements(options.refs), ...owns])];
        const kills = [...new Set([...utils.makeElements(options.kills), ...owns])];

        let clock = 0;
        const loop: LoopController = {
            stop,
            get clock() { return clock },
        };
        const tickerFn = () => {
            if (refs.some(r => r.destroyed)) {
                stop();
            } else {
                fn(loop);
                if (clock % timeScale > 0) {
                    clock = Math.floor(clock / timeScale)
                }
                clock += timeScale;
            }
        };
        function stop() {
            app.ticker.remove(tickerFn);
            kills.forEach(d => d.destroy());
        }
        app.ticker.add(tickerFn, undefined, options.priority);
        return loop;
    };

    function coDo(
        /**
         * 要执行的生成器函数  
         * 注意：应为生成器函数，而非生成器实例！
         * @example
         * // 现场构造一个生成器函数
         * function*(loop) {
         *     // 干啥干啥
         *     loop.stop();
         *     return; // return 和 loop.stop() 都能停止该协程
         * }
         */
        generatorFn: (loop: LoopController) => CoDoGenerator,
        options: LoopOptions = {}
    ): LoopController {
        const loop = forever(loop => {
            const result = generator.next();
            if (result.done) {
                loop.stop();
            }
        }, options);
        const generator = generatorFn(loop);
        return loop;
    }

    const input = makeInput();
    if (options.autoUpdateInput ?? true) { forever(() => input._update(), { priority: 30000 }); }

    const danmakuPool = (() => {
        const { objects: danmakus, push, clean, _validCount } = makeObjPool<Danmaku>();

        const update = (player: Player) => {
            for (let i = 0; i < danmakus.length; i++) {
                if (!danmakus[i].destroyed) danmakus[i].updateDamageToPlayer(player);
            }
        };

        return {
            /** @readonly 所有接受判定的弹幕，⚠️可能含有已经摧毁的无效弹幕 */
            danmakus,
            /** 推入并开始更新一个弹幕，此函数会在合适的时机自动触发清理 */
            push,
            /** 更新所有弹幕的攻击逻辑 */
            update,
            /** 立即清理弹幕列表，一般不用管这个东西 */
            clean,
            /** @readonly @internal 当前场上的弹幕数量（⚠️包含无效弹幕） */
            get _validCount() { return _validCount; },
        };
    })();

    function* Sleep(
        /** 要等待的时间（帧） */
        timeFrame: number
    ): CoDoGenerator {
        while (timeFrame > 0) {
            timeFrame -= timeScale;
            yield;
        }
    }

    const prefabTextures = await LoadPrefabTextures(options.loadPrefabTexturesOptions);

    const prefabSounds = await LoadPrefabSounds(options.loadPrefabSoundsOptions);

    const mainBoard = await (async () => {
        const root = new pixi.Sprite({
            parent: app.stage,
            x: (240 - 70) * stageWidth / 480, // (sc舞台半宽 - CameraX) * jstg相比sc的放大倍数
            y: stageHeight / 2,
        });

        const commonDanmakuSprites = new pixi.Sprite({
            parent: root,
            zIndex: 0, // 在 -100 到 100 中间
        });

        const danmakuEraseSprites = new pixi.Sprite({
            parent: root,
            zIndex: -10,
        });

        let width = 200;
        let height = 240;

        const isInBoundary = (x: number, y: number) => Math.abs(x) <= width && Math.abs(y) <= height;
        const isDanmakuInBoundary = (danmaku: Danmaku) =>
            Math.abs(danmaku.x) <= width + 5 + danmaku.hitboxRadius * 1.5 &&
            Math.abs(danmaku.y) <= height + 5 + danmaku.hitboxRadius * 1.5

        return {
            /** 根节点 */
            root,
            /** 装有所有普通弹幕节点的根节点 */
            commonDanmakuSprites,
            /** 装有所有消弹特效的根节点 */
            danmakuEraseSprites,
            /** 场地宽度的一半 */
            get width() { return width; },
            set width(n: number) { width = n; },
            /** 场地高度的一半 */
            get height() { return height; },
            set height(n: number) { height = n; },
            /** 检查一个点是否在版面内 */
            isInBoundary,
            /** 检查一个弹幕是否在版面内 */
            isDanmakuInBoundary,
        };
    })();

    type Board = typeof mainBoard;

    const ingameUI = (() => {
        const root = new pixi.Sprite({parent: app.stage});
        const windowFrame = new pixi.Sprite({
            parent: root, texture: prefabTextures.ingameUI.window
        });

        const fpsMonitor = new pixi.Text({
            parent: root,
            text: `FPS:-`,
            x: 572, y: 458,
            anchor: 0,
            style: {
                fontSize: 12,
                fill: "#000000",
                align: "left",
                stroke: {
                    color: "#4d4d4d",
                    width: 3,
                    join: "round",
                }
            },
        });

        return {
            /** 根节点 */
            root,
            /** 游戏内 UI 的那个像窗口框架的大背景 */
            windowFrame,
            /** fps 指示器 */
            fpsMonitor,
        }
    })();

    // 粗测帧率
    let fps = 60;
    let timeRecords: number[] = [];
    forever(() => {
        const now = performance.now();
        timeRecords.push(now);
        if (timeRecords.length > 10) {
            fps = Math.round(1000000 / (now - (timeRecords.shift() as number))) / 100;
        }
        ingameUI.fpsMonitor.text = `FPS:${fps}`;
    }, { priority: 1e9 });

    let frameCompCount = 0;
    // 跳帧补偿
    forever(() => {
        if (app.ticker.deltaMS > (frameCompCount + 1.5) * 16.66 && fps < 63) {
            frameCompCount ++;
            const rawfps = app.ticker.maxFPS;
            app.ticker.maxFPS = 0;
            app.ticker.update();
            app.ticker.maxFPS = rawfps;
        } else {
            frameCompCount = 0;
        }
    }, { priority: -2e9 });

    const debug = (()=>{
        const godMode = {
            isOn: false,
            dieCount: 0,
        };

        return {
            godMode,
        }
    })();

    const game = {
        /**
         * @readonly
         * pixi.Application 实例
         */
        app,
        /**
         * @readonly
         * 游戏内 UI ，版面上盖着的那一层 UI ，包括血条啥的以及那个像窗口框架的东西
         */
        ingameUI,
        /**
         * @readonly
         * 版面，就是自机和弹幕所处的那个主要场地
         */
        board: mainBoard,
        /**
         * @readonly
         * 每帧执行一次给定的回调函数。  
         * @example
         * let t = 0;
         * forever(loop => {
         *     myDanmaku.move(2);
         *     myDanmaku.boundaryDelete();
         *     t++;
         *     if (t >= 200) {
         *         loop.stop();
         *         myDanmaku.die();
         *     }
         * });
         */
        forever,
        /**
         * @readonly
         * 启动一个生成器函数，可以简单理解为启动一个协程，可以编写 Scratch 风格的代码
         * @example 
         * coDo(function*() {
         *     console.log("准备……"); // 这行代码立刻执行
         *     yield* Sleep(60); // 这行代码让该脚本暂停 1 秒（60帧）
         *     console.log("计时开始"); // 然后，执行这行代码
         *     for (let t = 120; t >= 0; t--) {
         *         console.log(t); // 输出 t 的值
         *         yield; // 这行代码让脚本暂停并等待下一帧
         *     }
         *     console.log("结束"); // 上述循环总共执行了 120 帧之后，才会执行这行代码
         * });
         */
        coDo,
        /**
         * @readonly
         * 用来获取用户输入，例如检测键盘上的某个键是否按下  
         * 按键名称为实体建码，即 HTML 按键事件的 code 属性
         * @see {@link [MDN KeyboardEvent.code](https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent/code)}
         * @example
         * if (input.isHold(JSTG.Key.ArrowUp)) {
         *     // 如果现在正在按着上方向键，干啥干啥
         * }
         * if (input.isDown(JSTG.Key.KeyX)) {
         *     // 如果现在是刚按下 X 键的那一帧，干啥干啥
         * }
         * if (input.isIdle(JSTG.Key.ShiftLeft)) {
         *     // 如果现在没按左 Shift，干啥干啥
         * }
         * // 可以引用 JSTG.Key ，如果愿意的话也可以直接写字符串字面量（不推荐）
         */
        input,
        /** 游戏的时间流速，可以用来做慢镜头啥的 */
        get timeScale() { return timeScale; },
        set timeScale(v: number) { timeScale = v; },
        /** 每秒帧数的估算值 */
        get fps() { return fps; },
        /** @readonly @generator 等待 timeFrame 帧 */
        Sleep,
        /**
         * @readonly
         * JSTG 预置的自机
         * @example
         * // 简单的例子
         * const player = game.prefabPlayers.makeSimple();
         * 
         * // 一个手动更新以设置键位的例子
         * const player = game.prefabPlayers.makeSimple({ autoUpdateSelf: false });
         * game.forever(loop => {
         *     player.update({
         *         highSpeed: 5, slowSpeed: 2,
         *         keyMap: {
         *             up: Key.KeyW,
         *             down: Key.KeyS,
         *             left: Key.KeyA,
         *             right: Key.KeyD,
         *         },
         *     });
         * });
         */
        prefabPlayers: null as unknown as typeof prefabPlayers, // 奇技淫巧
        /** 
         * 创建一个 JSTG 预置的弹幕  
         * @example
         * const myPlayer = game.prefabPlayers.makeSimple();
         * const myDanmaku = game.makeDanmaku("smallball");
         * myDanmaku.x = 0;
         * myDanmaku.y = 0;
         * game.forever(loop => {
         *     myPlayer.update();
         *     myDanmaku.move(2);
         *     myDanmaku.boundaryDelete();
         *     game.danmakuPool.update(myPlayer);
         * }, { with: myDanmaku, rely: myPlayer });
         */
        makeDanmaku: null as unknown as typeof makeDanmaku, // 又是奇技淫巧
        /** JSTG 预置的一些贴图 */
        prefabTextures,
        /** JSTG 预置的一些音效，部分音效解包自东方原作 */
        prefabSounds,
        /**
         * 一个随机数发生器，你可以用它来生成随机数
         * @example
         * game.rand.int(0, 10); // 生成一个 [0, 10) 之间的随机整数
         * game.rand.float(5, 8); // 生成一个 [5, 8) 之间的随机浮点数
         * game.rand.maybe(0.3); // 有 30% 的概率返回 true
         * game.rand.select(
         *     [1, "smallball"],
         *     [3, "ringball"],
         *     [6, "glowball"],
         * ); // 根据权重，随机返回一个弹幕类型
         */
        rand,
        /**
         * @readonly
         * 弹幕管理器，可以利用这个东西来每帧更新所有弹幕，这样弹幕才能攻击玩家  
         * 正常情况下不用管这个东西，因为自机会自动帮你调用它的 update 方法
         */
        danmakuPool,
        /** 调试模式工具，如上帝模式 */
        debug,
    };

    const prefabPlayers = {// TODO: 重命名为 make 开头的风格
        /** @async 创建预置自机：Simple */
        makeSimple: (options: MakePlayerOptions = {}) => makeSimple(game, mainBoard, prefabTextures, options),
    };
    game.prefabPlayers = prefabPlayers;

    type MakeDanmakuOptions<T = PrefabDanmakuNames> = {
        type: T,
        /** @default game.commonDanmakuSprites */
        parent?: pixi.Container,
        /** @default 1 */
        scale?: number,
    };

    function makeDanmaku(type: PrefabDanmakuNames): Danmaku
    function makeDanmaku(options: MakeDanmakuOptions): Danmaku
    function makeDanmaku(type: string): unknown
    function makeDanmaku(options: MakeDanmakuOptions<string>): unknown
    function makeDanmaku(options: PrefabDanmakuNames | MakeDanmakuOptions | string | MakeDanmakuOptions<string>) {
        if (typeof options === "string") {
            options = { type: options }
        };
        // @ts-expect-error 这里如果输入 string 会引发未定义行为，忽略错误
        return makePrefabDanmaku(game, mainBoard, options.type, options.parent, options.scale);
    }

    game.makeDanmaku = makeDanmaku;

    //#endregion

    return game;

};

export {
    LoadAsset,
    LoadSvg,
    loadSvgDefaultResolution,
    //LoadPrefabTextures,
    Key,
    Player,
    makeRng,
    utils,
}
