import * as pixi from "pixi";
import { Board, Combat, Game } from "../jstg.js";
import * as utils from "../utils.js";

export const makeReigekiRing = (options: {
    game: Game, combat: Combat, board: Board,
    x: number, y: number,
    /**
     * 弹幕引擎中，该半径为 100 ；  
     * 《风神录》中，灵梦的灵击圈半径换算过来约为 160 ，魔理沙则约为 120 。  
     * @default 120
     */
    maxRadius: number | null,
    /**
     * 弹幕引擎中，此值为 150 ；  
     * 《风神录》中，粗略换算过来约为 300 。  
     * @default 300
     */
    insideDps: number | null,
    /**
     * 弹幕引擎中，此值为 300 ；  
     * 《风神录》中，粗略换算过来约为 600 。  
     * @default 600
     */
    outsideDps: number | null,
    /**
     * 弹幕引擎中，此值为 2 。
     * @default 3
     */
    initSpeed: number | null,
}) => {
    const { game, combat, board, x: x0, y: y0 } = options;
    const maxRadius = options.maxRadius ?? 120;
    const insideDamage = options.insideDps ?? 300 / 60;
    const outsideDamage = options.outsideDps ?? 600 / 60;
    let speed = options.initSpeed ?? 3;
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
            utils.alphaTo(ring, 1, 0.05 * game.timeScale);
        } else if (t < 120) {
            tf = 1;
        } else if (t <= 180) {
            tf = 1 - (t - 120) / 60;
            utils.alphaTo(ring, 0, 0.01 * game.timeScale);
        } else {
            return loop.destroy();
        }
        const radius = Math.sin(tf * Math.PI / 2) * maxRadius;
        ring.y -= speed * game.timeScale;
        speed -= speed * 0.01 * game.timeScale;
        ring.scale = radius / 100;
        ring.rotation -= utils.deg(20 + Math.random() * 40) * game.timeScale; // RAND: 灵击圈旋转
        board.enemyRegList.getAlives().forEach(enemy => enemy.beHurt(
            enemy.danmaku.getIsCrossCircle({ x: ring.x, y: ring.y, radius }) ? insideDamage : outsideDamage,
            { isEffectByBirthProtect: !pierceEnemys.has(enemy) },
        ));
        board.danmakuRegList.eraseByRadius({ x: ring.x, y: ring.y, radius });
    }, { owns: ring });
};