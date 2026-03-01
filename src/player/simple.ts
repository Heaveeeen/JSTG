import { Player } from './player.js';
import { Board, Combat, Game } from "../jstg.js";
import { PrefabTextures } from '../textures.js';

export const makeSimple = async (options: {
    game: Game, combat: Combat, board: Board,
    /** @default true */
    autoUpdateDanmakuPool: boolean | null,
    /** @default true */
    autoUpdateSelf: boolean | null,
}) => {
    const { game, combat, board, autoUpdateDanmakuPool, autoUpdateSelf } = options;
    const { prefabTextures } = game;
    return new Player({
        name: "Simple", game, combat, board,
        mainTexture: prefabTextures.player.Simple,
        hitboxTexture: prefabTextures.player.hitbox,
        slowModeRingTexture: prefabTextures.player.slowMode,
        invincibleRingTexture: prefabTextures.player.invincibleRing,
        hue1: 208.8,
        hitboxRadius: 1, highSpeed: 4, slowSpeed: 1.6,
        dyingBombTime: null, initHpAmount: null, initBombAmount: null, missGainBombType: null,
        maxHpAmount: null, maxBombAmount: null,
        updateFn(self, options) {
            self._defaultUpdate(options);
        },
        getHurtFn(self, options) {
            self._defaultGetHurt(options);
        },
        autoUpdateDanmakuPool, autoUpdateSelf,
    });
};

