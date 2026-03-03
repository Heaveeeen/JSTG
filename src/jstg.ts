import * as pixi from "pixi";
import { DyedTextures, LoadPixiAsset, LoadPrefabTextures, LoadPrefabTexturesOptions, LoadSvg, PrefabDanmakuNames, DyedTextureColors } from "./textures.js";
import { Key, makeInput } from "./Input.js";
import { makeSimple } from "./player/simple.js";
import { makeRng } from "./random.js";
import * as utils from './utils.js';
import { CommonDanmaku, makePrefabDanmaku } from "./entity/commonDanmaku.js";
import { AbstractEntity, prefabDanmakuHitboxRadius } from "./entity/abstractEntity.js";
import { makeObjPool } from "./objPool.js";
import { LoadPrefabSounds, LoadPrefabSoundsOptions, LoadSound } from "./sounds.js";
import { LaserBeam, makePrefabLaserBeam } from "./entity/laserBeam.js";
import { Player } from "./player/player.js";
import { LoopController, LoopOptions, makeLooper } from "./looper.js";



export interface Destroyable {
    destroy(): unknown;
    readonly destroyed: boolean;
}

export type CoDoGenerator = Generator<void, void, void>;

// TODO: 这堆基于类型推导的东西，类型注释全都会自动展开。等以后架构稳定下来了，要把类型单独声明出来，写成接口或者类。
type ExtractPromiseType<U> = U extends Promise<infer T> ? T : never
export type Game = ExtractPromiseType<ReturnType<typeof LaunchGame>>;
export type Combat = ExtractPromiseType<ReturnType<Game["StartCombat"]>>;

export type Board = Combat["board"];
export type IngameUi = Combat["ingameUi"];

/** @async 启动 JSTG 游戏 */
export async function LaunchGame(/** 不建议填参数，因为我处理得不太完备。想干啥建议直接改源码。 */gameOptions: {
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
    /** @default 60 */
    standardFps?: number,
} = {}) {

    const standardFps = gameOptions.standardFps ?? 60;

    const app = new pixi.Application();

    const stageWidth = gameOptions.stageWidth ?? 640;
    const stageHeight = gameOptions.stageHeight ?? 480;
    /** 宽高比 */
    const stageProportion = stageWidth / stageHeight;

    let rendererResolution = Math.min(globalThis.innerWidth, globalThis.innerHeight * stageProportion) / stageWidth;
    if (gameOptions.onResizeWindow) {
        globalThis.addEventListener("resize", () => gameOptions.onResizeWindow!(app));
    } else {
        let isResizing = false;
        globalThis.addEventListener("resize", () => {
            if (isResizing) { return };
            isResizing = true;
            setTimeout(() => {
                rendererResolution = Math.min(globalThis.innerWidth, globalThis.innerHeight * stageProportion) / stageWidth;
                app.renderer.resize(stageWidth, stageHeight, rendererResolution);
                isResizing = false;
            }, 200);
        });
    }

    await app.init(gameOptions.pixiApplicationOptions ?? {
        backgroundColor: "#000000",
        //preference: "webgl",
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

    const prefabTextures = await LoadPrefabTextures(gameOptions.loadPrefabTexturesOptions ?? { app });

    const prefabSounds = await LoadPrefabSounds(gameOptions.loadPrefabSoundsOptions);

    app.ticker.maxFPS = standardFps;

    //#region game

    const rand = makeRng();

    let timeScale: number = 1;

    const looper = makeLooper({ getTimescale: () => timeScale });

    const { forever, coDo } = looper;

    function* Sleep(
        /** 要等待的时间（帧） */
        timeFrame: number
    ): CoDoGenerator {
        while (timeFrame > 0) {
            timeFrame -= timeScale;
            yield;
        }
    }

    const input = makeInput();
    if (gameOptions.autoUpdateInput ?? true) { forever(() => input._update(), { order: 0 }); }

    //#region combat

    /** ⚠️不要使用此函数的返回值 */
    async function StartCombat() {

        //#region board
        const board = await (async () => {
            const root = new pixi.Sprite({
                parent: app.stage,
                x: (240 - 70) * stageWidth / 480, // (sc舞台半宽 - CameraX) * jstg相比sc的放大倍数
                y: stageHeight / 2,
            });

            const commonDanmakuLayer = new pixi.Sprite({
                parent: root,
                zIndex: 0, // 在 -100 到 100 中间
            });

            const danmakuEraseLayer = new pixi.Sprite({
                parent: root,
                zIndex: -10,
            });

            // 弹幕引擎的场地尺寸是 150 * 180，这里放大到了 4/3 倍
            let width = 200;
            let height = 240;

            return {
                /** 根节点 */
                root,
                /** 装有所有普通弹幕节点的根节点 */
                commonDanmakuLayer,
                /** 装有所有消弹特效的根节点 */
                danmakuEraseLayer,
                /** 场地宽度的一半 */
                get width() { return width; },
                // set width(n: number) { width = n; },
                /** 场地高度的一半 */
                get height() { return height; },
                // set height(n: number) { height = n; },
                // MAY TODO: 改变场地尺寸
                destroy() {
                    root.destroy();
                    commonDanmakuLayer.destroy();
                    danmakuEraseLayer.destroy();
                },
                get destroyed() { return root.destroyed },
            };
        })();
        //#endregion board

        //#region ingameUi
        const ingameUi = (() => {
            const ingameUiRoot = new pixi.Sprite({
                parent: app.stage,
                zIndex: 0,
            });
            const windowFrame = new pixi.Sprite({
                parent: ingameUiRoot, texture: prefabTextures.ingameUi.window,
            });

            const playerStateBar = (()=>{
                const { hpFull: hpFull, hpEmpty: hpEmpty, bombFull: bombFull, bombEmpty: bombEmpty } = prefabTextures.ingameUi.plStateBarIcon;
                const stateBarRoot = new pixi.Sprite({
                    parent: ingameUiRoot, texture: prefabTextures.ingameUi.plStateBarFrame.spdeCommon,
                    anchor: 0.5,
                    scale: 4/3,
                    x: stageWidth / 2 + 160 * 4/3, y: stageHeight / 2 - 70 * 4/3,
                });
                const hearts: pixi.Sprite[] = [];
                const stars: pixi.Sprite[] = [];
                // 若希望资源上限超过 8 个，请修改此处
                const iconAmount = 8;
                for (let i = 0; i < iconAmount; i++) {
                    const x = i * 15 - 47;
                    hearts.push(new pixi.Sprite({ parent: stateBarRoot, anchor: 0.5, x, y: -30, texture: hpFull }));
                    stars.push(new pixi.Sprite({ parent: stateBarRoot, anchor: 0.5, x, y: 10, texture: bombFull }));
                }
                let loop: LoopController | null = null;
                function updateWithPlayer(player: Player) {
                    loop?.destroy();
                    loop = game.forever(()=>{
                        for (let i = 0; i < iconAmount; i++) {
                            if (i < player.maxHpAmount) {
                                hearts[i].visible = true;
                                hearts[i].texture = i < player.hpAmount ? hpFull : hpEmpty;
                                //hearts[i].alpha = i < player.hpAmount ? 1 : 0.25;
                            } else { hearts[i].visible = false; }
                            if (i < player.maxBombAmount) {
                                stars[i].visible = true;
                                stars[i].texture = i < player.bombAmount ? bombFull : bombEmpty;
                                //stars[i].alpha = i < player.hpAmount ? 1 : 0.25;
                            } else { stars[i].visible = false; }
                        }
                    }, { refs: [combat, player] });
                }
                return {
                    root: stateBarRoot,
                    hearts, stars,
                    updateWithPlayer,
                }
            })();

            return {
                /** 根节点 */
                root: ingameUiRoot,
                /** 游戏内 UI 的那个像窗口框架的大背景 */
                windowFrame,
                /** 显示残机和 Bomb 数量的那个状态栏 */
                playerStateBar,
                destroy() { ingameUiRoot.destroy(); },
                get destroyed() { return ingameUiRoot.destroyed; },
            }
        })();
        //#endregion

        //#region danmakuPool
        const danmakuPool = (() => {
            const pool = makeObjPool<AbstractEntity>();
            const { objects: danmakus, push, clean, forEachAlive, _validCount, destroy } = pool;

            const update = (player: Player) => {
                if (player.state.type === "common") {
                    for (let i = 0; i < danmakus.length; i++) {
                        if (!danmakus[i].destroyed) { danmakus[i].update(player); }
                    }
                }
                player._lastX = player.x;
                player._lastY = player.y;
            };

            const eraseByRadius = (options: { x: number, y: number, radius: number }) => {
                const { x, y, radius } = options;
                forEachAlive(dan => {
                    if (dan instanceof CommonDanmaku) {
                        if ((dan.x - x) ** 2 + (dan.y - y) ** 2 <= (dan.hitboxRadius + radius) ** 2) { dan.erase(); }
                    } else {// TODO: if (dan instanceof LaserBeam) {
                        if ((dan.x - x) ** 2 + (dan.y - y) ** 2 <= (4 + radius) ** 2) { dan.erase(); }
                    }
                });
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
                /** 遍历所有未被摧毁的弹幕，可以用来消弹 */
                forEachAlive,
                /** 消除一个圆形范围内的所有弹幕 */
                eraseByRadius,
                /** @readonly @internal 当前场上的弹幕数量（⚠️包含无效弹幕） */
                get _validCount() { return _validCount; },
                destroy,
                get destroyed() { return pool.destroyed; },
            };
        })();
        //#endregion danmakuPool

        const players: Player[] = [];

        const combat = {
            /** @readonly  游戏内 UI ，版面上盖着的那一层 UI ，包括血条啥的以及那个像窗口框架的东西 */
            ingameUi,
            /** @readonly 版面，就是自机和弹幕所处的那个主要场地 */
            board,
            /**
             * @readonly
             * 弹幕池，可以利用这个东西来每帧更新所有弹幕，这样弹幕才能攻击玩家。  
             * 正常情况下不用管这个东西，因为自机会自动帮你调用它的 update 方法。  
             * 也可以用这个来遍历所有弹幕。  
             */
            danmakuPool,
            /** @readonly JSTG 预置的自机 */
            makePrefabPlayer: null as unknown as typeof makePrefabPlayer, // 奇技淫巧
            /** 创建一个 JSTG 预置的弹幕 */
            makeDanmaku: null as unknown as typeof makeDanmaku, // 又是奇技淫巧
            /** TODO: DOC makeLaserBeam */
            makeLaserBeam: null as unknown as typeof makeLaserBeam, // 又是奇技淫巧
            destroy() {
                ingameUi.destroy();
                board.destroy();
                danmakuPool.destroy();
                for (const pl of players) { pl.destroy(); }
            },
            get destroyed() { return board.destroyed; },
        };

        const makePrefabPlayer = (()=>{
            const makePlayer = (player: Player) => {
                players.push(player);
                ingameUi.playerStateBar.updateWithPlayer(player);
                return player;
            }

            const simple = async (options: {
                /** @default true */
                autoUpdateDanmakuPool?: boolean,
                /** @default true */
                autoUpdateSelf?: boolean,
            } = {}) => makePlayer(await makeSimple({
                game, combat, board,
                autoUpdateDanmakuPool: options.autoUpdateDanmakuPool ?? null,
                autoUpdateSelf: options.autoUpdateSelf ?? null,
            }));

            /* TODO: simple.homingOnly ...
             * maple, icu
             * reimu, marisa, sanae
             */
            return {
                /** 创建预置自机：Simple */
                simple,
            }
        })();
        combat.makePrefabPlayer = makePrefabPlayer;

        type MakeDanmakuOptions = {
            type: PrefabDanmakuNames,
            /** @default red */
            color?: DyedTextureColors,
            /** @default game.commonDanmakuLayer */
            parent?: pixi.Container,
            /** @default 0 */
            x?: number,
            /** @default 0 */
            y?: number,
            /** @default 0 */
            rotation?: number,
            /** 该弹幕的判定半径，默认值请参考 prefabDanmakuHitboxRadius 。 */
            radius?: number,
            /** 图层顺序。若不填此参数，则自动根据弹幕尺寸排序，大的在底层、小的在顶层。 */
            zIndex?: number,
            /** @default true */
            canBeErase?: boolean,
        };

        function makeDanmaku(type: PrefabDanmakuNames, /** @default "red" */color?: DyedTextureColors): CommonDanmaku;
        function makeDanmaku(options: MakeDanmakuOptions): CommonDanmaku;
        function makeDanmaku(options: PrefabDanmakuNames | MakeDanmakuOptions, color?: DyedTextureColors) {
            if (typeof options === "string") {
                options = { type: options, color };
            };
            return makePrefabDanmaku({
                game, combat, board: board,
                type: options.type, color: options.color ?? "red", parent: options.parent ?? null,
                x: options.x ?? 0, y: options.y ?? 0, rotation: options.rotation ?? 0,
                radius: options.radius ?? null,
                zIndex: options.zIndex ?? null,
                canBeErase: options.canBeErase ?? null
            });
        }
        combat.makeDanmaku = makeDanmaku;

        type MakeLaserBeamOptions = {
            /** @default "laserseg" */
            type?: PrefabDanmakuNames,
            /** @default red */
            color?: DyedTextureColors,
            /** @default 0 */
            x?: number, 
            /** @default 0 */
            y?: number, 
            /** @default 0 */
            rotation?: number
            /** @default game.commonDanmakuLayer */
            parent?: pixi.Container,
            /** @default 2 */
            width?: number,
            /** @default 400 */
            length?: number,
            /**
             * 如果不填写此参数，则激光没有起始端点。
             * 若填写 startPoint: {} ，则默认为：
             * @default{ type: "nova", pos: 0 }
             */
            startPoint?: { type?: PrefabDanmakuNames, pos?: number, },
            /**
             * 如果不填写此参数，则激光没有末尾端点。
             * 若填写 endPoint: {} ，则默认为：
             * @default{ type: "nova", pos: 1 }
             */
            endPoint?: { type?: PrefabDanmakuNames, pos?: number, },
            /** 图层顺序。若不填此参数，则自动根据弹幕尺寸排序，大的在底层、小的在顶层。 */
            zIndex?: number,
            /** @default true */
            canBeErase?: boolean,
        };

        function makeLaserBeam(type?: PrefabDanmakuNames, /** @default "red" */color?: DyedTextureColors): LaserBeam;
        function makeLaserBeam(options: MakeLaserBeamOptions): LaserBeam;
        function makeLaserBeam(options?: PrefabDanmakuNames | MakeLaserBeamOptions, color?: DyedTextureColors) {
            if (options === undefined || typeof options === "string") {
                options = { type: options, color };
            };
            return makePrefabLaserBeam({
                game, combat, board, type: options.type ?? "laserseg", color: options.color ?? "red",
                x: options.x ?? 0, y: options.y ?? 0, rotation: options.rotation ?? 0,
                parent: options.parent ?? null,
                halfWidth: options.width ?? 2, length: options.length ?? 400,
                startPoint: options.startPoint ?? null, endPoint: options.endPoint ?? null,
                zIndex: options.zIndex ?? null,
                canBeErase: options.canBeErase ?? null,
            });
        }
        combat.makeLaserBeam = makeLaserBeam;

        return combat;
    }

    //#endregion combat

    // 粗测帧率
    const fpsMonitor = new pixi.Text({
        parent: app.stage,
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
        zIndex: 100,
    });
    let fps = standardFps;
    let timeRecords: number[] = [];
    const fpsCounterLoop = forever(() => {
        const now = performance.now();
        timeRecords.push(now);
        if (timeRecords.length > 10) {
            fps = Math.round(1000000 / (now - (timeRecords.shift() as number))) / 100;
        }
        fpsMonitor.text = `FPS:${fps}`;
    }, { order: 0 });

    app.ticker.add(() => {
        looper.stepThreads();
        // 跳帧补偿
        if (app.ticker.deltaMS > 1.5 * 16.66 && fps < 63) {
            looper.stepThreads();
        }
    });

    const debug = (()=>{
        const godMode = {
            isOn: false,
            dieCount: 0,
        };

        let showHitbox = {
            isOn: false,
            isShowDanmakuBoth: true,
            // TODO: isContainsPlayerRadius
        };

        return {
            godMode,
            showHitbox,
        };
    })();

    const game = {
        /**
         * @readonly
         * pixi.Application 实例
         */
        app,
        /** TODO: DOC StartCombat */
        StartCombat,
        /** fps 指示器 */
        fpsMonitor,
        /** @readonly 游戏的标准帧率 */
        standardFps,
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
        /** 调试模式工具，如上帝模式 */
        debug,
        /**
         * @readonly
         * 从游戏启动后过了多少帧。第一帧为0。  
         * 会考虑 timeScale，并且尽可能根据 timeScale 向下取整。（取整机制与弹幕引擎略有不同，我感觉我写的这个应该稍微好点）
         */
        get clock() {
            return fpsCounterLoop.clock;
        },
    };

    //#endregion game

    return game;

};

export {
    LoadPixiAsset,
    LoadSvg,
    LoadSound,
    Key,
    Player,
    makeRng,
    utils,
    prefabDanmakuHitboxRadius
}
