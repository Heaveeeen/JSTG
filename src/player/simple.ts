import { MakePlayerOptions, Player } from './player.js';
import { Board, Game } from "../jstg.js";
import { PrefabTextures } from '../assets.js';

export const makeSimple = async (
    game: Game, board: Board, prefabTextures: PrefabTextures, options: MakePlayerOptions = {}
) => new Player({
    name: "Simple",
    game,
    board,
    mainTexture: prefabTextures.player.Simple,
    hitboxTexture: prefabTextures.player.hitbox,
    slowModeRingTexture: prefabTextures.player.slow_mode,
    invincibleRingTexture: prefabTextures.player.invincible_ring,
    hue1: 208.8,
    hitboxRadius: 2, highSpeed: 4, slowSpeed: 1.6,
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

