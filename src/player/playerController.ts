import { ButtonName, Input, KeyName } from "../input";



export interface PlayerKeyMapOptions {
    /** @default "ArrowUp" */
    up?: KeyName | KeyName[],
    /** @default "ArrowDown" */
    down?: KeyName | KeyName[],
    /** @default "ArrowLeft" */
    left?: KeyName | KeyName[],
    /** @default "ArrowRight" */
    right?: KeyName | KeyName[],
    /** @default "ShiftLeft" */
    slow?: KeyName | KeyName[],
    /** @default "KeyZ" */
    attack?: KeyName | KeyName[],
    /** @default "KeyX" */
    bomb?: KeyName | KeyName[],
    /** @default "KeyC" */
    action1?: KeyName | KeyName[],

    /**
     * 这个键位不常用，并且跟 WASD 冲突，所以 JSTG 默认不支持这个按键。  
     * 在《东方》原作中，似乎仅有《东方虹龙洞》偶尔会用到这个按键，用于切换主动卡牌。  
     * @default "KeyD"
     */
    // action2?: KeyName | KeyName[],
}

export type PlayerKeyMap = Required<PlayerKeyMapOptions>;

export const fillKeyMapOptions = (keyMapOptions: PlayerKeyMapOptions) => ({
    up: keyMapOptions.up ?? "ArrowUp",
    down: keyMapOptions.down ?? "ArrowDown",
    left: keyMapOptions.left ?? "ArrowLeft",
    right: keyMapOptions.right ?? "ArrowRight",
    slow: keyMapOptions.slow ?? "ShiftLeft",
    attack: keyMapOptions.attack ?? "KeyZ",
    bomb: keyMapOptions.bomb ?? "KeyX",
    action1: keyMapOptions.action1 ?? "KeyC",
});

export type PlayerControllerActionType = keyof PlayerKeyMap;

export interface PlayerController {
    isHold(actType: PlayerControllerActionType): boolean,
    isIdle(actType: PlayerControllerActionType): boolean,
    isDown(actType: PlayerControllerActionType): boolean,
    isUp(actType: PlayerControllerActionType): boolean,
}

export function makePlayerControllerByInput(input: Input, keyMap: PlayerKeyMap): PlayerController {
    const k = (keyOrKeys: KeyName | KeyName[], fn: (button: ButtonName) => boolean) => typeof keyOrKeys === "string" ? input.isHold(keyOrKeys) : keyOrKeys.some(key => input.isHold(key));
    
    return {
        isHold: (actType) => k(keyMap[actType], input.isHold),
        isIdle: (actType) => k(keyMap[actType], input.isIdle),
        isDown: (actType) => k(keyMap[actType], input.isDown),
        isUp: (actType) => k(keyMap[actType], input.isUp),
    }
}

// TODO: makePlayerControllerByReplay