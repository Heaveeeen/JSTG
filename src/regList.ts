import { Destroyable, Game } from "./jstg.js";

// MAYDO: 把这个玩意封装一下，允许用户自己创建注册列表，用来给弹幕分组啥的。（其实小规模的分组直接用数组就行……）
/** TODOC: RegList */
export const makeRegList = <T extends Destroyable>(options: {
    game: Game,
    /** @default true */
    autoClean?: boolean,
}) => {
    const { game } = options;

    const objects: T[] = [];

    let validCount = 0;
    let nextCleanValidCount = 120;

    const push = (obj: T) => {
        objects.push(obj);
        validCount++;
    };

    const clean = () => {
        validCount = 0;
        for (const obj of objects) {
            if (!obj.destroyed) {
                objects[validCount++] = obj;
            }
        }
        objects.length = validCount;
        nextCleanValidCount = Math.max(validCount, 120);
    };

    const getAlives = () => objects.filter(obj => !obj.destroyed);

    let destroyed = false;
    const destroy = () => {
        if (destroyed) { return; }
        for (const obj of objects) { obj.destroy({ children: true }); }
        destroyed = true;
    };

    const regList = {
        objects,
        push,
        clean,
        getAlives,
        get _validCount() { return validCount; },
        destroy,
        get destroyed() { return destroyed; }
    };

    if (options.autoClean ?? true) {
        game.forever(loop => {
            if (validCount > nextCleanValidCount) {
                clean();
            }
        }, { refs: regList, order: 10 });
    }
    
    return regList;
}

export type RegList<T extends Destroyable> = ReturnType<typeof makeRegList<T>>