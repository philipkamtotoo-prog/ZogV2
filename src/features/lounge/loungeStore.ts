import { create } from 'zustand';
import { calculateIdleIncome } from '../../core/economy/loungeIncome';
import { begZogForGold, getBegCooldownMs } from '../../core/economy/begging';
import type { ItemId } from '../../core/economy/items';

interface LoungeState {
  gold: number;
  zogAffection: number;
  inventory: Record<string, number>;
  lastActiveTime: number;
  begAttempts: number;
  lastBegTime: number;
  begMessage: string | null;
  unlockedActorIds: string[];
  fridgeItemUseLimit: number;
  /** 演员好感：actorId -> affection points（文档7.1节） */
  actorAffection: Record<string, number>;
}

interface LoungeStore extends LoungeState {
  collectIdleIncome: () => { goldEarned: number; capped: boolean };
  beg: () => void;
  canBeg: () => boolean;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  addItem: (itemId: ItemId) => void;
  removeItem: (itemId: ItemId) => boolean;
  giftZog: (cost: number) => boolean;
  updateLastActiveTime: () => void;
  unlockActor: (actorId: string) => boolean;
  addActorAffection: (actorId: string, amount: number) => void;
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
    lastActiveTime: s.lastActiveTime,
    begAttempts: s.begAttempts,
    lastBegTime: s.lastBegTime,
    begMessage: s.begMessage,
    unlockedActorIds: s.unlockedActorIds,
    fridgeItemUseLimit: s.fridgeItemUseLimit,
    actorAffection: s.actorAffection,
  };
}

const defaults: LoungeState = {
  gold: 100,
  zogAffection: 0,
  inventory: {},
  lastActiveTime: Date.now(),
  begAttempts: 0,
  lastBegTime: 0,
  begMessage: null,
  unlockedActorIds: [],
  fridgeItemUseLimit: 3,
  actorAffection: {},
};

const saved = loadState();

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
        zogAffection: result.zogMood === 'ANNOYED'
          ? Math.max(0, s.zogAffection - 1)
          : s.zogAffection,
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

  giftZog: (cost) => {
    const { gold } = get();
    if (gold < cost) return false;
    set((s) => {
      const next = {
        ...s,
        gold: s.gold - cost,
        zogAffection: s.zogAffection + Math.ceil(cost / 10),
      };
      saveState(pickState(next as LoungeStore));
      return next;
    });
    return true;
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
}));
