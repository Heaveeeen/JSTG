// @ts-check
// 如果希望关闭 ts 的类型检查，请修改或删除上方注释。可以在“@ts-check”中间加个空格啥的，方便开关。

/// <reference path="./lib/pixi/pixi.d.ts" />
// ↑ 上面这行用来联动 pixi 的类型注释

import * as jstg from "./dist/jstg.js";
import * as pixi from "pixi";
import { deg } from "./dist/utils.js";


// 启动游戏
(async () => {
    const game = await jstg.LaunchGame();
    const { Key, prefabDanmakuHitboxRadius } = jstg;
    const { input, forever, coDo, app, debug } = game;
    const { isDown, isUp, isHold, isIdle } = input;
    const { asAny } = jstg.utils;

    const combat = await game.StartCombat()
    const { board, makeDanmaku, makeLaserBeam } = combat;

    console.log("game:", game);
    console.log("combat:", combat);
    console.log("danmaku pool:", combat.entityPool);
    const txt = new pixi.Text({
        parent: board.root,
        text: 
`Hello, JSTG!
按 P 显示判定范围。
按 O 开启上帝模式。
按 ESC 暂停。`,
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
    const pl = combat.prefabPlayers.makeSimple({
        autoUpdateSelf: false,
    });
    const se = game.prefabSounds.thse;
    
    //@ts-expect-error
    window.game=game;

    // 示例：山城高岭非符
    function scglff() {
        // 旋转米弹
        coDo(function*(){
            let gunOmega = deg(28.5);
            while (true) {
                //let gunDir = Math.atan2(pl.y, pl.x) - Math.sign(gunOmega) * 2;
                let gunDir = Math.PI * -0.5;
                gunOmega *= -1;
                for (let i = 0; i < 16; i++) {
                    gunDir += gunOmega;
                    se.tan00.play({volume: 0.1});
                    se.kira00.play({volume: 0.1});
                    for (let i = 0; i < 7; i++) {
                        const dan = makeDanmaku("grain", "h150");
                        dan.y = -80;
                        dan.rotation = gunDir + deg((i - 3) * 25);
                        dan.speed = 1;
                        const danBaseOmega = -Math.sign(gunOmega);
                        forever(loop => {
                            dan.speedToA(Infinity, 0.04 * game.timeScale);
                            dan.move();
                            dan.rotation += danBaseOmega * deg(1.5) * game.timeScale;
                            dan.boundaryDelete();
                        }, { owns: dan });
                    }
                    yield* game.Sleep(9);
                }
                yield* game.Sleep(15);
            }
        });

        // 中玉
        coDo(function*(){
            while (true) {
                let gunDir = Math.atan2(pl.y, pl.x);
                for (let i = 0; i < 36; i++) {
                    const dan = makeDanmaku("middleball", "white");
                    dan.y = -80;
                    dan.rotation = gunDir + deg(i / 36 * 360);
                    dan.speed = 4.5;
                    dan.sprite.blendMode = "add";
                    forever(loop => {
                        dan.speedToA(0.8, 0.1);
                        dan.move();
                        dan.boundaryDelete();
                    }, { owns: dan });
                }
                yield* game.Sleep(150);
            }
        });
    }
    //scglff();


    // 弹幕一览（彩色）
    function makeFooMuseum() {
        let y = -225;
        let rotation = 0;

        /**
         * @param {number} x0
         * @param {function} dx
         * @param {function} dy
         * @param {string[]} types
         */
        function makeFooExsibits(x0, dx, dy, types, colors=["h0", "h30", "h60", "h90", "h120", "h150", "h180", "h210", "h240", "h270", "h300", "h330", "black", "white"]) {
            for (const type of types) {
                let x = x0;
                for (const color of colors) {
                    // @ts-expect-error
                    const dan = makeDanmaku({ type, color, x, y, rotation });
                    dan.canBeErase = false;
                    forever(loop => {
                        dan.rotation += 0.006;
                    }, { refs: dan }),
                    // @ts-expect-error
                    x += dx(prefabDanmakuHitboxRadius[type]);
                    rotation += 0.4;
                }
                // @ts-expect-error
                y += dy(prefabDanmakuHitboxRadius[type]);
            }
        }
        makeFooExsibits(-188, (/** @type {number} */ r) => r * 3 + 4.3, (/** @type {number} */ r) => r * 3 + 5.2, [
            "dot", "bacteria", "drip", "scale", "grain", "chain", "seed", "bullet", "bacillus", "crystal", "particle", "card",
            "smallball", "ringball", "glowball", "fireball", "smallstar", "nova", "coin", "laserseg",
        ]);
        y += 4;
        makeFooExsibits(-182, (/** @type {number} */ r) => r * 3 + 15, (/** @type {number} */ r) => r * 3 + 13,
            ["knife", "note", "arrow", "butterfly"], ["white", "h300", "h240", "h180", "h150", "h120", "h60", "h30", "h0"]);
        y = -220;
        makeFooExsibits(182, (/** @type {number} */ r) => -32, (/** @type {number} */ r) => 36,
            ["lightball"], ["white", "h300", "h240", "h180", "h150", "h30", "h0"]);
        makeFooExsibits(182, (/** @type {number} */ r) => -29, (/** @type {number} */ r) => 30, [
            "bigstar", "ellipse", "heart", "middleball"//, "sword", "bubble", "nuclear"
        ], ["white", "h300", "h240", "h180", "h150", "h30", "h0"]);
        y = -50;
        makeFooExsibits(170, (/** @type {number} */ r) => -45, () => 0, ["sword"], ["h180", "h60", "h0"]);
        y = -15;
        makeFooExsibits(170, (/** @type {number} */ r) => -45, () => 0, ["sword"], ["white", "h300", "h240"]);
        y = 35;
        makeFooExsibits(180, (/** @type {number} */ r) => -32, (/** @type {number} */ r) => 32, ["yinyang"], ["h120", "h60", "h30", "h0"]);
        makeFooExsibits(180, (/** @type {number} */ r) => -32, (/** @type {number} */ r) => 32, ["yinyang"], ["white", "h300", "h240", "h180"]);
        y = 207;
        makeFooExsibits(-166, (/** @type {number} */ r) => 66, () => 0, ["bubble"], ["h0", "h60", "h120", "h240", "h300", "white"]);
    }
    function makeFooMuseum2() {
        let y = -200;
        let rotation = 0;
        /**
         * @param {number} x0
         * @param {function} dx
         * @param {function} dy
         * @param {string[]} types
         */
        function makeFooExsibits(x0, dx, dy, types, colors=["h0", "h30", "h60", "h90", "h120", "h150", "h180", "h210", "h240", "h270", "h300", "h330", "black", "white"]) {
            for (const type of types) {
                let x = x0;
                for (const color of colors) {
                    // @ts-expect-error
                    const dan = makeDanmaku({ type, color, x, y, rotation });
                    dan.canBeErase = false;
                    forever(loop => {
                        dan.rotation += 0.006;
                    }, { refs: dan }),
                    // @ts-expect-error
                    x += dx(prefabDanmakuHitboxRadius[type]);
                    rotation += 0.4;
                }
                // @ts-expect-error
                y += dy(prefabDanmakuHitboxRadius[type]);
            }
        }
        makeFooExsibits(-165, ()=>65, ()=>0, ["bigyinyang"], ["h0", "h60", "h120", "h180", "h240", "h300"]);
        makeDanmaku({ type: "nuclear", x: 115, y: -10 }).canBeErase = false;
        makeLaserBeam({ type: "laserseg", color: "h0", x: 60, y: 50, width: 1, length: 120, startPoint: {}, endPoint: {} }).canBeErase = false;
        makeLaserBeam({ type: "laserseg", color: "h60", x: 70, y: 70, width: 3, length: 100, startPoint: {}, endPoint: {} }).canBeErase = false;
        makeLaserBeam({ type: "laserseg", color: "h120", x: 80, y: 110, width: 5, length: 80, startPoint: {}, endPoint: {} }).canBeErase = false;
        makeLaserBeam({ type: "smallball", color: "h180", x: 40, y: 150, width: 3, length: 140, startPoint: {}, endPoint: {} }).canBeErase = false;
        makeLaserBeam({ type: "scale", color: "h240", x: 60, y: 180, width: 3, length: 120 }).canBeErase = false;
    }
    //makeFooMuseum();

    const colors = ["h0", "h30", "h60", "h90", "h120", "h150", "h180", "h210", "h240", "h270", "h300", "h330", "black", "white"];
    for (let i = 0; i < 30; i++) {
        combat.prefabEnemys.makeYinYangOrb({
            // @ts-expect-error
            color: colors[Math.floor(Math.random() * colors.length)],
            x: (i * 45) % 340 - 170, y: i * 6 - 220 + Math.random() * 10, rotation: 0,
            maxHp: 300,
        });
    }

    /*for (let i = 0; i < 5; i++) {
        combat.makeLaserBeam({
            type: "smallball",
            startPoint: {}, endPoint: {},
            x: 0, y: [-200,-180,-150,-50,80][i], rotation: deg(30),
            width: [1,3,5,10,20][i], length: 150,
        });
        combat.makeDanmaku({
            type: "smallball",
            x: 0, y: 70 * i - 180,
            radius: [1,3,5,10,20][i],
        });
    }

    combat.makeDanmaku({
        type: "smallball",
        x: -100, y: -100,
    });*/

    /*forever(loop => {
        const dan = combat.makeDanmaku("scale");
        dan.rotation = Math.random() * Math.PI * 2;
        forever(loop => {
            dan.move(0.5);
            dan.boundaryDelete();
        }, { refs: dan });
    });*/

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
    }, { order: 0 });

    forever(loop => {
        if (isDown(Key.Escape)) {
            game.defaultPauseController.isRun = !game.defaultPauseController.isRun;
            game.prefabSounds.thse.pause.play();
        }
    }, { order: 0, pauseController: "none" });

})();