import * as pixi from "pixi";
import { NewPlayerOptions, Player, PlayerBeHurtOptions, PlayerUpdateOptions } from "./player.js";
import { Board, Combat, Game } from "../jstg.js";
import { deg, Vec2 } from "../utils.js";

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
        const updateFn = (self: Player, opt: PlayerUpdateOptions) => {
            const input = opt.input ?? game.input;
            self._defaultUpdate(opt);
            let trans: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
            let size: number;
            if (self.isSlow) {
                trans = [[-24,-15,deg(90)], [-8,-25,deg(90)], [8,-25,deg(90)], [24,-15,deg(90)]];
                size = 0.8;
            } else {
                trans = [[-36,15,deg(90+10)], [-12,35,deg(90+3)], [12,35,deg(90-3)], [36,15,deg(90-10)]];
                size = 1;
            }
            const isShooting = false; // TODO: input.isHold(opt.keyMap.attack)
            for (let i = 0; i < 4; i++) {
                const drone = drones[i];
                const spr = drone.sprite;
                const [x, y, rotation] = trans[i];
                spr.x += (x - spr.x) * 0.2 * game.timeScale;
                spr.y += (y - spr.y) * 0.2 * game.timeScale;
                spr.scale.x += (size - spr.scale.x) * 0.2 * game.timeScale;
                spr.scale.y += (size - spr.scale.y) * 0.2 * game.timeScale;
                drone.rotation += (rotation - drone.rotation) * 0.2 * game.timeScale;
                if (isShooting) {
                    // TODO: 攻击
                } else {
                    spr.alpha += (0.27 - spr.alpha) * 0.05 * game.timeScale; // 此处弹幕引擎写的是 ghost 80 & brightness 5 ，我这里直接把 alpha 拉高点代替了
                }
            }
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