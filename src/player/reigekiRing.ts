import * as pixi from "pixi";
import { Board, Combat, Game } from "../jstg.js";
import * as utils from "../utils.js";

export const makeReigekiRing = (options: {
    game: Game, combat: Combat, board: Board,
    x: number, y: number,
    /**
     * 弹幕引擎中，该半径为 100 ；  
     * 《风神录》中，灵梦的灵击圈半径换算过来约为 160 ，魔理沙则约为 120 。  
     * @default 140
     */
    maxRadius: number | null,
    /**
     * 弹幕引擎中，此值为 150 ；  
     * 《风神录》中，粗略换算过来约为 300 。  
     * @default 300
     */
    outsideDps: number | null,
    /**
     * 弹幕引擎中，此值为 300 ；  
     * 《风神录》中，粗略换算过来约为 600 。  
     * @default 600
     */
    insideDps: number | null,
    /**
     * 弹幕引擎中，此值为 2 。  
     * @default 3
     */
    initSpeed: number | null,
    /**
     * 弹幕引擎中，此值为 0.99 。  
     * @default 0.99
     */
    speedK: number | null,
    /**
     * 除去淡入淡出部分以外，灵击圈的持续时间。  
     * 弹幕引擎中，此值为 90 。  
     * 《风神录》中不太好换算，但应该比 90 要小一些。  
     * 作为参考：灵击圈的淡入淡出时长共计 90f 。《风神录》中，灵梦的灵击圈持续 130f ，魔理沙的灵击圈持续 170f 。  
     * @default 90
     */
    duration: number | null,
}) => {
    const { game, combat, board, x: x0, y: y0 } = options;
    const maxRadius = options.maxRadius ?? 140;
    const outsideDamage = (options.outsideDps ?? 300) / 60;
    const insideDamage = (options.insideDps ?? 600) / 60;
    let speed = options.initSpeed ?? 3;
    const speedDK = 1 - (options.speedK ?? 0.99);
    const duration = options.duration ?? 90;
    const ring = new pixi.Sprite({
        parent: board.reigekiRingLayer,
        texture: game.prefabTextures.player.reigekiRing,
        x: x0, y: y0,
        anchor: 0.5,
        blendMode: "add",
        scale: 0,
        alpha: 0,
    });
    /** 对于放 B 之前已经存在的敌人（即先刷怪再放 B ），B 的伤害无视出生保护。在规划炸时可以击穿符卡保护。 */
    const pierceEnemys = new Set(board.enemyRegList.getAlives());
    board.forever(loop => {
        const t = loop.clock;
        let tf: number;
        if (t < 30) {
            tf = t / 30;
            game.alphaTo(ring, 1, 0.05);
        } else if (t < (30 + duration)) {
            tf = 1;
        } else if (t < (30 + duration + 60)) {
            tf = 1 - (t - (30 + duration)) / 60;
            game.alphaTo(ring, 0, 0.01);
        } else {
            return loop.destroy();
        }
        const radius = Math.sin(tf * Math.PI / 2) * maxRadius;
        ring.y -= speed * game.timeScale;
        speed -= speed * speedDK * game.timeScale;
        ring.scale = radius / 100;
        ring.rotation -= utils.deg(combat.rand.float(10, 30)) * game.timeScale; // RNG: EFF 灵击圈旋转
        board.enemyRegList.getAlives().forEach(enemy => enemy.beHurt(
            (enemy.danmaku.getIsCrossCircle({ x: ring.x, y: ring.y, radius }) ? insideDamage : outsideDamage) * game.timeScale,
            { isEffectByBirthProtect: !pierceEnemys.has(enemy) },
        ));
        board.danmakuRegList.eraseByRadius({ x: ring.x, y: ring.y, radius });
    }, { owns: ring });
};