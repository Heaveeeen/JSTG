



/**
 * 循环的控制器对象，用于控制该循环
 * @example
 * loop.stop(); // 从下一帧开始，停止该循环
 */
export interface LoopController {
    /** 从下一帧起，停止该循环 */
    stop(): void,
}

export type LooperFn = (loop: LoopController) => any;

export type CoDoGenerator = Generator<void, void, void>;

export const makeLooper = (options: {
    /** @default 0.06 */
    targetFpms?: number,
} = {}) => {

    const targetFpms = options.targetFpms ?? 0.06;

    type Thread = (LooperFn | null)[];

    const threads: [
        Thread, Thread, Thread, Thread, Thread,
        Thread, Thread, Thread, Thread, Thread, Thread
    ] = [[], [], [], [], [], [], [], [], [], [], []];

    type Order = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

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
            for (let i = 0; i < thread.length; i++) thread[i]?.({
                stop: () => thread[i] = null
            });
        });
        if (fnTotalCount > fnLastCleanCount * 2) cleanThreads();
    }

    const forever = (
        /** 要循环执行的回调函数 */
        fn: (loop: LoopController) => any,
        /** 执行优先级，每帧都会先执行优先级较小的脚本，必须是 0~10 的整数 */
        order: Order = 5
    ) => {
        const loop: LoopController = {
            stop,
        };
        const id = threads[order].push(fn) - 1;
        fnTotalCount ++;
        function stop() {
            threads[order][id] = null;
        }
        return loop;
    };

    const coDo = (
        /**
         * 要执行的生成器实例  
         * 注意：应为生成器实例，而非生成器函数！
         * @example
         * // 通过自调用的方式构造生成器
         * 
         * (function*() {
         *     // 干啥干啥
         * })()
         */
        generator: CoDoGenerator,
        /** 执行优先级，每帧都会先执行优先级较小的脚本，必须是 0~10 的整数 */
        order: Order = 5
    ) => {
        return forever(loop => {
            const result = generator.next();
            if (result.done) {
                loop.stop();
            }
        });
    }

    function start() {
        requestAnimationFrame(() => {
            stepThreads();
            start();
        });
    }

    return {
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
        stepThreads,
        start,
        threads,
    }
}