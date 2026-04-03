import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { prefabEnemyFactory } from "../entity/prefabEnemyFactory.js";
import * as utils from "../utils.js";
import { Entity } from "../entity/entity.js";
import { CommonEnemy } from "../entity/commonEnemy.js";


export interface NewBossOptions {
    game: Game, combat: Combat, board: Board,
    name: string,
    sprite: pixi.Sprite,
    shieldFilters: pixi.Filter[],
    defaultSpellcardFigure: pixi.Texture | "useTheUnknownFigure",
    hpBarHue: number,
}

export class Boss extends Entity {
    name: string;
    sprite: pixi.Sprite;
    defaultSpellcardFigure: pixi.Texture | "useTheUnknownFigure";
    shieldFilters: pixi.Filter[];
    hpBarHue: number;
    /** @internal */
    private _shield: CommonEnemy | null = null;
    
    constructor(options: NewBossOptions) {
        super(options);
        this.name = options.name;
        this.sprite = options.sprite;
        this.defaultSpellcardFigure = options.defaultSpellcardFigure;
        this.shieldFilters = options.shieldFilters;
        this.hpBarHue = options.hpBarHue;
    }

    get x() { return this.sprite.x; }
    set x(v: number) { this.sprite.x = v; }
    get y() { return this.sprite.y; }
    set y(v: number) { this.sprite.y = v; }
    get rotation() { return this.sprite.rotation; }
    set rotation(v: number) { this.sprite.rotation = v; }// TODO: 需要考虑一下，要不要让 boss 无法旋转……这样方便发弹
    get visible() { return this.sprite.visible; }
    set visible(v: boolean) { this.sprite.visible = v; }
    get zIndex() { return this.sprite.zIndex; }
    set zIndex(v: number) { this.sprite.zIndex = v; }
    get alpha() { return this.sprite.alpha }
    set alpha(n: number) { this.sprite.alpha = n; }

    makeSpellcardShield(options: {
        maxHp: number, birthProtectDuration: number,
    }) {
        if (this._shield !== null) {
            this._shield.destroy();
        }
        this._shield = prefabEnemyFactory.makeSpellcardShield({
            game: this.game, combat: this.combat, board: this.board,
            x: this.x, y: this.y, rotation: 0, parent: null,
            ...options, hpBarHue: this.hpBarHue,
        });
        this._shield.danmaku.sprite.filters = this.shieldFilters;
        return this._shield;
    }

    getIsInBoundary() { return true; }/** MAYDO: 应该没啥用，Boss.isInBoundary */

    kill() {
        // TODO: 击破特效
        this.destroy();
    }

    destroy() {
        if (this.destroyed) { return; }
        this.sprite.destroy({ children: true });
        this._shield?.destroy();
    }

    get destroyed() { return this.sprite.destroyed; }
};

export const baseMakeBoss = (options: {
    game: Game, combat: Combat, board: Board,
    name: string,
    x: number, y: number,
    shieldFilters: pixi.Filter[],
    defaultSpellcardFigure: pixi.Texture | "useTheUnknownFigure",
    avatar: pixi.Texture | "useTheUnknownAvatar",
    hpBarHue: number,
}) => {
    const { game, combat, board, name, x, y, shieldFilters, defaultSpellcardFigure, avatar, hpBarHue } = options;
    const sprite = new pixi.Sprite({
        parent: board.bossLayer,
        anchor: 0.5,
        texture: avatar === "useTheUnknownAvatar" ? game.prefabTextures.avatar.unknown : avatar,
        x, y, scale: 1.1,
    });
    return new Boss({
        game, combat, board,
        name, defaultSpellcardFigure,
        sprite, shieldFilters, hpBarHue,
    });
};