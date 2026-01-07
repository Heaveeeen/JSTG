import * as pixi from "pixi";

/**
 * 把 n 限制在 [a, b] 范围内
 * @example
 * clamp(5, 1, 10) // 5
 * clamp(-3, 0, 8) // 0
 * clamp(12, 2, 9) // 9
 */
export const clamp = (n: number, a: number, b: number) => Math.min(Math.max(a, n), b);

/**
 * 弹幕引擎 ghost to 同款
 * ⚠️这玩意必须自己填 game.ts
 */
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
 * 如果输入是单个元素则返回单元素数组，如果输入已经是数组则原样返回，如果输入是 undefined 则返回空数组  
 * 对于需要接受单个元素或数组作为参数的函数很有用  
 * ⚠️T 不能是数组
 */
export const makeElements = <T>(input?: T | T[]): T[] =>
    input === undefined ? [] : (Array.isArray(input) ? input : [input]);



/** 如果给定参数不属于 T，让 ts 报错 */
export const staticAssert = <T>(x: T) => x;

/** 仅限向下转换的 as 断言 */
export const cast = <T, U extends T>(x: T) => x as U;
