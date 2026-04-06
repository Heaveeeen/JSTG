import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { baseStartSpellcard, spde_UiGradient, Spellcard } from "./spellcard.js";
import { AutoInvincibleMode, CommonEnemy } from "../entity/commonEnemy.js";
import { LooperFn, LoopOptions, CoDoGenFn, CoDoGenerator, LoopController } from "../looper.js";
import { Boss } from "./boss.js";



const _startupDuration = 60;

/** TODOC: baseMakeSingleBossBattleController */
export const baseMakeSingleBossBattleController = (manualBossBattleOptions: {
    game: Game, combat: Combat, board: Board,
    refBoss: Boss, name: string,
}) => {
    const { game, combat, board, refBoss } = manualBossBattleOptions;

    const scCounterBar = (()=>{
        const root = new pixi.Sprite({
            parent: board.spellcardUiLayer,
            x: -(300 - 155 * spde_UiGradient) * 4/3, y: -board.halfHeight,
            alpha: 0,
        });

        const line = new pixi.Sprite({
            parent: root,
            anchor: 0.5,
            y: 15,
            scale: 0.55,
            texture: game.prefabTextures.spellcardUi.bossNameLine,
        });

        const bossNameText = new pixi.Text({
            parent: root,
            text: manualBossBattleOptions.name,
            x: 3, y: 7, anchor: { x: 0, y: 0.5 },
            resolution: 4,
            style: {
                fontSize: 10,
                align: "center",
                fill: "hsl(80, 60%, 67%)",
                fontWeight: "700",
            },
        });

        const stars: pixi.Sprite[] = [];

        const fadeInLoop = board.coDo(function*() { for (let t = 0; t < 20; t += game.timeScale) {
            root.alpha = t / 20;
            yield;
        } }, { refs: root });

        return {
            root, line, bossNameText, stars,
            pushStar(type: "spellcard" | "nonSpellcard") {
                const star = new pixi.Sprite({
                    parent: root,
                    texture: game.prefabTextures.spellcardUi.scCounterIcon[type],
                    anchor: 0.5,
                    x: stars.length * 12 + 8, y: 23,
                    scale: 0.8,
                });
                stars.push(star);
                // MAYDO: 使当前符卡对应的星星闪烁
            },
            popStar() {
                const star = stars.pop();
                if (star === undefined) { return; }
                board.coDo(function*() { for (let t = 0; t < 20; t += game.timeScale) {
                    star.alpha = 1 - (t / 20);
                    yield;
                } }, { refs: star }).then(() => {
                    star.destroy({ children: true });
                });
            },
            kill() {
                if (this.destroyed) { return; }
                fadeInLoop.destroy();
                return board.coDo(function*() { for (let t = 0; t < 20; t += game.timeScale) {
                    root.alpha = 1 - (t / 20);
                    yield;
                } }, { refs: root }).then(() => {
                    this.destroy();
                });
            },
            destroy() {
                if (this.destroyed) { return; }
                root.destroy({ children: true });
            },
            get destroyed() { return root.destroyed; },
        };
    })();

    const startCommonSpellcard = (options: {
        time: number,
        hp: number,
        figure?: pixi.Texture,
        title: string,
        birthProtectDuration?: number,
        /** @default true */
        isShowFigureAndTitle?: boolean,
        /**
         * 这个参数可以用来让敌人不吃 Bomb 。  
         * "noDamageWhilePlayerInvincible" - 一旦玩家获得无敌帧或 Miss ，这个敌人也会随之进入无敌状态，免疫所有伤害。  
         * "ghostWhilePlayerInvincible" - 一旦玩家获得无敌帧或 Miss ，这个敌人会随之进入无法选中的虚化状态，无法受到任何伤害，并且不会被诱导弹索敌等等。  
         * @default "none"
         */
        autoInvincibleMode?: AutoInvincibleMode,
    }) => {
        const { time, title, hp, figure } = options;
        const isShowFigureAndTitle = options.isShowFigureAndTitle ?? true;
        const birthProtectDuration = options.birthProtectDuration ?? 250;
        const opt = isShowFigureAndTitle ? {
            isPlayStartSound: true,
            figure: figure ?? refBoss.defaultSpellcardFigure,
        } as const : {
            isPlayStartSound: false,
            figure: "noFigure",
        } as const;
        const shield = refBoss.makeSpellcardShield({ maxHp: hp, birthProtectDuration, autoInvincibleMode: options.autoInvincibleMode ?? "none" });
        const spellcard = baseStartSpellcard({
            game, combat, board,
            title, time, ...opt,
            ownEnemys: [shield],
            isNonSpell: !isShowFigureAndTitle,
            isSurvival: false,
        });
        shield.forever(loop => {
            shield.x = refBoss.x;
            shield.y = refBoss.y;
        });
        refBoss.glideTo({ x: 0, y: -80 * 4/3 });
        let t = 0;
        const startupLoop = refBoss.forever(loop => {
            if (t >= _startupDuration) {
                loop.destroy();
            } else {
                t += game.timeScale;
            }
        }).then(() => refBoss.stopGlide());
        return { spellcard, shield, startupLoop };
    };

    const startSurvivalSpellcard = (options: {
        time: number,
        figure?: pixi.Texture,
        title: string,
        isShowFigureAndTitle: boolean,
    }) => {
        const { time, title, figure, isShowFigureAndTitle } = options;
        const opt = isShowFigureAndTitle ? {
            isPlayStartSound: true,
            figure: figure ?? refBoss.defaultSpellcardFigure,
        } as const : {
            isPlayStartSound: false,
            figure: "noFigure",
        } as const;
        const spellcard = baseStartSpellcard({
            game, combat, board,
            title, time, ...opt,
            ownEnemys: [],
            isNonSpell: !isShowFigureAndTitle,
            isSurvival: false,
        });
        refBoss.glideTo({ x: 0, y: -80 * 4/3 });
        let t = 0;
        const startupLoop = refBoss.forever(loop => {
            if (t >= _startupDuration) {
                loop.destroy();
            } else {
                t += game.timeScale;
            }
        }).then(() => refBoss.stopGlide());
        return { spellcard, startupLoop };
    };

    let _destroyed = false;
    const destroy = () => {
        if (_destroyed) { return; }
        _destroyed = true;
        scCounterBar.destroy();
    };

    const battleController = {
        startCommonSpellcard, startSurvivalSpellcard, scCounterBar,
        kill() {
            scCounterBar.kill()?.then(() => destroy());
            // TODO: 击破特效？
        },
        destroy,
        get destroyed() { return refBoss.destroyed || _destroyed; },
            
        forever<T>(fn: LooperFn<T>, options: LoopOptions = {}) {
            const loop = board.forever(fn, options);
            loop.addRefs(battleController);
            return loop;
        },
    
        coDo<T>(genFn: CoDoGenFn<T>, options: LoopOptions = {}) {
            const loop = board.coDo(genFn, options);
            loop.addRefs(battleController);
            return loop;
        },
    };

    return battleController;
};

export type SingleBossBattle = ReturnType<typeof baseMakeSingleBossBattleController>;



//#region SpellOptions
interface BaseSpellOptions {
    /**
     * 是否为时符。  
     * @default false
     */
    isSurvival?: boolean,
    /** @default 2400 */
    time?: number,
    /** 不填写此参数，则采用构造战斗时设定的默认立绘；填写此参数，可以给这个符卡设定另一张立绘。（对非符无效，因为非符没有立绘） */
    figure?: pixi.Texture,
    /** 不填写此参数，则该符卡为非符 */
    title?: string | number,
}

interface CommonSpellOptions extends BaseSpellOptions {
    isSurvival?: false,
    /** @default 3000 */
    hp?: number,
    /**
     * 对于符卡，250 的出生保护近似等效于 3 秒无敌。《风神录》中的符卡保护差不多就是这个数。
     * @default 250
     */
    birthProtectDuration?: number,
    /**
     * 这个参数可以用来让敌人不吃 Bomb 。  
     * "noDamageWhilePlayerInvincible" - 一旦玩家获得无敌帧或 Miss ，这个敌人也会随之进入无敌状态，免疫所有伤害。  
     * "ghostWhilePlayerInvincible" - 一旦玩家获得无敌帧或 Miss ，这个敌人会随之进入无法选中的虚化状态，无法受到任何伤害，并且不会被诱导弹索敌等等。  
     * @default "none"
     */
    autoInvincibleMode?: AutoInvincibleMode,
    /** 符卡开始时，执行一次这个函数。 */
    fn?: ({ boss, spellcard, shield }: { boss: Boss, spellcard: Spellcard, shield: CommonEnemy }) => void,
    /** 符卡开始时，启动这个循环函数。（即`forever`） */
    loopFn?: ({ boss, spellcard, shield, loop }: { boss: Boss, spellcard: Spellcard, shield: CommonEnemy, loop: LoopController<unknown> }) => void,
    /** 符卡开始时，启动这个生成器函数。（即`coDo`） */
    gen?: ({ boss, spellcard, shield, loop }: { boss: Boss, spellcard: Spellcard, shield: CommonEnemy, loop: LoopController<unknown> }) => CoDoGenerator<unknown>,
}

interface SurvivalSpellOptions extends BaseSpellOptions {
    isSurvival: true,
    /** 符卡开始时，执行一次这个函数。 */
    fn?: ({ boss, spellcard }: { boss: Boss, spellcard: Spellcard }) => void,
    /** 符卡开始时，启动这个循环函数。（即`forever`） */
    loopFn?: ({ boss, spellcard, loop }: { boss: Boss, spellcard: Spellcard, loop: LoopController<unknown> }) => void,
    /** 符卡开始时，启动这个生成器函数。（即`coDo`） */
    gen?: ({ boss, spellcard, loop }: { boss: Boss, spellcard: Spellcard, loop: LoopController<unknown> }) => CoDoGenerator<unknown>,
}

export type SingleBossSpellOptions = CommonSpellOptions | SurvivalSpellOptions;

export const makeSingleBossSpellOptions = (options: SingleBossSpellOptions) => options;
//#endregion

export const baseStartSingleBossBattle = (bossBattleOptions: {
    game: Game, combat: Combat, board: Board,
    ownBoss: Boss, name: string,
    spells: SingleBossSpellOptions[],
    getNonSpellTitle: ((num: number) => string) | null,
}) => {
    const { game, combat, board, ownBoss, name, } = bossBattleOptions;
    const getNonSpellTitle = bossBattleOptions.getNonSpellTitle ?? (num => `非符${num}`);
    const spellInfos = bossBattleOptions.spells;
    const battle = baseMakeSingleBossBattleController({
        game, combat, board, refBoss: ownBoss, name
    });
    for (let i = spellInfos.length - 1; i >= 0; i--) {
        battle.scCounterBar.pushStar(spellInfos[i].title === undefined ? "nonSpellcard" : "spellcard");
    }

    battle.coDo(function*() {
        let nonsCounter = 1;
        for (let i = 0; i < spellInfos.length; i++) {
            const info = spellInfos[i];
            const isShowFigureAndTitle = info.title === undefined ? false : true;
            const title = (()=>{
                if (typeof info.title === "string") { return info.title; }
                if (typeof info.title === "number") { nonsCounter = info.title; }
                return getNonSpellTitle(nonsCounter++);
            })();
            const time = info.time ?? 2400;
            const { figure } = info;
            if (info.isSurvival) {
                const spellController = battle.startSurvivalSpellcard({
                    title, time, figure, isShowFigureAndTitle,
                })
                yield* spellController.startupLoop;
                const { fn, loopFn, gen } = info;
                fn?.({ ...spellController, boss: ownBoss });
                if (loopFn !== undefined) { spellController.spellcard.forever(loop => loopFn({ ...spellController, boss: ownBoss, loop })); }
                if (gen !== undefined) { spellController.spellcard.coDo(loop => gen({ ...spellController, boss: ownBoss, loop })); }
                yield* spellController.spellcard.mainLoop;
            } else {
                const spellController = battle.startCommonSpellcard({
                    title, time, figure, isShowFigureAndTitle,
                    hp: info.hp ?? 3000,
                    birthProtectDuration: info.birthProtectDuration,
                    autoInvincibleMode: info.autoInvincibleMode,
                })
                yield* spellController.startupLoop;
                const { fn, loopFn, gen } = info;
                fn?.({ ...spellController, boss: ownBoss });
                if (loopFn !== undefined) { spellController.spellcard.forever(loop => loopFn({ ...spellController, boss: ownBoss, loop })); }
                if (gen !== undefined) { spellController.spellcard.coDo(loop => gen({ ...spellController, boss: ownBoss, loop })); }
                yield* spellController.spellcard.mainLoop;
            }
            battle.scCounterBar.popStar();
            const nextInfo = spellInfos[i + 1] as SingleBossSpellOptions | undefined;
            if (nextInfo && typeof info.title === "string" && typeof nextInfo.title === "string") {
                yield* game.Sleep(60);
            }
        }
    }).then(() => board.coDo(function*() {
        battle.kill();
        yield* game.Sleep(80);
        ownBoss.kill();
    }));

    return battle;
};