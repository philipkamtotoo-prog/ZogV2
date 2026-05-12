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
  healAmount?: number;
  healFailChance?: number;
  sideEffectStatus?: 'STOMACHACHE_NO_ATTACK';
  sideEffectChance?: number;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  HEAL_TINY: {
    itemId: 'HEAL_TINY',
    name: 'Pocket Coolant Pack',
    description: 'Restore 10 HP. No side effect.',
    cost: 45,
    usableInBattle: true,
    healAmount: 10,
  },
  HEAL_SMALL: {
    itemId: 'HEAL_SMALL',
    name: 'Bad Engine Oil',
    description: 'Restore 20 HP. 20% chance to add STOMACHACHE_NO_ATTACK for the next action.',
    cost: 80,
    usableInBattle: true,
    healAmount: 20,
    sideEffectStatus: 'STOMACHACHE_NO_ATTACK',
    sideEffectChance: 0.2,
  },
  HEAL_MEDIUM: {
    itemId: 'HEAL_MEDIUM',
    name: 'Emergency Can',
    description: 'Restore 35 HP. No side effect.',
    cost: 150,
    usableInBattle: true,
    healAmount: 35,
  },
  HEAL_GAMBLE: {
    itemId: 'HEAL_GAMBLE',
    name: 'Prototype Surge Tank',
    description: 'Attempt to restore 100 HP. 35% chance to fail and restore nothing.',
    cost: 260,
    usableInBattle: true,
    healAmount: 100,
    healFailChance: 0.35,
  },
  SHIELD_GRANT: {
    itemId: 'SHIELD_GRANT',
    name: 'High-Energy Taunt Battery',
    description: 'Restore 60 HP, grant SHIELD_ONCE, and make other actors target this actor once.',
    cost: 350,
    usableInBattle: true,
    healAmount: 60,
  },
};

export function getItemDef(itemId: ItemId): ItemDef {
  return ITEM_DEFS[itemId];
}

export function getAllItems(): ItemDef[] {
  return Object.values(ITEM_DEFS);
}
