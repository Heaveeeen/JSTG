import { MakePlayerOptions, Player } from './player.js';
import { Board, Combat, Game } from "../jstg.js";
import { PrefabTextures } from '../textures.js';

export const makeSimple = async (
    game: Game, combat: Combat, board: Board, prefabTextures: PrefabTextures, options: MakePlayerOptions = {}
) => new Player({
    name: "Simple",
    game,
    combat,
    board,
    mainTexture: prefabTextures.player.Simple,
    hitboxTexture: prefabTextures.player.hitbox,
    slowModeRingTexture: prefabTextures.player.slow_mode,
    invincibleRingTexture: prefabTextures.player.invincible_ring,
    hue1: 208.8,
    hitboxRadius: 1, highSpeed: 4, slowSpeed: 1.6,
    updateFn(options = {}) {
        this._defaultUpdate(options);
    },
    hitByEnemyFn(options = {}) {
        if (options.danmaku) {
            this.hitByDanmaku(options.danmaku);
        }
    },
    ...options,
});

