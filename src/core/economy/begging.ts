import { seededRng } from '../battle/rng';

const COOLDOWN_MS = 600_000; // 10分钟（文档3.3节）

/**
 * Zog好感等级对应的乞讨收益范围（文档3.3节）
 * Lv1: 20-40, Lv2: 35-60, Lv3: 55-85, Lv4: 80-120, Lv5: 120-180
 */
const BEG_RANGES: Record<number, [number, number]> = {
  1: [20, 40],
  2: [35, 60],
  3: [55, 85],
  4: [80, 120],
  5: [120, 180],
};

export interface BegResult {
  gold: number;
  message: string;
  zogMood: 'HAPPY' | 'NEUTRAL' | 'ANNOYED';
}

function getZogAffectionTier(zogAffection: number): number {
  if (zogAffection >= 1500) return 5;
  if (zogAffection >= 700) return 4;
  if (zogAffection >= 300) return 3;
  if (zogAffection >= 100) return 2;
  return 1;
}

export function begZogForGold(seed: string, attemptIndex: number, zogAffection: number = 0): BegResult {
  const roll = seededRng(seed, attemptIndex, 'begging');
  const tier = getZogAffectionTier(zogAffection);
  const [minGold, maxGold] = BEG_RANGES[tier] ?? [20, 40];

  if (roll < 0.1) {
    return {
      gold: maxGold,
      message: 'Zog大方地扔了一把金币给你！',
      zogMood: 'HAPPY',
    };
  }

  if (roll < 0.5) {
    const gold = minGold + Math.floor(roll * (maxGold - minGold));
    return {
      gold,
      message: `Zog不情愿地给了你${gold}金币。`,
      zogMood: 'NEUTRAL',
    };
  }

  if (roll < 0.85) {
    return {
      gold: minGold,
      message: 'Zog翻了个白眼，丢给你一枚金币。',
      zogMood: 'ANNOYED',
    };
  }

  return {
    gold: 0,
    message: 'Zog假装没听见。',
    zogMood: 'NEUTRAL',
  };
}

export function getBegCooldownMs(): number {
  return COOLDOWN_MS;
}
