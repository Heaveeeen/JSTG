import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { prefabEnemyFactory } from "../entity/prefabEnemyFactory.js";
import * as utils from "../utils.js";
import { Entity } from "../entity/entity.js";
import { CommonEnemy } from "../entity/commonEnemy.js";


export interface MakeBossOptions {
    game: Game, combat: Combat, board: Board,
    name: string,
    sprite: pixi.Sprite,
    hue1: number, hue2: number,
    defaultSpellcardFigure: pixi.Texture | "useTheUnknownFigure",
}

export class Boss extends Entity {
    name: string;
    sprite: pixi.Sprite;
    hue1: number;
    hue1Filter: pixi.ColorMatrixFilter;
    hue2: number;
    hue2Filter: pixi.ColorMatrixFilter;
    defaultSpellcardFigure: pixi.Texture | "useTheUnknownFigure";
    /** @internal */
    private _shield: CommonEnemy | null = null;
    
    constructor(options: MakeBossOptions) {
        super(options);
        this.name = options.name;
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

export const baseMakeBoss = (options: {
    game: Game, combat: Combat, board: Board,
    name: string,
    x: number, y: number,
    hue1: number, hue2: number,
    defaultSpellcardFigure: pixi.Texture | "useTheUnknownFigure",
    avatar: pixi.Texture | "useTheUnknownAvatar",
}) => {
    const { game, combat, board, name, x, y, hue1, hue2, defaultSpellcardFigure, avatar } = options;
    const sprite = new pixi.Sprite({
        parent: board.bossLayer,
        anchor: 0.5,
        texture: avatar === "useTheUnknownAvatar" ? game.prefabTextures.avatar.unknown : avatar,
        x, y, scale: 1.1,
    });
    return new Boss({
        game, combat, board,
        name, hue1, hue2, defaultSpellcardFigure,
        sprite,
    })
}