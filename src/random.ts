import * as utils from "./utils.js";


type NewRngOptions = {
    /** 随机种子，可选，留空会自动帮你填上一个随机数 */
    seed?: number;
    /** @default 1664525 */
    a?: number;
    /** @default 1013904223 */
    c?: number;
    /** @default 2**32 */
    m?: number;
};

/**
 * 构造一个随机数发生器，你可以用它来生成随机数，并且指定种子。  
 * 指定种子有助于稳定复现一局游戏，比如可以做 replay 啥的。  
 * 另外，也可以通过手动填入一些参数，实现一些神奇的“固定随机弹”。  
 */
export class Rng {

    /** @readonly 起始的随机种子 */
    readonly seed: number;
    readonly a: number;
    readonly c: number;
    readonly m: number;
    /** @internal */
    _current: number;

    constructor(options: NewRngOptions = {}) {
        this._current = this.seed = options.seed ?? Math.round(Math.random() * 1e8);
        this.a = options.a ?? 1664525;
        this.c = options.c ?? 1013904223;
        this.m = options.m ?? 2 ** 32;
    }
    /** @internal */
    _next() { return this._current = (this.a * this._current + this.c) % this.m; }
    /** 
     * 返回一个 [from, to) 范围内的随机浮点数
     * @example
     * rng.float(0, 4) // 可能是：0.3547, 3.5813, 1.2, ...
     */
    float(from: number, to: number) { return this._next() / this.m * (to - from) + from; }
    /**
     * 返回一个 [from, to) 范围内的随机整数
     * @example
     * rng.int(2, 8) // 可能是：7, 2, 4, 5, ... 不可能是 8
     */
    int(from: number, to: number) { return this._next() / this.m * (to - from) + from | 0; }
    /** 
     * 有 prob 的概率返回 true ，否则返回 false
     * @example
     * rng.maybe(0.8) // 有 80% 的概率为 true
     * if (rng.maybe(7/19)) {
     *     // 有 7/19 的概率执行这里
     * }
     */
    maybe(prob: number) { return (this._next() / this.m) < prob; }
    /** 
     * 根据权重随机选择一个结果返回
     * @example
     * const rng = makeRng();
     * 
     * const danmakuType = rng.select(["smallball", "ringball", "glowball", "glowball"]);
     * // 25% 的概率是小玉，25% 的概率是环玉，50% 的概率是水光弹
     * 
     * const danmakuType = rng.select([
     *     { weight: 1, value: "smallball" },
     *     { weight: 3, value: "ringball" },
     *     { weight: 6, value: "glowball" },
     * ]);
     * // 10% 的概率是小玉，30% 的概率是环玉，60% 的概率是水光弹
     */
    select<T extends string | number | boolean | undefined | bigint | symbol | (()=>any)>(results: Readonly<T[]>): typeof results[number];
    select<T>(results: Readonly<utils.SelectItem<T>[]>): typeof results[number]["value"];
    select<T>(results: Readonly<utils.SelectItem<T>[]> | Readonly<T[]>) {
        // ASSERTS: results not empty
        if (typeof results[0] !== "object") {
            return results[this.int(0, results.length)];
        }
        results = utils.cast<Readonly<utils.SelectItem<T>[]> | Readonly<T[]>, Readonly<utils.SelectItem<T>[]>>(results);
        const totalWeight = results.reduce((a, b) => a + b.weight, 0);
        let r = this.float(0, totalWeight);
        return utils.select(r, results);
    }
    /** 返回随机洗牌后的新数组。不改变原先的数组。 */
    shuffled<T extends Readonly<[]>>(array: T): T {
        const result: any[] = [];
        for (const item of array) {
            result.splice(this.int(0, result.length + 1), 0, item);
        }
        return result as any;
    }
}

export const makeRng = (options: NewRngOptions = {}) => new Rng(options);