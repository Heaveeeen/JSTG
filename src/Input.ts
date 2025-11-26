
const enum KeyEventType {
    none = 0,
    down = 1,
    up = 2,
    downAndUp = 3,
}

/** 键码表，仅包含 Required 部分，注释为个人简单翻译  
 * 来源：{@link https://w3c.github.io/uievents-code/#code-value-tables}  
 * 此枚举最后更新于：2025/1/6 */
export enum Key {
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

export type Input = ReturnType<typeof makeInput>;

export function makeInput() {

    // 注意：如果按住一个键，突然松开极短的时间，然后再次按住，有可能忽视这次抬手，视为一直按住。
    // ↑ 这条注释是我好久之前留下的了，我只记得这玩意仅存在于理论分析中，对实际使用应该没啥影响。。

    /** 所有按键的状态，初始为0，按住则从1开始每帧加1，松开的一帧变为相反数，之后归0。 */
    const states: Record<string, number | undefined> = {};
    /** 在两次更新之间累积起来的按键事件 */
    const keyEvents: Record<string, KeyEventType> = {};

    document.addEventListener("keydown", ev => keyEvents[ev.code] = KeyEventType.down);
    document.addEventListener("keyup", ev => {
        if (keyEvents[ev.code] === KeyEventType.none) {
            keyEvents[ev.code] = KeyEventType.up;
        } else if (keyEvents[ev.code] === KeyEventType.down) {
            keyEvents[ev.code] = KeyEventType.downAndUp;
        }
    });

    const _update = (timeScale: number = 1) => {
        for (const [ key, eventType ] of Object.entries(keyEvents)) {
            if (states[key] === undefined) states[key] = 0;
            if (eventType === KeyEventType.none) {
                if (states[key] > 0) {
                    states[key] += timeScale;
                } else {
                    states[key] = 0;
                }
            } else if (eventType === KeyEventType.up) {
                if (states[key] > 0) {
                    states[key] *= -1;
                } else {
                    states[key] = 0
                }
            } else { // down | DownAndUp
                if (states[key] < 0) {
                    states[key] = timeScale;
                } else {
                    states[key] += timeScale;
                }
            }
            if (eventType == KeyEventType.downAndUp) {
                keyEvents[key] = KeyEventType.up;
            } else {
                keyEvents[key] = KeyEventType.none;
            }
        }
    }

    const getState = (button: string) => states[button] ?? 0;
    const isDown = (button: string) => getState(button) == 1;
    const isUp = (button: string) => getState(button) < 0;
    const isHold = (button: string) => getState(button) > 0;
    const isIdle = (button: string) => getState(button) <= 0;

    const isShortClick = (button: string,
        /** 容许按住的最大持续帧数，若按住的时长超过此值则不会判定为轻敲 */
        maxHoldTime: number = 10
    ) => isUp(button) && getState(button) >= -maxHoldTime;

    const isLongRelease = (button: string,
        /** 容许按住的最小持续帧数，若按住的时长低于此值则不会判定为长按 */
        minHoldTime: number = 12
    ) => getState(button) <= -minHoldTime;

    return {
        /** 获取一个按键的状态，初始为0，按住则从1开始每帧加1，松开的一帧变为相反数，之后归0 */
        getState,
        /** 按键被按下的一瞬间，返回 true */
        isDown,
        /** 按键松开的一瞬间，返回 true */
        isUp,
        /** 如果按键被按住，返回 true */
        isHold,
        /** 如果按键闲置，返回 true */
        isIdle,
        /** 如果轻敲按键并立即松开，在松开的那一帧返回 true */
        isShortClick,
        /** 如果长按按键并松开，在松开的那一帧返回 true */
        isLongRelease,
        /**
         * 此函数用于更新按键状态，须在每帧最开始时调用该函数。  
         * 启动游戏时默认会自动帮你做这一步，所以一般不用管这个。
         * @example
         * game.forever(() => game.input._update(), 1000); // 使用一个较高的优先级，确保每帧最先执行
         * 
         * game.forever(() => game.input._update(game.timeScale), 1000);
         * // ↑ timeScale 是可选的，这样写游戏在减速时按键统计时间也会减速。
         * // 但这么写不太可靠，原因懒得解释，我个人不推荐
         */
        _update,
    }

}