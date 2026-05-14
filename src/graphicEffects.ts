import * as pixi from 'pixi';
import { Game, Combat, Board, Destroyable } from "./jstg.js";
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
                if (!(refPos as any).destroyed) {
                    ring.x = refPos.x;
                    ring.y = refPos.y;
                }
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
                if (!(refPos as any).destroyed) {
                    ring.x = refPos.x;
                    ring.y = refPos.y;
                }
                ring.scale = fs(loop.clock);
                ring.alpha = fa(loop.clock);
            }
        }, { owns: ring });
        return { chargeRing: ring, loop };
    };

    const makeScrap = (options: {
        game: Game, combat: Combat, board: Board,
        texture: pixi.Texture | "leaf",
        filters: pixi.Filter | readonly pixi.Filter[] | null,
    }) => {
        const { game, combat, board } = options;
        let texture = options.texture ?? "leaf";
        if (texture === "leaf") {
            texture = game.prefabTextures.effects.leaf;
        }
        // MAYDO: 更多 scrap 贴图，除 leaf 以外
        const scrap = new pixi.Sprite({
            parent: board.bossChargeRingLayer,
            anchor: 0.5,
            texture,
            filters: options.filters ?? undefined,
        });
        return scrap;
    };

    const scrapIn = (options: {
        game: Game, combat: Combat, board: Board,
        refPos: utils.Vec2,
        texture: pixi.Texture | "leaf",
        filters: pixi.Filter | readonly pixi.Filter[] | null,
    }) => {
        const { game, combat, board, refPos } = options;
        const { rand } = combat;
        const scrap = makeScrap(options);

        // RNG: scrapIn 特效位置、缩放、持续时间、缩放尺寸等等
        const dur = rand.int(30, 80);
        {
            const r = rand.rotation();
            const d = dur * 1.5 + rand.float(0, 100);
            scrap.x = refPos.x + d * Math.cos(r);
            scrap.y = refPos.y + d * Math.sin(r);
        }
        scrap.rotation = rand.rotation();
        const omega = utils.deg(rand.float(-3, 3));
        const scale = rand.float(1.6, 2.5);
        const a = 0.1 * dur + 10;
        const fs = (t: number) => scale * (1 - a ** (t / dur - 1));
        const fa = (t: number) => 0.8 * t / dur;
        scrap.scale = fs(0);
        scrap.alpha = fa(0);
        let { x: tx, y: ty } = refPos;
        const loop = board.forever(loop => {
            if (loop.clock >= dur) {
                return loop.destroy();
            } else {
                if (!(refPos as any).destroyed) {
                    tx = refPos.x; ty = refPos.y;
                }
                scrap.x += (tx - scrap.x) * 0.06 * game.timeScale; // MAYDO: 现在这个 scrap 是追着人跑，边跑边蓄力的时候尤为明显。以后考虑改改
                scrap.y += (ty - scrap.y) * 0.06 * game.timeScale;
                scrap.rotation += omega * game.timeScale;
                scrap.scale = fs(loop.clock);
                scrap.alpha = fa(loop.clock);
            }
        }, { owns: scrap });
        return { scrap, loop };
    };

    const scrapOut = (options: {
        game: Game, combat: Combat, board: Board,
        pos: utils.Vec2,
        texture: pixi.Texture | "leaf",
        filters: pixi.Filter | readonly pixi.Filter[] | null,
    }) => {
        const { game, combat, board, pos } = options;
        const { rand } = combat;
        const scrap = makeScrap(options);

        // RNG: scrapOut 特效位置、缩放、持续时间、缩放尺寸等等
        const dur = rand.int(30, 80);
        const moveDir = rand.rotation();
        scrap.x = pos.x;
        scrap.y = pos.y;
        scrap.rotation = rand.rotation();
        const omega = utils.deg(rand.float(-3, 3));
        const scale = rand.float(1.6, 2.5);
        const a = 0.1 * dur + 10;
        const b = Math.sqrt(dur);
        const v = Math.sqrt(rand.float(0.6, 5));
        const fs = (t: number) => scale * (1 - a ** (-t / dur));
        const fa = (t: number) => 0.8 * (1 - t / dur);
        scrap.scale = fs(0);
        scrap.alpha = fa(0);
        const loop = board.forever(loop => {
            if (loop.clock >= dur) {
                return loop.destroy();
            } else {
                scrap.x += v * Math.cos(moveDir);
                scrap.y += v * Math.sin(moveDir);
                scrap.rotation += omega * game.timeScale;
                scrap.scale = fs(loop.clock);
                scrap.alpha = fa(loop.clock);
            }
        }, { owns: scrap });
        return { scrap, loop };
    };

    return {
        defaultWhiteFilter,
        makeBossChargeRing,
        chargeIn, chargeOut,
        makeScrap,
        scrapIn, scrapOut,
    }

})();