export type ItemId =
  | 'HEAL_TINY'
  | 'HEAL_SMALL'
  | 'HEAL_MEDIUM'
  | 'HEAL_GAMBLE'
  | 'SHIELD_GRANT';

export interface ItemDef {
  itemId: ItemId;
  name: string;
  description: string;
  cost: number;
  usableInBattle: boolean;
  iconFile: string;
  effectLabel: string;
  sideEffectLabel: string;
  flavorText: string;
  healAmount?: number;
  healFailChance?: number;
  sideEffectStatus?: 'STOMACHACHE_NO_ATTACK';
  sideEffectChance?: number;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  HEAL_TINY: {
    itemId: 'HEAL_TINY',
    name: '袖珍冷却包',
    description: '目标演员恢复 10 HP。没有副作用，是节目组少数能放心入口的东西。',
    cost: 45,
    usableInBattle: true,
    iconFile: 'Pocket Coolant Pack.png',
    effectLabel: '+10 HP',
    sideEffectLabel: '无副作用',
    flavorText: '废弃飞船上拆下的边角料，勉强能降温保命。',
    healAmount: 10,
  },
  HEAL_SMALL: {
    itemId: 'HEAL_SMALL',
    name: '劣质机油',
    description: '目标演员恢复 20 HP。20% 概率获得“肠胃不适”，下一次行动无法攻击。',
    cost: 80,
    usableInBattle: true,
    iconFile: 'Bad Engine Oil_.png',
    effectLabel: '+20 HP',
    sideEffectLabel: '20% 肠胃不适',
    flavorText: '外星黑市的勾兑假货，难怪喝了容易闹胃痛。',
    healAmount: 20,
    sideEffectStatus: 'STOMACHACHE_NO_ATTACK',
    sideEffectChance: 0.2,
  },
  HEAL_MEDIUM: {
    itemId: 'HEAL_MEDIUM',
    name: '急救罐头',
    description: '目标演员恢复 35 HP。无副作用，罐头环切口略有节目感。',
    cost: 150,
    usableInBattle: true,
    iconFile: 'Emergency Can.png',
    effectLabel: '+35 HP',
    sideEffectLabel: '无副作用',
    flavorText: '节目组从垃圾堆翻出的口粮，保质期是个谜。',
    healAmount: 35,
  },
  HEAL_GAMBLE: {
    itemId: 'HEAL_GAMBLE',
    name: '原型涌流罐',
    description: '尝试恢复 100 HP。35% 概率失败，失败时不恢复 HP。',
    cost: 260,
    usableInBattle: true,
    iconFile: 'Prototype Surge Tank.png',
    effectLabel: '+100 HP',
    sideEffectLabel: '35% 概率失效',
    flavorText: '宇宙电视机附赠的危险残次品，生死全靠命。',
    healAmount: 100,
    healFailChance: 0.35,
  },
  SHIELD_GRANT: {
    itemId: 'SHIELD_GRANT',
    name: '高能嘲讽电池',
    description: '目标演员恢复 60 HP，并获得 1 次护盾；同时获得 TAUNT_1_ACTION，下 1 次行动前被其他演员优先攻击。',
    cost: 350,
    usableInBattle: true,
    iconFile: 'High-Energy Taunt Battery.png',
    effectLabel: '+60 HP',
    sideEffectLabel: '护盾 + 嘲讽',
    flavorText: '漏电且闪着红光的废电池，最招渡渡鸟仇恨。',
    healAmount: 60,
  },
};

export function getItemDef(itemId: ItemId): ItemDef {
  return ITEM_DEFS[itemId];
}

export function getAllItems(): ItemDef[] {
  return Object.values(ITEM_DEFS);
}
