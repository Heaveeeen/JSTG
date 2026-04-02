import { Destroyable, Game } from "./jstg.js";
import * as utils from "./utils.js"


export const makePauseController = () => ({ isRun: true });
type PauseController = ReturnType<typeof makePauseController>;

/**
 * 循环的控制器对象，用于控制该循环
 * @example
 * loop.stop(); // 从下一帧开始，停止该循环
 */
export interface LoopController<T> {
    /** 从下一帧起，停止该循环。 */
    destroy(result?: T): void,
    readonly destroyed: boolean
    /**
     * @readonly
     * 该循环进行到了第几帧。第一帧为0。  
     * 会考虑 timeScale，并且尽可能根据 timeScale 向下取整。（取整机制与弹幕引擎略有不同，我感觉我写的这个应该稍微好点）
     */
    readonly clock: number,
    /**
     * 该循环结束时，调用回调函数。
     * 该方法只是执行一个回调函数而已，如果在回调函数里开启了一个新的 loop ，then 不会返回这个新的 loop 。
     */
    then(callback: (result?: T) => void): this,
    addRefs(...objs: Destroyable[]): void,
    addDestroys(...objs: Destroyable[]): void,
    addOwns(...objs: Destroyable[]): void,
    addPauseController(...controllers: PauseController[]): void,
    [Symbol.iterator](): CoDoGenerator<T>,
}

type LoopOrder = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type LooperFn<T> = (loop: LoopController<T>) => void;
export type CoDoGenerator<T> = Generator<void, T | undefined, void>;
export type CoDoGenFn<T> = (loop: LoopController<T>) => CoDoGenerator<T>;

export interface LoopOptions {
    /**
     * 执行顺序编号。每帧都会先执行编号较小的脚本，再执行编号较大的脚本。  
     * 可以是 [0, 10] 之间的整数。
     * 编号相同者，先来后到。  
     * ⚠️ 0 和 10 是内部使用的，不建议使用 0 或 10。  
     * @default 5
     */
    order?: LoopOrder,
    /** 借用，或者说依赖的对象，这些对象只要死了任意一个，该脚本就会停止。 */
    refs?: Destroyable | Destroyable[],
    /** 该脚本停止时，自动摧毁这些对象。 */
    destroys?: Destroyable | Destroyable[],
    /**
     * 绑定所有权的对象。  
     * 这些对象只要死了任意一个，该脚本就会停止；  
     * 该脚本停止时，自动摧毁这些对象。  
     */
    owns?: Destroyable | Destroyable[],
    /** TODOC: LoopOptions.pauseController */
    pauseController?: PauseController | PauseController[] | "none",
}

export const makeLooper = (makeLooperOptions: {
    getTimescale: () => number,
    mainPauseController: PauseController,
}) => {

    const { getTimescale, mainPauseController } = makeLooperOptions;

    type Thread = ((() => void) | null)[];

    const threads: [
        Thread, Thread, Thread, Thread, Thread,
        Thread, Thread, Thread, Thread, Thread, Thread
    ] = [[], [], [], [], [], [], [], [], [], [], []];

    let fnTotalCount = 0;
    let fnLastCleanCount = 50;

    const cleanThreads = () => {
        fnTotalCount = 0;
        threads.forEach(thread => {
            let fnCount = 0;
            const len = thread.length;
            for (let i = 0; i < len; i++) {
                if (thread[i] !== null) {
                    thread[fnCount++] = thread[i];
                }
            }
            thread.length = fnCount;
            fnTotalCount += fnCount;
        });
        fnLastCleanCount = fnTotalCount;
    };

    const stepThreads = () => {
        threads.forEach(thread => {
            for (let i = 0; i < thread.length; i++) { thread[i]?.(); }
        });
        if (fnTotalCount > fnLastCleanCount * 2) cleanThreads();
    };

    
    const forever = <T>(
        /** 要循环执行的回调函数 */
        fn: LooperFn<T>,
        options: LoopOptions = {}
    ) => {
        const thread = threads[options.order ?? 5];
        // 这个东西仅用来构造 refs 和 destroys ，它本身没有实际作用
        const owns = utils.makeElements(options.owns);

        // 注意：可能包含重复项
        const refs = [...utils.makeElements(options.refs), ...owns];
        const destroys = [...utils.makeElements(options.destroys), ...owns];

        const pauseControllers = options.pauseController === "none" ? [] : utils.makeElements(options.pauseController ?? mainPauseController);

        let clock = 0;
        let destroyed = false;
        let loopResult: T | undefined;
        const callbacks: ((result?: T) => void)[] = [];
        const loop: LoopController<T> = {
            destroy,
            get destroyed() { return destroyed || refs.some(r => r.destroyed); },
            get clock() { return clock },
            then: (callback: () => void) => {
                callbacks.push(callback);
                return loop;
            },
            addRefs: (...objs) => { refs.push(...objs); },
            addDestroys: (...objs) => { destroys.push(...objs); },
            addOwns: (...objs) => {
                refs.push(...objs);
                destroys.push(...objs);
            },
            addPauseController: (...controllers) => { pauseControllers.push(...controllers); },
            *[Symbol.iterator]() {
                while (!loop.destroyed) { yield; }
                return loopResult;
            },
        };
        const looperFn = () => {
            if (refs.some(r => r.destroyed)) {
                destroy();
            } else if (pauseControllers.every(ctrlr => ctrlr.isRun)) {
                fn(loop);
                if (clock % getTimescale() > 0) {
                    clock = Math.floor(clock / getTimescale());
                }
                clock += getTimescale();
            }
        };
        let idx = thread.length;
        thread.push(looperFn);
        function destroy(result?: T) {
            if (destroyed) { return; }
            destroyed = true;
            thread[idx] = null;
            destroys.forEach(d => d.destroy({ children: true }));
            callbacks.forEach(callback => callback(result));
            loopResult = result;
        }
        return loop;
    };
    
    const coDo = <T>(
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
        genFn: CoDoGenFn<T>,
        options: LoopOptions = {}
    ) => {
        const loop = forever<T>(loop => {
            const result = generator.next();
            if (result.done) {
                loop.destroy(result.value);
            }
        }, options);
        const generator = genFn(loop);
        return loop;
    }

    return {
        forever,
        coDo,
        stepThreads,
        threads,
        cleanThreads,
    }
};