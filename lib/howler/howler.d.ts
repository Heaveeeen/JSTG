// 由 deepseek 生成，人工润色
//（又不是写小说哪来的润色……不要在意这些细节）

declare namespace HowlerGlobal {
    interface HowlerStatic {
        /**
         * 全局音量控制（0.0 到 1.0）
         * @param volume 音量值
         * @returns 当前音量值或 Howler 实例
         */
        volume(volume?: number): number | HowlerStatic;
        
        /**
         * 全局静音控制
         * @param muted 是否静音
         * @returns Howler 实例
         */
        mute(muted: boolean): HowlerStatic;
        
        /**
         * 停止所有声音
         * @returns Howler 实例
         */
        stop(): HowlerStatic;
        
        /**
         * 卸载所有 Howl 对象并重置 AudioContext
         * @returns Howler 实例
         */
        unload(): HowlerStatic;
        
        /**
         * 检查浏览器是否支持指定音频格式
         * @param ext 音频文件扩展名（如 'mp3', 'ogg'）
         * @returns 是否支持
         */
        codecs(ext: string): boolean;
        
        /**
         * 检查当前音频上下文状态
         */
        readonly state: 'suspended' | 'running' | 'closed';
        
        /**
         * 是否使用 Web Audio API（否则使用 HTML5 Audio）
         */
        readonly usingWebAudio: boolean;
        
        /**
         * 是否没有音频支持
         */
        readonly noAudio: boolean;
        
        /**
         * 是否自动暂停（30秒无声音后自动暂停 AudioContext）
         */
        autoSuspend: boolean;
        
        /**
         * 是否自动解锁音频（移动端需用户交互后播放）
         */
        autoUnlock: boolean;
        
        /**
         * AudioContext 实例（Web Audio API）
         */
        readonly ctx: AudioContext | null;
        
        /**
         * 主增益节点（Web Audio API）
         */
        readonly masterGain: GainNode | null;
        
        /**
         * HTML5 Audio 对象池大小
         */
        html5PoolSize: number;
        
        /**
         * 设置/获取监听器的 3D 位置
         * @param x x坐标
         * @param y y坐标
         * @param z z坐标
         * @returns 当前位置或 Howler 实例
         */
        pos(x?: number, y?: number, z?: number): [number, number, number] | HowlerStatic;
        
        /**
         * 设置/获取监听器的朝向
         * @param x 前向向量x
         * @param y 前向向量y
         * @param z 前向向量z
         * @param xUp 上向量x
         * @param yUp 上向量y
         * @param zUp 上向量z
         * @returns 当前朝向或 Howler 实例
         */
        orientation(x?: number, y?: number, z?: number, xUp?: number, yUp?: number, zUp?: number): [number, number, number, number, number, number] | HowlerStatic;
        
        /**
         * 设置所有声音的立体声平衡（-1.0 到 1.0）
         * @param pan 平衡值
         * @returns Howler 实例
         */
        stereo(pan: number): HowlerStatic;
    }
}

declare namespace Howler {
    /**
     * Howl 构造函数配置选项
     */
    interface HowlOptions {
        /** 音频源URL数组 */
        src: string | string[];
        /** 音频格式数组（可选，自动检测） */
        format?: string | string[];
        /** 是否自动播放 */
        autoplay?: boolean;
        /** 是否使用HTML5 Audio（默认使用Web Audio） */
        html5?: boolean;
        /** 是否循环播放 */
        loop?: boolean;
        /** 音量（0.0 到 1.0） */
        volume?: number;
        /** 播放速率（0.5 到 4.0） */
        rate?: number;
        /** 是否预加载 */
        preload?: boolean | 'metadata';
        /**
         * 声音池大小  
         * 我曾经的理解是：最多允许 pool 个该音效同时播放  
         * 例如：pool 为 1 ，只要播放第二次某音效就会立刻覆盖上一次播放的该音效  
         * 现在已经证明没有这回事。。。
         */
        pool?: number;
        /** 精灵图定义（声音片段） */
        sprite?: {[name: string]: [number, number, boolean?]};
        /** 初始是否静音 */
        mute?: boolean;
        
        /** XHR请求配置 */
        xhr?: {
            method?: string;
            headers?: {[key: string]: string};
            withCredentials?: boolean;
        };
        
        /** 3D位置 [x, y, z] */
        pos?: [number, number, number];
        /** 立体声平衡（-1.0 到 1.0） */
        stereo?: number;
        /** 3D朝向 [x, y, z] */
        orientation?: [number, number, number];
        
        /** 距离模型参数 */
        distanceModel?: 'linear' | 'inverse' | 'exponential';
        maxDistance?: number;
        refDistance?: number;
        rolloffFactor?: number;
        panningModel?: 'HRTF' | 'equalpower';
        coneInnerAngle?: number;
        coneOuterAngle?: number;
        coneOuterGain?: number;
        
        /** 事件回调 */
        onload?: () => void;
        onloaderror?: (soundId?: number, error?: any) => void;
        onplayerror?: (soundId?: number, error?: any) => void;
        onplay?: (soundId?: number) => void;
        onend?: (soundId?: number) => void;
        onpause?: (soundId?: number) => void;
        onstop?: (soundId?: number) => void;
        onmute?: (soundId?: number) => void;
        onvolume?: (soundId?: number) => void;
        onrate?: (soundId?: number) => void;
        onseek?: (soundId?: number) => void;
        onfade?: (soundId?: number) => void;
        onunlock?: (soundId?: number) => void;
        onstereo?: (soundId?: number) => void;
        onpos?: (soundId?: number) => void;
        onorientation?: (soundId?: number) => void;
    }
    interface Howl {
        
        /**
         * 播放声音
         * @param spriteOrId 精灵图名称或声音ID
         * @returns 声音ID
         */
        play(spriteOrId?: string | number): number;
        
        /**
         * 暂停播放
         * @param id 声音ID（省略则暂停所有）
         * @returns Howl 实例
         */
        pause(id?: number): this;
        
        /**
         * 停止播放并重置到开始
         * @param id 声音ID（省略则停止所有）
         * @returns Howl 实例
         */
        stop(id?: number): this;
        
        /**
         * 静音/取消静音
         * @param muted 是否静音
         * @param id 声音ID（省略则控制所有）
         * @returns Howl 实例
         */
        mute(muted: boolean, id?: number): this;
        
        /**
         * 获取/设置音量
         * @param volume 音量值（0.0-1.0）
         * @param id 声音ID（省略则控制所有）
         * @returns 当前音量或 Howl 实例
         */
        volume(volume?: number, id?: number): number | this;
        
        /**
         * 淡入淡出
         * @param from 起始音量
         * @param to 结束音量
         * @param duration 持续时间（毫秒）
         * @param id 声音ID（省略则控制所有）
         * @returns Howl 实例
         */
        fade(from: number, to: number, duration: number, id?: number): this;
        
        /**
         * 获取/设置播放速率
         * @param rate 播放速率（0.5-4.0）
         * @param id 声音ID（省略则控制所有）
         * @returns 当前速率或 Howl 实例
         */
        rate(rate?: number, id?: number): number | this;
        
        /**
         * 获取/设置播放位置
         * @param seek 播放位置（秒）
         * @param id 声音ID
         * @returns 当前位置或 Howl 实例
         */
        seek(seek?: number, id?: number): number | this;
        
        /**
         * 获取/设置是否循环
         * @param loop 是否循环
         * @param id 声音ID（省略则控制所有）
         * @returns 当前循环状态或 Howl 实例
         */
        loop(loop?: boolean, id?: number): boolean | this;
        
        /**
         * 检查是否正在播放
         * @param id 声音ID（省略则检查是否有声音在播放）
         * @returns 是否正在播放
         */
        playing(id?: number): boolean;
        
        /**
         * 获取音频时长
         * @param id 声音ID（省略则返回完整时长）
         * @returns 时长（秒）
         */
        duration(id?: number): number;
        
        /**
         * 获取当前加载状态
         * @returns 'unloaded' | 'loading' | 'loaded'
         */
        state(): string;
        
        /**
         * 卸载并销毁此 Howl 对象
         */
        unload(): void;
        
        /**
         * 监听事件
         * @param event 事件名称
         * @param fn 回调函数
         * @param id 声音ID（可选）
         * @returns Howl 实例
         */
        on(event: string, fn: (id?: number, ...args: any[]) => void, id?: number): this;
        
        /**
         * 取消监听事件
         * @param event 事件名称
         * @param fn 回调函数（可选，省略则移除所有）
         * @param id 声音ID（可选）
         * @returns Howl 实例
         */
        off(event: string, fn?: (id?: number, ...args: any[]) => void, id?: number): this;
        
        /**
         * 监听一次性事件
         * @param event 事件名称
         * @param fn 回调函数
         * @param id 声音ID（可选）
         * @returns Howl 实例
         */
        once(event: string, fn: (id?: number, ...args: any[]) => void, id?: number): this;
        
        /**
         * 设置/获取 3D 位置
         * @param x x坐标
         * @param y y坐标
         * @param z z坐标
         * @param id 声音ID（省略则控制所有）
         * @returns 当前位置或 Howl 实例
         */
        pos(x?: number, y?: number, z?: number, id?: number): [number, number, number] | this;
        
        /**
         * 设置/获取立体声平衡
         * @param pan 平衡值（-1.0 到 1.0）
         * @param id 声音ID（省略则控制所有）
         * @returns 当前平衡值或 Howl 实例
         */
        stereo(pan?: number, id?: number): number | this;
        
        /**
         * 设置/获取 3D 朝向
         * @param x 朝向x
         * @param y 朝向y
         * @param z 朝向z
         * @param id 声音ID（省略则控制所有）
         * @returns 当前朝向或 Howl 实例
         */
        orientation(x?: number, y?: number, z?: number, id?: number): [number, number, number] | this;
        
        /**
         * 设置/获取 Panner 属性
         * @param attr 属性对象
         * @param id 声音ID（省略则控制所有）
         * @returns 当前属性或 Howl 实例
         */
        pannerAttr(attr?: {
            coneInnerAngle?: number;
            coneOuterAngle?: number;
            coneOuterGain?: number;
            distanceModel?: 'linear' | 'inverse' | 'exponential';
            maxDistance?: number;
            refDistance?: number;
            rolloffFactor?: number;
            panningModel?: 'HRTF' | 'equalpower';
        }, id?: number): any | this;
    }
    
    /**
     * Howl 构造函数
     */
    interface HowlConstructor {
        new (options: HowlOptions): Howl;
    }
}

// 全局变量声明
//declare var HowlerGlobal: HowlerGlobal.HowlerStatic;
declare var Howler: HowlerGlobal.HowlerStatic;
/**
 * 构造一个 Howl 实例，你可以用它来播放音频，用法可参照 [Howler 自述文档](./README.md)
 * @example
 * const sound = new Howl({ src: ['sound.mp3', 'sound.ogg'] });
 * sound.play();
 */
declare var Howl: Howler.HowlConstructor;
