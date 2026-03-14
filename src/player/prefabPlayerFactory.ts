import * as pixi from "pixi";
import { NewPlayerOptions, Player, PlayerBeHurtOptions, PlayerUpdateOptions } from "./player.js";
import { Board, Combat, Destroyable, Game } from "../jstg.js";
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
        type Drone = { sprite: pixi.Sprite, rotation: number, laser: {
            sprite: pixi.Sprite,
            hitEffects: Map<AbstractEnemy, pixi.Sprite>,
        } & Destroyable, } & Destroyable;
        let drones: [Drone, Drone, Drone, Drone];
        const initFn = (player: Player, opt: NewPlayerOptions) => {
            function makeDrone(): Drone { return {
                sprite: new pixi.Sprite({
                    parent: player.backParts,
                    texture: prefabTextures.player.drone.simpleDrone,
                    anchor: 0.5,
                    filters: player.colorFilter,
                    alpha: 0,
                    zIndex: -10,
                }),
                rotation: deg(90),
                laser: {
                    sprite: { destroy() {}, destroyed: true } as any, // MAGIC: 拿这么个玩意，伪装成一个摧毁后的激光，相当于空值
                    hitEffects: new Map(),
                    destroy() {
                        if (this.destroyed) { return; }
                        this.sprite.destroy();
                        this.hitEffects.forEach(eff => eff.destroy());
                        this.hitEffects.clear();
                    },
                    get destroyed() { return this.sprite.destroyed; }
                },
                destroy() {
                    if (this.destroyed) { return; }
                    this.sprite.destroy();
                    this.laser.destroy();
                },
                get destroyed() { return this.sprite.destroyed; },
            }; }
            drones = [makeDrone(), makeDrone(), makeDrone(), makeDrone()];
        };
        let shootTimer = 0;
        const lasers = new Map<Drone, pixi.Sprite | null>();
        const updateFn = (player: Player, opt: PlayerUpdateOptions) => {
            const input = opt.input ?? game.input;
            player._defaultUpdate(opt);
            let trans: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
            let size: number;
            if (player.isSlow) {
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
                if (player.isShooting) {
                    if (player.isSlow) {
                        spr.alpha = 0.45;
                    } else {
                        spr.alpha = 0.65;
                    }
                } else {
                    spr.alpha += (0.24 - spr.alpha) * 0.05 * game.timeScale; // 此处弹幕引擎写的是 ghost 80 & brightness 5 ，我这里直接把 alpha 拉高点代替了
                }
            }
            if (player.isShooting) {
                if (player.isSlow) {
                    shootTimer = 0;
                    for (const drone of drones) { // simple laser
                        drone.laser.sprite.destroy(); // 这句正常应该是不需要的，但保险起见。。。
                        drone.laser.sprite = new pixi.Sprite({
                            parent: board.playerBulletLayer,
                            texture: game.prefabTextures.player.playerBullet.laserAndNova,
                            anchor: 0.5,
                            alpha: 0.4,
                            blendMode: "add",
                        });
                        player.forever(loop => {
                            if (!player.isShooting || !player.isSlow) { return loop.destroy(); }
                            drone.laser.sprite.x = player.x + drone.sprite.x;
                            drone.laser.sprite.y = player.y + drone.sprite.y;
                            drone.laser.sprite.rotation = drone.rotation;
                        }, { owns: drone.laser, order: 10 });
                    }
                } else {
                    if (shootTimer >= 6) { // 跟踪粒子导弹
                        shootTimer = 0;
                        game.prefabSounds.thse.plst00.play({ volume: decibel(-6) });
                        for (const drone of drones) { // 发射诱导弹
                            const bullet = new pixi.Sprite({ 
                                parent: board.playerBulletLayer,
                                x: player.x + drone.sprite.x,
                                y: player.y + drone.sprite.y,
                                scale: 1.3,
                                rotation: drone.rotation,
                                alpha: 0.4,
                                filters: player.colorFilter,
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
                                            // 命中
                                            enemy.beHurt({ num: 5 });
                                            bullet.x += currentSpeed * Math.cos(bullet.rotation);
                                            bullet.y += currentSpeed * Math.sin(bullet.rotation);
                                            { // 命中特效
                                                const hitEffect = new pixi.Sprite({
                                                    parent: bullet.parent ?? undefined,
                                                    texture: game.prefabTextures.player.playerBullet.hit,
                                                    anchor: 0.5,
                                                    x: bullet.x, y: bullet.y,
                                                    scale: bullet.scale,
                                                    // RAND: 命中特效随机旋转
                                                    rotation: bullet.rotation + deg((Math.random() * 60) - 30),
                                                    filters: bullet.filters,
                                                    blendMode: "add",
                                                });
                                                combat.forever(loop => {
                                                    hitEffect.scale.x -= 0.05 * game.timeScale;
                                                    hitEffect.scale.y -= 0.05 * game.timeScale;
                                                    alphaTo(hitEffect, 0, 0.075 * game.timeScale);
                                                    if (hitEffect.alpha <= 0) {
                                                        hitEffect.destroy();
                                                    }
                                                }, { owns: hitEffect });
                                            }
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
                                        if (cost <= 600 && angle <= deg(135)) {
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
                                trail.scale.x = Math.min(1, trail.scale.x + 0.2 * game.timeScale);
                                omega -= deg(0.1) * game.timeScale;
                                omega = Math.max(omega, 0);
                            }, { owns: bullet, order: 10 });
                        }
                    }
                }
            }
            shootTimer += game.timeScale;
        }
        const beHurtFn = (player: Player, opt: PlayerBeHurtOptions) => player._defaultBeHurt(opt);
        const destroyFn = (player: Player) => {
            for (const drone of drones) {
                drone.destroy();
            }
        }
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
            initFn, updateFn, beHurtFn, destroyFn,
        });
        return player;
    };

    return {
        makeSimple,
    };

})();