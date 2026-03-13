import * as pixi from "pixi";
import { NewPlayerOptions, Player, PlayerBeHurtOptions, PlayerUpdateOptions } from "./player.js";
import { Board, Combat, Game } from "../jstg.js";
import { alphaTo, decibel, deg, rotateVec, Vec2 } from "../utils.js";
import { AbstractEnemy } from "../entity/abstractEnemy.js";
import { AbstractEntity } from "../entity/abstractEntity.js";
import { CommonEnemy } from "../entity/commonEnemy.js";

export const prefabPlayerFactory = (()=>{

    const makeSimple = (options: {
        game: Game, combat: Combat, board: Board,
        /** @default true */
        autoUpdateEntityPool: boolean | null,
        /** @default true */
        autoUpdateSelf: boolean | null,
    }) => {
        const { game, combat, board, autoUpdateEntityPool, autoUpdateSelf } = options;
        const { prefabTextures } = game;
        type Drone = { sprite: pixi.Sprite, rotation: number };
        let drones: [Drone, Drone, Drone, Drone];
        const initFn = (self: Player, opt: NewPlayerOptions) => {
            const makeDrone = () => ({ sprite: new pixi.Sprite({
                parent: self.backParts,
                texture: prefabTextures.player.drone.simpleDrone,
                anchor: 0.5,
                filters: self.colorFilter,
                alpha: 0,
                zIndex: -10,
            }), rotation: deg(90), });
            drones = [makeDrone(), makeDrone(), makeDrone(), makeDrone()];
        };
        let shootTimer = 0;
        const updateFn = (self: Player, opt: PlayerUpdateOptions) => {
            const input = opt.input ?? game.input;
            self._defaultUpdate(opt);
            let trans: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
            let size: number;
            if (self.isSlow) {
                trans = [[-26,-17,deg(-90)], [-9,-27,deg(-90)], [9,-27,deg(-90)], [26,-17,deg(-90)]];
                size = 0.88;
            } else {
                trans = [[-40,17,deg(-90-10)], [-13,39,deg(-90-3)], [13,39,deg(-90+3)], [40,17,deg(-90+10)]];
                size = 1.1;
            }
            for (let i = 0; i < 4; i++) {
                const drone = drones[i];
                const spr = drone.sprite;
                const [x, y, rotation] = trans[i];
                spr.x += (x - spr.x) * 0.2 * game.timeScale;
                spr.y += (y - spr.y) * 0.2 * game.timeScale;
                spr.scale.x += (size - spr.scale.x) * 0.2 * game.timeScale;
                spr.scale.y += (size - spr.scale.y) * 0.2 * game.timeScale;
                drone.rotation += (rotation - drone.rotation) * 0.2 * game.timeScale;
                if (self.isShooting) {
                    if (self.isSlow) {
                        spr.alpha = 0.45;
                    } else {
                        spr.alpha = 0.65;
                    }
                } else {
                    spr.alpha += (0.25 - spr.alpha) * 0.05 * game.timeScale; // 此处弹幕引擎写的是 ghost 80 & brightness 5 ，我这里直接把 alpha 拉高点代替了
                }
            }
            if (self.isShooting) {
                if (self.isSlow) {
                    shootTimer = 0;
                    // TODO: simple laser
                } else {
                    if (shootTimer >= 6) {
                        shootTimer = 0;
                        game.prefabSounds.thse.plst00.play({ volume: decibel(-6) });
                        for (const drone of drones) { // 发射诱导弹
                            const bullet = new pixi.Sprite({ 
                                parent: board.playerBulletLayer,
                                x: self.x + drone.sprite.x,
                                y: self.y + drone.sprite.y,
                                scale: 1.3,
                                rotation: drone.rotation,
                                alpha: drone.sprite.alpha,
                                filters: self.colorFilter,
                                blendMode: "add",
                            });
                            const head = new pixi.Sprite({
                                parent: bullet,
                                anchor: 0.5,
                                texture: game.prefabTextures.player.playerBullet.simpleBullet.head,
                                zIndex: 0,
                            });
                            const trail = new pixi.Sprite({
                                parent: bullet,
                                anchor: 0.5,
                                texture: game.prefabTextures.player.playerBullet.simpleBullet.trail,
                                scale: { x: 0.3, y: 1 },
                                zIndex: -5,
                            });
                            let speed = 20;
                            let omega = deg(8);
                            let target: AbstractEnemy | null = null;
                            combat.forever(loop => {
                                const currentSpeed = speed * game.timeScale;
                                const currentOmega = omega * game.timeScale;
                                for (const enemy of combat.enemyPool.getAlives()) { // 攻击判定
                                    if (enemy instanceof CommonEnemy) {
                                        const { x: rx, y: ry } = rotateVec({ x: enemy.x - bullet.x, y: enemy.y - bullet.y }, bullet.rotation);
                                        if ((rx >= 0) && (rx <= currentSpeed) && (Math.abs(ry) <= 4)) {
                                            enemy.beHurt({ num: 5 });
                                            bullet.x += currentSpeed * Math.cos(bullet.rotation);
                                            bullet.y += currentSpeed * Math.sin(bullet.rotation);
                                            return bullet.destroy();
                                        }
                                    }
                                }
                                // 移动
                                bullet.x += currentSpeed * Math.cos(bullet.rotation);
                                bullet.y += currentSpeed * Math.sin(bullet.rotation);
                                if (Math.abs(bullet.x) >= board.width + 10 || Math.abs(bullet.y) >= board.height + 10) {
                                    return bullet.destroy();
                                }
                                let targetAngle = 0;
                                // cost 是一个综合评分，反映了追踪这个敌人的成本有多高
                                const getCost = (enemy: AbstractEnemy) => {
                                    let dx = enemy.x - bullet.x;
                                    let dy = enemy.y - bullet.y;
                                    let angle = Math.atan2(dy, dx) - bullet.rotation;
                                    let dist = Math.sqrt(dx * dx + dy * dy);
                                    return {
                                        // 100 是转向的成本，此处认为转1个弧度的成本等于走100个像素
                                        cost: dist + Math.abs(angle) * 100,
                                        angle,
                                    };
                                }
                                if (target !== null) { // 优先追踪现有的目标
                                    if (target.destroyed) {
                                        target = null;
                                    } else {
                                        const { cost, angle } = getCost(target);
                                        if (cost <= 600 && angle <= deg(120)) {
                                            targetAngle = angle;
                                        } else {
                                            target = null; // 成本太高了，尝试换一个目标追
                                        }
                                    }
                                }
                                if (target === null) { // 选择新的追踪目标
                                    let minCost = 500; // 初始值是能接受的最大成本
                                    for (const enemy of combat.enemyPool.getAlives()) {
                                        const { cost, angle } = getCost(enemy);
                                        if (cost < minCost && angle <= deg(90)) {
                                            minCost = cost;
                                            targetAngle = angle;
                                            target = enemy;
                                        }
                                    }
                                }
                                // 转向
                                if (Math.abs(targetAngle) >= currentOmega) {
                                    bullet.rotation += Math.sign(targetAngle) * currentOmega;
                                } else {
                                    bullet.rotation += targetAngle;
                                }
                                alphaTo(bullet, 1, 0.05 * game.timeScale);
                                trail.scale.x = Math.min(1, trail.scale.x + 0.1 * game.timeScale);
                                omega -= deg(0.1) * game.timeScale;
                                omega = Math.max(omega, 0);
                            }, { owns: bullet });
                        }
                    }
                }
            }
            shootTimer += game.timeScale;
        }
        const beHurtFn = (self: Player, opt: PlayerBeHurtOptions) => self._defaultBeHurt(opt);
        const player = new Player({
            name: "Simple", ...options,
            mainTexture: prefabTextures.player.Simple,
            hitboxTexture: prefabTextures.player.hitbox,
            slowModeRingTexture: prefabTextures.player.slowMode,
            invincibleRingTexture: prefabTextures.player.invincibleRing,
            hue1: 208.8,
            hitboxRadius: 1, highSpeed: 4, slowSpeed: 1.6,
            dyingBombTime: null, initHpAmount: null, initBombAmount: null, missGainBombType: null,
            maxHpAmount: null, maxBombAmount: null,
            initFn, updateFn, beHurtFn,
        });
        return player;
    };

    return {
        makeSimple,
    };

})();