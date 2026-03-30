import * as pixi from "pixi";
import { Input, KeyName } from "../input.js";
import { Board, Combat, Game, utils } from "../jstg.js";
import { alphaTo, deg, clamp, staticAssert } from "../utils.js";
import { AbstractDanmaku } from "../entity/abstractDanmaku.js";
import { DifferenceBlendFilter } from "../graphics/differenceBlendFilter.js";
import { CoDoGenFn, LooperFn, LoopOptions } from "../looper.js";

export interface PlayerKeyMapOptions {
    /** @default Key.ArrowUp */
    up?: KeyName | KeyName[],
    /** @default Key.ArrowDown */
    down?: KeyName | KeyName[],
    /** @default Key.ArrowLeft */
    left?: KeyName | KeyName[],
    /** @default Key.ArrowRight */
    right?: KeyName | KeyName[],
    /** @default Key.ShiftLeft */
    slow?: KeyName | KeyName[],
    /** @default Key.KeyZ */
    attack?: KeyName | KeyName[],
    /** @default Key.KeyX */
    bomb?: KeyName | KeyName[],
}

export interface PlayerUpdateOptions {
    /**
     * 可以传一个 replay 专用 input 啥的
     * @default game.input
     */
    input?: Input,

    keyMap?: PlayerKeyMapOptions,
    /**
     * 高速时的移速
     * @default this.highSpeed
     */
    highSpeed?: number,
    /**
     * 低速时的移速
     * @default this.slowSpeed
     */
    slowSpeed?: number,
}

export interface PlayerBeHurtOptions {
    danmaku: AbstractDanmaku | null,
}

export type MissGainBombType = "resetToInitAmount" | "increaseByInitAmount" | "none";

const missInvincibleTime = 180;

export interface NewPlayerOptions {
    name: string;
    game: Game;
    combat: Combat;
    board: Board;
    mainTexture: pixi.Texture;
    hitboxTexture: pixi.Texture;
    slowModeRingTexture: pixi.Texture;
    invincibleRingTexture: pixi.Texture;
    /** @default 0 */
    hue1: number | null;
    /** @default 3 */
    hitboxRadius: number | null;
    /** @default 4 */
    highSpeed: number | null;
    /** @default 1.6 */
    slowSpeed: number | null;
    /** @default 12 */
    dyingBombTime: number | null;
    /** @default 2 */
    initHpAmount: number | null;
    /** @default 3 */
    initBombAmount: number | null;
    /** @default 8 */
    maxHpAmount: number | null;
    /** @default 8 */
    maxBombAmount: number | null;
    /** @default "resetToInitAmount" */
    missGainBombType: MissGainBombType | null;
    /** @default true */
    autoUpdateDanmakuRegList: boolean | null;
    /** @default true */
    autoUpdateSelf: boolean | null;
    updateFn: (options: PlayerUpdateOptions) => void;
    beHurtFn: (options: PlayerBeHurtOptions) => void;
    destroyCallback: () => void;
}

export class Player {

    readonly name: string;
    readonly game: Game;
    readonly combat: Combat;
    readonly board: Board;

    hue1: number;
    hue1Filter: pixi.ColorMatrixFilter;
    hitboxRadius: number;
    highSpeed: number;
    slowSpeed: number;
    dyingBombTime: number;

    isSlow: boolean = false;
    isShooting: boolean = false;

    state: {
        type: "common",
        invincibleTime: number,
    } | {
        type: "dying",
        timeSinceDying: number,
    } | {
        type: "miss",
        rebirthInvincibleTime?: number,
    } = {
        type: "common",
        invincibleTime: missInvincibleTime,
    }

    /** 图层低于弹幕的节点们的父节点，这个节点里有像素绘、低速魔法阵、子机 */
    backParts: pixi.Sprite;
    /** 图层高于弹幕的节点们的父节点，这个节点里有判定点、无敌特效光环 */
    frontParts: pixi.Sprite;
    /** 像素绘 */
    avatar: pixi.Sprite;
    /** 判定点 */
    hitboxPoint: pixi.Sprite;
    /** 无敌期间出现的一个大圆圈特效 */
    invincibleRing: pixi.Sprite;
    /** 减速时那个半透明转转转的魔法阵 */
    slowModeRing: pixi.Sprite;

    /** @internal */
    private _hpAmount: number;
    /** 当前残机数量 */
    get hpAmount() { return this._hpAmount; }
    set hpAmount(n: number) {
        this._hpAmount = clamp(n, 0, this.maxHpAmount);
    }
    /** 起始残机数量 */
    initHpAmount: number;
    /** 残机数量上限 */
    maxHpAmount: number;

    /** @internal */
    private _bombAmount: number;
    /** 当前 Bomb 数量 */
    get bombAmount() { return this._bombAmount; }
    set bombAmount(n: number) {
        this._bombAmount = clamp(n, 0, this.maxBombAmount);
    }
    /** 起始 Bomb 数量 */
    initBombAmount: number;
    /** Bomb 数量上限 */
    maxBombAmount: number;

    /** @internal */
    private readonly missGainBombType: MissGainBombType;

    /** @internal 玩家在上一次判定时的 x */
    _lastX: number;
    /** @internal 玩家在上一次判定时的 y */
    _lastY: number;

    /** @internal 是否消除撞到的弹幕 */
    _isNeedEraseHitDanmaku: boolean = true;

    get x() { return this.frontParts.x; }
    set x(n: number) {
        this.frontParts.x = n;
        this.backParts.x = n;
    }

    get y() { return this.frontParts.y; }
    set y(n: number) {
        this.frontParts.y = n;
        this.backParts.y = n;
    }

    get alpha() { return this.frontParts.alpha; }
    set alpha(n: number) {
        this.frontParts.alpha = n;
        this.backParts.alpha = n;
    }

    constructor(options: NewPlayerOptions) {
        this.name = options.name;
        this.game = options.game;
        this.combat = options.combat;
        this.board = options.board;
        this.hue1 = options.hue1 ?? 0;
        this.hue1Filter = new pixi.ColorMatrixFilter({ resolution: "inherit" });
        this.hue1Filter.hue(this.hue1, false);
        this.hitboxRadius = options.hitboxRadius ?? 3;
        this.highSpeed = options.highSpeed ?? 4;
        this.slowSpeed = options.slowSpeed ?? 1.6;
        this.dyingBombTime = options.dyingBombTime ?? 12;
        this.initHpAmount = this._hpAmount = options.initHpAmount ?? 2;
        this.initBombAmount = this._bombAmount = options.initBombAmount ?? 3;
        this.maxHpAmount = options.maxHpAmount ?? 8;
        this.maxBombAmount = options.maxBombAmount ?? 8;
        this.missGainBombType = options.missGainBombType ?? "resetToInitAmount";

        this.update = options.updateFn;
        this.beHurt = options.beHurtFn;
        this.destroyFn = options.destroyCallback;

        this.backParts = new pixi.Sprite({
            parent: options.board.playerBackLayer,
            anchor: 0.5,
        });

        this.frontParts = new pixi.Sprite({
            parent: options.board.playerFrontLayer,
            anchor: 0.5,
        });

        this.avatar = new pixi.Sprite({
            parent: this.backParts,
            texture: options.mainTexture,
            anchor: 0.5,
            scale: 1.1,
            zIndex: 10,
        });

        this.hitboxPoint = new pixi.Sprite({
            parent: this.frontParts,
            texture: options.hitboxTexture,
            scale: 0.24, anchor: 0.5,// 这里的 scale 只是个临时的值，实际上 scale每帧都会更新
            filters: this.hue1Filter,
            alpha: 0,
        });

        this.invincibleRing = new pixi.Sprite({
            parent: this.frontParts,
            texture: options.invincibleRingTexture,
            scale: 0, anchor: 0.5,
            filters: this.hue1Filter,
            alpha: 0,
            blendMode: "add",
        });

        this.slowModeRing = new pixi.Sprite({
            parent: this.backParts,
            texture: options.slowModeRingTexture,
            scale: 1.1, anchor: 0.5,
            filters: this.hue1Filter,
            alpha: 0,
            rotation: 0,
            zIndex: 0,
        });

        this.x = this._lastX = 0;
        this.y = this._lastY = 185;

        if (options.autoUpdateSelf ?? true) {
            this.forever(() => this.update({}), { order: 0 });
        }

        if (options.autoUpdateDanmakuRegList ?? true) {
            this.forever(() => this.board.danmakuRegList.update(this), { order: 10, owns: this }); // 这里 owns 是为了在 combat 销毁时让 player 随之销毁
        }
    }

    /**
     * TODOC:
     * 更新自机。
     * @example
     * game.forever(loop => {
     *     // 基本的写法
     *     player.update();
     * 
     *     // 接受一个特定输入源，并重设键位和移速的写法
     *     // 将移动键位重设为 WASD ，并且按 Z 或者 K 都可以开火，按 Shift 或空格都可以低速
     *     player.update({
     *         input: game.input,
     *         highSpeed: 5, slowSpeed: 2,
     *         keyMap: {
     *             up: Key.KeyW, down: Key.KeyS, left: Key.KeyA, right: Key.KeyD,
     *             attack: [Key.KeyZ, Key.KeyK],
     *             slow: [Key.ShiftLeft, Key.Space],
     *         },
     *     );
     * });
     */
    update: (options: PlayerUpdateOptions) => void;

    beHurt: (options: PlayerBeHurtOptions) => void;

    destroyFn: () => void;

    /** 移动自机，还有 isShooting */
    _updateInputAndMove(options: PlayerUpdateOptions) {
        if (!(this.state.type === "common")) { return; }
        const ts = this.game.timeScale;
        const keyMap = options.keyMap ?? {};
        const { isDown, isHold } = options.input ?? this.game.input;
        let dx = 0;
        let dy = 0;

        const kh = (keyOrKeys: KeyName | KeyName[]) => typeof keyOrKeys === "string" ? isHold(keyOrKeys) : keyOrKeys.some(key => isHold(key));
        // @ts-expect-error MAGIC: 布尔值隐式转换为 0 和 1 ，可以用于数学运算
        dx = kh(keyMap.right ?? Key.ArrowRight) - kh(keyMap.left ?? Key.ArrowLeft);
        // @ts-expect-error
        dy = kh(keyMap.down ?? Key.ArrowDown) - kh(keyMap.up ?? Key.ArrowUp);
        this.isSlow = kh(keyMap.slow ?? "ShiftLeft");

        this.slowModeRing.rotation += deg(2 * ts);
        if (dx !== 0 || dy !== 0) {
            let v = this.isSlow ? options.slowSpeed ?? this.slowSpeed : options.highSpeed ?? this.highSpeed;
            v *= ts;
            let m = v / Math.sqrt(dx * dx + dy * dy);
            dx *= m;
            dy *= m;

            let w = this.board.halfWidth - 16;
            let h = this.board.halfHeight - 16;
            this.x = clamp(this.x + dx, -w, w);
            this.y = clamp(this.y + dy, -h, h);
        }

        this.isShooting = kh(keyMap.attack ?? "KeyZ");
    }

    _defaultUpdate(options: PlayerUpdateOptions) {
        if (this.state.type === "common") {
            this._updateInputAndMove(options);
        } else {
            this.isSlow = false;
            this.isShooting = false;
        } // 这玩意不写在生成器里，是因为 options 传不进去。。。傻逼 js 没法获得第一次 next 传进去的东西
        this._updateStateGen.next();
    }

    /** @internal */
    _updateStateGen = function*(this: Player) { while (true) {
        while (this.state.type === "common") { // 平时
            const ts = this.game.timeScale;

            if (this.state.invincibleTime <= ts) {
                this.state.invincibleTime = 0;
            } else {
                this.state.invincibleTime -= ts;
            }

            // 更新各组件的外观，如透明度
            this.invincibleRing.scale = 0.00036 * this.state.invincibleTime * Math.sqrt(this.state.invincibleTime);
            if (this.state.invincibleTime > 30) {
                this.invincibleRing.alpha = Math.min(this.state.invincibleTime / 180, 1); // 这里我总感觉让它超过 1 有点不稳当
            } else {
                alphaTo(this.invincibleRing, 0, 0.025 * ts);
            }

            let avatarAlpha = 1;
            if (this.state.invincibleTime > 30) {
                avatarAlpha -= (Math.floor(this.state.invincibleTime / 3) % 2) * 0.4 // 括号不是必要的，但不套括号多少有点不明确，因为我是试了一下才确定取模优先级大于乘法的
            }

            if (this.isSlow) {
                alphaTo(this.avatar, avatarAlpha / 2, 0.1 * ts);
                alphaTo(this.hitboxPoint, 1, 0.1 * ts);
                alphaTo(this.slowModeRing, 1, 0.1 * ts);
            } else {
                alphaTo(this.avatar, avatarAlpha, 0.1 * ts);
                alphaTo(this.hitboxPoint, 0, 0.1 * ts);
                alphaTo(this.slowModeRing, 0, 0.1 * ts);
            }
            alphaTo(this, 1, 0.1 * ts);

            this.hitboxPoint.scale = this.hitboxRadius * 0.072 + 0.16;

            yield;
        };
        if (this.state.type === "dying") {
            this.avatar.alpha = 1;
            this.hitboxPoint.alpha = 1;
            this.slowModeRing.alpha = 0;
        }
        while (this.state.type === "dying") { // 决死期间
            const ts = this.game.timeScale;
            alphaTo(this, 0, 0.1 * ts)
            if (this.state.timeSinceDying >= this.dyingBombTime) {
                this.state = { type: "miss" }; // 似了
            } else {
                this.state.timeSinceDying += this.game.timeScale;
                yield;
            }
        }
        while (this.state.type === "miss") { // 死后
            if (this.game.debug.godMode.isOn) {
                this.game.debug.godMode.dieCount ++;
                this.state = { type: "common", invincibleTime: 30, };
            } else {
                if (this.hpAmount < 1) {
                    // TODO: 疮痍
                } else {
                    this.hpAmount -= 1;
                }
                {// 一堆交叉圈的特效
                    const missFilterSprites: pixi.Sprite[] = []
                    const makeMissFilterSprite = (dx: number, dy: number) => {
                        const spr = new pixi.Sprite({
                            parent: this.backParts.parent ?? undefined,
                            texture: this.game.prefabTextures.player.missFilter,
                            anchor: 0.5,
                            x: this.x + dx, y: this.y + dy,
                            scale: 0,
                            zIndex: 500,
                            filters: new DifferenceBlendFilter(),
                        });
                        let radius = 0;
                        this.board.forever(loop => {
                            radius += (radius * 0.075 + 0.25) * this.game.timeScale;
                            spr.scale = radius * 0.01;
                        }, { owns: spr });
                        missFilterSprites.push(spr);
                    }
                    const self = this;
                    this.board.coDo(function*(loop) {
                        makeMissFilterSprite(0, 0);
                        yield* self.game.Sleep(6);
                        makeMissFilterSprite(-40, 0);
                        makeMissFilterSprite(40, 0);
                        makeMissFilterSprite(0, -40);
                        makeMissFilterSprite(0, 40);
                        yield* self.game.Sleep(24);
                        makeMissFilterSprite(0, 0);
                        yield* self.game.Sleep(70);
                        missFilterSprites.forEach(spr => spr.destroy({ children: true }));
                    });
                }
                yield* this.game.Sleep(40);
                this.board.foo_clearScreen({ x: this.x, y: this.y });
                yield* this.game.Sleep(20);
                // 重生动画
                this.alpha = 1;
                this.avatar.alpha = 1;
                this.hitboxPoint.alpha = 0;
                this.slowModeRing.alpha = 0;
                this.x = 0;
                this.y = 224;
                // 重置 Bomb 的数量
                if (this.missGainBombType === "resetToInitAmount") {
                    this.bombAmount = this.initBombAmount;
                } else if (this.missGainBombType === "increaseByInitAmount") {
                    this.bombAmount = Math.max(this.bombAmount, this.initBombAmount);
                } else {
                    staticAssert<"none">(this.missGainBombType)
                }
                while (this.y > 185) {
                    this.y -= 2 * this.game.timeScale;
                    yield;
                }
                this.y = 185;
                this.state = { type: "common", invincibleTime: this.state.rebirthInvincibleTime ?? 0 };
                this.applyInvincible(missInvincibleTime);
                break;
            }
        }
    }}.call(this);

    _defaultBeHurt(options: PlayerBeHurtOptions) {
        if (this.state.type === "common") {
            if (this.state.invincibleTime === 0) {
                const { pldead00 } = this.game.prefabSounds.thse;
                pldead00.play(utils.decibel(3));
                if (this.game.debug.godMode.isOn) {
                    this.game.debug.godMode.dieCount += 1;
                    this.applyInvincible(20);
                } else {
                    // TODO: 两种受伤行为，一种普通的，一种原地爆炸的
                    this.state = { type: "dying", timeSinceDying: 0 };
                    this.board._spellcardRegList.forEachAlive(spell => spell.onMiss({ player: this }));
                }
            }
            if (this._isNeedEraseHitDanmaku) { options.danmaku?.erase(); }
        }
    }

    /** 给予玩家无敌效果。如果玩家处于 Miss 状态，则这些无敌时间会拖到玩家复活后再开始生效。 */
    applyInvincible(time: number) {
        if (this.state.type === "common") {
            // 新旧无敌时间的叠加方式，不是加算，也不是取最大值，而是两者折中。（用牢zun的话说，很狡猾的机制。）
            this.state.invincibleTime = Math.max(this.state.invincibleTime, time) + Math.min(this.state.invincibleTime, time) / 2;
        } else if (this.state.type === "dying") { // 决死
            this.state = { type: "common", invincibleTime: time };
        } else {
            const rt = this.state.rebirthInvincibleTime ?? 0;
            this.state.rebirthInvincibleTime = Math.max(rt, time) + Math.min(rt, time) / 2;
        }
    }

    destroy() {
        if (this.backParts.destroyed) { return };
        this.backParts.destroy({ children: true });
        this.frontParts.destroy({ children: true });
        this.destroyFn();
    }

    /**
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃  
     * 例如：一个跟踪弹保留了一个玩家的引用，并且追踪玩家的位置；那么，该跟踪弹应该在每帧都检查玩家是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    get destroyed() {
        return this.backParts.destroyed;
    }

    forever(fn: LooperFn, options: LoopOptions = {}) {
        const loop = this.board.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }

    coDo(genFn: CoDoGenFn, options: LoopOptions = {}) {
        const loop = this.board.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}