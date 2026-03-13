import * as pixi from "pixi";
import { Combat, Board, Game, Destroyable } from "../jstg.js";
import { DyedTextureColors } from "../textures.js";
import { AbstractEnemy, newAbstractEnemyOptions } from "./abstractEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";
import * as utils from "../utils.js";
import { EraseEntityOptions } from "./abstractEntity.js";



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

    /** @private */
    private _hp: number;
    get hp() { return this._hp; }
    set hp(n: number) {
        this._hp = utils.clamp(n, 0, this.maxHp);
        if (this._hp <= 0) {
            this.kill();
        }
    }

    constructor(options: NewCommonEnemyOptions) {
        super(options);
        this.hurtHitboxRadius = options.hurtHitboxRadius ?? this.entity.hitboxRadius;
        this.maxHp = this._hp = options.maxHp;
        this.entity.canBeErase = options.canBeErase ?? false;
    }

    drawDebugHitbox(): void {
        this.entity.hitboxGraphics?.circle(
            0, 0, this.hurtHitboxRadius
        ).fill("hsla(0, 100%, 60%, 0.30)").stroke("#ffaaaa");
    }

    beHurt(options: {
        /** 造成了多少点伤害。原则上，这个值不应当小于0。 */
        num: number,
        // TODO: type
    }) {
        this.hp -= options.num;
        if (this.hp / this.maxHp <= 0.1) {
            this.entity.game.prefabSounds.thse.damage01.play();
        } else {
            this.entity.game.prefabSounds.thse.damage00.play();
        }
    }

    /** 
     * 击破这个敌人，并且消除与之对应的实体。  
     * 调用此方法后，该敌人的生死是未知的。它可能会立即被摧毁，或者等下一帧才被摧毁，也有可能不会被摧毁。  
     */
    kill(options: {
        forEachCorpse?: EraseEntityOptions["forEachCorpse"],
    } = {}) {
        if (this.destroyed) { return; }
        this.entity.erase({
            permissionType: "thisEnemyDie",
            effectType: "none", // TODO: 击破特效
            forEachCorpse: options.forEachCorpse,
        });
        this.entity.game.prefabSounds.thse.enep00.play();
    }

    /** 摧毁该敌人，但不会摧毁实体。只是会让这个实体变得无法受击。 */
    destroy() {
        if (this.destroyed) { return; }
        this.entity.enemy = null;
    }

    get destroyed(): boolean {
        return this.entity.enemy !== this;
    }
}