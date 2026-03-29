import * as pixi from "pixi";
import { Game, Board, Player, Combat } from "../jstg.js";
import { DyedTextureColors, DyedTextures } from "../textures.js";
import { AbstractEnemy } from "./abstractEnemy.js";
import { staticAssert } from "../utils.js";
import { Entity } from "./entity.js";


export interface NewAbstractDanmakuOptions {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    type: string;
    color: DyedTextureColors;
    game: Game;
    combat: Combat;
    board: Board;
}

export interface EraseDanmakuOptions {
    /**
     * 本次消弹的来源种类。决定本次消弹是否能够生效。
     * * "common" - 最低级别的权限，本次消弹会被 canBeErase 拦住。
     * * "thisEnemyDie" - 本次消弹的原因是“击破了该弹幕绑定的敌人”，本次消弹无视 canBeErase 。  
     * * "force" - 本次消弹不会被任何因素阻止。  
     * @default "common"
     */
    permissionType?: "common" | "thisEnemyDie" | "force";
    /**
     * 消弹时的回调函数。可以利用这个回调函数，把消掉的弹幕转换成别的东西。例如，转化为得分道具，或者死尸弹。
     * 对于普通弹幕，该回调函数只会调用一次；对于激光，该回调函数会对激光的每一个“体节”都调用一次。
     * 如果该弹幕最终没有被消除（例如因为这个该弹幕无法被消除），则该回调函数不会被调用。
     */
    forEachCorpse?: (corpseInfo: { x: number, y: number }) => void;
    /**
     * 消弹的特效种类。  
     * 对于普通弹幕，若不填写此参数，则根据 this.type 自动决定。一般的弹幕为雾化消失，大玉和核弹为缩小虚化至消失。  
     * 对于直线激光，默认为 "reduce"。  
     * 直线激光暂不支持 "fog" ，其效果和 "reduce" 相同。  
     */
    effectType?: "fog" | "reduce" | "none",
}

export abstract class AbstractDanmaku extends Entity {
    /**
     * 弹幕的种类名称
     * @example
     * "smallball"
     */
    readonly type: string;
    readonly color: DyedTextureColors;

    /**
     * @readonly  
     * 与该弹幕绑定的敌人。  
     * 绑定了敌人时，该弹幕会随着敌人的击破而消除。
     */
    enemy: AbstractEnemy<this> | null = null;

    constructor(options: NewAbstractDanmakuOptions) {
        super(options);
        this.type = options.type;
        this.color = options.color;
        options.board.danmakuRegList.push(this);
    }

    hitboxGraphics: pixi.Graphics | null = null;
    isHitboxGraphicsDirty = true;
    clearHitboxGraphics() {
        this.hitboxGraphics?.clear();
        this.isHitboxGraphicsDirty = true;
    }

    grazeCd: number = 0;
    isGrazing: boolean = false;

    /**
     * 该弹幕是否会与玩家交互并造成伤害
     * @example
     * myDanmaku.isDamageToPlayer = false; // 让这个弹幕不再与玩家产生交互，取消伤害判定
     * myDanmaku.isDamageToPlayer = true; // 重新启用伤害判定
     */
    isDamageToPlayer: boolean = true;
    /**
     * 该弹幕是否能够被通常的消弹效果消除。  
     * 此属性为 false 时，该弹幕不会被通常的消弹效果（如 Bomb）消除，但依然会在击破符卡时消除。
     * 如果该弹幕是一个敌人，在击破该敌人时，哪怕 canBeErase 为 false ，此弹幕也会被消除。
     * 构造一个敌人时，此值会被默认设置为 false 。
     * @example
     * myDanmaku.canBeErase = false; // 让这个弹幕无法被消弹效果消除
     * myDanmaku.canBeErase = true; // 又能消掉了
     */
    canBeErase: boolean = true;

    /**
     * 消除该弹幕，并生成一个消弹特效。  
     * 如果该弹幕无法被消除，则该函数什么也不做。  
     * 调用该函数之后，不能再使用该弹幕。  
     */
    abstract erase(options?: EraseDanmakuOptions): void;

    /** @internal */
    protected _erased = false;

    /** @internal 此函数会考虑 destroyed */
    protected _getIsCanBeEraseByPermissionType(permissionType: Exclude<EraseDanmakuOptions["permissionType"], undefined>) {
        if (this.destroyed) {
            return false;
        } else if (permissionType === "force") {
            return true;
        } else if (permissionType === "thisEnemyDie") {
            // ASSERTS: this.enemy !== null
            return true;
        } else {
            staticAssert<"common">(permissionType);
            return this.canBeErase;
        }
    }

    // MAYDO: 加入一种延迟消弹效果，暂时取消弹幕的攻击性，但会照常虚化显示，还会进行攻击判定，一段时间后才会消除。但该状态下的攻击判定不会造成伤害，只会播放音效。有助于让玩家知道放这个B放得到底赚不赚。

    /**
     * 更新该弹幕，每帧都会调用一次这个函数。
     * 会更新与玩家的交互逻辑（即伤害判定），除非 isDamageToPlayer 属性为 false。
     */
    abstract update(player: Player): void;

    abstract getIsCrossCircle(circle: { x: number, y: number, radius: number }): boolean;
}

/** 此处的数值与弹幕引擎有所不同 */
export const prefabDanmakuHitboxRadius = {
    smallball: 4,
    ringball: 4,
    glowball: 4,
    fireball: 4,
    dot: 2.8,
    popcorn: 2.8,
    darkpill: 3,
    grain: 3,
    chain: 3,
    seed: 3,
    scale: 3,
    bullet: 3,
    drip: 2.8,
    card: 3.25,
    note: 4,
    arrow: 4,
    butterfly: 4,
    smallstar: 4,
    bigstar: 8,
    ellipse: 5.7,
    heart: 8,
    middleball: 8,
    lightball: 10.4,
    bubble: 15,
    crystal: 3.25,
    particle: 3.25,
    nova: 4,
    coin: 4,
    knife: 4,
    sword: 5.7,
    nuclear: 46.6,
    laserseg: 4,
    yinyang: 9.5,
    bigyinyang: 27,
    // MAYDO: 休止符（英文名rest），宝珠（大水滴？），岩石（木糖醇）
} as const;