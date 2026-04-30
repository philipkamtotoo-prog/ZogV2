export interface RosterActor {
  actorId: string;
  name: string;
  title: string;
  bio: string;
  baseHP?: number;
  baseThreat: number;
  baseATK: number;
  baseDEF: number;
  baseSPD: number;
  defaultUnlocked: boolean;
  affection: number;
  unlockCost: number;
  unlockAffection: number;
}

/**
 * 10名首发演员，数值对齐文档11.2节。
 * preBattlePower = HP + ATK*3 + DEF*5 + SPD*4 - THREAT*2（仅用于赔率，不用于战斗）
 */
export const DEFAULT_ROSTER: RosterActor[] = [
  {
    actorId: 'actor_tdog',
    name: 'T-Dog',
    title: '愤世嫉俗的哲学狗',
    bio: '嘴狠但容易拉仇恨，节目里的常客。',
    baseHP: 110, baseThreat: 22, baseATK: 18, baseDEF: 8, baseSPD: 6,
    defaultUnlocked: true, affection: 0, unlockCost: 0, unlockAffection: 0,
  },
  {
    actorId: 'actor_cybercat',
    name: 'Cybercat',
    title: '赛博猫',
    bio: '速度极快、攻击极高，但很招打。',
    baseHP: 90, baseThreat: 24, baseATK: 21, baseDEF: 5, baseSPD: 9,
    defaultUnlocked: true, affection: 0, unlockCost: 0, unlockAffection: 0,
  },
  {
    actorId: 'actor_nanobot',
    name: 'Nanobot',
    title: '纳米机器人',
    bio: '防御高、低调、稳定。',
    baseHP: 75, baseThreat: 10, baseATK: 14, baseDEF: 12, baseSPD: 7,
    defaultUnlocked: true, affection: 0, unlockCost: 0, unlockAffection: 0,
  },
  {
    actorId: 'actor_dodo_bishop',
    name: 'Dodo Bishop',
    title: '渡渡鸟神父',
    bio: '血厚、防御稳定。',
    baseHP: 120, baseThreat: 12, baseATK: 12, baseDEF: 10, baseSPD: 4,
    defaultUnlocked: true, affection: 0, unlockCost: 0, unlockAffection: 0,
  },
  {
    actorId: 'actor_glitch_witch',
    name: 'Glitch Witch',
    title: '故障女巫',
    bio: '高攻击、高风险。',
    baseHP: 80, baseThreat: 28, baseATK: 22, baseDEF: 4, baseSPD: 8,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'actor_astro_toad',
    name: 'Astro Toad',
    title: '宇航蛤蟆',
    bio: '血厚但行动慢。',
    baseHP: 130, baseThreat: 8, baseATK: 10, baseDEF: 9, baseSPD: 3,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'actor_sofa_mimic',
    name: 'Sofa Mimic',
    title: '沙发拟态怪',
    bio: '极能苟，速度很慢。',
    baseHP: 115, baseThreat: 6, baseATK: 15, baseDEF: 11, baseSPD: 2,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'actor_neon_crab',
    name: 'Neon Crab',
    title: '霓虹螃蟹',
    bio: '均衡型，适合新手押注。',
    baseHP: 100, baseThreat: 18, baseATK: 17, baseDEF: 9, baseSPD: 5,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'actor_blob_accountant',
    name: 'Blob Accountant',
    title: '果冻会计',
    bio: '防御强、威胁低。',
    baseHP: 95, baseThreat: 4, baseATK: 13, baseDEF: 13, baseSPD: 4,
    defaultUnlocked: false, affection: 0, unlockCost: 200, unlockAffection: 10,
  },
  {
    actorId: 'actor_tian_yake',
    name: '天涯客',
    title: '很帅的一个男人',
    bio: '美强惨，会被怜爱。',
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

/**
 * 赛前综合战力，仅用于赔率生成（文档9.3节）
 * preBattlePower = HP + ATK*3 + DEF*5 + SPD*4 - THREAT*2
 */
export function calculatePreBattlePower(actor: { maxHP?: number; baseHP?: number; baseATK: number; baseDEF: number; baseSPD: number; baseThreat: number }): number {
  const hp = actor.baseHP ?? actor.maxHP ?? 100;
  return hp + actor.baseATK * 3 + actor.baseDEF * 5 + actor.baseSPD * 4 - actor.baseThreat * 2;
}
