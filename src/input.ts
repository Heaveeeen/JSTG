

// 这个文件是从我以前的项目里摘出来的，不是专为 JSTG 写的，所以风格跟 JSTG 不太一样。

import * as pixi from "pixi";
import * as utils from "./utils.js";

const enum ButtonEventType {
    none = 0,
    down = 1,
    up = 2,
    downAndUp = 3,
}

/** 键码表，不全，注释为个人简单翻译  
 * 来源：{@link https://w3c.github.io/uievents-code/#code-value-tables}  
 * 此枚举最后更新于：2025/1/6 */
export enum KeyEnum {
    /* -- Alphanumeric Section - Writing System Keys -- */
    /** 美式键盘的 “`~”。 同时也是日式键盘的 “半角/全角/漢字” */
    Backquote = "Backquote",
    /** Used for both the US \\| (on the 101-key layout) and also for the key located between the " and Enter keys on row C of the 102-, 104- and 106-key layouts. Labelled #~ on a UK (102) keyboard. */
    Backslash = "Backslash",
    /** 美式键盘的 “[{”。 */
    BracketLeft = "BracketLeft",
    /** 美式键盘的 “]}”。 */
    BracketRight = "BracketRight",
    /** 美式键盘的 “,<”。 */
    Comma = "Comma",
    /** 美式键盘的 “0)”。 */
    Digit0 = "Digit0",
    /** 美式键盘的 “1!”。 */
    Digit1 = "Digit1",
    /** 美式键盘的 “2@”。 */
    Digit2 = "Digit2",
    /** 美式键盘的 “3#”。 */
    Digit3 = "Digit3",
    /** 美式键盘的 “4$”。 */
    Digit4 = "Digit4",
    /** 美式键盘的 “5%”。 */
    Digit5 = "Digit5",
    /** 美式键盘的 “6^”。 */
    Digit6 = "Digit6",
    /** 美式键盘的 “7&”。 */
    Digit7 = "Digit7",
    /** 美式键盘的 “8*”。 */
    Digit8 = "Digit8",
    /** 美式键盘的 “9(”。 */
    Digit9 = "Digit9",
    /** 美式键盘的 “=+”。 */
    Equal = "Equal",
    /** Located between the left Shift and Z keys. Labelled \\| on a UK keyboard. */
    IntlBackslash = "IntlBackslash",
    /** Located between the / and right Shift keys. Labelled \\ろ (ro) on a Japanese keyboard. */
    IntlRo = "IntlRo",
    /** Located between the = and Backspace keys. Labelled ¥ (yen) on a Japanese keyboard. \\/ on a Russian keyboard. */
    IntlYen = "IntlYen",
    /**美式键盘的 “ a”。 在 AZERTY 键盘（如法国）上标识为 “q”。 */
    KeyA = "KeyA",
    /**美式键盘的 “ b”。 */
    KeyB = "KeyB",
    /**美式键盘的 “ c”。 */
    KeyC = "KeyC",
    /**美式键盘的 “ d”。 */
    KeyD = "KeyD",
    /**美式键盘的 “ e”。 */
    KeyE = "KeyE",
    /**美式键盘的 “ f”。 */
    KeyF = "KeyF",
    /**美式键盘的 “ g”。 */
    KeyG = "KeyG",
    /**美式键盘的 “ h”。 */
    KeyH = "KeyH",
    /**美式键盘的 “ i”。 */
    KeyI = "KeyI",
    /**美式键盘的 “ j”。 */
    KeyJ = "KeyJ",
    /**美式键盘的 “ k”。 */
    KeyK = "KeyK",
    /**美式键盘的 “ l”。 */
    KeyL = "KeyL",
    /**美式键盘的 “ m”。 */
    KeyM = "KeyM",
    /**美式键盘的 “ n”。 */
    KeyN = "KeyN",
    /**美式键盘的 “ o”。 */
    KeyO = "KeyO",
    /**美式键盘的 “ p”。 */
    KeyP = "KeyP",
    /**美式键盘的 “ q”。 在 AZERTY 键盘（如法国）上标识为 “a”。 */
    KeyQ = "KeyQ",
    /**美式键盘的 “ r”。 */
    KeyR = "KeyR",
    /**美式键盘的 “ s”。 */
    KeyS = "KeyS",
    /**美式键盘的 “ t”。 */
    KeyT = "KeyT",
    /**美式键盘的 “ u”。 */
    KeyU = "KeyU",
    /**美式键盘的 “ v”。 */
    KeyV = "KeyV",
    /**美式键盘的 “ w”。 在 AZERTY 键盘（如法国）上标识为 “z”。 */
    KeyW = "KeyW",
    /**美式键盘的 “ x”。 */
    KeyX = "KeyX",
    /**美式键盘的 “ y”。 在 QWERTZ 键盘（如德国）上标识为 “z”。 */
    KeyY = "KeyY",
    /**美式键盘的 “ z”。 在 AZERTY 键盘（如法国）上标识为 “w”，在 QWERTZ 键盘（如德国）上标识为 “y”。 */
    KeyZ = "KeyZ",
    /** 美式键盘的 “-_”。 */
    Minus = "Minus",
    /** 美式键盘的 “.>”。 */
    Period = "Period",
    /** 美式键盘的 “'"”。 */
    Quote = "Quote",
    /** 美式键盘的 “;:”。 */
    Semicolon = "Semicolon",
    /** 美式键盘的 “/?”。 */
    Slash = "Slash",
    /* -- Alphanumeric Section - Functional Keys -- */
    /** “Alt”，“Option” 或 “⌥”。 */
    AltLeft = "AltLeft",
    /** “Alt”，“Option” 或 “⌥”。 在很多键盘布局上标识为 “AltGr”。 */
    AltRight = "AltRight",
    /** “Backspace” 或 “⌫”。 在 Apple 键盘上标识为 “Delete”。 */
    Backspace = "Backspace",
    /** “CapsLock” 或 “⇪”。 */
    CapsLock = "CapsLock",
    /** The application context menu key, which is typically found between the right Meta key and the right Control key. */
    ContextMenu = "ContextMenu",
    /** “Control” 或 “⌃”。 */
    ControlLeft = "ControlLeft",
    /** “Control” 或 “⌃”。 */
    ControlRight = "ControlRight",
    /** “Enter” 或 “↵”。 在 Apple 键盘上标识为 “Return”。 */
    Enter = "Enter",
    /** The Windows, ⌘, Command or other OS symbol key. */
    MetaLeft = "MetaLeft",
    /** The Windows, ⌘, Command or other OS symbol key. */
    MetaRight = "MetaRight",
    /** “Shift” 或 “⇧”。 */
    ShiftLeft = "ShiftLeft",
    /** “Shift” 或 “⇧”。 */
    ShiftRight = "ShiftRight",
    /** “ ” （空格） */
    Space = "Space",
    /** “Tab” 或 “⇥”。 */
    Tab = "Tab",
    /* -- Control Pad Section -- */
    /** ⌦. The forward delete key. Note that on Apple keyboards, the key labelled Delete on the main part of the keyboard should be encoded as "Backspace". */
    Delete = "Delete",
    /** “End” 或 “↘”。 */
    End = "End",
    /** Help. Not present on standard PC keyboards. */
    Help = "Help",
    /** “Home” 或 “↖”。 */
    Home = "Home",
    /** “Insert” 或 “I”。ns. Not present on Apple keyboards. */
    Insert = "Insert",
    /** Page Down, PgDn or ⇟ */
    PageDown = "PageDown",
    /** Page Up, PgUp or ⇞ */
    PageUp = "PageUp",
    /* -- Arrow Pad Section -- */
    /** ↓ */
    ArrowDown = "ArrowDown",
    /** ← */
    ArrowLeft = "ArrowLeft",
    /** → */
    ArrowRight = "ArrowRight",
    /** ↑ */
    ArrowUp = "ArrowUp",
    /* -- Numpad Section -- */
    /** On the Mac, the "NumLock" code should be used for the numpad Clear key. */
    NumLock = "NumLock",
    /** 0 Ins on a keyboard  
     * 0 on a phone or remote control */
    Numpad0 = "Numpad0",
    /** 1 End on a keyboard  
     * 1 or 1 QZ on a phone or remote control */
    Numpad1 = "Numpad1",
    /** 2 ↓ on a keyboard  
     * 2 ABC on a phone or remote control */
    Numpad2 = "Numpad2",
    /** 3 PgDn on a keyboard  
     * 3 DEF on a phone or remote control */
    Numpad3 = "Numpad3",
    /** 4 ← on a keyboard  
     * 4 GHI on a phone or remote control */
    Numpad4 = "Numpad4",
    /** 5 on a keyboard  
     * 5 JKL on a phone or remote control */
    Numpad5 = "Numpad5",
    /** 6 → on a keyboard  
     * 6 MNO on a phone or remote control */
    Numpad6 = "Numpad6",
    /** 7 Home on a keyboard  
     * 7 PQRS or 7 PRS on a phone or remote control */
    Numpad7 = "Numpad7",
    /** 8 ↑ on a keyboard  
     * 8 TUV on a phone or remote control */
    Numpad8 = "Numpad8",
    /** 9 PgUp on a keyboard  
     * 9 WXYZ or 9 WXY on a phone or remote control */
    Numpad9 = "Numpad9",
    /** + */
    NumpadAdd = "NumpadAdd",
    /** . Del. For locales where the decimal separator is "," (e.g., Brazil), this key may generate a ,. */
    NumpadDecimal = "NumpadDecimal",
    /** / */
    NumpadDivide = "NumpadDivide",
    /**  */
    NumpadEnter = "NumpadEnter",
    /** \* on a keyboard. For use with numpads that provide mathematical operations (+, -, * and /).  
     * Use "NumpadStar" for the * key on phones and remote controls. */
    NumpadMultiply = "NumpadMultiply",
    /* -- Function Section -- */
    /** “Esc” 或 “⎋”。 */
    Escape = "Escape",
    /** F1 */
    F1 = "F1",
    /** F2 */
    F2 = "F2",
    /** F3 */
    F3 = "F3",
    /** F4 */
    F4 = "F4",
    /** F5 */
    F5 = "F5",
    /** F6 */
    F6 = "F6",
    /** F7 */
    F7 = "F7",
    /** F8 */
    F8 = "F8",
    /** F9 */
    F9 = "F9",
    /** F10 */
    F10 = "F10",
    /** F11 */
    F11 = "F11",
    /** F12 */
    F12 = "F12",
    /** PrtScr SysRq or Print Screen */
    PrintScreen = "PrintScreen",
    /** Scroll Lock */
    ScrollLock = "ScrollLock",
    /** Pause Break */
    Pause = "Pause",
}

export type KeyName = "Backquote" | "Backslash" | "BracketLeft" | "BracketRight" | "Comma" |
    "Digit0" | "Digit1" | "Digit2" | "Digit3" | "Digit4" | "Digit5" | "Digit6" | "Digit7" | "Digit8" | "Digit9" |
    "Equal" | "IntlBackslash" | "IntlRo" | "IntlYen" |
    "KeyA" | "KeyB" | "KeyC" | "KeyD" | "KeyE" | "KeyF" | "KeyG" | "KeyH" | "KeyI" | "KeyJ" | "KeyK" | "KeyL" | "KeyM" |
    "KeyN" | "KeyO" | "KeyP" | "KeyQ" | "KeyR" | "KeyS" | "KeyT" | "KeyU" | "KeyV" | "KeyW" | "KeyX" | "KeyY" | "KeyZ" |
    "Minus" | "Period" | "Quote" | "Semicolon" | "Slash" | "AltLeft" | "AltRight" | "Backspace" | "CapsLock" |
    "ContextMenu" | "ControlLeft" | "ControlRight" | "Enter" | "MetaLeft" | "MetaRight" | "ShiftLeft" | "ShiftRight" |
    "Space" | "Tab" | "Delete" | "End" | "Help" | "Home" | "Insert" | "PageDown" | "PageUp" |
    "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp" |
    "NumLock" | "Numpad0" | "Numpad1" | "Numpad2" | "Numpad3" | "Numpad4" | "Numpad5" | "Numpad6" | "Numpad7" | "Numpad8" | "Numpad9" |
    "NumpadAdd" | "NumpadDecimal" | "NumpadDivide" | "NumpadEnter" | "NumpadMultiply" |
    "Escape" | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12" |
    "PrintScreen" | "ScrollLock" | "Pause" ;

export type MouseName = "MouseLeft" | "MouseMiddle" | "MouseRight" | "MouseForth" | "MouseFifth" ;

const mouseCodeNameMap = ["MouseLeft", "MouseMiddle", "MouseRight", "MouseForth", "MouseFifth"];

export type ButtonName = KeyName | MouseName;

interface RelativableNode {
    toLocal(pos: utils.Vec2): utils.Vec2,
}

export class Input { // TODO: lastPressedKey，虚拟按键，onTap，type Button = ButtonName | ButtonObj ...

    // 注意：如果按住一个键，突然松开极短的时间，然后再次按住，有可能忽视这次抬手，视为一直按住。
    // ↑ 这条注释是我好久之前留下的了，我只记得这玩意仅存在于理论分析中，对实际使用应该没啥影响。。

    /** @internal 所有按键的状态，初始为0，按住则从1开始每帧加1，松开的一帧变为相反数，之后归0。 */
    private _buttonStates: Record<string, number | undefined> = {};
    /** @internal 在两次更新之间累积起来的按键事件 */
    private _buttonEvents: Record<string, ButtonEventType> = {};

    /** @internal */
    _onBtnDown(button: string) { this._buttonEvents[button] = ButtonEventType.down; }
    /** @internal */
    _onBtnUp(button: string) {
        if (this._buttonEvents[button] === ButtonEventType.none) {
            this._buttonEvents[button] = ButtonEventType.up;
        } else if (this._buttonEvents[button] === ButtonEventType.down) {
            this._buttonEvents[button] = ButtonEventType.downAndUp;
        }
    }

    /** @internal */
    private _mouseLastPos: utils.Vec2;
    /** @internal */
    private _mouseNowPos: utils.Vec2;
    /** @internal */
    private _mouseNextPos: utils.Vec2;
    /** @internal */
    _onMouseMove({ x, y }: utils.Vec2) { this._mouseNextPos = { x, y }; }

    /** @internal */
    private _nowWheelDown: -1 | 0 | 1;
    /** @internal */
    private _nextWheelDown: -1 | 0 | 1;
    _onWheel(wheelDown: -1 | 0 | 1) { this._nextWheelDown = wheelDown; }
    getWheel() { return this._nowWheelDown; }

    /** TODOC: getMouseXy */
    getMouseXy(relativeNode?: RelativableNode) { 
        let pos = { ...this._mouseNowPos };
        if (relativeNode) { pos = relativeNode.toLocal(pos); }
        return pos;
    }
    getMouseMotion(relativeNode?: RelativableNode) {
        let lastPos = this._mouseLastPos;
        let nowPos = this._mouseNowPos;
        if (relativeNode) {
            lastPos = relativeNode.toLocal(lastPos);
            nowPos = relativeNode.toLocal(nowPos);
        }
        return {
            x: nowPos.x - lastPos.x,
            y: nowPos.y - lastPos.y,
        };
    }

    constructor(options: {
        buttonStates: Record<string, number | undefined>,
        buttonEvents: Record<string, ButtonEventType>,
        mouseLastPos: utils.Vec2,
        mouseNowPos: utils.Vec2,
        mouseNextPos: utils.Vec2,
        nowWheelDown: -1 | 0 | 1,
        nextWheelDown: -1 | 0 | 1,
    }) {
        this._buttonStates = options.buttonStates;
        this._buttonEvents = options.buttonEvents;
        this._mouseLastPos = options.mouseLastPos;
        this._mouseNowPos = options.mouseNowPos;
        this._mouseNextPos = options.mouseNextPos;
        this._nowWheelDown = options.nowWheelDown;
        this._nextWheelDown = options.nextWheelDown;
    }

    /**
     * TODOC: input._update
     * 此函数用于更新按键状态，须在每帧最开始时调用该函数。  
     * 启动游戏时默认会自动帮你做这一步，所以一般不用管这个。
     * @example
     * game.forever(() => game.input._update(), 1000); // 使用一个较高的优先级，确保每帧最先执行
     * 
     * game.forever(() => game.input._update(game.timeScale), 1000);
     * // ↑ timeScale 是可选的，这样写游戏在减速时按键统计时间也会减速。
     * // 但这么写不太可靠，原因懒得解释，我个人不推荐
     */
    _update() {
        for (const [ key, eventType ] of Object.entries(this._buttonEvents)) {
            if (this._buttonStates[key] === undefined) { this._buttonStates[key] = 0; }
            if (eventType === ButtonEventType.none) {
                if (this._buttonStates[key] > 0) {
                    this._buttonStates[key] += 1;
                } else {
                    this._buttonStates[key] = 0;
                }
            } else if (eventType === ButtonEventType.up) {
                if (this._buttonStates[key] > 0) {
                    this._buttonStates[key] *= -1;
                } else {
                    this._buttonStates[key] = 0
                }
            } else { // down | DownAndUp
                if (this._buttonStates[key] < 0) {
                    this._buttonStates[key] = 1;
                } else {
                    this._buttonStates[key] += 1;
                }
            }
            if (eventType == ButtonEventType.downAndUp) {
                this._buttonEvents[key] = ButtonEventType.up;
            } else {
                this._buttonEvents[key] = ButtonEventType.none;
            }
        }
        // 这里我总感觉不太稳当所以浅拷贝一下
        this._mouseLastPos = { ...this._mouseNowPos };
        this._mouseNowPos = { ...this._mouseNextPos };
        this._nowWheelDown = this._nextWheelDown;
        this._nextWheelDown = 0;
    }

    /**
     * 获取一个按键的状态，初始为 0 ，按住则从1开始每帧加 1 ，松开的一帧变为相反数，之后归 0 。  
     * ⚠️ 这个值不受 timeScale 的影响，只跟更新次数有关。  
     */
    getState(button: ButtonName) { return this._buttonStates[button] ?? 0; }
    /** 按键被按下的一瞬间，返回 true 。 */
    isDown(button: ButtonName) { return this.getState(button) == 1; }
    /** 按键松开的一瞬间，返回 true 。 */
    isUp(button: ButtonName) { return this.getState(button) < 0; }
    /** 如果按键被按住，返回 true 。 */
    isHold(button: ButtonName) { return this.getState(button) > 0; }
    /** 如果按键闲置，返回 true 。 */
    isIdle(button: ButtonName) { return this.getState(button) <= 0; }

    /**
     * 如果轻敲按键并立即松开，在松开的那一帧返回 true 。  
     * ⚠️ 此函数不考虑 timeScale ，只跟更新次数有关。  
     */
    isShortClick(button: ButtonName,
        /** 容许按住的最大持续帧数，若按住的时长超过此值则不会判定为轻敲。 */
        maxHoldTime: number = 10
    ) { return this.isUp(button) && this.getState(button) >= -maxHoldTime; }

    /**
     * 如果长按按键并松开，在松开的那一帧返回 true 。  
     * ⚠️ 此函数不考虑 timeScale ，只跟更新次数有关。  
     */
    isLongRelease(button: ButtonName,
        /** 容许按住的最小持续帧数，若按住的时长低于此值则不会判定为长按。 */
        minHoldTime: number = 12
    ) { return this.getState(button) <= -minHoldTime; }
}

export const makeInput = (options: {
    app: pixi.Application,
}) => {
    const { app } = options;
    const input = new Input({
        buttonStates: {},
        buttonEvents: {},
        mouseLastPos: { x: 0, y: 0 },
        mouseNowPos: { x: 0, y: 0 },
        mouseNextPos: { x: 0, y: 0 },
        nowWheelDown: 0,
        nextWheelDown: 0,
    });
    document.addEventListener("keydown", ev => input._onBtnDown(ev.code));
    document.addEventListener("keyup", ev => input._onBtnUp(ev.code));
    app.stage.eventMode = "static";
    app.stage.on("mousedown", ev => input._onBtnDown(mouseCodeNameMap[ev.button]));
    app.stage.on("mouseup", ev => input._onBtnUp(mouseCodeNameMap[ev.button]));
    app.stage.on("mousemove", ev => input._onMouseMove(ev.global));
    app.stage.on("wheel", ev => input._onWheel(ev.deltaY < 0 ? -1 : ev.deltaY > 0 ? 1 : 0));
    input.getState = input.getState.bind(input);
    input.isDown = input.isDown.bind(input);
    input.isUp = input.isUp.bind(input);
    input.isHold = input.isHold.bind(input);
    input.isIdle = input.isIdle.bind(input);
    input.isShortClick = input.isShortClick.bind(input);
    input.isLongRelease = input.isLongRelease.bind(input);
    input.getMouseXy = input.getMouseXy.bind(input);
    input.getMouseMotion = input.getMouseMotion.bind(input);
    return input;
};