import * as pixi from "pixi";
import { Combat, Board, Game, Destroyable } from "../jstg.js";
import { DyedTextureColors } from "../textures.js";
import { AbstractEnemy, EnemyBeHurtOptions, newAbstractEnemyOptions } from "./abstractEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";
import * as utils from "../utils.js";
import { EraseDanmakuOptions } from "./abstractDanmaku.js";
import { LoopController } from "../looper.js";
import { PlaySoundOptions } from "../sounds.js";



interface NewCommonEnemyOptions extends newAbstractEnemyOptions<CommonDanmaku> {
    /** @default danmaku.hitboxRadius */
    hurtHitboxRadius: number | null,
    maxHp: number,
    /** @default false */
    canBeErase: boolean | null,
    afterBeHurtCallback: ((options: EnemyBeHurtOptions) => void) | null,
    // TODO: killedCallback
    hpBar: {
        type: "circle", radius: number,
    } | null,
    /**
     * 所有敌人在刚出生时，都会有一个持续一小段时间的减伤护盾。在此期间，敌人所受的伤害会大大减少。
     * 可以防止敌人在刚出生时立马被秒杀。
     * 这个参数是出生保护减伤持续的帧数。
     */
    birthProtectDuration: number,
}

let lastPlayDamageSoundClockTs = -999;
let damageSoundLoop: LoopController<void> | null = null;
const damageSoundQueue: { play(options?: PlaySoundOptions): void }[] = [];

// TODO: 一个比较偷懒的设计…… boss 身上的保护罩是一个 CommonEnemy ，打爆这个罩子就会打通一张符
export class CommonEnemy extends AbstractEnemy<CommonDanmaku> {
    hurtHitboxRadius: number;
    maxHp: number;
    /** @internal */
    private _birthClockTS: number;
    /** @internal */
    private _birthProtectDuration: number;
    /** @internal */
    get _birthProtectCoef() {
        if (this._birthProtectDuration <= 0) { return 1; }
        const t = (this.danmaku.game.clock - this._birthClockTS) / this._birthProtectDuration - 1;
        if (t >= 0) {
            return 1;
        } else {
            return (this._birthProtectDuration * 0.2 + 20) ** t;
        }
    }

    /** @internal */
    private _hp: number;
    get hp() { return this._hp; }
    set hp(n: number) {
        this._hp = utils.clamp(n, 0, this.maxHp);
        if (this._hp <= 0) {
            this.kill();
        }
    }
    /** @internal */
    private _hpBarGraphics: pixi.Graphics | null;

    constructor(options: NewCommonEnemyOptions) {
        super(options);
        this.hurtHitboxRadius = options.hurtHitboxRadius ?? this.danmaku.hitboxRadius;
        this.maxHp = this._hp = options.maxHp;
        this.danmaku.canBeErase = options.canBeErase ?? false;
        this._afterBeHurtCallback = options.afterBeHurtCallback;
        this._birthClockTS = this.danmaku.game.clock;
        this._birthProtectDuration = options.birthProtectDuration;
        if (options.hpBar === null) {
            this._hpBarGraphics = null;
        } else if (options.hpBar.type === "circle") {
            const { radius } = options.hpBar;
            this._hpBarGraphics = new pixi.Graphics({
                parent: this.danmaku.board.enemyHpBarLayer,
                x: this.x, y: this.y,
            });
            let p = 0;
            this.forever(loop => { // 绘制圆环血条
                if (this._hpBarGraphics === null) { return; }
                this._hpBarGraphics.x = this.x;
                this._hpBarGraphics.y = this.y;
                this._hpBarGraphics.clear();
                // 内描边
                this._hpBarGraphics.circle(0, 0, radius - 1.5).stroke({
                    width: 0.5, color: "hsla(0, 90%, 30%, 0.70)",
                });
                // 外描边
                this._hpBarGraphics.circle(0, 0, radius + 1.5).stroke({
                    width: 0.5, color: "hsla(0, 90%, 30%, 0.70)",
                });
                // 填充 TODO: 缓动
                // 车万原作中，玩家靠近血条时血条会淡化，但是弹幕引擎没有这个设定。我感觉不是很必要，这个设定有时候有点烦人，贴近 boss 想把它秒了有可能因此看不清它剩多少血。
                const tp = this.hp / this.maxHp;
                if (p < tp - 0.02) {
                    p += 0.02;
                } else if (p > tp + 0.02) {
                    p -= 0.02;
                } else {
                    p = tp;
                }
                this._hpBarGraphics.moveTo(0, -radius).arc(0, 0, radius, utils.deg(-90), utils.deg(-90 - 360 * p), true).stroke({
                    width: 3, color: "hsla(0, 80%, 95%, 1.00)",
                });
            }, { order: 10 });
        } else {
            utils.staticAssert<never>(options.hpBar.type);
            this._hpBarGraphics = null;
        }
        if (damageSoundLoop === null || damageSoundLoop.destroyed) { damageSoundLoop = this.danmaku.game.forever(loop => {
            if (this.danmaku.game.clock >= lastPlayDamageSoundClockTs + 3) {
                const sound = damageSoundQueue.pop();
                if (sound) {
                    lastPlayDamageSoundClockTs = this.danmaku.game.clock;
                    sound.play();
                }
            }
        }); }
    }

    drawDebugHitbox(): void {
        this.danmaku.hitboxGraphics?.circle(
            0, 0, this.hurtHitboxRadius
        ).fill("hsla(0, 100%, 60%, 0.30)").stroke("#ffaaaa");
    }

    /** @internal */
    private _afterBeHurtCallback: NewCommonEnemyOptions["afterBeHurtCallback"];

    beHurt(value: number, options: EnemyBeHurtOptions = {}) {
        this.hp -= value * this._birthProtectCoef;
        const { damage00, damage01 } = this.danmaku.game.prefabSounds.thse;
        const sound = this.hp <= Math.min(this.maxHp * 0.1, 500) ? damage01 : damage00;
        if (this.danmaku.game.clock >= lastPlayDamageSoundClockTs + 3) {
            lastPlayDamageSoundClockTs = this.danmaku.game.clock;
            sound.play();
        } else if (this.danmaku.game.clock >= lastPlayDamageSoundClockTs + 1) {
            if (damageSoundQueue.length < 2) { damageSoundQueue.push(sound); }
        }
        this._afterBeHurtCallback?.(options);
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
        this._hpBarGraphics?.destroy({ children: true });
    }

    get destroyed(): boolean {
        return this.danmaku.enemy !== this;
    }
}