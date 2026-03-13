import { Destroyable } from "./jstg.js";

// MAYDO: 把这个玩意封装一下，允许用户自己创建对象池，用来给弹幕分组啥的。（其实小规模的分组直接用数组就行……）
/** 一个简单的对象池 */
export const makeObjPool = <T extends Destroyable>() => {
    const objects: T[] = [];

    const push = (obj: T) => {
        objects.push(obj);
        if (++validCount > lastValidCount * 2) {
            clean();
        }
    }

    let validCount = 0;
    let lastValidCount = 60;

    const clean = () => {
        validCount = 0;
        for (const obj of objects) {
            if (!obj.destroyed) {
                objects[validCount++] = obj;
            }
        }
        objects.length = validCount;
        lastValidCount = Math.max(validCount, 60);
    }

    const getAlives = () => objects.filter(obj => !obj.destroyed);

    const forEachAlive = (callback: (obj: T) => unknown) => getAlives().forEach(callback);

    let destroyed = false;
    const destroy = () => {
        if (destroyed) { return; }
        for (const obj of objects) { obj.destroy(); }
        destroyed = true;
    }

    return {
        objects,
        push,
        clean,
        getAlives,
        forEachAlive,
        get _validCount() { return validCount; },
        destroy,
        get destroyed() { return destroyed; }
    };
}