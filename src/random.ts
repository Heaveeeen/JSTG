

/**
 * 构造一个随机数发生器，你可以用它来生成随机数，并且指定种子。  
 * 指定种子有助于稳定复现一局游戏，比如可以做 replay 啥的。  
 * 另外，也可以通过手动填入一些参数，实现一些神奇的“固定随机弹”。  
 */
export function makeRng(
    /** 随机种子，可选，留空会自动帮你填上一个随机数 */
    seed = Math.round(Math.random() * 1e8),
    a = 1103515245,
    c = 0,
    m = 2**31-1
) {
    let initSeed = seed;
    const next = () => seed = (a * seed + c) % m;
    const float = (from: number, to: number) => next() / m * (to - from) + from;
    const int = (from: number, to: number) => next() / m * (to - from) + from | 0;
    return {
        /** @readonly 随机种子 */
        get seed() { return initSeed; },
        /** 
         * 返回一个 [from, to) 范围内的随机浮点数
         * @example
         * rng.float(0, 4) // 可能是：0.3547, 3.5813, 1.2, ...
         */
        float,
        /** 
         * 返回一个 [from, to) 范围内的随机整数
         * @example
         * rng.int(2, 8) // 可能是：7, 2, 4, 5, ... 不可能是 8
         */
        int,
        /** 
         * 有 prob 的概率返回 true ，否则返回 false
         * @example
         * rng.maybe(0.8) // 有 80% 的概率为 true
         * if (rng.maybe(7/19)) {
         *     // 有 7/19 的概率执行这里
         * }
         */
        maybe: (prob: number) => (next() / m) < prob,
        /** 
         * 根据权重随机选择一个结果返回
         * @example
         * const rng = makeRng();
         * const danmakuType = rng.select(
         *     [1, "smallball"],
         *     [3, "ringball"],
         *     [6, "glowball"],
         * );
         * // 10% 的概率是小玉，30% 的概率是环玉，60% 的概率是水光弹
         */
        select<T>(...results: [number, T][]): typeof results[number][1] {
            const totalWeight = results.reduce((a, b) => a + b[0], 0);
            let r = float(0, totalWeight);
            for (const [weight, result] of results) {
                if (r < weight) return result;
                r -= weight;
            }
            return results[results.length - 1][1];
        }
    }
}
