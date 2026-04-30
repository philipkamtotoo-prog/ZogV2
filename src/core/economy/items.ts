/**
 * 战斗道具表（文档10.2节）
 * 价格和效果严格对齐文档。
 */

export type ItemId =
  | 'HEAL_SMALL'       // 劣质机油
  | 'HEAL_MEDIUM'      // 急救罐头
  | 'SHIELD_GRANT'     // 高能嘲讽电池
  | 'THREAT_BOOST'     // 聚光灯提升（文档中未列但代码有）
  | 'SPOTLIGHT_FORCE'; // 导演之选（文档中未列但代码有）

export interface ItemDef {
  itemId: ItemId;
  name: string;
  description: string;
  cost: number;
  usableInBattle: boolean;
  /** 恢复HP量（仅回血道具） */
  healAmount?: number;
  /** 副作用：触发状态（仅劣质机油有） */
  sideEffectStatus?: 'STOMACHACHE_NO_ATTACK';
  /** 副作用触发概率（0-1） */
  sideEffectChance?: number;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  /**
   * 劣质机油（文档10.2节）
   * 价格：80G | 恢复20HP | 20%概率触发"肠胃不适"
   * 副作用：下一次行动无法攻击
   */
  HEAL_SMALL: {
    itemId: 'HEAL_SMALL',
    name: '劣质机油',
    description: '恢复20 HP。20%概率获得"肠胃不适"，下一次行动无法攻击。',
    cost: 80,
    usableInBattle: true,
    healAmount: 20,
    sideEffectStatus: 'STOMACHACHE_NO_ATTACK',
    sideEffectChance: 0.2,
  },

  /**
   * 急救罐头（文档10.2节）
   * 价格：150G | 恢复35HP | 无副作用
   */
  HEAL_MEDIUM: {
    itemId: 'HEAL_MEDIUM',
    name: '急救罐头',
    description: '恢复35 HP。无副作用。',
    cost: 150,
    usableInBattle: true,
    healAmount: 35,
  },

  /**
   * 高能嘲讽电池（文档10.2节）
   * 价格：350G | 恢复60HP + 护盾 + TAUNT_1_ACTION
   */
  SHIELD_GRANT: {
    itemId: 'SHIELD_GRANT',
    name: '高能嘲讽电池',
    description: '恢复60 HP，赋予护盾，并使目标进入TAUNT_1_ACTION状态（下次被强制指定攻击）。',
    cost: 350,
    usableInBattle: true,
    healAmount: 60,
  },

  /**
   * 聚光灯提升（额外道具）
   * 价格：20G | 威胁+20
   */
  THREAT_BOOST: {
    itemId: 'THREAT_BOOST',
    name: '聚光灯提升',
    description: '使目标威胁值+20。',
    cost: 20,
    usableInBattle: true,
  },

  /**
   * 导演之选（额外道具）
   * 价格：50G | 强制下一次行动聚焦目标
   */
  SPOTLIGHT_FORCE: {
    itemId: 'SPOTLIGHT_FORCE',
    name: '导演之选',
    description: '强制使目标成为下一次行动的聚焦对象。',
    cost: 50,
    usableInBattle: true,
  },
};

export function getItemDef(itemId: ItemId): ItemDef {
  return ITEM_DEFS[itemId];
}

export function getAllItems(): ItemDef[] {
  return Object.values(ITEM_DEFS);
}
