import { AbstractEnemy, newAbstractEnemyOptions } from "./abstractEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";



interface NewCommonEnemyOptions extends newAbstractEnemyOptions<CommonDanmaku> {
    /** @default entity.hitboxRadius */
    hurtHitboxRadius: number | null,
    maxHp: number,
}

export class CommonEnemy extends AbstractEnemy<CommonDanmaku> {
    hurtHitboxRadius: number;
    maxHp: number;
    hp: number;

    constructor(options: NewCommonEnemyOptions) {
        super(options);
        this.hurtHitboxRadius = options.hurtHitboxRadius ?? this.entity.hitboxRadius;
        this.maxHp = this.hp = options.maxHp;
        this.entity.canBeErase = false;
    }

    destroy(): void {
        if (this.destroyed) { return; }
        this.entity.enemy = null;
    }

    get destroyed(): boolean {
        return this.entity.enemy === this;
    }
}
