import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { baseStartSpellcard, sic_UiGradient, StartSpellcardOptions } from "./spellcard.js";
import { prefabEnemyFactory } from "../entity/prefabEnemyFactory.js";
import * as utils from "../utils.js";
import { Entity } from "../entity/entity.js";
import { CommonEnemy } from "../entity/commonEnemy.js";


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

    destroy() {
        if (this.destroyed) { return; }
        this.sprite.destroy({ children: true });
        this._shield?.destroy();
        //this.hue1Filter.destroy();
        //this.hue2Filter.destroy();
    }

    get destroyed() { return this.sprite.destroyed; }
};



const _startupTime = 60;

/** TODOC: baseStartSingleBossBattle */
export const baseStartSingleBossBattle = (bossBattleOptions: {
    game: Game, combat: Combat, board: Board,
    refBoss: Boss, name: string,
}) => {
    const { game, combat, board, refBoss } = bossBattleOptions;

    const scCounterBar = (()=>{
        // TODO: 淡入淡出
        const root = new pixi.Sprite({
            parent: board.spellcardUiLayer,
            x: -(300 - 155 * sic_UiGradient) * 4/3, y: -board.halfHeight,
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
            text: bossBattleOptions.name,
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
                stars.pop()?.destroy({ children: true });
                // TODO: 动画效果
            },
            destroy() {
                if (this.destroyed) { return; }
                root.destroy({ children: true });
            },
            get destroyed() { return root.destroyed; },
        };
    })();

    const startSpellcard = (options: {
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
            isPlayStartSound: true, title,
            figure: figure ?? refBoss.defaultSpellcardFigure ?? "useTheUnknownFigure",
        } as const : {
            isPlayStartSound: false, title: null,
            figure: "noFigure",
        } as const;
        const shield = refBoss.makeSpellcardShield({ maxHp: hp, birthProtectDuration });
        shield.danmaku.sprite.filters = refBoss.hue2Filter;
        const spellcard = baseStartSpellcard({
            game, combat, board,
            time, ...opt,
            ownEnemys: [shield],
            startupTime: _startupTime,
        });
        shield.forever(loop => {
            shield.x = refBoss.x;
            shield.y = refBoss.y;
        });
        refBoss.glideTo({ x: 0, y: -80 * 4/3 });
        let t = 0;
        const startupLoop = refBoss.forever(loop => {
            if (t >= _startupTime) {
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
            isPlayStartSound: true, title,
            figure: figure ?? refBoss.defaultSpellcardFigure ?? "useTheUnknownFigure",
        } as const : {
            isPlayStartSound: false, title: null,
            figure: "noFigure",
        } as const;
        const spellcard = baseStartSpellcard({
            game, combat, board,
            time, ...opt,
            ownEnemys: [],
            startupTime: _startupTime,
        });
        refBoss.glideTo({ x: 0, y: -80 * 4/3 });
        let t = 0;
        const startupLoop = refBoss.forever(loop => {
            if (t >= _startupTime) {
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

    return {
        startSpellcard, startSurvivalSpellcard, scCounterBar,
        kill() {
            // TODO: bossbattle.kill 顺便还要击破符卡
            destroy();
        },
        destroy,
        get destroyed() { return refBoss.destroyed || _destroyed; }
    }
};