import { create } from 'zustand';
import { calculateIdleIncome } from '../../core/economy/loungeIncome';
import { begZogForGold, getBegCooldownMs } from '../../core/economy/begging';
import type { ItemId } from '../../core/economy/items';
import {
  ZOG_GIFTS,
  buildZogLoungeSystemPrompt,
  getZogGiftById,
  rollZogGiftResult,
  type ZogGiftResult,
} from '../zog/zogAffinity';
import {
  ACTOR_GACHA_SINGLE_COST,
  ACTOR_GACHA_TEN_COST,
  ACTOR_SHARDS_TO_UNLOCK,
  RANDOM_ACTOR_SHARD_BASE_COST,
  RANDOM_ACTOR_SHARD_COST_STEP,
  type ActorGachaPullCount,
  type ActorGachaResult,
  getActorGachaCost,
  getRandomActorShardPurchaseCost,
  isActorUnlocked,
  rollActorGacha,
  rollRandomActorShardPurchase,
} from '../gacha/actorGacha';
import { DEFAULT_ROSTER } from '../actors/actorRoster';
import {
  ACTOR_POTENTIAL_TRAIN_SHARD_COST,
  type ActorPotentialStats,
  type ActorPotentialTrainResult,
  normalizeActorPotentialMap,
  trainActorPotential as rollActorPotentialTraining,
} from '../actors/actorPotential';

// Shared upgrade tree for equipment (fridge + keyboard share same level)
// Lv2/3/4/5 = 300/900/2500/7000G (per数值文档)
export const EQUIPMENT_UPGRADE_COSTS: Record<number, number> = { 1: 300, 2: 900, 3: 2500, 4: 7000 };
export const FRIDGE_USES: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
export const KEYBOARD_LIMITS: Record<number, number> = { 1: 5, 2: 8, 3: 12, 4: 20, 5: 30 };

export const ZOG_GIFT_TIERS: { id: string; cost: number; affection: number }[] = ZOG_GIFTS.map((gift) => ({
  id: gift.giftId,
  cost: gift.cost,
  affection: gift.affection,
}));

// Actor gift tiers per数值文档: 100G/+10, 300G/+35, 800G/+100
export const ACTOR_GIFT_TIERS: { cost: number; affection: number }[] = [
  { cost: 100, affection: 10 },
    { cost: 350, affection: 35 },
  { cost: 800, affection: 100 },
];

// Permanent prompt injection costs per数值文档
export const PERMANENT_PROMPT_COST_G = 1000;
export const PERMANENT_PROMPT_MODIFY_COST_G = 1500;
export const PERMANENT_PROMPT_CLEAR_COST_G = 1000;
export const PERMANENT_PROMPT_COST_S = 200;

export {
  ACTOR_GACHA_SINGLE_COST,
  ACTOR_GACHA_TEN_COST,
  ACTOR_SHARDS_TO_UNLOCK,
  ACTOR_POTENTIAL_TRAIN_SHARD_COST,
  RANDOM_ACTOR_SHARD_BASE_COST,
  RANDOM_ACTOR_SHARD_COST_STEP,
  getRandomActorShardPurchaseCost,
};

interface LoungeState {
  gold: number;
  zogAffection: number;
  inventory: Record<string, number>;
  zogGiftInventory: Record<string, number>;
  battleQuickSlots: (ItemId | null)[];
  lastActiveTime: number;
  begAttempts: number;
  lastBegTime: number;
  begMessage: string | null;
  unlockedActorIds: string[];
  fridgeLevel: number;
  keyboardLevel: number;
  fridgeItemUseLimit: number;
  actorAffection: Record<string, number>;
  actorSalary: Record<string, number>;
  actorPurchases: Record<string, string[]>;
  actorPermanentPrompts: Record<string, string>;
  zogGiftAttempts: number;
  lastZogGiftResult: ZogGiftResult | null;
  actorContractShards: Record<string, number>;
  actorPotential: Record<string, ActorPotentialStats>;
  gachaPullCount: number;
  gachaShardPityCount: number;
  randomShardPurchaseCount: number;
  lastGachaResults: ActorGachaResult[];
}

export interface ChatMessage {
  role: 'user' | 'zog';
  content: string;
  timestamp: number;
}

interface LoungeStore extends LoungeState {
  collectIdleIncome: () => { goldEarned: number; capped: boolean };
  beg: () => void;
  canBeg: () => boolean;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  addItem: (itemId: ItemId) => void;
  removeItem: (itemId: ItemId) => boolean;
  buyZogGiftById: (giftId: string, quantity?: number) => boolean;
  addZogGift: (giftId: string, quantity?: number) => void;
  removeZogGift: (giftId: string) => boolean;
  setBattleQuickSlot: (slotIndex: number, itemId: ItemId | null) => void;
  giftZog: (cost: number) => boolean;
  giftZogById: (giftId: string) => ZogGiftResult | null;
  updateLastActiveTime: () => void;
  unlockActor: (actorId: string) => boolean;
  addActorAffection: (actorId: string, amount: number) => void;
  giftActor: (actorId: string, cost: number, affection: number) => boolean;
  addActorSalary: (actorId: string, amount: number) => void;
  spendActorSalary: (actorId: string, amount: number, purchaseId: string) => boolean;
  upgradeEquipment: () => boolean;
  upgradeFridge: () => boolean;
  upgradeKeyboard: () => boolean;
  getActorAffinityTier: (actorId: string) => number;
  setPermanentPrompt: (actorId: string, prompt: string) => boolean;
  modifyPermanentPrompt: (actorId: string, prompt: string) => boolean;
  clearPermanentPrompt: (actorId: string) => boolean;
  addActorContractShard: (actorId: string, amount: number) => void;
  unlockActorByShards: (actorId: string) => boolean;
  pullActorGacha: (count: ActorGachaPullCount) => ActorGachaResult[] | null;
  buyRandomActorShard: () => ActorGachaResult | null;
  trainActorPotential: (actorId: string) => ActorPotentialTrainResult | null;

  // 客厅聊天
  chatMessages: ChatMessage[];
  isZogTyping: boolean;
  sendChat: (message: string) => Promise<void>;
  clearChat: () => void;
}

const STORAGE_KEY = 'zog_lounge';

function loadState(): Partial<LoungeState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveState(state: LoungeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function pickState(s: LoungeStore): LoungeState {
  return {
    gold: s.gold,
    zogAffection: s.zogAffection,
    inventory: s.inventory,
    zogGiftInventory: s.zogGiftInventory,
    battleQuickSlots: normalizeBattleQuickSlots(s.battleQuickSlots),
    lastActiveTime: s.lastActiveTime,
    begAttempts: s.begAttempts,
    lastBegTime: s.lastBegTime,
    begMessage: s.begMessage,
    unlockedActorIds: s.unlockedActorIds,
    fridgeLevel: s.fridgeLevel ?? 1,
    keyboardLevel: s.keyboardLevel ?? 1,
    fridgeItemUseLimit: s.fridgeItemUseLimit ?? 1,
    actorAffection: s.actorAffection,
    actorSalary: s.actorSalary,
    actorPurchases: s.actorPurchases,
    actorPermanentPrompts: s.actorPermanentPrompts,
    zogGiftAttempts: s.zogGiftAttempts ?? 0,
    lastZogGiftResult: s.lastZogGiftResult ?? null,
    actorContractShards: s.actorContractShards,
    actorPotential: s.actorPotential,
    gachaPullCount: s.gachaPullCount ?? 0,
    gachaShardPityCount: s.gachaShardPityCount ?? 0,
    randomShardPurchaseCount: s.randomShardPurchaseCount ?? 0,
    lastGachaResults: s.lastGachaResults ?? [],
  };
}

function normalizeBattleQuickSlots(value: unknown): (ItemId | null)[] {
  const rawSlots = Array.isArray(value) ? value : [];
  return Array.from({ length: 4 }, (_, index) => {
    const raw = rawSlots[index];
    return typeof raw === 'string' ? (raw as ItemId) : null;
  });
}

function normalizeCountMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((next, [key, raw]) => {
    const count = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    if (count > 0) next[key] = count;
    return next;
  }, {});
}

const defaults: LoungeState & Pick<LoungeStore, 'chatMessages' | 'isZogTyping'> = {
  gold: 100,
  zogAffection: 0,
  inventory: {},
  zogGiftInventory: {},
  battleQuickSlots: [null, null, null, null],
  lastActiveTime: Date.now(),
  begAttempts: 0,
  lastBegTime: 0,
  begMessage: null,
  unlockedActorIds: [],
  fridgeLevel: 1,
  keyboardLevel: 1,
  fridgeItemUseLimit: 1,
  actorAffection: {},
  actorSalary: {},
  actorPurchases: {},
  actorPermanentPrompts: {},
  zogGiftAttempts: 0,
  lastZogGiftResult: null,
  actorContractShards: {},
  actorPotential: {},
  gachaPullCount: 0,
  gachaShardPityCount: 0,
  randomShardPurchaseCount: 0,
  lastGachaResults: [],
  chatMessages: [],
  isZogTyping: false,
};

function normalizeEquipmentLevel(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(5, Math.max(1, Math.floor(value)))
    : 1;
}

function normalizeLoadedState(state: Partial<LoungeState>): Partial<LoungeState> {
  const level = Math.max(
    normalizeEquipmentLevel(state.fridgeLevel),
    normalizeEquipmentLevel(state.keyboardLevel)
  );
  return {
    ...state,
    inventory: normalizeCountMap(state.inventory),
    zogGiftInventory: normalizeCountMap(state.zogGiftInventory),
    actorContractShards: normalizeCountMap(state.actorContractShards),
    actorPotential: normalizeActorPotentialMap(state.actorPotential),
    battleQuickSlots: normalizeBattleQuickSlots(state.battleQuickSlots),
    gachaPullCount: normalizeNonNegativeInteger(state.gachaPullCount),
    gachaShardPityCount: normalizeNonNegativeInteger(state.gachaShardPityCount),
    randomShardPurchaseCount: normalizeNonNegativeInteger(state.randomShardPurchaseCount),
    lastGachaResults: Array.isArray(state.lastGachaResults) ? state.lastGachaResults : [],
    fridgeLevel: level,
    keyboardLevel: level,
    fridgeItemUseLimit: FRIDGE_USES[level],
  };
}

function normalizeNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

const saved = normalizeLoadedState(loadState());

export const useLoungeStore = create<LoungeStore>((set, get) => ({
  ...defaults,
  ...saved,

  collectIdleIncome: () => {
    const { lastActiveTime, zogAffection } = get();
    const minutesAway = Math.floor((Date.now() - lastActiveTime) / 60_000);

    if (minutesAway < 1) return { goldEarned: 0, capped: false };

    const result = calculateIdleIncome(minutesAway, zogAffection);
    set((s) => {
      const next = { ...s, gold: s.gold + result.goldEarned, lastActiveTime: Date.now() };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return result;
  },

  beg: () => {
    const { canBeg, begAttempts, zogAffection } = get();
    if (!canBeg()) return;

    const seed = `beg_${Date.now()}`;
    const result = begZogForGold(seed, begAttempts, zogAffection);

    set((s) => {
      const next = {
        ...s,
        gold: s.gold + result.gold,
        begAttempts: s.begAttempts + 1,
        lastBegTime: Date.now(),
        begMessage: result.message,
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
  },

  canBeg: () => {
    const { lastBegTime } = get();
    return Date.now() - lastBegTime >= getBegCooldownMs();
  },

  addGold: (amount) => set((s) => {
    const next = { ...s, gold: s.gold + amount };
    saveState(pickState(next as LoungeStore));
    return next;
  }),

  spendGold: (amount) => {
    const { gold } = get();
    if (gold < amount) return false;
    set((s) => {
      const next = { ...s, gold: s.gold - amount };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  addItem: (itemId) =>
    set((s) => {
      const next = { ...s, inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 } };
      saveState(pickState(next as LoungeStore));
      return next;
    }),

  removeItem: (itemId) => {
    const { inventory } = get();
    if ((inventory[itemId] ?? 0) <= 0) return false;
    set((s) => {
      const next = { ...s, inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) - 1 } };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  buyZogGiftById: (giftId, quantity = 1) => {
    const gift = getZogGiftById(giftId);
    if (!gift) return false;
    const safeQuantity = Math.max(1, Math.floor(quantity));
    const totalCost = gift.cost * safeQuantity;
    const { gold } = get();
    if (gold < totalCost) return false;

    set((s) => {
      const next = {
        ...s,
        gold: s.gold - totalCost,
        zogGiftInventory: {
          ...s.zogGiftInventory,
          [giftId]: (s.zogGiftInventory[giftId] ?? 0) + safeQuantity,
        },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  addZogGift: (giftId, quantity = 1) => {
    if (!getZogGiftById(giftId)) return;
    const safeQuantity = Math.max(1, Math.floor(quantity));
    set((s) => {
      const next = {
        ...s,
        zogGiftInventory: {
          ...s.zogGiftInventory,
          [giftId]: (s.zogGiftInventory[giftId] ?? 0) + safeQuantity,
        },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
  },

  removeZogGift: (giftId) => {
    const { zogGiftInventory } = get();
    if ((zogGiftInventory[giftId] ?? 0) <= 0) return false;
    set((s) => {
      const nextInventory = { ...s.zogGiftInventory, [giftId]: (s.zogGiftInventory[giftId] ?? 0) - 1 };
      if (nextInventory[giftId] <= 0) {
        delete nextInventory[giftId];
      }
      const next = { ...s, zogGiftInventory: nextInventory };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  setBattleQuickSlot: (slotIndex, itemId) => {
    if (slotIndex < 0 || slotIndex >= 4) return;
    set((s) => {
      const nextSlots = normalizeBattleQuickSlots(s.battleQuickSlots);
      const existingIndex = itemId ? nextSlots.findIndex((slot) => slot === itemId) : -1;
      if (existingIndex >= 0) {
        nextSlots[existingIndex] = null;
      }
      nextSlots[slotIndex] = itemId;
      const next = { ...s, battleQuickSlots: nextSlots };
      saveState(pickState(next as LoungeStore));
      return next;
    });
  },

  giftZog: (cost: number) => {
    const { gold } = get();
    if (gold < cost) return false;
    const tier = ZOG_GIFT_TIERS.find((t) => t.cost === cost);
    if (!tier) return false;
    set((s) => {
      const next = {
        ...s,
        gold: s.gold - cost,
        zogAffection: s.zogAffection + tier.affection,
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  giftZogById: (giftId: string) => {
    const gift = getZogGiftById(giftId);
    if (!gift) return null;

    const { zogGiftInventory, zogAffection, zogGiftAttempts } = get();
    if ((zogGiftInventory[giftId] ?? 0) <= 0) return null;

    const result = rollZogGiftResult(giftId, zogAffection, zogGiftAttempts);
    if (!result) return null;

    set((s) => {
      const nextInventory = { ...s.zogGiftInventory, [giftId]: (s.zogGiftInventory[giftId] ?? 0) - 1 };
      if (nextInventory[giftId] <= 0) {
        delete nextInventory[giftId];
      }
      const next = {
        ...s,
        zogGiftInventory: nextInventory,
        zogAffection: s.zogAffection + result.totalAffection,
        zogGiftAttempts: s.zogGiftAttempts + 1,
        lastZogGiftResult: result,
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });

    return result;
  },

  updateLastActiveTime: () => set((s) => {
    const next = { ...s, lastActiveTime: Date.now() };
    saveState(pickState(next as LoungeStore));
    return next;
  }),

  unlockActor: (actorId: string) => {
    const { gold, zogAffection, unlockedActorIds } = get();
    if (unlockedActorIds.includes(actorId)) return false;

    const UNLOCK_COST = 200;
    const UNLOCK_AFFECTION = 10;

    if (gold < UNLOCK_COST || zogAffection < UNLOCK_AFFECTION) return false;

    set((s) => {
      const next = {
        ...s,
        gold: s.gold - UNLOCK_COST,
        unlockedActorIds: [...s.unlockedActorIds, actorId],
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  addActorAffection: (actorId: string, amount: number) => {
    set((s) => {
      const next = {
        ...s,
        actorAffection: {
          ...s.actorAffection,
          [actorId]: (s.actorAffection[actorId] ?? 0) + amount,
        },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
  },

  giftActor: (actorId: string, cost: number, affection: number) => {
    const { gold } = get();
    if (gold < cost) return false;
    set((s) => {
      const next = {
        ...s,
        gold: s.gold - cost,
        actorAffection: {
          ...s.actorAffection,
          [actorId]: (s.actorAffection[actorId] ?? 0) + affection,
        },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  addActorSalary: (actorId: string, amount: number) => {
    if (amount <= 0) return;
    set((s) => {
      const next = {
        ...s,
        actorSalary: {
          ...s.actorSalary,
          [actorId]: (s.actorSalary[actorId] ?? 0) + amount,
        },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
  },

  spendActorSalary: (actorId: string, amount: number, purchaseId: string) => {
    const { actorSalary, actorPurchases } = get();
    if ((actorSalary[actorId] ?? 0) < amount) return false;
    if ((actorPurchases[actorId] ?? []).includes(purchaseId)) return false;
    set((s) => {
      const next = {
        ...s,
        actorSalary: {
          ...s.actorSalary,
          [actorId]: (s.actorSalary[actorId] ?? 0) - amount,
        },
        actorPurchases: {
          ...s.actorPurchases,
          [actorId]: [...(s.actorPurchases[actorId] ?? []), purchaseId],
        },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  upgradeEquipment: () => {
    const { gold, fridgeLevel, keyboardLevel } = get();
    const currentLevel = Math.max(fridgeLevel, keyboardLevel);
    if (currentLevel >= 5) return false;
    const cost = EQUIPMENT_UPGRADE_COSTS[currentLevel];
    if (gold < cost) return false;
    set((s) => {
      const nextLevel = Math.max(s.fridgeLevel, s.keyboardLevel) + 1;
      const next = {
        ...s,
        gold: s.gold - cost,
        fridgeLevel: nextLevel,
        keyboardLevel: nextLevel,
        fridgeItemUseLimit: FRIDGE_USES[nextLevel],
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  upgradeFridge: () => get().upgradeEquipment(),

  upgradeKeyboard: () => get().upgradeEquipment(),

  getActorAffinityTier: (actorId: string) => {
    const affection = get().actorAffection[actorId] ?? 0;
    if (affection >= 3000) return 5;
    if (affection >= 1200) return 4;
    if (affection >= 500) return 3;
    if (affection >= 150) return 2;
    return 1;
  },

  setPermanentPrompt: (actorId: string, prompt: string) => {
    const { gold, getActorAffinityTier, actorSalary } = get();
    const tier = getActorAffinityTier(actorId);
    if (tier < 4) return false;
    const actorSalaryBalance = actorSalary[actorId] ?? 0;
    if (gold < PERMANENT_PROMPT_COST_G || actorSalaryBalance < PERMANENT_PROMPT_COST_S) return false;
    set((s) => {
      const next = {
        ...s,
        gold: s.gold - PERMANENT_PROMPT_COST_G,
        actorSalary: { ...s.actorSalary, [actorId]: (s.actorSalary[actorId] ?? 0) - PERMANENT_PROMPT_COST_S },
        actorPermanentPrompts: { ...s.actorPermanentPrompts, [actorId]: prompt.slice(0, 30) },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  modifyPermanentPrompt: (actorId: string, prompt: string) => {
    const { gold, actorSalary } = get();
    const actorSalaryBalance = actorSalary[actorId] ?? 0;
    if (gold < PERMANENT_PROMPT_MODIFY_COST_G || actorSalaryBalance < PERMANENT_PROMPT_COST_S) return false;
    set((s) => {
      const next = {
        ...s,
        gold: s.gold - PERMANENT_PROMPT_MODIFY_COST_G,
        actorSalary: { ...s.actorSalary, [actorId]: (s.actorSalary[actorId] ?? 0) - PERMANENT_PROMPT_COST_S },
        actorPermanentPrompts: { ...s.actorPermanentPrompts, [actorId]: prompt.slice(0, 30) },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  clearPermanentPrompt: (actorId: string) => {
    const { gold } = get();
    if (gold < PERMANENT_PROMPT_CLEAR_COST_G) return false;
    const { spendGold } = get();
    if (!spendGold(PERMANENT_PROMPT_CLEAR_COST_G)) return false;
    set((s) => {
      const next = { ...s };
      delete next.actorPermanentPrompts[actorId];
      next.actorPermanentPrompts = { ...next.actorPermanentPrompts };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  addActorContractShard: (actorId: string, amount: number) => {
    const actorExists = DEFAULT_ROSTER.some((actor) => actor.actorId === actorId);
    const safeAmount = Math.max(0, Math.floor(amount));
    if (!actorExists || safeAmount <= 0) return;
    set((s) => {
      const next = {
        ...s,
        actorContractShards: {
          ...s.actorContractShards,
          [actorId]: (s.actorContractShards[actorId] ?? 0) + safeAmount,
        },
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
  },

  unlockActorByShards: (actorId: string) => {
    const actorExists = DEFAULT_ROSTER.some((actor) => actor.actorId === actorId);
    const { actorContractShards, unlockedActorIds } = get();
    if (!actorExists || isActorUnlocked(actorId, unlockedActorIds)) return false;
    if ((actorContractShards[actorId] ?? 0) < ACTOR_SHARDS_TO_UNLOCK) return false;

    set((s) => {
      const nextShardCount = (s.actorContractShards[actorId] ?? 0) - ACTOR_SHARDS_TO_UNLOCK;
      const nextShards = { ...s.actorContractShards, [actorId]: nextShardCount };
      if (nextShardCount <= 0) {
        delete nextShards[actorId];
      }
      const next = {
        ...s,
        actorContractShards: nextShards,
        unlockedActorIds: [...s.unlockedActorIds, actorId],
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
  },

  pullActorGacha: (count: ActorGachaPullCount) => {
    const cost = getActorGachaCost(count);
    const { gold, gachaPullCount, gachaShardPityCount, unlockedActorIds } = get();
    if (gold < cost) return null;

    const roll = rollActorGacha(count, { gachaPullCount, gachaShardPityCount }, unlockedActorIds);

    set((s) => {
      const nextUnlockedActorIds = [...s.unlockedActorIds];
      const nextInventory = { ...s.inventory };
      const nextZogGiftInventory = { ...s.zogGiftInventory };
      const nextActorAffection = { ...s.actorAffection };
      const nextActorSalary = { ...s.actorSalary };
      const nextActorContractShards = { ...s.actorContractShards };
      let nextGold = s.gold - cost;

      for (const result of roll.results) {
        switch (result.kind) {
          case 'DIRECT_CONTRACT': {
            if (!result.actorId) break;
            if (!isActorUnlocked(result.actorId, nextUnlockedActorIds)) {
              nextUnlockedActorIds.push(result.actorId);
              break;
            }
            const shardAmount = result.shardAmount && result.shardAmount > 0 ? result.shardAmount : 5;
            nextActorContractShards[result.actorId] =
              (nextActorContractShards[result.actorId] ?? 0) + shardAmount;
            break;
          }
          case 'ACTOR_SHARD': {
            if (!result.actorId || !result.shardAmount) break;
            nextActorContractShards[result.actorId] =
              (nextActorContractShards[result.actorId] ?? 0) + result.shardAmount;
            break;
          }
          case 'BATTLE_ITEM': {
            if (!result.itemId) break;
            nextInventory[result.itemId] = (nextInventory[result.itemId] ?? 0) + (result.amount ?? 1);
            break;
          }
          case 'ZOG_GIFT': {
            if (!result.giftId) break;
            nextZogGiftInventory[result.giftId] =
              (nextZogGiftInventory[result.giftId] ?? 0) + (result.amount ?? 1);
            break;
          }
          case 'ACTOR_AFFECTION': {
            if (!result.actorId || !result.amount) break;
            nextActorAffection[result.actorId] = (nextActorAffection[result.actorId] ?? 0) + result.amount;
            break;
          }
          case 'ACTOR_SALARY': {
            if (!result.actorId || !result.amount) break;
            nextActorSalary[result.actorId] = (nextActorSalary[result.actorId] ?? 0) + result.amount;
            break;
          }
          case 'GOLD_REFUND': {
            nextGold += result.goldAmount ?? 0;
            break;
          }
        }
      }

      const next = {
        ...s,
        gold: nextGold,
        inventory: nextInventory,
        zogGiftInventory: nextZogGiftInventory,
        actorAffection: nextActorAffection,
        actorSalary: nextActorSalary,
        actorContractShards: nextActorContractShards,
        unlockedActorIds: nextUnlockedActorIds,
        gachaPullCount: roll.nextPullCount,
        gachaShardPityCount: roll.nextShardPityCount,
        lastGachaResults: roll.results,
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });

    return roll.results;
  },

  buyRandomActorShard: () => {
    const { gold, randomShardPurchaseCount } = get();
    const cost = getRandomActorShardPurchaseCost(randomShardPurchaseCount);
    if (gold < cost) return null;

    const result = rollRandomActorShardPurchase(randomShardPurchaseCount);
    if (!result.actorId || !result.shardAmount) return null;

    set((s) => {
      const next = {
        ...s,
        gold: s.gold - cost,
        actorContractShards: {
          ...s.actorContractShards,
          [result.actorId!]: (s.actorContractShards[result.actorId!] ?? 0) + result.shardAmount!,
        },
        randomShardPurchaseCount: s.randomShardPurchaseCount + 1,
        lastGachaResults: [result],
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });

    return result;
  },

  trainActorPotential: (actorId: string) => {
    const { actorContractShards, actorPotential, unlockedActorIds } = get();
    const actorExists = DEFAULT_ROSTER.some((actor) => actor.actorId === actorId);
    if (!actorExists || !isActorUnlocked(actorId, unlockedActorIds)) return null;
    if ((actorContractShards[actorId] ?? 0) < ACTOR_POTENTIAL_TRAIN_SHARD_COST) return null;

    const result = rollActorPotentialTraining(actorPotential[actorId]);

    set((s) => {
      const nextShardCount = (s.actorContractShards[actorId] ?? 0) - ACTOR_POTENTIAL_TRAIN_SHARD_COST;
      const nextShards = { ...s.actorContractShards, [actorId]: nextShardCount };
      if (nextShardCount <= 0) {
        delete nextShards[actorId];
      }

      const next = {
        ...s,
        actorContractShards: nextShards,
        actorPotential: {
          ...s.actorPotential,
          [actorId]: result.nextPotential,
        },
        actorSalary: result.salaryReward
          ? { ...s.actorSalary, [actorId]: (s.actorSalary[actorId] ?? 0) + result.salaryReward }
          : s.actorSalary,
        actorAffection: result.affectionReward
          ? { ...s.actorAffection, [actorId]: (s.actorAffection[actorId] ?? 0) + result.affectionReward }
          : s.actorAffection,
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });

    return result;
  },

  // 客厅聊天
  chatMessages: [],
  isZogTyping: false,

  sendChat: async (message: string) => {
    const { chatMessages, zogAffection } = get();
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    set((s) => ({ ...s, chatMessages: [...s.chatMessages, userMsg], isZogTyping: true }));

    try {
      const { createZogLoungeProvider } = await import('../../llm/zogLoungeProvider');
      const response = await createZogLoungeProvider({
        systemPrompt: buildZogLoungeSystemPrompt(zogAffection),
      }).chat(message, chatMessages);
      const zogMsg: ChatMessage = { role: 'zog', content: response, timestamp: Date.now() };
      set((s) => ({ ...s, chatMessages: [...s.chatMessages, zogMsg], isZogTyping: false }));
    } catch (err) {
      const errorMsg: ChatMessage = { role: 'zog', content: `喂，信号坏了。不是我咬的。(${err})`, timestamp: Date.now() };
      set((s) => ({ ...s, chatMessages: [...s.chatMessages, errorMsg], isZogTyping: false }));
    }
  },

  clearChat: () => set((s) => ({ ...s, chatMessages: [], isZogTyping: false })),
}));
