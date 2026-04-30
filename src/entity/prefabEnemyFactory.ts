import * as pixi from "pixi";
import { Game, Combat, Board } from "../jstg.js";
import { DyedTextureColors } from "../textures.js";
import { AutoInvincibleMode, CommonEnemy } from "./commonEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";

export const prefabEnemyFactory = (()=>{

    const makeYinYangOrb = (options: {
        game: Game, combat: Combat, board: Board,
        maxHp: number, color: DyedTextureColors,
        x: number, y: number, rotation: number,
        /** @default board.commonEnemyLayer */
        parent: pixi.Container | null,
        birthProtectDuration: number,
        //scale: number,
        // TODO: hitboxRadius, isCanHurt, isTouchingDamage, isCanGraze, hpBarType
        autoInvincibleMode: AutoInvincibleMode,
        isBoss: boolean,
    }) => {
        const { game, combat, board, maxHp, color, x, y, rotation, birthProtectDuration, autoInvincibleMode, isBoss } = options;
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
        const danmaku = new CommonDanmaku({
            game, combat, board,
            type: "enemyYinYangOrb",
            color, hitboxRadius: 6,
            sprite: rootSprite,
        });
        danmaku.grazeCd = Infinity;
        const enemy = new CommonEnemy({
            danmaku, maxHp, phaseHpThresholds: [], hurtHitboxRadius: 14, // MAYDO: 想办法查查原版判定数据……？我不知道原版阴阳玉判定多大，我瞎填的……
            canBeErase: false,
            birthProtectDuration,
            afterBeHurtCallback: null,
            hpBar: null, autoInvincibleMode, isBoss,
        });
        enemy.forever(loop => {
            outerRing.rotation -= 0.07;
            innerRing.rotation += 0.12;
        });
        return enemy;
    };

    const makeSpellcardShield = (options: {
        game: Game, combat: Combat, board: Board,
        maxHp: number,
        phaseHpThresholds: number[],
        x: number, y: number, rotation: number,
        /** @default board.bossShieldLayer */
        parent: pixi.Container | null,
        birthProtectDuration: number,
        hpBarHue: number,
        hpBarPhaseLineHue: number,
        //scale: number, 
        // TODO: hitboxRadius, isCanHurt, isTouchingDamage, isCanGraze, animRotation(?), hpBarType
        autoInvincibleMode: AutoInvincibleMode,
        isBoss: boolean,
    }) => {
        const { game, combat, board, maxHp, phaseHpThresholds, x, y, rotation, birthProtectDuration, hpBarHue, hpBarPhaseLineHue, autoInvincibleMode, isBoss } = options;
        const sprite = new pixi.Sprite({
            parent: options.parent ?? board.bossShieldLayer,
            texture: game.prefabTextures.enemy.shield,
            x, y, rotation, anchor: 0.5,
            scale: 0.4 * 1.1,
            alpha: 0,
            blendMode: "add",
        });
        const danmaku = new CommonDanmaku({
            game, combat, board,
            type: "enemySpellcardShield",
            color: "red", // 罩子原始颜色就是红的，所以这里填红色没毛病
            hitboxRadius: 16,
            sprite,
        });
        danmaku.grazeCd = Infinity;
        const enemy = new CommonEnemy({
            danmaku, maxHp, phaseHpThresholds, hurtHitboxRadius: 40 * 1.1,
            canBeErase: false,
            birthProtectDuration,
            afterBeHurtCallback: () => {
                sprite.alpha = 0.8;
            },
            hpBar: { type: "circle", radius: 50 * 1.1, mainHue: hpBarHue, phaseLineHue: hpBarPhaseLineHue },
            autoInvincibleMode, isBoss,
        });
        enemy.forever(loop => {
            sprite.alpha += (0.2 - sprite.alpha) * 0.05 * game.timeScale;
        });
        return enemy;
    }

    return {
        /** 创建一个阴阳玉敌人。 */
        makeYinYangOrb,
        makeSpellcardShield,
    }

})();