import * as pixi from "pixi";
import { Input, Key } from "../Input.js";
import { Board, Game } from "../jstg.js";
import { alphaTo, deg, clamp } from "../utils.js";
import { Danmaku } from "../danmaku.js";

interface PlayerKeyMapOptions {
    /** @default Key.ArrowUp */
    up?: string | string[],
    /** @default Key.ArrowDown */
    down?: string | string[],
    /** @default Key.ArrowLeft */
    left?: string | string[],
    /** @default Key.ArrowRight */
    right?: string | string[],
    /** @default Key.ShiftLeft */
    slow?: string | string[],
    /** @default Key.KeyZ */
    attack?: string | string[],
    /** @default Key.KeyX */
    bomb?: string | string[],
}

interface PlayerUpdateOptions {
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

interface PlayerHitByEnemyOptions {
    danmaku?: Danmaku,
}

export interface MakePlayerOptions {
    /** @default true */
    autoUpdateSelf?: boolean,
    /** @default true */
    autoUpdateDanmakuPool?: boolean,
}

export class Player {

    readonly name: string;
    readonly game: Game;
    readonly board: Board;

    hue1: number;
    hitboxRadius: number;
    highSpeed: number;
    slowSpeed: number;
    dyingBombTime: number;

    isSlow: boolean = false;
    invincibleTime: number = 90;

    state: {
        type: "common",
    } | {
        type: "dying",
        timeSinceDying: number,
    } | {
        type: "miss",
    } = {
        type: "common",
    }

    /** 图层低于弹幕的节点们的父节点，这个节点里有像素绘、低速魔法阵 */
    backParts: pixi.Sprite;
    /** 图层高于弹幕的节点们的父节点，这个节点里有判定点、无敌特效光环 */
    frontParts: pixi.Sprite;
    /** 像素绘 */
    avatar: pixi.Sprite;
    /** 判定点 */
    hitboxPoint: pixi.Sprite;
    /** 减速时那个半透明转转转的魔法阵 */
    slowModeRing: pixi.Sprite;

    /** @internal 玩家在上一次判定时的 x */
    _lastX: number;
    /** @internal 玩家在上一次判定时的 y */
    _lastY: number;

    get x() { return this.frontParts.x; }
    set x(n: number) {
        this.backParts.x = n;
        this.frontParts.x = n;
    }

    get y() { return this.frontParts.y; }
    set y(n: number) {
        this.backParts.y = n;
        this.frontParts.y = n;
    }

    constructor(options: {
        name: string,
        game: Game
        board: Board,
        mainTexture: pixi.Texture,
        hitboxTexture: pixi.Texture,
        slowModeRingTexture: pixi.Texture,
        /** @default 0 */
        hue1?: number,
        /** @default 3 */
        hitboxRadius?: number,
        /** @default 4 */
        highSpeed?: number,
        /** @default 1.6 */
        slowSpeed?: number,
        /** @default 12 */
        dyingBombTime?: number,
        /** @default true */
        autoUpdateDanmakuPool?: boolean,
        /** @default true */
        autoUpdateSelf?: boolean,
        updateFn: (this: Player, options?: PlayerUpdateOptions) => any,
        hitByEnemyFn: (this: Player, options?: PlayerHitByEnemyOptions) => any,
    }) {
        this.name = options.name;
        this.game = options.game;
        this.board = options.board;
        this.hue1 = options.hue1 ?? 0;
        this.hitboxRadius = options.hitboxRadius ?? 3;
        this.highSpeed = options.highSpeed ?? 4;
        this.slowSpeed = options.slowSpeed ?? 1.6;
        this.dyingBombTime = options.dyingBombTime ?? 12;
        this.update = options.updateFn;
        this.hitByEnemy = options.hitByEnemyFn;

        this.backParts = new pixi.Sprite({
            parent: options.board.root,
            anchor: 0.5,
            zIndex: -100,
        });

        this.frontParts = new pixi.Sprite({
            parent: options.board.root,
            anchor: 0.5,
            zIndex: 100,
        });

        this.avatar = new pixi.Sprite({
            parent: this.backParts,
            texture: options.mainTexture,
            anchor: 0.5,
            scale: 1.1,
        });

        const plColorFilter = new pixi.ColorMatrixFilter({resolution: "inherit"});
        plColorFilter.hue(this.hue1, false);

        this.hitboxPoint = new pixi.Sprite({
            parent: this.frontParts,
            texture: options.hitboxTexture,
            scale: this.hitboxRadius * 0.04 + 0.12, anchor: 0.5,
            filters: plColorFilter,
            alpha: 0,
        });

        this.slowModeRing = new pixi.Sprite({
            parent: this.backParts,
            texture: options.slowModeRingTexture,
            scale: 1.1, anchor: 0.5,
            filters: plColorFilter,
            alpha: 0,
            rotation: 0,
        });

        this.x = this._lastX = 0;
        this.y = this._lastY = 185;

        if (options.autoUpdateSelf ?? true) {
            this.game.forever(() => this.update(), { priority: 29900, refs: this });
        }

        if (options.autoUpdateDanmakuPool ?? true) {
            this.game.forever(() => this.game.danmakuPool.update(this), { priority: -30000, refs: this });
        }
    }

    /**
     * 更新自机，请务必每帧都调用一次该函数
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
    update: (this: Player, options?: PlayerUpdateOptions) => any;

    hitByEnemy: (this: Player, options?: PlayerHitByEnemyOptions) => any;

    /** 移动自机 */
    move(options: PlayerUpdateOptions) {
        const ts = this.game.ts;
        const keyMap = options.keyMap ?? {};
        const { isDown, isHold } = options.input ?? this.game.input;
        let dx = 0;
        let dy = 0;

        const kh = (keyOrKeys: string | string[]) => typeof keyOrKeys === "string" ? isHold(keyOrKeys) : keyOrKeys.some(key => isHold(key));
        // @ts-expect-error 隐式转换的奇技淫巧
        dx = kh(keyMap.right ?? Key.ArrowRight) - kh(keyMap.left ?? Key.ArrowLeft);
        // @ts-expect-error
        dy = kh(keyMap.down ?? Key.ArrowDown) - kh(keyMap.up ?? Key.ArrowUp);
        this.isSlow = kh(keyMap.slow ?? Key.ShiftLeft);

        if (this.isSlow) {
            alphaTo(this.avatar, 0.5, 0.1 * ts);
            alphaTo(this.hitboxPoint, 1, 0.1 * ts);
            alphaTo(this.slowModeRing, 1, 0.1 * ts);
        } else {
            alphaTo(this.avatar, 1, 0.1 * ts);
            alphaTo(this.hitboxPoint, 0, 0.1 * ts);
            alphaTo(this.slowModeRing, 0, 0.1 * ts);
        }
        this.slowModeRing.rotation += deg(2 * ts);
        if (dx !== 0 || dy !== 0) {
            let v = this.isSlow ? options.slowSpeed ?? this.slowSpeed : options.highSpeed ?? this.highSpeed;
            v *= ts;
            let m = v / Math.sqrt(dx * dx + dy * dy);
            dx *= m;
            dy *= m;

            let w = this.board.width - 16;
            let h = this.board.height - 16;
            this.x = clamp(this.x + dx, -w, w);
            this.y = clamp(this.y + dy, -h, h);
        }
    }

    /** @internal */
    _updateStateGen = function*(this: Player) {
        while (true) {
            while (this.state.type === "common") yield; // 平时
            while (this.state.type === "dying") { // 决死期间
                if (this.state.timeSinceDying >= this.dyingBombTime) {
                    this.state = { type: "miss" }; // 似了
                    // TODO: miss
                } else {
                    this.state.timeSinceDying += this.game.ts;
                    if (this.invincibleTime > 0) { // 决死成功

                    }
                    yield;
                }
            }
            while (this.state.type === "miss") { // 死后
                this.state = { type: "common" };
                // TODO: miss
            }
        }
    }.call(this);


    updateState() {
        this._updateStateGen.next();
        if (this.invincibleTime <= this.game.ts) {
            this.invincibleTime = 0;
        } else {
            this.invincibleTime -= this.game.ts;
        }
    }

    hitByDanmaku(danmaku: Danmaku) {
        if (this.state.type !== "common" || this.invincibleTime > 0) return;
        const { pldead00 } = this.game.prefabSounds.thse;
        pldead00.stop();
        pldead00.play();
        this.state = { type: "dying", timeSinceDying: 0 };
        this.updateState();
    }

    destroy() {
        if (this.destroyed) return;
        this.backParts.destroy();
        this.frontParts.destroy();
    }

    /** 
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃  
     * 例如：一个跟踪弹保留了一个玩家的引用，并且追踪玩家的位置；那么，该跟踪弹应该在每帧都检查玩家是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    get destroyed() {
        return this.backParts.destroyed;
    }

}
