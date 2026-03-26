import * as pixi from "pixi";
import { Destroyable } from "./jstg.js";

/**
 * 把 n 限制在 [a, b] 范围内
 * @example
 * clamp(5, 1, 10) // 5
 * clamp(-3, 0, 8) // 0
 * clamp(12, 2, 9) // 9
 */
export const clamp = (n: number, a: number, b: number) => Math.min(Math.max(a, n), b);

/** TODOC: lerp */
export const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

/**
 * 弹幕引擎 ghost to 同款  
 * ⚠️这玩意必须自己填 game.ts
 */ // TODO: 往 game 里塞一个这玩意，顺便做一个指数衰减的工具函数。以后说不定要把 Entity 放到这边来，也说不定要把这些都丢进 Entity 里……我倾向于前者。
export const alphaTo = (spr: { alpha: number }, dst: number, speed: number) => {
    if (Math.abs(spr.alpha - dst) <= speed) {
        spr.alpha = dst;
    } else if (dst > spr.alpha) {
        spr.alpha += speed;
    } else {
        spr.alpha -= speed;
    }
};

/**
 * 把角度转换为弧度
 * @example
 * deg(180) // π，即正左方向
 * deg(90) // π/2，即正上方向
 */
export const deg = (n: number) => n * Math.PI / 180;

/**
 * 如果输入是单个元素则返回单元素数组，如果输入已经是数组则原样返回，如果输入是 undefined 则返回空数组。  
 * 对于需要接受单个元素或数组作为参数的函数很有用。  
 * ⚠️T 不能是数组  
 */
export const makeElements = <T>(input?: T | T[]): T[] =>
    input === undefined ? [] : (Array.isArray(input) ? input : [input]);

export interface Vec2 {
    x: number,
    y: number,
}

/** 计算点 P 到线段 AB 距离的平方 */
export const getPointToSegmentDist2 = (AB: Vec2, AP: Vec2) => {
    /** AB * AP */
    const dot = AB.x * AP.x + AB.y * AP.y;
    if (dot <= 0) {
        return AP.x ** 2 + AP.y ** 2;
    }
    /** AB^2 */
    const len2 = AB.x ** 2 + AB.y ** 2;
    if (dot >= len2) {
        return (AP.x - AB.x) ** 2 + (AP.y - AB.y) ** 2;
    }
    return (AB.y * AP.x - AB.x * AP.y) ** 2 / (AB.x ** 2 + AB.y ** 2);
};

/** 转轴公式，把 {x, y} 绕坐标原点旋转 theta 弧度。注意转的是向量，不是坐标轴。 */
export const rotateVec = ({x, y}: Readonly<Vec2>, theta: number) => cast<Vec2>({
    x: x * Math.cos(theta) + y * Math.sin(theta),
    y: y * Math.cos(theta) - x * Math.sin(theta),
});

/**
 * 把分贝数转化为振幅倍数。
 * @example
 * decibel(0) // 1，即不变
 * decibel(-6) // 约为 0.5，即减半
 * decibel(6) // 约为 2，即翻倍
 */
export const decibel = (db: number) => 10 ** (db / 20);
/** 把振幅倍数转化为分贝数，是 decibel 的逆运算。 */
export const gainToDecibel = (gain: number) => Math.log10(gain) * 20;

export type SelectItem<T> = { weight: number, value: T };

export const select = <T>(t: number, results: Readonly<SelectItem<T>[]>): typeof results[number]["value"] => {
    for (const {weight, value} of results) {
        if (t < weight) { return value };
        t -= weight;
    }
    return results[results.length - 1].value;
};

export function* UntilDestroy(obj: Destroyable) { while (!obj.destroyed) { yield; } }



/** 如果给定参数不属于 T，让 ts 报错 */
export const staticAssert = <T>(x: T) => x;

/** 仅限向下转换的 as 断言 */
export const cast = <T, U extends T = T>(x: T) => x as U;

export const asAny = (x: any) => x as any;