import * as pixi from "pixi";
import { LoadAsset, LoadPrefabTextures, LoadPrefabTexturesOptions, LoadSvg, loadSvgDefaultResolution } from "./assets.js";
import { Key, makeInput } from "./Input.js";
import { Player } from "./player/player.js";
import { makeSimple } from "./player/simple.js";
import { makeRng } from "./random.js";
import * as utils from './utils.js';

/**
 * 循环的控制器对象，用于控制该循环
 * @example
 * loop.stop(); // 从下一帧开始，停止该循环
 */
export interface LoopController {
    /** 从下一帧起，停止该循环 */
    stop(): void,
}

export type CoDoGenerator = Generator<void, void, LoopController>;

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
    });
    // 重设画面尺寸，填充整个窗口
    app.renderer.resize(stageWidth, stageHeight, rendererResolution);
    //app.renderer.resize(stageWidth, stageHeight, 1);
    pixi.sayHello(app.renderer.name); // 仪式感这块，别的我不知道但我就知道在控制台输出这么一条五彩斑斓的信息实在太酷了
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

    const rng = makeRng();

    let timeScale: number = 1;

    function forever(
        /** 要循环执行的回调函数 */
        fn: (loop: LoopController) => any,
        /** 执行优先级，每帧都会先执行优先级较大的脚本 */
        priority: number = 0
    ): LoopController {
        const loop: LoopController = {
            stop,
        };
        const tickerFn = () => fn(loop);
        function stop() {
            app.ticker.remove(tickerFn);
        }
        app.ticker.add(tickerFn, undefined, priority);
        return loop;
    };

    function coDo(
        /**
         * 要执行的生成器实例  
         * 注意：应为生成器实例，而非生成器函数！
         * @example
         * // 通过自调用的方式构造生成器
         * (function*() {
         *     // 干啥干啥
         * })()
         */
        generator: CoDoGenerator,
        /** 执行优先级，每帧都会先执行优先级较大的脚本 */
        priority: number = 0
    ): LoopController {
        return forever(loop => {
            const result = generator.next();
            if (result.done) {
                loop.stop();
            }
        });
    }

    const input = makeInput();
    if (options.autoUpdateInput ?? true) { forever(() => input._update(), 30000); }

    function* Sleep(
        /** 要等待的时间（帧） */
        timeFrame: number
    ): CoDoGenerator {
        while (timeFrame > 0) {
            timeFrame -= timeScale;
            yield;
        }
    }

    const destroyOption = { children: true };

    /** @deprecated */
    class Entity {
        readonly sprites: pixi.ContainerChild[] = [];
        readonly loops: LoopController[] = [];
        constructor (
            /** 
             * @readonly
             * 与该Entity生命周期所绑定的对象，通常是一个 pixi.Sprite  
             * 应当把该绘图对象的所有权完全移交给该 Entity
             */
            ...sprites: pixi.ContainerChild[]
        ) {
            this.bindLife(...sprites);
        }

        /** 把一批对象的生命周期绑定到该实体上 */
        bindLife(...sprites: pixi.ContainerChild[]) {
            this.sprites.push(...sprites);
            app.stage.addChild(...sprites);
            return this;
        }

        /** 销毁该实体
         * @alias die */
        destroy() {
            app.stage.removeChild(...this.sprites);
            this.sprites.forEach(sprite => sprite.destroy(destroyOption));
            this.loops.forEach(loop => loop.stop());
        }

        /** 销毁该实体
         * @alias destroy */
        die() {
            this.destroy();
        }

        /**
         * 每帧执行一次给定的回调函数，在该实体死亡后自动停止回调函数。  
         * @example
         * let t = 0;
         * myDammaku.forever(loop => {
         *     myDanmaku.step(2);
         *     myDanmaku.boundaryDelete();
         *     t++;
         *     if (t >= 200) {
         *         myDanmaku.die(); // 自动停止该函数
         *     }
         * });
         */
        forever(
            /** 要循环执行的回调函数 */
            fn: (loop: LoopController) => any,
            /** 执行优先级，每帧都会先执行优先级较大的脚本 */
            priority: number = 0
        ): LoopController {
            const loop = forever(fn, priority);
            this.loops.push(loop);
            return loop;
        };

        /**
         * 启动一个生成器函数，可以简单理解为启动一个协程，可以编写 Scratch 风格的代码，会在实体死亡时自动停止运行  
         * @example 
         * myPerson.coDo(function*() {
         *     console.log("准备……"); // 这行代码立刻执行
         *     yield* Sleep(60); // 这行代码让该脚本暂停 1 秒（60帧）
         *     myPerson.die();
         *     yield;
         *     // 这后面的代码不会执行
         *     console.log("计时开始"); // 然后，执行这行代码
         *     for (let t = 120; t >= 0; t--) {
         *         console.log(t); // 输出 t 的值
         *         yield; // 这行代码让脚本暂停并等待下一帧
         *     }
         *     console.log("结束"); // 上述循环总共执行了 120 帧之后，才会执行这行代码
         * });
         */
        coDo(
            /**
             * 要执行的生成器实例  
             * 注意：应为生成器实例，而非生成器函数！
             * @example
             * // 通过自调用的方式构造生成器
             * (function*() {
             *     // 干啥干啥
             * })()
             */
            generator: CoDoGenerator,
            /** 执行优先级，每帧都会先执行优先级较大的脚本 */
            priority: number = 0
        ): LoopController {
            const loop = coDo(generator, priority);
            this.loops.push(loop);
            return loop;
        }
    }

    const prefabTextures = await LoadPrefabTextures(options.loadPrefabTexturesOptions);

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

        return {
            /** 根节点 */
            root,
            /** 装有所有普通弹幕节点的根节点 */
            commonDanmakuSprites,
            /** 装有所有消弹特效的根节点 */
            danmakuEraseSprites,
            /** 场地宽度的一半 */
            width: 200,
            /** 场地高度的一半 */
            height: 240,
        }
    })();

    type Board = typeof mainBoard;

    const ingameUI = (async () => {
        const root = new pixi.Sprite({parent: app.stage});
        const windowFrame = new pixi.Sprite({
            parent: root, texture: prefabTextures.ingameUI.window
        });
        return {
            /** 根节点 */
            root,
            /** 游戏内 UI 的那个像窗口框架的大背景 */
            windowFrame,
        }
    })();

    const prefabPlayers = {
        /** @async 创建预置自机：Simple */
        makeSimple: (board = mainBoard) => makeSimple(board, prefabTextures),
    };

    //#endregion

    return {
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
         *     myDanmaku.step(2);
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
         * coDo((function*() {
         *     console.log("准备……"); // 这行代码立刻执行
         *     yield* Sleep(60); // 这行代码让该脚本暂停 1 秒（60帧）
         *     console.log("计时开始"); // 然后，执行这行代码
         *     for (let t = 120; t >= 0; t--) {
         *         console.log(t); // 输出 t 的值
         *         yield; // 这行代码让脚本暂停并等待下一帧
         *     }
         *     console.log("结束"); // 上述循环总共执行了 120 帧之后，才会执行这行代码
         * })());
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
        //#region game.timeScale
        /** 游戏的时间流速，可以用来做慢镜头啥的  
         * @alias ts */
        get timeScale() {
            return timeScale;
        },
        /** 游戏的时间流速，可以用来做慢镜头啥的  
         * @alias ts */
        set timeScale(v: number) {
            timeScale = v;
        },
        /** 游戏的时间流速，可以用来做慢镜头啥的  
         * @alias timeScale */
        get ts() {
            return timeScale;
        },
        /** 游戏的时间流速，可以用来做慢镜头啥的  
         * @alias timeScale */
        set ts(v: number) {
            timeScale = v;
        },
        //#endregion
        /** @readonly @generator 等待 timeFrame 帧 */
        Sleep,
        /**
         * @readonly
         * JSTG 预置的自机
         * @example
         * const player = game.prefabPlayers.makeSimpleOn(game.board);
         * game.forever(loop => {
         *     player.update({input: game.input, timeScale: game.ts});
         * });
         */
        prefabPlayers,
        //Entity,
        /** JSTG 预置的一些贴图 */
        prefabTextures,
        /**
         * 一个随机数发生器，你可以用它来生成随机数
         * @example
         * game.rng.int(1, 10); // 生成一个 [1, 10) 之间的随机整数
         * game.rng.maybe(0.3); // 有 30% 的概率返回 true
         * game.rng.select(
         *     [1, "smallball"],
         *     [3, "ringball"],
         *     [6, "glowball"],
         * ); // 根据权重，随机返回一个弹幕类型
         */
        rng,
    };

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