import * as pixi from "pixi";
import { Input, KeyName } from "../input.js";
import { Board, Combat, Game } from "../jstg.js";
import * as utils from "../utils.js";
import { AbstractDanmaku } from "../entity/abstractDanmaku.js";
import { DifferenceBlendFilter } from "../graphics/differenceBlendFilter.js";
import { CoDoGenFn, LooperFn, LoopOptions } from "../looper.js";
import { makeReigekiRing } from "./reigekiRing.js";

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

export interface PlayerBombOptions {
    
}

export type MissGainBombType = "resetToInitAmount" | "increaseToInitAmount" | "none";

const missInvincibleTime = 180;

export interface NewPlayerOptions {
    name: string;
    game: Game;
    combat: Combat;
    board: Board;
    avatarTexture: pixi.Texture;
    hitboxTexture: pixi.Texture;
    slowModeRingTexture: pixi.Texture;
    invincibleRingTexture: pixi.Texture;
    filters: pixi.Filter[];
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
    autoUpdateDanmakuRegList: boolean;
    autoUpdateSelf: boolean;
    updateFn: (options: PlayerUpdateOptions) => void;
    beHurtFn: (options: PlayerBeHurtOptions) => void;
    bombFn: (options: PlayerBombOptions) => void;
    destroyCallback: () => void;
}

export class Player {

    readonly name: string;
    readonly game: Game;
    readonly combat: Combat;
    readonly board: Board;

    filters: pixi.Filter[];
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
        this._hpAmount = utils.clamp(n, 0, this.maxHpAmount);
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
        this._bombAmount = utils.clamp(n, 0, this.maxBombAmount);
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
        this.filters = options.filters;
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
        this.bombFn = options.bombFn;
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
            texture: options.avatarTexture,
            anchor: 0.5,
            scale: 1.1,
            zIndex: 10,
        });

        this.hitboxPoint = new pixi.Sprite({
            parent: this.frontParts,
            texture: options.hitboxTexture,
            scale: 0.24, anchor: 0.5,// 这里的 scale 只是个临时的值，实际上 scale每帧都会更新
            filters: this.filters,
            alpha: 0,
        });

        this.invincibleRing = new pixi.Sprite({
            parent: this.frontParts,
            texture: options.invincibleRingTexture,
            scale: 0, anchor: 0.5,
            filters: this.filters,
            alpha: 0,
            blendMode: "add",
        });

        this.slowModeRing = new pixi.Sprite({
            parent: this.backParts,
            texture: options.slowModeRingTexture,
            scale: 1.1, anchor: 0.5,
            filters: this.filters,
            alpha: 0,
            rotation: 0,
            zIndex: 0,
        });

        this.x = this._lastX = 0;
        this.y = this._lastY = 185;

        if (options.autoUpdateSelf) {
            this.forever(() => this.update({}), { order: 0 });
        }

        if (options.autoUpdateDanmakuRegList) {
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
    bombFn: (options: PlayerBombOptions) => void;
    destroyFn: () => void;

    private _bombCd = 0;

    /** 移动自机，还有 isShooting */
    _updateInputAndMove(options: PlayerUpdateOptions) {
        const ts = this.game.timeScale;
        const { deg, clamp } = utils;
        const keyMap = options.keyMap ?? {};
        const { isDown, isHold } = options.input ?? this.game.input;
        let dx = 0;
        let dy = 0;

        const kh = (keyOrKeys: KeyName | KeyName[]) => typeof keyOrKeys === "string" ? isHold(keyOrKeys) : keyOrKeys.some(key => isHold(key));
        const kd = (keyOrKeys: KeyName | KeyName[]) => typeof keyOrKeys === "string" ? isDown(keyOrKeys) : keyOrKeys.some(key => isDown(key));
        // @ts-expect-error MAGIC: 布尔值隐式转换为 0 和 1 ，可以用于数学运算
        dx = kh(keyMap.right ?? Key.ArrowRight) - kh(keyMap.left ?? Key.ArrowLeft);
        // @ts-expect-error
        dy = kh(keyMap.down ?? Key.ArrowDown) - kh(keyMap.up ?? Key.ArrowUp);
        if (this.state.type === "common") {
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
        } else {
            this.isSlow = false;
            this.isShooting = false;
        }

        if (this.state.type === "common" || this.state.type === "dying") {
            if (this.bombAmount >= 1 && kd(keyMap.bomb ?? "KeyX") && (
                this._bombCd <= 0 || this.state.type !== "common" || this.state.invincibleTime <= 0
            )) {
                this.bombFn({});
                this.bombAmount -= 1;
                this.board._spellcardRegList.getAlives().forEach(spell => spell.onBomb({ player: this }));
            }
        }
    }

    _defaultUpdate(options: PlayerUpdateOptions) {
        this._updateInputAndMove(options); // 这玩意不写在生成器里，是因为 options 传不进去。。。傻逼 js 没法获得第一次 next 传进去的东西
        this._updateStateGen.next();
        if (this._bombCd <= this.game.timeScale) {
            this._bombCd = 0;
        } else {
            this._bombCd -= this.game.timeScale;
        }
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
                this.invincibleRing.alpha = 1 - this.state.invincibleTime / 180;
            } else {
                this.game.alphaTo(this.invincibleRing, 0, 0.025);
            }

            let avatarAlpha = 1;
            if (this.state.invincibleTime > 30) {
                avatarAlpha -= (Math.floor(this.state.invincibleTime / 3) % 2) * 0.4 // 括号不是必要的，但不套括号多少有点不明确，因为我是试了一下才确定取模优先级大于乘法的
            }

            if (this.isSlow) {
                this.game.alphaTo(this.avatar, avatarAlpha / 2, 0.1);
                this.game.alphaTo(this.hitboxPoint, 1, 0.1);
                this.game.alphaTo(this.slowModeRing, 1, 0.1);
            } else {
                this.game.alphaTo(this.avatar, avatarAlpha, 0.1);
                this.game.alphaTo(this.hitboxPoint, 0, 0.1);
                this.game.alphaTo(this.slowModeRing, 0, 0.1);
            }
            this.game.alphaTo(this, 1, 0.1);

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
            this.game.alphaTo(this, 0, 0.1)
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
                            parent: this.board.missFilterLayer,
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
                this.board.clearBoard({ x: this.x, y: this.y });
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
                } else if (this.missGainBombType === "increaseToInitAmount") {
                    this.bombAmount = Math.max(this.bombAmount, this.initBombAmount);
                } else {
                    utils.staticAssert<"none">(this.missGainBombType)
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
                    this.board._spellcardRegList.getAlives().forEach(spell => spell.onMiss({ player: this }));
                }
            }
            if (this._isNeedEraseHitDanmaku) { options.danmaku?.erase(); }
        }
    }

    _defaultReigekiBomb(opt: PlayerBombOptions) {
        this.applyInvincible(330);
        this.applyBombCd(240);
        this.game.prefabSounds.thse.slash.play();
        this.game.prefabSounds.thse.nep00.play();
        makeReigekiRing({
            game: this.game, combat: this.combat, board: this.board,
            x: this.x, y: this.y + 50,
            maxRadius: null, insideDps: 250, outsideDps: 500,
            initSpeed: 2, speedK: 0.992, duration: 150,
        });
    }

    /**
     * 给予玩家无敌效果。  
     * 如果 time <= 0 ，则什么也不会发生。  
     * 如果玩家处于 dying 状态，则复活，也就是俗称的决死。  
     * 如果玩家处于 miss 状态，则这些无敌时间会拖到玩家复活后再开始生效。  
     */
    applyInvincible(time: number) {
        if (time <= 0) { return; }
        if (this.state.type === "common") {
            // 新旧无敌时间的叠加方式，不是加算，也不是取最大值，而是两者折中。（用牢zun的话说，很狡猾的机制。）
            this.state.invincibleTime = Math.max(this.state.invincibleTime, time) + Math.min(this.state.invincibleTime, time) / 2;
        } else if (this.state.type === "dying") { // 决死
            this.state = { type: "common", invincibleTime: time };
        } else if (this.state.type === "miss") {
            const rt = this.state.rebirthInvincibleTime ?? 0;
            this.state.rebirthInvincibleTime = Math.max(rt, time) + Math.min(rt, time) / 2;
        } else {
            utils.staticAssert<never>(this.state);
        }
    }

    /**
     * 在 time 时间内，不能使用 Bomb 。  
     * 一般来说，应当在 Bomb 生效时调用此函数，防止玩家手滑连着放出好几个 B 。  
     */
    applyBombCd(time: number) {
        this._bombCd = Math.max(this._bombCd, time);
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

    forever<T>(fn: LooperFn<T>, options: LoopOptions = {}) {
        const loop = this.board.forever(fn, options);
        loop.addRefs(this);
        return loop;
    }

    coDo<T>(genFn: CoDoGenFn<T>, options: LoopOptions = {}) {
        const loop = this.board.coDo(genFn, options);
        loop.addRefs(this);
        return loop;
    }
}