import { Destroyable } from "./jstg.js";


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

    const forEachAlive = (callback: (obj: T) => unknown) => {
        const copy = objects;
        for (const obj of copy) {
            if (!obj.destroyed) {
                callback(obj);
            }
        }
    };

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
        forEachAlive,
        get _validCount() { return validCount; },
        destroy,
        get destroyed() { return destroyed; }
    };
}