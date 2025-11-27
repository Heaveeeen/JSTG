import * as pixi from "pixi";
import { LoadSvg } from "./assets.js";
import { Input, Key } from "./Input.js";
import { Board } from "./jstg.js";

const clamp = (n: number, a: number, b: number) => Math.min(Math.max(a, n), b);

const alphaTo = (spr: pixi.Sprite, dst: number, speed: number) => {
    if (Math.abs(spr.alpha - dst) <= speed) {
        spr.alpha = dst;
    } else if (dst > spr.alpha) {
        spr.alpha += speed;
    } else {
        spr.alpha -= speed;
    }
}

const deg = (n: number) => n * Math.PI / 180;

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

export class Player {

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

    constructor(
        readonly name: string,
        readonly board: Board,
        mainTexture: pixi.Texture,
        hitboxTexture: pixi.Texture,
        slowModeRingTexture: pixi.Texture,
        readonly hue1: number,
        public hitboxRadius: number,
        public highSpeed: number,
        public slowSpeed: number
    ) {

        this.backParts = new pixi.Sprite({
            parent: board.root,
            anchor: 0.5,
            zIndex: -100,
        });

        this.frontParts = new pixi.Sprite({
            parent: board.root,
            anchor: 0.5,
            zIndex: 100,
        });

        this.avatar = new pixi.Sprite({
            parent: this.backParts,
            texture: mainTexture,
            anchor: 0.5,
            scale: 1.1,
        });

        const plColorFilter = new pixi.ColorMatrixFilter({resolution: "inherit"});
        plColorFilter.hue(hue1, false);

        this.hitboxPoint = new pixi.Sprite({
            parent: this.frontParts,
            texture: hitboxTexture,
            scale: hitboxRadius * 0.04 + 0.12, anchor: 0.5,
            filters: plColorFilter,
            alpha: 0,
        });

        this.slowModeRing = new pixi.Sprite({
            parent: this.backParts,
            texture: slowModeRingTexture,
            scale: 1.1, anchor: 0.5,
            filters: plColorFilter,
            alpha: 0,
            rotation: 0,
        });

        this.x = this._lastX = 0;
        this.y = this._lastY = 185;
    }

    /**
     * 更新自机，请务必每帧都调用一次该函数
     * @example
     * game.forever(loop => {
     *     // 基本的写法
     *     player.update(game.input, game.ts);
     * 
     *     // 更高级的写法
     *     // 将移动键位重设为 WASD ，并且按 Z 或者 K 都可以开火，按 Shift 或空格都可以低速
     *     player.update(game.input, game.ts, {
     *         up: Key.KeyW, down: Key.KeyS, left: Key.KeyA, right: Key.KeyD,
     *         attack: [Key.KeyZ, Key.KeyK],
     *         slow: [Key.ShiftLeft, Key.Space],
     *     });
     * });
     */
    update(
        input: Input,
        timeScale: number, keyMap: PlayerKeyMapOptions = {}
    ) {
        const { isHold } = input;
        let dx = 0;
        let dy = 0;
        let slow = false;

        const kh = (keyOrKeys: string | string[]) =>
            typeof keyOrKeys === "string" ? isHold(keyOrKeys) : keyOrKeys.some(key => isHold(key));
        // @ts-expect-error 隐式转换的奇技淫巧
        dx = kh(keyMap.right ?? Key.ArrowRight) - kh(keyMap.left ?? Key.ArrowLeft);
        // @ts-expect-error
        dy = kh(keyMap.down ?? Key.ArrowDown) - kh(keyMap.up ?? Key.ArrowUp);
        slow = kh(keyMap.slow ?? Key.ShiftLeft);

        if (slow) {
            alphaTo(this.avatar, 0.5, 0.1 * timeScale);
            alphaTo(this.hitboxPoint, 1, 0.1 * timeScale);
            alphaTo(this.slowModeRing, 1, 0.1 * timeScale);
        } else {
            alphaTo(this.avatar, 1, 0.1 * timeScale);
            alphaTo(this.hitboxPoint, 0, 0.1 * timeScale);
            alphaTo(this.slowModeRing, 0, 0.1 * timeScale);
        }
        this.slowModeRing.rotation += deg(2 * timeScale);
        if (dx !== 0 || dy !== 0) {
            let v = slow ? 1.6 : 4;
            v *= timeScale;
            let m = v / Math.sqrt(dx * dx + dy * dy);
            dx *= m;
            dy *= m;

            let w = this.board.width - 16;
            let h = this.board.height - 16;
            this.x = clamp(this.x + dx, -w, w);
            this.y = clamp(this.y + dy, -h, h);
        }
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

const playerTextures: Record<string, pixi.Texture | undefined> = {};
const getOrLoad = async (name: string) =>
    playerTextures[name] ?? (playerTextures[name] = await LoadSvg(`assets/images/player/${name}.svg`));

const makePlayer = async (options: {board: Board, name: string, hue1: number,
    hitboxRadius: number, highSpeed: number, slowSpeed: number
}) => new Player(
    options.name, options.board,
    await getOrLoad(options.name),
    await getOrLoad("hitbox"),
    await getOrLoad("slow_mode"),
    options.hue1,
    options.hitboxRadius, options.highSpeed, options.slowSpeed
);

/**
 * JSTG 预置的自机
 * @example
 * const player = jstg.prefabPlayers.makeSimpleOn(game.board);
 * game.forever(loop => {
 *     player.update(game.input, game.ts);
 * });
 */
export const prefabPlayers = {
    /** @async 创建预置自机：Simple */
    makeSimpleOn: async (board: Board) => await makePlayer({
        board,
        name: "Simple",
        hue1: 208.8,
        hitboxRadius: 3, highSpeed: 4, slowSpeed: 1.6,
    }),
};
