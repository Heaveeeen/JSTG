import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { DyedTextureColors } from "../textures.js";
import { CommonEnemy } from "./commonEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";

export const prefabEnemyFactory = (()=>{

    const makeYinYangOrb = (options: {
        game: Game, combat: Combat, board: Board,
        maxHp: number, color: DyedTextureColors,
        x: number, y: number, rotation: number,
        /** @default board.commonEnemyLayer */
        parent: pixi.Container | null,
        // TODO: hitboxRadius, isCanHurt, isTouchingDamage, isCanGraze, scale(?), animRotation(?), birthProtectDuration
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
            rotation: Math.random() * Math.PI * 2, // RAND: 阴阳玉动画初始相位
        });
        const outerRing = new pixi.Sprite({
            parent: rootSprite,
            anchor: 0.5,
            texture: game.prefabTextures.enemy.yinYangOrb.outerRing[color],
            rotation: Math.random() * Math.PI * 2, // RAND: 阴阳玉动画初始相位
        });
        const mainOrb = new pixi.Sprite({
            parent: rootSprite,
            anchor: 0.5,
            texture: game.prefabTextures.enemy.yinYangOrb.main[color],
        });
        const entity = new CommonDanmaku({
            game, combat, board,
            type: "enemyYinYangOrb",
            color, hitboxRadius: 6,
            sprite: rootSprite,
        });
        entity.grazeCd = Infinity;
        const enemy = new CommonEnemy({
            entity, maxHp, hurtHitboxRadius: 14, // MAYDO: 想办法查查原版判定数据……？我不知道原版阴阳玉判定多大，我瞎填的……
            canBeErase: false,
            birthProtectDuration: 30,
        });
        enemy.forever(loop => {
            outerRing.rotation -= 0.07;
            innerRing.rotation += 0.12;
        });
        return enemy;
    };

    return {
        /** 创建一个阴阳玉敌人。 */
        makeYinYangOrb,
    }

})();