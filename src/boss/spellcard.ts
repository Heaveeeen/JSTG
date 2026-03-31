import * as pixi from "pixi";
import { CommonEnemy } from "../entity/commonEnemy.js";
import { Game, Combat, Board, Player } from "../jstg.js";
import { alphaTo, clamp, makeElements } from "../utils.js";
import { LooperFn, LoopOptions, CoDoGenFn } from "../looper.js";
import * as utils from "../utils.js";


/** 弹幕引擎里一个跟摄像机变换有关的全局变量，暂时只是个占位符，没有实际作用 */
export const spde_UiGradient = 1;

export interface StartSpellcardOptions {
    game: Game, combat: Combat, board: Board,
    ownEnemys: CommonEnemy[],
    figure: pixi.Texture | "noFigure" | "useTheUnknownFigure",
    title: string,
    time: number,
    isPlayStartSound: boolean,
    startupDuration: number, // 这个不太优雅……但暂时来看够用。
    isNonSpell: boolean,
    isSurvival: boolean,
}

export function baseStartSpellcard(spellcardOptions: StartSpellcardOptions) {
    const { game, combat, board, title: titleString, time: maxTime, ownEnemys, isNonSpell, isSurvival } = spellcardOptions;
    const beginClockTs = game.clock + spellcardOptions.startupDuration;
    let endClockTs: number | null = null;
    if (spellcardOptions.isPlayStartSound) { game.prefabSounds.thse.cat00.play(); }

    let isMissOrBomb = false;
    let isSpellcardDestroyed = false;
    const spellcard = {
        get clock() { return game.clock - beginClockTs; },
        get timeRemaining() { return maxTime - this.clock; },

        kill() {
            liveLoop.destroy();
        },

        destroy() {
            if (isSpellcardDestroyed) { return; }
            isSpellcardDestroyed = true;
            mainLoop.destroy();
            figure?.destroy({ children: true });
            timerText.destroy();
            title?.root.destroy({ children: true });
            resultPopup?.destroy({ children: true });
        },
        get destroyed() {
            return ownEnemys.some(enemy => enemy.destroyed) || isSpellcardDestroyed || this.timeRemaining <= 0;
        },

        onMiss(options: { player: Player }) { isMissOrBomb = true; },
        onBomb(options: { player: Player }) { isMissOrBomb = true; },

        forever<T>(fn: LooperFn<T>, options: LoopOptions = {}) {
            const loop = board.forever(fn, options);
            loop.addRefs(this);
            return loop;
        },
        coDo<T>(genFn: CoDoGenFn<T>, options: LoopOptions = {}) {
            const loop = board.coDo(genFn, options);
            loop.addRefs(this);
            return loop;
        },

        get mainLoop() { return mainLoop; },
    };
    spellcard.forever = spellcard.forever.bind(spellcard);
    spellcard.coDo = spellcard.coDo.bind(spellcard);
    board._spellcardRegList.push(spellcard);

    const getTimeStr = (time: number) => {
        const timeCs = Math.round(utils.clamp(time, 0, maxTime) / 60 * 100);
        if (timeCs >= 1000_00) {
            return "999.99";
        } else if (timeCs >= 100_00) {
            const s = `${timeCs}`;
            return `${s.substring(0, 3)}.${s.substring(3, 5)}`;
        } else if (timeCs >= 10_00) {
            const s = `${timeCs}`;
            return `${s.substring(0, 2)}.${s.substring(2, 4)}`;
        } else if (timeCs >= 10) {
            const s = timeCs >= 1_00 ? `0${timeCs}` : `00${timeCs}`;
            return `${s.substring(0, 2)}.${s.substring(2, 4)}`
        } else {
            return timeCs >= 0 ? `00.0${timeCs}` : "00.00";
        }
    };

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
            const spde_posX = 100 - 155 * spde_UiGradient;
            const spde_temp = (t/2 - 35) * (Math.abs(t/2 - 35) + 10);
            const x = spde_temp * 0.08 + spde_posX
            figure.x = (x + 70) * 4/3;
            figure.y = (spde_temp * 0.02 - 40) * -4/3;
            figure.alpha = 1 - clamp(Math.abs(x - spde_posX) * 0.8 + 20, 0, 100) / 100;
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
            fill: "#eeeeee",
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
    const timerTargetY = -board.halfHeight + (isNonSpell ? 13 : 33);

    const liveLoop = spellcard.forever(() => {
        // 保留两位小数后取出的整数
        timerText.style.fill = "#eeeeee";
        timerText.y += (timerTargetY - timerText.y) * 0.05 * game.timeScale;
        alphaTo(timerText, 1, 0.05 * game.timeScale);
        timerText.scale.x += (1 - timerText.scale.x) * 0.1 * game.timeScale;
        timerText.scale.y += (1 - timerText.scale.y) * 0.1 * game.timeScale;
        const { timeRemaining } = spellcard;
        timerText.text = getTimeStr(timeRemaining);
        if (timeRemaining < 10 * 60) { //MAYDO: 计时器不固定在最后 10 秒内变红，而是在最后一定比例的时间内闪烁。
            timerText.style.fill = timeRemaining > 5 * 60 ? "#ff6666" : "#f43636";
            if (timeRemaining / 60 < lastRingNum) {
                lastRingNum = Math.floor(timeRemaining / 60);
                (timeRemaining > 5 * 60 ? game.prefabSounds.thse.timeout : game.prefabSounds.thse.timeout2).play();
                timerText.scale = 1.2;
            }
        }
        if (game.debug.godMode.isOn) { isMissOrBomb = true; }
    }, { order: 0 });
    let resultPopup: pixi.Sprite | null = null;
    const mainLoop = board.coDo(function*() {
        yield* liveLoop;
        // 击破后的收尾
        endClockTs = game.clock;
        ownEnemys.forEach(enemy => enemy.kill());
        board._playerRegList.forEachAlive(pl => pl.applyInvincible(60));
        board.foo_clearScreen({ x: 0, y: 80 * 4/3 }); // 此处姑且用一个固定坐标……敌人似了之后再读取坐标，逻辑比较麻烦。
        board.coDo(function*() { // 计时器
            for (let t = 0; t < 40; t += game.timeScale) { // 这里偷个懒复制粘贴
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
        }, { owns: timerText, order: 0 });
        // 收卡提示
        const resultType = (()=>{
            if (isMissOrBomb) {
                // 通过
                return "pass";
            } else if (!isSurvival && endClockTs - beginClockTs >= maxTime) {
                // 全避（NN & 未击破）
                timerText.text = "00.00";
                timerText.style.fill = "#f43636";
                game.prefabSounds.thse.fault.play();
                return "dodge";
            } else {
                // 收取（NN & 击破，或者全避时符）
                if (!isNonSpell) { game.prefabSounds.thse.cardget.play(); }
                return "get";
            }
        })();
        const resultTexture = game.prefabTextures.spellcardUi.result[resultType];
        resultPopup = new pixi.Sprite({
            parent: board.spellcardUiLayer,
            texture: resultTexture,
            anchor: 0.5,
            x: 0,
            // 弹幕引擎里，这东西的尺寸是 0.8
            scale: 1,
            alpha: 0,
        })
        const resultTitle = new pixi.Text({
            parent: resultPopup,
            text: titleString,
            x: -64, y: 15, anchor: { x: 0, y: 0.5 },
            resolution: 4,
            style: {
                fontSize: 18,
                align: "center",
                fill: "#eee",
            },
            zIndex: 10,
        });
        const resultTime = new pixi.Text({
            parent: resultPopup,
            text: getTimeStr(endClockTs - beginClockTs),
            x: 90, y: -16, anchor: { x: 1, y: 0.5 },
            resolution: 4,
            style: {
                fontSize: 12,
                align: "center",
                fill: "#aaa",
            },
            zIndex: 10,
        });
        if (isNonSpell) {
            yield* game.Sleep(30);
        } else {
            let t = 0;
            const popupBaseY = -20 * 4/3;
            board.forever(loop => {
                if (resultPopup === null) { return loop.destroy(); }
                // 这里的动画比弹幕引擎稍快一点
                let tf = t < 30 ? (t - 30) / 30 : t < 90 ? 0 : (t - 90) / 30;
                tf *= tf ** 2;
                resultPopup.y = popupBaseY - tf * 30;
                resultPopup.alpha = clamp(1 - Math.abs(tf), 0, 1);
                if (t > 90 && resultPopup.alpha <= 0) {
                    return loop.destroy();
                }
                t += game.timeScale;
            }, { owns: resultPopup });
            yield* game.Sleep(60);
        }
    });
    //#endregion 主进程

    //#region 符卡标题
    const title = isNonSpell ? null : (()=>{
        const initY = 90 * 4 / 3;
        const targetY = -board.halfHeight + 11;
        const root = new pixi.Sprite({
            parent: board.spellcardUiLayer,
            x: (300 - 155 * spde_UiGradient) * 4/3, y: initY,
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
        }, { refs: liveLoop, order: 0 }).then(() => { board.coDo(function*() {
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
    for (const enemy of ownEnemys) {
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
            const minHp = Math.min(...ownEnemys.map(enemy => enemy.hp));
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