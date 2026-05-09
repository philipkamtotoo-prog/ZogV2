export interface RosterActor {
  actorId: string;
  name: string;
  title: string;
  bio: string;
  baseHP: number;
  baseThreat: number;
  baseATK: number;
  baseDEF: number;
  baseSPD: number;
  defaultUnlocked: boolean;
  affection: number;
  unlockCost: number;
  unlockAffection: number;
}

export const DEFAULT_ROSTER: RosterActor[] = [
  {
    actorId: 'tdog',
    name: 'T-Dog',
    title: 'Cynical philosophy dog',
    bio: 'Sharp-tongued, easy to hate, somehow still watchable.',
    baseHP: 110, baseThreat: 22, baseATK: 18, baseDEF: 8, baseSPD: 6,
    defaultUnlocked: true, affection: 0, unlockCost: 0, unlockAffection: 0,
  },
  {
    actorId: 'cybercat',
    name: 'Cybercat',
    title: 'Fast cyber cat',
    bio: 'High speed, high attack, high chance of becoming everyone else’s problem.',
    baseHP: 90, baseThreat: 24, baseATK: 21, baseDEF: 5, baseSPD: 9,
    defaultUnlocked: true, affection: 0, unlockCost: 0, unlockAffection: 0,
  },
  {
    actorId: 'nanobot',
    name: 'Nanobot',
    title: 'Tiny defensive machine',
    bio: 'Low-key, stubborn, and hard to remove from the island.',
    baseHP: 75, baseThreat: 10, baseATK: 14, baseDEF: 12, baseSPD: 7,
    defaultUnlocked: true, affection: 0, unlockCost: 0, unlockAffection: 0,
  },
  {
    actorId: 'dodo_bishop',
    name: 'Dodo Bishop',
    title: 'Priest of questionable birds',
    bio: 'Thick HP, stable defense, excessive confidence in nests.',
    baseHP: 120, baseThreat: 12, baseATK: 12, baseDEF: 10, baseSPD: 4,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'glitch_witch',
    name: 'Glitch Witch',
    title: 'Dangerous error witch',
    bio: 'High damage and high risk, like a lawsuit with a hat.',
    baseHP: 80, baseThreat: 28, baseATK: 22, baseDEF: 4, baseSPD: 8,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'astro_toad',
    name: 'Astro Toad',
    title: 'Slow space toad',
    bio: 'Huge HP, slow action, cosmic confidence.',
    baseHP: 130, baseThreat: 8, baseATK: 10, baseDEF: 9, baseSPD: 3,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'sofa_mimic',
    name: 'Sofa Mimic',
    title: 'Furniture-shaped survivor',
    bio: 'Very hard to remove. Very easy to underestimate.',
    baseHP: 115, baseThreat: 6, baseATK: 15, baseDEF: 11, baseSPD: 2,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'neon_crab',
    name: 'Neon Crab',
    title: 'Balanced glowing crab',
    bio: 'A stable bet, unless the island remembers it has claws.',
    baseHP: 100, baseThreat: 18, baseATK: 17, baseDEF: 9, baseSPD: 5,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'blob_accountant',
    name: 'Blob Bob',
    title: 'Gelatinous accountant',
    bio: 'High defense, low threat, counts every humiliating incident.',
    baseHP: 95, baseThreat: 4, baseATK: 13, baseDEF: 13, baseSPD: 4,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'tian_yake',
    name: '天涯客',
    title: 'Suspiciously handsome wanderer',
    bio: 'Beautiful, strong, and doomed to be noticed.',
    baseHP: 85, baseThreat: 30, baseATK: 20, baseDEF: 7, baseSPD: 10,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
];

export function getUnlockedActors(extraUnlockedIds: string[] = []): RosterActor[] {
  return DEFAULT_ROSTER.filter((a) => a.defaultUnlocked || extraUnlockedIds.includes(a.actorId));
}

export function getLockedActors(extraUnlockedIds: string[] = []): RosterActor[] {
  return DEFAULT_ROSTER.filter((a) => !a.defaultUnlocked && !extraUnlockedIds.includes(a.actorId));
}

export function calculatePreBattlePower(actor: {
  maxHP?: number;
  baseHP?: number;
  baseATK: number;
  baseDEF: number;
  baseSPD: number;
  baseThreat: number;
}): number {
  const hp = actor.baseHP ?? actor.maxHP ?? 100;
  return hp + actor.baseATK * 3 + actor.baseDEF * 5 + actor.baseSPD * 4 - actor.baseThreat * 2;
}
