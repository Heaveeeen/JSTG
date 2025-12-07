// @ts-check

/// <reference path="./lib/pixi/pixi.d.ts" />
/// <reference path="./lib/howler/howler.d.ts" />
// ↑ 上面这两行用来联动 pixi 和 howler 的类型注释

import * as jstg from "./dist/jstg.js";
import * as pixi from "pixi";
import { deg } from "./dist/utils.js";


// 启动游戏
(async () => {

    const game = await jstg.LaunchGame();
    const { LoadAsset, LoadSvg, Key } = jstg;
    const { input, forever, coDo, app, board, ingameUI } = game;
    const { isDown, isUp, isHold, isIdle } = input;

    console.log("game:", game);

    const txt = new pixi.Text({
        parent: board.root,
        text: 
`Hello, PIXI & JSTG!
测试文本你好你好你好
1\t2\t3\t
45\t67\t890
这是小 simple，她很可爱，我借来用用，而且她很可爱
按方向键让她移动，按G可以杀了她
（别问我为什么是G，随便选的）`,
        x: 0,
        y: 0,
        anchor: 0.5,
        style: {
            fontSize: 16,
            fill: "#000000",
            align: "center",
            stroke: {
                color: "#888888",
                width: 3,
                join: "round",
            }
        },
        zIndex: -200,
    });

    /** 自机 */
    const pl = await game.prefabPlayers.makeSimple({
        autoUpdateSelf: false,
    });
    const { tan00 } = game.prefabSounds.thse;
    
    //@ts-expect-error
    window.game=game
    
    coDo((function*(){
        while (true) {
            const sid = tan00.play();
            tan00.volume(0.05);
            for (let i = 0; i < 50; i++) {
                const dan = game.makePrefabDanmaku("scale");
                //const filter = new pixi.ColorMatrixFilter();
                //filter.hue(Math.random() * 360, false);
                //dan.sprite.filters = filter;
                dan.rotation = deg(Math.random() * 360);
                //dan.sprite.blendMode = "add";
                game.forever(loop => {
                    dan.speedToA(1.5, 0.5);
                    dan.move();
                    dan.rotation += deg(0.5) * game.ts;
                    dan.boundaryDelete(loop);
                }, { with: dan });
            }
            yield* game.Sleep(10);
        }
    })());

    forever(loop => {
        pl.update({input, keyMap: {
            up: [Key.ArrowUp, Key.KeyW],
            down: [Key.ArrowDown, Key.KeyS],
            left: [Key.ArrowLeft, Key.KeyA],
            right: [Key.ArrowRight, Key.KeyD],
            slow: [Key.ShiftLeft, Key.KeyL, Key.Space],
            attack: [Key.KeyZ, Key.KeyK],
            bomb: [Key.KeyX, Key.KeyJ],
        }});
        if (isDown(Key.KeyG)) {
            pl.destroy();
            loop.stop();
        }
    });

})();