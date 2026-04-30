import * as pixi from "pixi";
import { CommonEnemy } from "../entity/commonEnemy.js";
import { Game, Combat, Board, Player } from "../jstg.js";
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
    isNonSpell: boolean,
    isSurvival: boolean,
}

export function baseStartSpellcard(spellcardOptions: StartSpellcardOptions) {
    const { game, combat, board, title: titleString, time: maxTime, ownEnemys, isNonSpell, isSurvival } = spellcardOptions;
    const beginClockTs = combat.clock;
    let endClockTs: number | null = null;
    if (spellcardOptions.isPlayStartSound) { game.prefabSounds.thse.cat00.play(); }
    game.debug.godMode.dieCount = 0;

    let missCount = 0;
    let bombCount = 0;
    let isUsedGodMode = false;

    let isSpellcardDestroyed = false;
    const spellcard = {
        get clock(): number { return combat.clock - beginClockTs; },
        get timeRemaining(): number { return maxTime - this.clock; },

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
            summaryPopup?.destroy({ children: true });
        },
        get destroyed() {
            return ownEnemys.some(enemy => enemy.destroyed) || isSpellcardDestroyed || spellcard.timeRemaining <= 0;
        },

        onMiss(options: { player: Player }) { missCount++; },
        onBomb(options: { player: Player }) { bombCount++; },

        forever<T>(fn: LooperFn<T>, options: LoopOptions = {}) {
            const loop = board.forever(fn, options);
            loop.addRefs(spellcard);
            return loop;
        },
        coDo<T>(genFn: CoDoGenFn<T>, options: LoopOptions = {}) {
            const loop = board.coDo(genFn, options);
            loop.addRefs(spellcard);
            return loop;
        },

        get mainLoop() { return mainLoop; },
    };
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
        // MAYDO: 写个新的符卡宣言动画，这里直接沿用弹幕引擎的写法……其实我不是特别喜欢这个（我更喜欢车万原作那种快节奏的），但也完全谈不上讨厌，感觉犯不上为了这点破事大动干戈。反正调这玩意得不断编译，非常麻烦。。。
        for (let t = 20; t < 140; t += game.timeScale) {
            // 这俩变量是弹幕引擎里的局部变量，我也不知道这玩意该叫啥……
            const spde_posX = 100 - 155 * spde_UiGradient;
            const spde_temp = (t/2 - 35) * (Math.abs(t/2 - 35) + 10);
            const x = spde_temp * 0.08 + spde_posX
            figure.x = (x + 70) * 4/3;
            figure.y = (spde_temp * 0.02 - 40) * -4/3;
            figure.alpha = 1 - utils.clamp(Math.abs(x - spde_posX) * 0.8 + 20, 0, 100) / 100;
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
        game.alphaTo(timerText, 1, 0.05);
        timerText.scale.x += (1 - timerText.scale.x) * 0.1 * game.timeScale;
        timerText.scale.y += (1 - timerText.scale.y) * 0.1 * game.timeScale;
        const { timeRemaining } = spellcard;
        timerText.text = (utils.clamp(timeRemaining, 0, maxTime) / 60).toFixed(2).padStart(5, "0");
        if (timeRemaining < 10 * 60) { //MAYDO: 计时器不固定在最后 10 秒内变红，而是在最后一定比例的时间内闪烁。
            timerText.style.fill = timeRemaining > 5 * 60 ? "#ff6666" : "#f43636";
            if (timeRemaining / 60 < lastRingNum) {
                lastRingNum = Math.floor(timeRemaining / 60);
                (timeRemaining > 5 * 60 ? game.prefabSounds.thse.timeout : game.prefabSounds.thse.timeout2).play();
                timerText.scale = 1.2;
            }
        }
        if (game.debug.godMode.isOn) { isUsedGodMode = true; }
    }, { order: 0 });
    let summaryPopup: pixi.Sprite | null = null;
    const mainLoop = board.coDo(function*() {
        yield* liveLoop;
        // 击破后的收尾
        endClockTs = combat.clock;
        ownEnemys.forEach(enemy => enemy.kill());
        const clearBoardDuration = isNonSpell ? 30 : 60;
        board._playerRegList.getAlives().forEach(pl => pl.applyInvincible(clearBoardDuration));
        board.clearBoard({ x: 0, y: -80 * 4/3, duration: clearBoardDuration, permissionType: "force", isDestroyGun: true }); // 此处姑且用一个固定坐标……敌人似了之后再读取坐标，逻辑比较麻烦。
        if (endClockTs - beginClockTs >= maxTime) { timerText.text = "00.00"; }
        board.coDo(function*() { // 计时器
            for (let t = 0; t < 40; t += game.timeScale) { // 这里偷个懒复制粘贴
                timerText.y += (timerTargetY - timerText.y) * 0.05 * game.timeScale;
                game.alphaTo(timerText, 1, 0.05);
                timerText.scale.x += (1 - timerText.scale.x) * 0.1 * game.timeScale;
                timerText.scale.y += (1 - timerText.scale.y) * 0.1 * game.timeScale;
                yield;
            }
            let v = 0;
            while (timerText.alpha > 0) {
                timerText.y += v * game.timeScale;
                v -= 0.2 * game.timeScale;
                game.alphaTo(timerText, 0, 0.05);
                yield;
            }
        }, { owns: timerText, order: 0 });
        // 收卡提示
        const summary: SpellcardSummary = (()=>{
            let type: SpellcardSummary["type"];
            if (isUsedGodMode) {
                type = "godMode";
            } else if (missCount > 0 || bombCount > 0) {
                // 通过
                type = "pass";
            } else if (!isSurvival && endClockTs - beginClockTs >= maxTime) {
                // 全避（NN & 未击破）
                timerText.text = "00.00";
                timerText.style.fill = "#f43636";
                game.prefabSounds.thse.fault.play();
                type = "dodge";
            } else {
                // 收取（NN & 击破，或者全避时符）
                if (!isNonSpell) { game.prefabSounds.thse.cardget.play(); }
                type = "get";
            }
            return {
                type, missCount, bombCount,
                godModeDieCount: game.debug.godMode.dieCount,
                time: utils.clamp(endClockTs - beginClockTs, 0, maxTime),
            };
        })();
        game.debug.godMode.dieCount = 0;
        const resultTexture = game.prefabTextures.spellcardUi.summaryPopup[summary.type];
        summaryPopup = new pixi.Sprite({
            parent: board.spellcardUiLayer,
            texture: resultTexture,
            anchor: 0.5,
            x: 0,
            // 弹幕引擎里，这东西的尺寸是 0.8
            scale: 1,
            alpha: 0,
        });
        const summaryTypeText = new pixi.Text({
            parent: summaryPopup,
            text: {
                godMode: `调试 ${summary.missCount}+${summary.godModeDieCount}m${summary.bombCount}b`,
                pass: "通过",
                dodge: "全避",
                get: "收取",
            }[summary.type],
            x: -62, y: -15, anchor: { x: 0, y: 0.5 },
            resolution: 4,
            style: {
                fontSize: 16,
                align: "center",
                fill: "#eee",
            },
            zIndex: 10,
        });
        const summaryTitle = new pixi.Text({
            parent: summaryPopup,
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
        const summaryTime = new pixi.Text({
            parent: summaryPopup,
            text: (summary.time / 60).toFixed(2) + "s",
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
                if (summaryPopup === null) { return loop.destroy(); }
                // 这里的动画比弹幕引擎稍快一点
                let tf = t < 30 ? (t - 30) / 30 : t < 90 ? 0 : (t - 90) / 30;
                tf *= tf ** 2;
                summaryPopup.y = popupBaseY - tf * 30;
                summaryPopup.alpha = utils.clamp(1 - Math.abs(tf), 0, 1);
                if (t > 90 && summaryPopup.alpha <= 0) {
                    return loop.destroy();
                }
                t += game.timeScale;
            }, { owns: summaryPopup });
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
                game.alphaTo(root, 1, 0.015);
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
            root.alpha = 1;
            root.scale = 0.7;
            root.y = targetY;
            yield* game.Sleep(60);
            let v = 0;
            while (root.alpha > 0) {
                root.x += v;
                v += 0.3 * game.timeScale;
                game.alphaTo(root, 0, 0.05);
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

export type SpellcardSummary = {
    type: "godMode" | "pass" | "dodge" | "get",
    missCount: number,
    bombCount: number,
    godModeDieCount: number,
    time: number,
};