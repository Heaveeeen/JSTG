import * as pixi from "pixi";
import { Combat, Board, Game, Destroyable } from "../jstg.js";
import { DyedTextureColors } from "../textures.js";
import { AbstractEnemy, newAbstractEnemyOptions } from "./abstractEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";
import * as utils from "../utils.js";
import { EraseDanmakuOptions } from "./abstractDanmaku.js";



interface NewCommonEnemyOptions extends newAbstractEnemyOptions<CommonDanmaku> {
    /** @default danmaku.hitboxRadius */
    hurtHitboxRadius: number | null,
    maxHp: number,
    /** @default false */
    canBeErase: boolean | null,
}

let lastPlayDamageSoundClockTS = -1;

// TODO: 一个比较偷懒的设计…… boss 身上的保护罩是一个 CommonEnemy ，打爆这个罩子就会打通一张符
export class CommonEnemy extends AbstractEnemy<CommonDanmaku> {
    hurtHitboxRadius: number;
    maxHp: number;

    /** @internal */
    private _hp: number;
    get hp() { return this._hp; }
    set hp(n: number) {
        this._hp = utils.clamp(n, 0, this.maxHp);
        if (this._hp <= 0) {
            this.kill();
        }
    }
    // TODO: 血条

    constructor(options: NewCommonEnemyOptions) {
        super(options);
        this.hurtHitboxRadius = options.hurtHitboxRadius ?? this.danmaku.hitboxRadius;
        this.maxHp = this._hp = options.maxHp;
        this.danmaku.canBeErase = options.canBeErase ?? false;
    }

    drawDebugHitbox(): void {
        this.danmaku.hitboxGraphics?.circle(
            0, 0, this.hurtHitboxRadius
        ).fill("hsla(0, 100%, 60%, 0.30)").stroke("#ffaaaa");
    }

    beHurt(options: {
        /** 造成了多少点伤害。原则上，这个值不应当小于0。 */
        num: number,
        // TODO: damageType
    }) {
        this.hp -= options.num * this._birthProtectCoef;
        if (this.danmaku.game.clock >= lastPlayDamageSoundClockTS + 3) {
            lastPlayDamageSoundClockTS = this.danmaku.game.clock;
            if (this.hp / this.maxHp <= 0.1) {
                this.danmaku.game.prefabSounds.thse.damage01.play();
            } else {
                this.danmaku.game.prefabSounds.thse.damage00.play();
            }
        }
    }

    /** 
     * 击破这个敌人，并且消除与之对应的弹幕。  
     * 调用该函数后，不能再使用这个敌人。  
     */
    kill(options: {
        forEachCorpse?: EraseDanmakuOptions["forEachCorpse"],
    } = {}) {
        if (this.destroyed) { return; }
        this.danmaku.erase({
            permissionType: "thisEnemyDie",
            effectType: "none", // TODO: 击破特效
            forEachCorpse: options.forEachCorpse,
        });
        this.danmaku.game.prefabSounds.thse.enep00.play();
    }

    /** 摧毁该敌人，但不会摧毁弹幕。只是会让这个弹幕变得无法受击。 */
    destroy() {
        if (this.destroyed) { return; }
        this.danmaku.enemy = null;
    }

    get destroyed(): boolean {
        return this.danmaku.enemy !== this;
    }
}