import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { baseStartSpellcard, StartSpellcardOptions } from "./spellcard.js";
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
    hue1Filter: pixi.ColorMatrixFilter;
    hue2Filter: pixi.ColorMatrixFilter;
    defaultSpellcardFigure: pixi.Texture | null;
    /** @internal */
    private _shield: CommonEnemy | null = null;
    
    constructor(options: MakeBossOptions) {
        super(options);
        this.sprite = options.sprite;
        this.hue1Filter = new pixi.ColorMatrixFilter({ resolution: "inherit" });
        this.hue1Filter.hue(options.hue1, false);
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
        this.sprite.destroy();
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
    refBoss: Boss,
}) => {
    const { game, combat, board, refBoss: boss } = bossBattleOptions;
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
            figure: figure ?? boss.defaultSpellcardFigure ?? "useTheUnknownFigure",
        } as const : {
            isPlayStartSound: false, title: null,
            figure: "noFigure",
        } as const;
        const shield = boss.makeSpellcardShield({ maxHp: hp, birthProtectDuration });
        shield.danmaku.sprite.filters = boss.hue2Filter;
        const spellcard = baseStartSpellcard({
            game, combat, board,
            time, ...opt,
            ownEnemys: [shield],
            startupTime: _startupTime,
        });
        shield.forever(loop => {
            shield.x = boss.x;
            shield.y = boss.y;
        });
        const glideLoop = boss.glideTo({ x: 0, y: -80 * 4/3 });
        let t = 0;
        const startupLoop = boss.forever(loop => {
            if (t >= _startupTime) {
                loop.destroy();
            } else {
                t += game.timeScale;
            }
        }, { destroys: glideLoop });
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
            figure: figure ?? boss.defaultSpellcardFigure ?? "useTheUnknownFigure",
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
        const glideLoop = boss.glideTo({ x: 0, y: -80 * 4/3 });
        let t = 0;
        const startupLoop = boss.forever(loop => {
            if (t >= _startupTime) {
                loop.destroy();
            } else {
                t += game.timeScale;
            }
        }, { destroys: glideLoop });
        return { spellcard, startupLoop };
    };

    let _destroyed = false;
    const destroy = () => {
        if (_destroyed) { return; }
        _destroyed = true;
    };

    return {
        startSpellcard, startSurvivalSpellcard,
        kill() {
            // TODO: bossbattle.kill
            destroy();
        },
        destroy,
        get destroyed() { return boss.destroyed || _destroyed; }
    }
};