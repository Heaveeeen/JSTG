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
export const alphaTo = (spr: pixi.Sprite, dst: number, speed: number) => {
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
