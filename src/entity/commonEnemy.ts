import * as pixi from "pixi";
import { Combat, Board, Game } from "../jstg.js";
import { DyedTextureColors } from "../textures.js";
import { AbstractEnemy, newAbstractEnemyOptions } from "./abstractEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";



interface NewCommonEnemyOptions extends newAbstractEnemyOptions<CommonDanmaku> {
    /** @default entity.hitboxRadius */
    hurtHitboxRadius: number | null,
    maxHp: number,
    /** @default false */
    canBeErase: boolean | null,
}

export class CommonEnemy extends AbstractEnemy<CommonDanmaku> {
    hurtHitboxRadius: number;
    maxHp: number;
    hp: number;

    constructor(options: NewCommonEnemyOptions) {
        super(options);
        this.hurtHitboxRadius = options.hurtHitboxRadius ?? this.entity.hitboxRadius;
        this.maxHp = this.hp = options.maxHp;
        this.entity.canBeErase = options.canBeErase ?? false;
    }

    destroy(): void {
        if (this.destroyed) { return; }
        this.entity.enemy = null;
    }

    get destroyed(): boolean {
        return this.entity.enemy === this;
    }
}

export const prefabEnemys = (()=>{

    const makeYinYangOrb = (options: {
        game: Game, combat: Combat, board: Board,
        maxHp: number, color: DyedTextureColors,
        x: number, y: number, rotation: number,
        /** @default board.commonEnemyLayer */
        parent: pixi.Container | null,
    }) => {
        const { game, combat, board, maxHp, color, x, y, rotation } = options;
        const rootSprite = new pixi.Sprite({
            parent: options.parent ?? board.commonEnemyLayer,
            x, y, rotation, anchor: 0.5,
        });
        const innerRing = new pixi.Sprite({
            parent: rootSprite,
            anchor: 0.5,
            texture: game.prefabTextures.enemy.yinYangOrb.innerRing[color],
        });
        const outerRing = new pixi.Sprite({
            parent: rootSprite,
            anchor: 0.5,
            texture: game.prefabTextures.enemy.yinYangOrb.outerRing[color],
        });
        const mainOrb = new pixi.Sprite({
            parent: rootSprite,
            anchor: 0.5,
            texture: game.prefabTextures.enemy.yinYangOrb.main[color],
        });
        const enemy = new CommonEnemy({
            entity: new CommonDanmaku({
                game, combat, board,
                type: "enemyYinYangOrb",
                color, hitboxRadius: 9.5,
                sprite: rootSprite,
            }),
            maxHp, hurtHitboxRadius: 9.5,
            canBeErase: false,
        });
        game.forever(loop => {
            outerRing.rotation -= 0.07;
            innerRing.rotation += 0.12;
        }, { refs: enemy, });
        return enemy;
};

    return {
        /** 创建一个阴阳玉敌人。 */
        makeYinYangOrb,
    }
})();