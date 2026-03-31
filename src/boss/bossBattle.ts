import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { baseStartSpellcard, spde_UiGradient, Spellcard, StartSpellcardOptions } from "./spellcard.js";
import { prefabEnemyFactory } from "../entity/prefabEnemyFactory.js";
import * as utils from "../utils.js";
import { Entity } from "../entity/entity.js";
import { CommonEnemy } from "../entity/commonEnemy.js";
import { LooperFn, LoopOptions, CoDoGenFn, CoDoGenerator, LoopController } from "../looper.js";


export interface MakeBossOptions {
    game: Game, combat: Combat, board: Board,
    sprite: pixi.Sprite,
    hue1: number, hue2: number,
    defaultSpellcardFigure: pixi.Texture | null,
}

export class Boss extends Entity {
    sprite: pixi.Sprite;
    hue1: number;
    hue1Filter: pixi.ColorMatrixFilter;
    hue2: number;
    hue2Filter: pixi.ColorMatrixFilter;
    defaultSpellcardFigure: pixi.Texture | null;
    /** @internal */
    private _shield: CommonEnemy | null = null;
    
    constructor(options: MakeBossOptions) {
        super(options);
        this.sprite = options.sprite;
        this.hue1 = options.hue1;
        this.hue1Filter = new pixi.ColorMatrixFilter({ resolution: "inherit" });
        this.hue1Filter.hue(options.hue1, false);
        this.hue2 = options.hue2;
        this.hue2Filter = new pixi.ColorMatrixFilter({ resolution: "inherit" });
        this.hue2Filter.hue(options.hue2, false);
        this.defaultSpellcardFigure = options.defaultSpellcardFigure;
    }

    get x() { return this.sprite.x; }
    set x(v: number) { this.sprite.x = v; }
    get y() { return this.sprite.y; }
    set y(v: number) { this.sprite.y = v; }
    get rotation() { return this.sprite.rotation; }
    set rotation(v: number) { this.sprite.rotation = v; }
    get visible() { return this.sprite.visible; }
    set visible(v: boolean) { this.sprite.visible = v; }
    get zIndex() { return this.sprite.zIndex; }
    set zIndex(v: number) { this.sprite.zIndex = v; }

    makeSpellcardShield(options: {
        maxHp: number, birthProtectDuration: number,
    }) {
        if (this._shield !== null) {
            this._shield.destroy();
        }
        this._shield = prefabEnemyFactory.makeSpellcardShield({
            game: this.game, combat: this.combat, board: this.board,
            x: this.x, y: this.y, rotation: 0, parent: null,
            ...options,
        });
        this._shield.danmaku.sprite.filters = this.hue2Filter;
        return this._shield;
    }

    isInBoundary() { return true; }/** MAYDO: 应该没啥用，Boss.isInBoundary */

    kill() {
        // TODO: 击破特效
        this.destroy();
    }

    destroy() {
        if (this.destroyed) { return; }
        this.sprite.destroy({ children: true });
        this._shield?.destroy();
        //this.hue1Filter.destroy();
        //this.hue2Filter.destroy();
    }

    get destroyed() { return this.sprite.destroyed; }
};



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

        const fadeInLoop = board.coDo(function*() { for (let t = 0; t <= 20; t += game.timeScale) {
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
                // TODO: 使当前符卡对应的星星闪烁
            },
            popStar() {
                const star = stars.pop();
                if (star === undefined) { return; }
                board.coDo(function*() { for (let t = 0; t <= 20; t += game.timeScale) {
                    star.alpha = 1 - (t / 20);
                    yield;
                } }, { refs: star }).then(() => {
                    star.destroy({ children: true });
                });
            },
            kill() {
                if (this.destroyed) { return; }
                fadeInLoop.destroy();
                return board.coDo(function*() { for (let t = 0; t <= 20; t += game.timeScale) {
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
    }) => {
        const { time, title, hp, figure } = options;
        const isShowFigureAndTitle = options.isShowFigureAndTitle ?? true;
        const birthProtectDuration = options.birthProtectDuration ?? 250;
        const opt = isShowFigureAndTitle ? {
            isPlayStartSound: true,
            figure: figure ?? refBoss.defaultSpellcardFigure ?? "useTheUnknownFigure",
        } as const : {
            isPlayStartSound: false,
            figure: "noFigure",
        } as const;
        const shield = refBoss.makeSpellcardShield({ maxHp: hp, birthProtectDuration });
        shield.danmaku.sprite.filters = refBoss.hue2Filter;
        const spellcard = baseStartSpellcard({
            game, combat, board,
            title, time, ...opt,
            ownEnemys: [shield],
            startupDuration: _startupDuration,
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
            figure: figure ?? refBoss.defaultSpellcardFigure ?? "useTheUnknownFigure",
        } as const : {
            isPlayStartSound: false,
            figure: "noFigure",
        } as const;
        const spellcard = baseStartSpellcard({
            game, combat, board,
            title, time, ...opt,
            ownEnemys: [],
            startupDuration: _startupDuration,
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
    /** @default false */
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
    /** @default 250 */
    birthProtectDuration?: number,
    fn?: ({ spellcard, shield }: { spellcard: Spellcard, shield: CommonEnemy }) => void,
    gen?: ({ spellcard, shield }: { spellcard: Spellcard, shield: CommonEnemy }, loop: LoopController<unknown>) => CoDoGenerator<unknown>,
}

interface SurvivalSpellOptions extends BaseSpellOptions {
    isSurvival: true,
    fn?: ({ spellcard }: { spellcard: Spellcard }) => void,
    gen?: ({ spellcard }: { spellcard: Spellcard }, loop: LoopController<unknown>) => CoDoGenerator<unknown>,
}

type SpellOptions = CommonSpellOptions | SurvivalSpellOptions;
//#endregion

export const baseStartSingleBossBattle = (bossBattleOptions: {
    game: Game, combat: Combat, board: Board,
    ownBoss: Boss, name: string,
    /** @default null */
    spells?: SpellOptions[],
    /**
     * 一般来说，不用管这个东西。  
     * 这个函数可以让你指定非符标题的格式。默认的格式形如“非符1”，“非符3”。  
     * @example
     * num => `第 ${num} 张非符`
     */
    getNonSpellTitle?: (num: number) => string,
}) => {
    const { game, combat, board, ownBoss, name, } = bossBattleOptions;
    const getNonSpellTitle = bossBattleOptions.getNonSpellTitle ?? ((num: number) => `非符${num}`);
    const spellInfos = bossBattleOptions.spells ?? [];
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
                const { fn, gen } = info;
                fn?.(spellController);
                if (gen !== undefined) { spellController.spellcard.coDo(loop => gen(spellController, loop)); }
                yield* spellController.spellcard.mainLoop;
            } else {
                const spellController = battle.startCommonSpellcard({
                    title, time, figure, isShowFigureAndTitle,
                    hp: info.hp ?? 3000,
                    birthProtectDuration: info.birthProtectDuration, 
                })
                yield* spellController.startupLoop;
                const { fn, gen } = info;
                fn?.(spellController);
                if (gen !== undefined) { spellController.spellcard.coDo(loop => gen(spellController, loop)); }
                yield* spellController.spellcard.mainLoop;
            }
            battle.scCounterBar.popStar();
            const nextInfo = spellInfos[i + 1] as SpellOptions | undefined;
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