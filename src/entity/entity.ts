import { Board, Combat, Game } from "../jstg";


export abstract class Entity {
    readonly game: Game;
    readonly combat: Combat;
    readonly board: Board;

    constructor(options: {
        game: Game, combat: Combat, board: Board,
    }) {
        this.game = options.game;
        this.combat = options.combat;
        this.board = options.board;
    }

    abstract x: number;
    abstract y: number;
    abstract rotation: number;
    abstract visible: boolean;
    abstract zIndex: number;
    speed = 0;

    /** 向着 this.rotation 的方向前进 dist 步，若 dist 留空则为 this.speed * game.timeScale */
    step(/** @default this.speed * game.timeScale */ dist: number = this.speed * this.game.timeScale) {
        this.x += Math.cos(this.rotation) * dist;
        this.y += Math.sin(this.rotation) * dist;
    }

    /** 匀变速至目标速度 */
    speedToA(/** 目标速度 */ dst: number, /** 加速度 */ a: number) {
        if (Math.abs(dst - this.speed) < a * this.game.timeScale) {
            this.speed = dst;
        } else if (dst > this.speed) {
            this.speed += a * this.game.timeScale;
        } else {
            this.speed -= a * this.game.timeScale;
        }
    }

    /** 指数衰减地变速至目标速度 */
    speedToK(/** 目标速度 */ dst: number, /** 每次变速的比 */ k: number) {
        this.speed += (dst - this.speed * k * this.game.timeScale);
    }
    
    /**
     * 判断该实体是否在版面内。  
     * 注意，该判断是必要不充分的。false 则实体一定在版面外，true 则该实体不一定在版面内。  
     * 如果弹幕刚刚离开版面但离得不远，该函数仍然有可能返回 true。  
     */
    abstract isInBoundary(): boolean;

    /** 如果该实体超出版面边界，摧毁该实体 */
    boundaryDelete() {
        if (!this.isInBoundary()) {
            this.destroy();
        }
    }
    
    abstract destroy(): void;
    /**
     * 返回该对象是否被摧毁，已被摧毁的对象不应该继续使用，应该丢弃
     * 例如：一个跟踪弹保留了一个敌人的引用，并且追踪敌人的位置；那么，该跟踪弹应该在每帧都检查目标敌人是否已被摧毁，如果已被摧毁则失去目标，寻找新的目标或者进入游荡状态或者怎么怎么样
     */
    abstract readonly destroyed: boolean;
}