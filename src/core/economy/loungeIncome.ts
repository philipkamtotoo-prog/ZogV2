const MAX_IDLE_MINUTES = 120;

/**
 * Zog好感等级对应的挂机收益（文档3.2节）
 * Lv1=2, Lv2=3, Lv3=4, Lv4=5, Lv5=7 G/分钟
 */
export const IDLE_RATE_BY_AFFECTION: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 7,
};

export function getZogAffectionTier(zogAffection: number): number {
  if (zogAffection >= 1500) return 5;
  if (zogAffection >= 700) return 4;
  if (zogAffection >= 300) return 3;
  if (zogAffection >= 100) return 2;
  return 1;
}

export function getIdleRateForAffection(zogAffection: number): number {
  return IDLE_RATE_BY_AFFECTION[getZogAffectionTier(zogAffection)] ?? 2;
}

export interface IdleIncomeResult {
  minutes: number;
  goldEarned: number;
  capped: boolean;
}

export function calculateIdleIncome(minutesAway: number, zogAffection: number = 0): IdleIncomeResult {
  const effective = Math.min(minutesAway, MAX_IDLE_MINUTES);
  const rate = getIdleRateForAffection(zogAffection);
  const goldEarned = Math.floor(effective * rate);

  return {
    minutes: effective,
    goldEarned,
    capped: minutesAway > MAX_IDLE_MINUTES,
  };
}

export function getIdleRate(): number {
  return 2; // 最低档
}

export function getMaxIdleMinutes(): number {
  return MAX_IDLE_MINUTES;
}
