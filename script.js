// @ ts-check

/// <reference path="./lib/pixi/pixi.d.ts" />
// ↑ 上面这行用来联动 pixi 的类型注释

// ↓ 在编辑时，把这行注释掉，可以与 .ts 源码联动，对语法服务可能有些帮助。注意在运行时要导入 .js 。
import * as jstg from "./dist/jstg.js";/*
import * as jstg from "./src/jstg.ts";/**/

import * as pixi from "pixi";



// 启动游戏
(async () => {
    const game = await jstg.LaunchGame();
    const { prefabDanmakuHitboxRadius, utils } = jstg;
    const { input, app, debug, Sleep, prefabSounds, prefabTextures } = game;
    const { thse } = prefabSounds;
    const { isDown, isUp, isHold, isIdle } = input;
    const { asAny, UntilDestroy, decibel, deg, lerp, lerpAngle } = utils;

    const combat = await game.StartCombat()
    const { board, rand } = combat;
    const { makeDanmaku, makeFoggyDanmaku, makeLaserBeam, makeGrowingLaserBeam, prefabPlayers, prefabEnemys, forever, coDo, } = board;

    const txt = new pixi.Text({
        parent: board.root,
        text: 
`Hello, JSTG!
按 P 显示判定范围。
按 O 开启上帝模式。
按 ESC 暂停。
按 M 生成一个枫叶。`,
        x: 0,
        y: 0,
        anchor: 0.5,
        style: {
            fontSize: 16,
            fill: "#000",
            align: "center",
            stroke: {
                color: "#333",
                width: 3,
                join: "round",
            }
        },
        zIndex: -200,
    });

    /** 自机 */
    const pl = prefabPlayers.makeSimple({
        highSpeed: 4.5,
        slowSpeed: 2,
        keyMap: {
            up: ["ArrowUp", "KeyW"],
            down: ["ArrowDown", "KeyS"],
            left: ["ArrowLeft", "KeyA"],
            right: ["ArrowRight", "KeyD"],
            slow: ["ShiftLeft", "KeyL", "Space"],
            attack: ["KeyZ", "KeyK"],
            bomb: ["KeyX", "KeyJ"],
        },
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
                            dan.step();
                            dan.rotation += danBaseOmega * deg(1.5) * game.timeScale;
                            dan.boundaryDelete();
                        }, { owns: dan });
                    }
                    yield* Sleep(9);
                }
                yield* Sleep(15);
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
                        dan.step();
                        dan.boundaryDelete();
                    }, { owns: dan });
                }
                yield* Sleep(150);
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
            "dot", "popcorn", "drip", "scale", "grain", "chain", "seed", "bullet", "darkpill", "crystal", "particle", "card",
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
        makeDanmaku({ type: "nuclear", x: 115, y: -10, canBeErase: false });
        makeGrowingLaserBeam({ type: "laserseg", color: "h0", x: 180, y: 50, halfWidth: 1, targetLength: 120, tailPoint: {}, headPoint: {}, canBeErase: false });
        makeGrowingLaserBeam({ type: "laserseg", color: "h60", x: 170, y: 70, halfWidth: 3, targetLength: 100, tailPoint: {}, headPoint: {}, canBeErase: false });
        makeGrowingLaserBeam({ type: "laserseg", color: "h120", x: 160, y: 110, halfWidth: 5, targetLength: 80, tailPoint: {}, headPoint: {}, canBeErase: false });
        makeGrowingLaserBeam({ type: "smallball", color: "h180", x: 180, y: 150, halfWidth: 3, targetLength: 140, tailPoint: {}, headPoint: {}, canBeErase: false });
        makeGrowingLaserBeam({ type: "scale", color: "h240", x: 180, y: 180, halfWidth: 3, targetLength: 120, canBeErase: false });
    }
    //makeFooMuseum2();

    const colors = ["h0", "h30", "h60", "h90", "h120", "h150", "h180", "h210", "h240", "h270", "h300", "h330", "black", "white"];
    function makeFooYinYangOrbs() { for (let i = 0; i < 30; i++) {
        prefabEnemys.makeYinYangOrb({
            // @ts-expect-error
            color: colors[Math.floor(Math.random() * colors.length)],
            x: (i * 45) % 340 - 170, y: i * 6 - 220 + Math.random() * 10, rotation: 0,
            maxHp: 300,
        });
    } };
    //makeFooYinYangOrbs();

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

    //#region 测试 boss
    const non1 = jstg.makeSingleBossSpellOptions({
        time: 30 * 60, hp: 2500,
        *gen({ boss, spellcard, shield }) { while (true) {
            const foo = (gun, o) => {let r = gun.aimedGun(boss).rotation; gun.forever(loop => {
                if (loop.clock >= 80) { gun.destroy(); } else {
                    r += o;
                    gun.speedToA(9, 0.03);
                    gun.rotation += o * 0.018;
                    gun.step();
                    if (loop.clock % 1 === 0) {
                        game.prefabSounds.thse.tan00.play(decibel(-15));
                        const v = rand.float(0.8, 3.2);
                        const a = rand.float(0.008, 0.015);
                        makeFoggyDanmaku({
                            type: rand.select(["ringball", "dot", "smallball"]),
                            color: rand.select(["h180", "h210", "white"]),
                            ...gun, speed: 0,
                            rotation: deg(rand.float(-100, 100)) * rand.float(0,1) ** 3 + r,
                            fn({ dan }) { dan.loopBoundaryDelete(300); },
                            loopFn({ dan }) {
                                dan.speedToA(v, a);
                                dan.step();
                            },
                        });
                    }
                }
            })};
            const gunLeft = boss.makeGun();
            gunLeft.y -= 25;
            gunLeft.rotation = deg(90 + 40);
            gunLeft.speed = 2;
            foo(gunLeft, deg(20));
            const gunRight = boss.makeGun();
            gunRight.y -= 25;
            gunRight.rotation = deg(90 - 40);
            gunRight.speed = 2;
            foo(gunRight, deg(-20));
            yield* Sleep(80);
            boss.glideTo(boss.wander.getStepd());
            yield* Sleep(30);
        } },
    });
    const 漫天落雪 = jstg.makeSingleBossSpellOptions({
        time: 60 * 60, hp: 4500, title: "冬符「漫天落雪的大口真神原」",
        loopFn({ boss, loop }) {
            if (loop.clock % 300 === 250) { boss.glideTo(boss.wander.getStepd()); }
        },
        *gen({ boss, spellcard, shield, loop }) { let count = 0; let lastSoundCount = 0; while (true) {
            // const danPerFrame = 0.4;
            // const speedMul = 0.55;
            // const danPerFrame = 0.65;
            // const speedMul = 0.6;
            // const danPerFrame = 1;
            // const speedMul = 0.7;
            const danPerFrame = 1.4;
            const speedMul = 0.8;
            const s = Math.sin(deg(loop.clock / 2));
            const dir = deg(90 + 30 * s * Math.abs(s));
            const danTypes = rand.shuffled([
                "smallball", "smallball", "smallball",
                "dot", "dot", "dot", "dot",
                "grain",
                "ringball", "ringball", "ringball",
            ]);
            let xList = [];
            for (let i = 0; i < danTypes.length; i++) { xList.push(lerp(-600, 600, (i + rand.float(0, 1)) / danTypes.length)); }
            xList = rand.shuffled(xList);
            for (let i = 0; i < danTypes.length; i++) {
                while (count > loop.clock * danPerFrame) {
                    if (count - lastSoundCount >= 9) {
                        lastSoundCount += 9;
                        thse.kira00.play(decibel(-3));
                    }
                    yield;
                };
                const dan = makeDanmaku({
                    type: danTypes[i],
                    color: rand.select(["h180", "h180", "h210", "white", "white", "white"]),/*
                    color: rand.select(["h180", "h180", "h210", "h240", "white", "white", "white"]),/**/
                    x: xList[i],
                    y: rand.float(-260, -250),
                });
                const vx = Math.cos(dir) * rand.float(4, 6) * speedMul;
                if ((dan.x < -210 && vx <= 0) || (dan.x > 210 && vx >= 0)) {
                    dan.destroy();
                } else {
                    const vy = rand.float(2, 3) * speedMul;
                    dan.rotation = Math.atan2(vy, vx);
                    dan.forever(loop => {
                        dan.x += vx;
                        dan.y += vy;
                    });
                    dan.loopBoundaryDelete(300);
                }
                count ++;
            }
        } },
    });
    const 波力海苔 = jstg.makeSingleBossSpellOptions({
        time: 50 * 60, hp: 4000, title: "你好「波粒海苔」",
        //autoInvincibleMode: "noDamageWhilePlayerInvincible",
        *gen({ boss, spellcard, shield }) {
            spellcard.forever(loop => {
                boss.glideTo({
                    x: 40 * Math.cos(loop.clock * 0.01),
                    y: 20 * Math.sin(loop.clock * 0.01) - 80,
                });
            });
            let omega = 0;
            let d = deg(0);
            while (true) {
                game.prefabSounds.thse.tan00.play(decibel(-9));
                const gun1 = boss.makeGun();
                gun1.rotation = d;
                for (const gun2 of gun1.ringBlast(3)) {
                    gun2.step(30);
                    makeFoggyDanmaku({
                        type: "crystal", color: "h30", ...gun2,
                    }).then(dan => {
                        dan?.forever(loop => {
                            dan.step(2.5);
                            dan.boundaryDelete();
                        });
                    });
                }
                d += omega;
                omega += deg(0.045);
                yield;
            }
        },
    });
    const non2 = jstg.makeSingleBossSpellOptions({
        time: 30 * 60, hp: 3000,
        fn({ boss, spellcard, shield }) {
            spellcard.forever(loop => {
                if (loop.clock % 17 === 0) {
                    game.prefabSounds.thse.tan00.play(decibel(-15));
                    for (const gun of boss.aimedGun(pl).scatter({ amount: 5, deg: 60 })) {
                        makeFoggyDanmaku({
                            type: "chain", ...gun, color: "blue", speed: 8
                        }).then(dan => dan?.forever(loop => {
                            dan.step();
                            dan.speedToK(1.5, 0.05);
                            dan.boundaryDelete();
                        }));
                    }
                }
                if (loop.clock % 41 === 10) {
                    game.prefabSounds.thse.kira00.play(decibel(-3));
                    const gun1 = boss.aimedGun(pl);
                    gun1.rotation += deg(180 / 20);
                    for (const gun2 of gun1.ringBlast(40)) {
                        gun2.step(30);
                        makeFoggyDanmaku({
                            type: "chain", ...gun2, color: "pink", speed: 0,
                        }).then(dan => dan?.forever(loop => {
                            dan.step();
                            dan.speedToA(8, 0.06);
                            dan.boundaryDelete();
                        }));
                    };
                }
            });
        }
    });
    const fooBoss = () => coDo(function*() {
        yield* Sleep(30);
        const boss = board.makeBoss(game.prefabCharInfos.koke.boss);
        const battle = board.startSingleBossBattle({
            boss,
            spells: [
                non1,
                漫天落雪,
                //non2, { title: "aaaaaaaa", hp: 50, time: 15 * 60 }, { title: "bbbbbbbb", hp: 50, time: 15 * 60}
            ],
        });
    });
    fooBoss();
    debug.vars.addInput("foo");
    debug.vars.addInput("bar");
    debug.vars.addInput("baz", { type: "text" });
    debug.vars.show();
    //#endregion

    forever(loop => {
        //txt.text = debug.vars.getStr("bar") + debug.vars.getStr("baz");
        if (isDown("KeyP")) {
            if (!debug.showHitbox.isOn) {
                debug.showHitbox.isOn = true;
                debug.showHitbox.isShowDanmakuBoth = true;
            } else if (debug.showHitbox.isShowDanmakuBoth) {
                debug.showHitbox.isShowDanmakuBoth = false;
            } else {
                debug.showHitbox.isOn = false;
            }
        }
        if (isDown("KeyO")) {
            debug.godMode.isOn = !debug.godMode.isOn;
        }
        if (isDown("KeyM")) {
            fooBoss();
        }
    }, { order: 0 });

    forever(loop => {
        if (isDown("Escape")) {
            game.mainPauseController.isRun = !game.mainPauseController.isRun;
            game.prefabSounds.thse.pause.play();
        }
    }, { order: 0, pauseController: "none" });

})();