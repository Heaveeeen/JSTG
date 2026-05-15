import * as pixi from "pixi";
import { AbstractEnemy, EnemyBeHurtOptions, newAbstractEnemyOptions } from "./abstractEnemy.js";
import { CommonDanmaku } from "./commonDanmaku.js";
import * as utils from "../utils.js";
import { EraseDanmakuOptions } from "./abstractDanmaku.js";
import { LoopController } from "../looper.js";



export type AutoInvincibleMode = "none" | "noDamageWhilePlayerInvincible" | "ghostWhilePlayerInvincible";
// MAYDO: 车万原作有的符，我感觉是吃 B 的，但又不完全吃，主要是一些终符……比方说石之女神，我怀疑那玩意是不吃 B 本身的伤害，但放 B 期间开枪能打出伤害。我得做个替代品，比方说“放 B 期间受伤减半”啥的。

export interface NewCommonEnemyOptions extends newAbstractEnemyOptions<CommonDanmaku> {
    /** @default danmaku.hitboxRadius */
    hurtHitboxRadius: number | null,
    maxHp: number,
    phaseHpThresholds: number[],
    /** @default false */
    canBeErase: boolean | null,
    afterBeHurtCallback: ((options: EnemyBeHurtOptions) => void) | null,
    // TODO: killedCallback
    hpBar: {
        type: "circle", radius: number, mainHue: number, phaseLineHue: number,
    } | null,
    /**
     * 所有敌人在刚出生时，都会有一个持续一小段时间的减伤护盾。在此期间，敌人所受的伤害会大大减少。
     * 可以防止敌人在刚出生时立马被秒杀。
     * 这个参数是出生保护减伤持续的帧数。
     */
    birthProtectDuration: number,
    /**
     * 这个参数可以用来让敌人不吃 Bomb 。  
     * "noDamageWhilePlayerInvincible" - 一旦玩家获得无敌帧或 Miss ，这个敌人也会随之进入无敌状态，免疫所有伤害。  
     * "ghostWhilePlayerInvincible" - 一旦玩家获得无敌帧或 Miss ，这个敌人会随之进入无法选中的虚化状态，无法受到任何伤害，并且不会被诱导弹索敌等等。  
     */
    autoInvincibleMode: AutoInvincibleMode,
}

let lastPlayDamageSoundClockTs = -999;
let damageSoundLoop: LoopController<void> | null = null;
const damageSoundQueue: (()=>{})[] = [];

export class CommonEnemy extends AbstractEnemy<CommonDanmaku> {
    hurtHitboxRadius: number;
    maxHp: number;
    /** @internal */
    private _birthClockTS: number;
    /** @internal */
    private _birthProtectDuration: number;
    /** @internal */
    private get _birthProtectCoef() {
        if (this._birthProtectDuration <= 0) { return 1; }
        const t = (this.danmaku.combat.clock - this._birthClockTS) / this._birthProtectDuration - 1;
        if (t >= 0) {
            return 1;
        } else {
            return (this._birthProtectDuration * 0.2 + 20) ** t;
        }
    }

    /** @internal */
    private _lastInvincibleClockTs: number = -999;
    private get isInvincible() { return this.danmaku.combat.clock - this._lastInvincibleClockTs < 10; }

    /** @internal */
    private _hp: number;
    get hp() { return this._hp; }
    set hp(n: number) {
        this._hp = utils.clamp(n, 0, this.maxHp);
        while (this.phase <= this._phases.length && this._hp <= this._phases[this.phase - 1].threshold) {
            this._popPhase();
        }
        if (this._hp <= 0) {
            this.kill();
        }
    }
    /** @internal */
    private readonly _hpBarGraphics: pixi.Graphics | null;
    /** @internal */
    private readonly _hpBarPhaseLinesGraphics: pixi.Graphics | null;
    /** @internal */
    _redrawHpPhaseLines(hpThresholds: number[]) { throw new utils.JstgError("redrawHpPhaseLinesButNoHpBar"); }

    /** @internal 注意：阈值是从大到小排列的。 */
    private readonly _phases: { threshold: number, endCallbacks: (() => any)[] }[];
    /** 此编号从 1 开始，不是从 0 开始。 */
    phase = 1;
    /**
     * @internal
     * ASSERTS: this.phase < this._phases.length
     */
    _popPhase() {
        for (const fn of this._phases[this.phase - 1].endCallbacks) { fn(); }
        this.phase += 1;
        this._redrawHpPhaseLines(this._phases.slice(this.phase - 1).map(info => info.threshold));
    }
    /** ASSERTS: phase ∈ [1, this._phases.length] */
    onPhaseEnd(phase: number, callback: () => any) {
        this._phases[phase - 1].endCallbacks.push(callback);
    }
    onAnyPhaseEnd(callback: () => any) {
        for (const phase of this._phases) { phase.endCallbacks.push(callback); }
    }

    constructor(options: NewCommonEnemyOptions) {
        super(options);
        this.hurtHitboxRadius = options.hurtHitboxRadius ?? this.danmaku.hitboxRadius;
        this.maxHp = this._hp = options.maxHp;
        this.danmaku.canBeErase = options.canBeErase ?? false;
        this._afterBeHurtCallback = options.afterBeHurtCallback;
        this._birthClockTS = this.danmaku.combat.clock;
        this._birthProtectDuration = options.birthProtectDuration;
        this._phases = options.phaseHpThresholds.sort((a, b) => b - a).map(threshold => ({ threshold, endCallbacks: [] }));
        if (options.hpBar === null) {
            this._hpBarGraphics = null;
            this._hpBarPhaseLinesGraphics = null;
        } else if (options.hpBar.type === "circle") {
            const { radius, mainHue, phaseLineHue } = options.hpBar;
            this._hpBarGraphics = new pixi.Graphics({
                parent: this.danmaku.board.enemyHpBarLayer,
                x: this.x, y: this.y,
            });
            this._hpBarPhaseLinesGraphics = new pixi.Graphics({
                parent: this.danmaku.board.enemyHpBarLayer,
                x: this.x, y: this.y,
            });
            this._redrawHpPhaseLines = hpThresholds => {
                if (this._hpBarPhaseLinesGraphics === null) { return; } // 此处理应不可达
                this._hpBarPhaseLinesGraphics.clear();
                const r1 = radius - 2.5, r2 = radius + 2.5;
                for (const hp of hpThresholds) {
                    const dir = utils.deg(-90 - 360 * (hp / this.maxHp));
                    const cos = Math.cos(dir), sin = Math.sin(dir);
                    this._hpBarPhaseLinesGraphics.moveTo(r1 * cos, r1 * sin).lineTo(r2 * cos, r2 * sin).stroke({
                        width: 5, color: `hsla(${phaseLineHue}, 100%, 50%, 0.50)`, cap: "round",
                    });
                    this._hpBarPhaseLinesGraphics.moveTo(r1 * cos, r1 * sin).lineTo(r2 * cos, r2 * sin).stroke({
                        width: 4, color: `hsla(${phaseLineHue}, 90%, 60%, 0.70)`, cap: "round",
                    });
                    this._hpBarPhaseLinesGraphics.moveTo(r1 * cos, r1 * sin).lineTo(r2 * cos, r2 * sin).stroke({
                        width: 3, color: `hsla(${phaseLineHue}, 80%, 70%, 0.90)`, cap: "round",
                    });
                    this._hpBarPhaseLinesGraphics.moveTo(r1 * cos, r1 * sin).lineTo(r2 * cos, r2 * sin).stroke({
                        width: 2, color: `hsla(${phaseLineHue}, 80%, 95%, 1.00)`, cap: "round",
                    });
                }
            };
            this._redrawHpPhaseLines(this._phases.slice(0, this._phases.length - this.phase + 1).map(info => info.threshold));
            let p = 0;
            this.forever(loop => { // 绘制圆环血条
                if (this._hpBarPhaseLinesGraphics !== null) {
                this._hpBarPhaseLinesGraphics.x = this.x;
                this._hpBarPhaseLinesGraphics.y = this.y;
                }
                if (this._hpBarGraphics === null) { return; }
                this._hpBarGraphics.x = this.x;
                this._hpBarGraphics.y = this.y;
                this._hpBarGraphics.clear();
                // 填充
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
                    width: 4.5, color: `hsla(${mainHue}, 80%, 60%, 0.40)`,
                });
                this._hpBarGraphics.moveTo(0, -radius).arc(0, 0, radius, utils.deg(-90), utils.deg(-90 - 360 * p), true).stroke({
                    width: 3, color: `hsla(${mainHue}, 60%, 80%, 0.70)`,
                });
                this._hpBarGraphics.moveTo(0, -radius).arc(0, 0, radius, utils.deg(-90), utils.deg(-90 - 360 * p), true).stroke({
                    width: 1.5, color: `hsla(${mainHue}, 40%, 95%, 1.00)`,
                });
                // 内描边
                this._hpBarGraphics.circle(0, 0, radius - 1.5).stroke({
                    width: 0.5, color: `hsla(${mainHue}, 80%, 30%, 0.70)`,
                });
                // 外描边
                this._hpBarGraphics.circle(0, 0, radius + 1.5).stroke({
                    width: 0.5, color: `hsla(${mainHue}, 80%, 30%, 0.70)`,
                });
            }, { order: 10 });
        } else {
            utils.staticAssert<never>(options.hpBar.type);
            this._hpBarGraphics = null;
            this._hpBarPhaseLinesGraphics = null;
        }
        if (damageSoundLoop === null || damageSoundLoop.destroyed) { damageSoundLoop = this.danmaku.game.forever(loop => {
            if (this.danmaku.combat.clock >= lastPlayDamageSoundClockTs + 3) {
                const fn = damageSoundQueue.shift();
                if (fn) {
                    lastPlayDamageSoundClockTs = this.danmaku.combat.clock;
                    fn();
                }
            }
        }); }
        if (options.autoInvincibleMode === "noDamageWhilePlayerInvincible") {
            this.forever(loop => {
                for (const player of this.danmaku.board._playerRegList.getAlives()) {
                    if (player.state.type !== "common" || player.state.invincibleTime > 10) {
                        this._lastInvincibleClockTs = this.danmaku.combat.clock + 10;
                    }
                }
            });
        } else if (options.autoInvincibleMode === "ghostWhilePlayerInvincible") {
            // TODO: ghostWhilePlayerInvincible
        } else {
            utils.staticAssert<"none">(options.autoInvincibleMode);
        }
    }

    drawDebugHitbox() {
        this.danmaku.hitboxGraphics?.circle(
            0, 0, this.hurtHitboxRadius
        ).fill("hsla(0, 100%, 60%, 0.30)").stroke("#ffaaaa");
    }

    /** @internal */
    private _afterBeHurtCallback: NewCommonEnemyOptions["afterBeHurtCallback"];

    beHurt(value: number, options: EnemyBeHurtOptions = {}) {
        if (!this.isInvincible) {
            if (options.isEffectByBirthProtect ?? true) {
                value *= this._birthProtectCoef;
            }
            this.hp -= value;
        }
        const { damage00, damage01, nodamage } = this.danmaku.game.prefabSounds.thse;
        const play = this.isInvincible ? () => nodamage.play(utils.decibel(-6)) : this.hp <= Math.min(this.maxHp * 0.1, 500) ? damage01.play : damage00.play;
        if (this.danmaku.combat.clock >= lastPlayDamageSoundClockTs + 3) {
            lastPlayDamageSoundClockTs = this.danmaku.combat.clock;
            play();
        } else if (this.danmaku.combat.clock >= lastPlayDamageSoundClockTs + 1) {
            if (damageSoundQueue.length < 2) { damageSoundQueue.push(play); }
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
        this._hpBarPhaseLinesGraphics?.destroy({ children: true });
    }

    get destroyed(): boolean {
        return this.danmaku.enemy !== this;
    }
}