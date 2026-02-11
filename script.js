// @ts-check

/// <reference path="./lib/pixi/pixi.d.ts" />
/// <reference path="./lib/howler/howler.d.ts" />
// ↑ 上面这两行用来联动 pixi 和 howler 的类型注释

import * as jstg from "./dist/jstg.js";
import * as pixi from "pixi";
import { deg } from "./dist/utils.js";
import { Danmaku, prefabDanmakuHitboxRadius } from "./dist/danmaku.js";


// 启动游戏
(async () => {

    const game = await jstg.LaunchGame();
    const { LoadAsset, LoadSvg, Key } = jstg;
    const { input, forever, coDo, app, board, ingameUI, debug, makeDanmaku } = game;
    const { isDown, isUp, isHold, isIdle } = input;
    const { asAny } = jstg.utils;

    console.log("game:", game);
    const txt = new pixi.Text({
        parent: board.root,
        text: 
`Hello, JSTG!
按 P 显示判定范围。
按 O 开启上帝模式。`,
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
    const pl = await game.makePrefabPlayer.simple({
        autoUpdateSelf: false,
    });
    const se = game.prefabSounds.thse;
    
    //@ts-expect-error
    window.game=game;

    //const greenContainer = new pixi.Container();
    const greenFilter = new pixi.ColorMatrixFilter();
    greenFilter.hue(140, false);
    //greenContainer.filters = greenFilter;

    // 示例：山城高岭非符
    /*se.tan00.volume(0.05);
    se.kira00.volume(0.05);
    // 旋转米弹
    coDo(function*(){
        let gunOmega = deg(28.5);
        while (true) {
            //let gunDir = Math.atan2(pl.y, pl.x) - Math.sign(gunOmega) * 2;
            let gunDir = Math.PI * -0.5;
            gunOmega *= -1;
            for (let i = 0; i < 16; i++) {
                gunDir += gunOmega;
                se.tan00.play();
                se.kira00.play();
                for (let i = 0; i < 7; i++) {
                    const dan = makeDanmaku("grain");
                    dan.sprite.filters = greenFilter;
                    dan.y = -80;
                    dan.rotation = gunDir + deg((i - 3) * 25);
                    dan.speed = 1;
                    const danBaseOmega = -Math.sign(gunOmega);
                    forever(loop => {
                        dan.speedToA(Infinity, 0.04 * game.timeScale);
                        dan.move();
                        dan.rotation += danBaseOmega * deg(1) * game.timeScale;
                        dan.boundaryDelete();
                    }, { owns: dan });
                }
                yield* game.Sleep(9);
            }
            yield* game.Sleep(15);
        }
    });

    const blueFilter = new pixi.ColorMatrixFilter();
    blueFilter.hue(200, false);
    blueFilter.blendMode = "add";

    // 中玉
    coDo(function*(){
        while (true) {
            let gunDir = Math.atan2(pl.y, pl.x);
            for (let i = 0; i < 32; i++) {
                const dan = makeDanmaku("middleball");
                dan.sprite.filters = blueFilter;
                dan.y = -80;
                dan.rotation = gunDir + deg(i / 32 * 360);
                dan.speed = 0.8;
                forever(loop => {
                    dan.move();
                    dan.boundaryDelete();
                }, { owns: dan });
            }
            yield* game.Sleep(180);
        }
    });*/

    // 弹幕一览
    
    let x = -180, y = -200;
    let maxR = 0;
    for (const danType in prefabDanmakuHitboxRadius) {
        const dan = asAny(makeDanmaku(danType));
        x += dan.hitboxRadius * 2 + 20;
        dan.x = x;
        dan.y = y;
        dan.canBeErase = false;
        x += dan.hitboxRadius * 2 + 20;
        maxR = Math.max(maxR, dan.hitboxRadius)
        if (x >= 160) {
            x = -180;
            y += maxR * 4 + 40;
        }
    }

    forever(loop => {
        pl.update({input, keyMap: {
            up: [Key.ArrowUp, Key.KeyW],
            down: [Key.ArrowDown, Key.KeyS],
            left: [Key.ArrowLeft, Key.KeyA],
            right: [Key.ArrowRight, Key.KeyD],
            slow: [Key.ShiftLeft, Key.KeyL, Key.Space],
            attack: [Key.KeyZ, Key.KeyK],
            bomb: [Key.KeyX, Key.KeyJ],
        }, slowSpeed: debug.godMode.isOn ? 0.2 : undefined});
        if (isDown(Key.KeyP)) {
            if (!debug.showHitbox.isOn) {
                debug.showHitbox.isOn = true;
                debug.showHitbox.isShowDanmakuBoth = true;
            } else if (debug.showHitbox.isShowDanmakuBoth) {
                debug.showHitbox.isShowDanmakuBoth = false;
            } else {
                debug.showHitbox.isOn = false;
            }
        }
        if (isDown(Key.KeyO)) {
            debug.godMode.isOn = !debug.godMode.isOn;
        }
    });

})();