export type ItemId =
  | 'HEAL_SMALL'
  | 'HEAL_MEDIUM'
  | 'SHIELD_GRANT';

export interface ItemDef {
  itemId: ItemId;
  name: string;
  description: string;
  cost: number;
  usableInBattle: boolean;
  healAmount?: number;
  sideEffectStatus?: 'STOMACHACHE_NO_ATTACK';
  sideEffectChance?: number;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
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
