import { Player } from './player.js';
import { Board, Game } from "../jstg.js";
import { PrefabTextures } from '../assets.js';

export const makeSimple = async (game: Game, board: Board, prefabTextures: PrefabTextures) => new Player({
    name: "Simple",
    game,
    board,
    mainTexture: prefabTextures.player.Simple,
    hitboxTexture: prefabTextures.player.hitbox,
    slowModeRingTexture: prefabTextures.player.slow_mode,
    hue1: 208.8,
    hitboxRadius: 3, highSpeed: 4, slowSpeed: 1.6,
    updateFn(options = {}) {
        this.move(options);
        this.updateState();
    },
    hitByEnemyFn(options = {}) {
        if (options.danmaku) {
            this.hitByDanmaku(options.danmaku);
        }
    },
});

