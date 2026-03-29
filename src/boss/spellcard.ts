import * as pixi from "pixi";
import { CommonEnemy } from "../entity/commonEnemy.js";
import { Game, Combat, Board, Player } from "../jstg.js";
import { alphaTo, clamp, makeElements } from "../utils.js";
import { LooperFn, LoopOptions, CoDoGenFn } from "../looper.js";
import * as utils from "../utils.js";


/** 弹幕引擎里一个跟摄像机变换有关的全局变量，暂时只是个占位符，没有实际作用 */
export const sic_UiGradient = 1;

export interface StartSpellcardOptions {
    game: Game, combat: Combat, board: Board,
    ownEnemys: CommonEnemy[],
    figure: pixi.Texture | "noFigure" | "useTheUnknownFigure",
    title: string | null,
    time: number,
    isPlayStartSound: boolean,
    startupTime: number, // 这个不太优雅……但暂时来看够用。
}

export function baseStartSpellcard(spellcardOptions: StartSpellcardOptions) {
    const { game, combat, board, title: titleString, time: maxTime, ownEnemys: ownsEnemys } = spellcardOptions;
    const beginClockTs = game.clock + spellcardOptions.startupTime;
    let endClockTs: number | null = null;
    if (spellcardOptions.isPlayStartSound) { game.prefabSounds.thse.cat00.play(); }

    let isMissOrBomb = false;
    let isSpellcardDestroyed = false;
    const spellcard = {
        get clock() { return game.clock - beginClockTs; },
        get timeRemaining() { return maxTime - this.clock; },

        kill() {
            mainLoop.destroy();
        },

        destroy() {
            if (isSpellcardDestroyed) { return; }
            isSpellcardDestroyed = true;
            mainLoop.destroy();
            // 此处无需摧毁 figure ，让它自生自灭就行。
            timerText.destroy();
            title?.root.destroy({ children: true });
        },
        get destroyed() {
            return ownsEnemys.some(enemy => enemy.destroyed) || isSpellcardDestroyed || this.timeRemaining <= 0;
        },

        onMiss(options: { player: Player }) { isMissOrBomb = true; },
        onBomb(options: { player: Player }) { isMissOrBomb = true; },

        forever(fn: LooperFn, options: LoopOptions = {}) {
            const loop = board.forever(fn, options);
            loop.addRefs(this);
            return loop;
        },
        coDo(genFn: CoDoGenFn, options: LoopOptions = {}) {
            const loop = board.coDo(genFn, options);
            loop.addRefs(this);
            return loop;
        },
    };
    spellcard.forever = spellcard.forever.bind(spellcard);
    spellcard.coDo = spellcard.coDo.bind(spellcard);
    board._spellcardRegList.push(spellcard);

    //#region 立绘
    const figure = spellcardOptions.figure === "noFigure" ? null : new pixi.Sprite({
        parent: board.spellcardFigureLayer,
        anchor: 0.5,
        texture: spellcardOptions.figure === "useTheUnknownFigure" ?
            game.prefabTextures.charFigure.unknown :
            spellcardOptions.figure,
        scale: 1.6,
        zIndex: 0,
        alpha: 0,
    });
    if (figure !== null) { board.coDo(function*() { // 此处没必要依赖 spellcard ，一个立绘飞过去的动画而已……
        // MAYDO: 写个新的符卡宣言动画，这里直接沿用弹幕引擎的写法……其实我不是特别喜欢这个，但也完全谈不上讨厌，感觉犯不上为了这点破事大动干戈。反正调这玩意得不断编译，非常麻烦。。。
        for (let t = 20; t <= 140; t += game.timeScale) {
            // 这俩变量是弹幕引擎里的局部变量，我也不知道这玩意该叫啥……
            const sic_posX = 100 - 155 * sic_UiGradient;
            const sic_temp = (t/2 - 35) * (Math.abs(t/2 - 35) + 10);
            const x = sic_temp * 0.08 + sic_posX
            figure.x = (x + 70) * 4/3;
            figure.y = (sic_temp * 0.02 - 40) * -4/3;
            figure.alpha = 1 - clamp(Math.abs(x - sic_posX) * 0.8 + 20, 0, 100) / 100;
            yield;
        }
    }, { owns: figure, order: 0 }); }
    //#endregion 立绘

    //#region 主进程
    const timerText = new pixi.Text({
        parent: board.spellcardUiLayer,
        x: 0, y: -board.halfHeight - 30, anchor: 0.5,
        resolution: 4,
        style: {
            fontSize: 16,
            align: "center",
            //fill: "#eeeeee",
            stroke: {
                color: "#111111",
                width: 3,
                join: "round",
            },
        },
        zIndex: 10,
        alpha: 0.5,
    });
    let lastRingNum = 10;
    const timerTargetY = -board.halfHeight + (titleString === null ? 13 : 33);

    const mainLoop = spellcard.forever(() => {
        // 保留两位小数后取出的整数
        const time = Math.round(utils.clamp(spellcard.timeRemaining, 0, spellcardOptions.time) / 60 * 100);
        timerText.style.fill = "#eeeeee";
        timerText.y += (timerTargetY - timerText.y) * 0.05 * game.timeScale;
        alphaTo(timerText, 1, 0.05 * game.timeScale);
        timerText.scale.x += (1 - timerText.scale.x) * 0.1 * game.timeScale;
        timerText.scale.y += (1 - timerText.scale.y) * 0.1 * game.timeScale;
        if (time >= 1000_00) {
            timerText.text = "999.99";
        } else if (time >= 100_00) {
            const s = `${time}`;
            timerText.text = `${s.substring(0, 3)}.${s.substring(3, 5)}`;
        } else if (time >= 10_00) {
            const s = `${time}`;
            timerText.text = `${s.substring(0, 2)}.${s.substring(2, 4)}`;
        } else if (time >= 10) { // TODO: 计时器不固定在最后 10 秒内变红，而是在最后一定比例的时间内闪烁。
            const s = time >= 1_00 ? `0${time}` : `00${time}`;
            timerText.text = `${s.substring(0, 2)}.${s.substring(2, 4)}`
            timerText.style.fill = time > 500 ? "#ff6666" : "#f43636";
            if (time / 100 < lastRingNum) {
                lastRingNum = Math.floor(time / 100);
                (time > 500 ? game.prefabSounds.thse.timeout : game.prefabSounds.thse.timeout2).play();
                timerText.scale = 1.2;
            }
        } else {
            timerText.text = time >= 0 ? `00.0${time}` : "00.00";
            timerText.style.fill = "#f43636";
        }
    }, { order: 0 }).then(() => { board.coDo(function*() {
        endClockTs = game.clock;
        ownsEnemys.forEach(enemy => enemy.kill());
        if (endClockTs - beginClockTs >= maxTime) {
            // 全避
            timerText.text = "00.00";
            timerText.style.fill = "#f43636";
            game.prefabSounds.thse.fault.play();
        } else if (isMissOrBomb) {
            // 收取失败
        } else {
            // 收取
            game.prefabSounds.thse.cardget.play();
        }
        board.coDo(function*() {
            board._playerRegList.forEachAlive(pl => pl.applyInvincible(60));
            board.foo_clearScreen({ x: 0, y: 80 * 4/3 }); // 此处姑且用一个固定坐标……敌人似了之后再读取坐标，逻辑比较麻烦。
        });
        for (let t = 0; t < 60; t += game.timeScale) { // 这里偷个懒复制粘贴
            timerText.y += (timerTargetY - timerText.y) * 0.05 * game.timeScale;
            alphaTo(timerText, 1, 0.05 * game.timeScale);
            timerText.scale.x += (1 - timerText.scale.x) * 0.1 * game.timeScale;
            timerText.scale.y += (1 - timerText.scale.y) * 0.1 * game.timeScale;
            yield;
        }
        let v = 0;
        while (timerText.alpha > 0) {
            timerText.y += v * game.timeScale;
            v -= 0.2 * game.timeScale;
            alphaTo(timerText, 0, 0.05 * game.timeScale);
            yield;
        }
    }, { destroys: spellcard, order: 0 }); });
    //#endregion 主进程

    //#region 符卡标题
    const title = titleString === null ? null : (()=>{
        const initY = 90 * 4 / 3;
        const targetY = -board.halfHeight + 11;
        const root = new pixi.Sprite({
            parent: board.spellcardUiLayer,
            x: (300 - 155 * sic_UiGradient) * 4/3, y: initY,
            zIndex: 5,
            alpha: 0,
        });
        const line = new pixi.Sprite({
            parent: root,
            anchor: 0.5,
            y: 12,
            texture: game.prefabTextures.spellcardUi.spellcardTitleLine,
        });
        const text = new pixi.Text({
            parent: root,
            text: titleString,
            x: 5, anchor: { x: 1, y: 0.5 },
            resolution: 4,
            style: {
                fontSize: 20,
                align: "center",
                fill: "#eeeeee",
                stroke: {
                    color: "#111111",
                    width: 3,
                    join: "round",
                },
            },
        });
        spellcard.coDo(function*() {
            for (let t = 0; t < 70; t += game.timeScale) {
                alphaTo(root, 1, 0.015 * game.timeScale);
                root.scale = Math.sin(utils.deg(180 + root.alpha * 90)) * 1.6 + 2.3;
                yield;
            }
            root.alpha = 1;
            root.scale = 0.7;
            for (let t = 0; t < 60; t += game.timeScale) {
                root.y = utils.lerp(initY, targetY, 1 - Math.cos(utils.deg(t * 1.5)));
                yield;
            }
            root.y = targetY;
            while (!spellcard.destroyed) {
                yield;
            }
        }, { refs: mainLoop, order: 0 }).then(() => { board.coDo(function*() {
            yield* game.Sleep(60);
            let v = 0;
            while (root.alpha > 0) {
                root.x += v;
                v += 0.3 * game.timeScale;
                alphaTo(root, 0, 0.05 * game.timeScale);
                yield;
            }
        }, { owns: root, order: 0 }); });
        return { root, line, text };
    })();
    //#endregion

    //#region 版底目标指示器
    const targetPointers: pixi.Sprite[] = [];
    for (const enemy of ownsEnemys) {
        const pointer = new pixi.Sprite({
            parent: board.spellcardUiLayer,
            texture: game.prefabTextures.spellcardUi.targetPointer,
            anchor: 0.5,
            y: board.halfHeight, scale: 1.1,
            alpha: 0,
        });
        targetPointers.push(pointer);
        let twinkPhase = 0;
        spellcard.forever(loop => {
            pointer.x = enemy.x;
            const minDist = Math.min(...board._playerRegList.getAlives().map(pl => Math.abs(pl.x - pointer.x)));
            let alpha = Math.min(minDist * 0.004 + 0.16, 1);
            const minHp = Math.min(...ownsEnemys.map(enemy => enemy.hp));
            if (minHp <= 1000) {
                const twinkOmega = Math.min((1300 - minHp) / 1000, 1);
                twinkPhase += utils.deg(twinkOmega * 30 * game.timeScale);
                alpha *= 1 - (twinkOmega * 0.2 * (Math.cos(twinkPhase) + 1));
            } else {
                twinkPhase = 0;
            }
            pointer.alpha = utils.clamp(alpha, 0, 1);
        }, { refs: pointer, order: 10, }).then(() => { board.coDo(function*() {
            while (pointer.alpha > 0) {
                pointer.alpha -= 5 * game.timeScale;
                yield;
            }
        }, { owns: pointer, order: 10 }) });
    }
    //#endregion

    return spellcard;
}

export type Spellcard = ReturnType<typeof baseStartSpellcard>;