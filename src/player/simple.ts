import { Player, _getOrLoadPlayerTexture as _getOrLoad } from './player.js';
import { Board } from "../jstg.js";

export const makeSimpleOn = async (board: Board) => new Player({
    name: "Simple",
    board,
    mainTexture: await _getOrLoad("Simple"),
    hitboxTexture: await _getOrLoad("hitbox"),
    slowModeRingTexture: await _getOrLoad("slow_mode"),
    hue1: 208.8,
    hitboxRadius: 3, highSpeed: 4, slowSpeed: 1.6,
    updateFn(options) {
        this.move(options);
    }
});

