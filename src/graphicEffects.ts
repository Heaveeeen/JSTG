import * as pixi from 'pixi';
import { Game, Combat, Board } from "./jstg.js";
import { HslaFilter } from "./graphics/hslaFilter.js"
import * as utils from "./utils.js";


export const prefabGraphicEffectsFactory = (() => {

    const defaultWhiteFilter = new HslaFilter("hsla(0, 0%, 100%, 0.8)");

    const makeBossChargeRing = (options: {
        game: Game, combat: Combat, board: Board,
        filters: pixi.Filter | readonly pixi.Filter[] | null,
    }) => new pixi.Sprite({
        parent: options.board.bossChargeRingLayer,
        anchor: 0.5,
        texture: options.game.prefabTextures.effects.chargeRing,
        filters: options.filters ?? undefined,
    });

    const chargeIn = (options: {
        game: Game, combat: Combat, board: Board,
        refPos: utils.Vec2,
        filters: pixi.Filter | readonly pixi.Filter[] | null,
    }) => {
        const { game, combat, board, refPos } = options;
        const ring = makeBossChargeRing(options);
        ring.x = refPos.x;
        ring.y = refPos.y;
        const fs = (t: number) => 4 * (0.95 ** t - 0.002 * t);
        const fa = (t: number) => 0.6 - 0.12 * fs(t);
        ring.scale = fs(0);
        ring.alpha = fa(0);
        const loop = board.forever(loop => {
            if (fs(loop.clock) <= 0.01) {
                return loop.destroy();
            } else {
                ring.x = refPos.x;
                ring.y = refPos.y;
                ring.scale = fs(loop.clock);
                ring.alpha = fa(loop.clock);
            }
        }, { owns: ring });
        return { chargeRing: ring, loop };
    };

    const chargeOut = (options: {
        game: Game, combat: Combat, board: Board,
        refPos: utils.Vec2,
        filters: pixi.Filter | readonly pixi.Filter[] | null,
    }) => {
        const { game, combat, board, refPos } = options;
        const ring = makeBossChargeRing(options);
        ring.x = refPos.x;
        ring.y = refPos.y;
        const fs = (t: number) => 6 * (1 - (0.96 ** t - 0.006 * t));
        const fa = (t: number) => 0.8 - 0.14 * fs(t);
        ring.scale = fs(0);
        ring.alpha = fa(0);
        const loop = board.forever(loop => {
            if (fa(loop.clock) <= 0.01) {
                return loop.destroy();
            } else {
                ring.x = refPos.x;
                ring.y = refPos.y;
                ring.scale = fs(loop.clock);
                ring.alpha = fa(loop.clock);
            }
        }, { owns: ring });
        return { chargeRing: ring, loop };
    };

    return {
        defaultWhiteFilter,
        makeBossChargeRing,
        chargeIn, chargeOut,
    }

})();