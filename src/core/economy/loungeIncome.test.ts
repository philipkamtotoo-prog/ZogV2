import { describe, it, expect } from 'vitest';
import { calculateIdleIncome, getMaxIdleMinutes, getZogAffectionTier } from './loungeIncome';

describe('loungeIncome', () => {
  it('returns 0 for 0 minutes', () => {
    const result = calculateIdleIncome(0);
    expect(result.goldEarned).toBe(0);
    expect(result.capped).toBe(false);
  });

  it('earns gold proportional to minutes at Lv1 rate (2 G/min)', () => {
    // Lv1 = 2 G/min
    const result = calculateIdleIncome(30, 0);
    expect(result.goldEarned).toBe(60);
    expect(result.minutes).toBe(30);
    expect(result.capped).toBe(false);
  });

  it('caps at max idle minutes', () => {
    const max = getMaxIdleMinutes();
    // Lv1 rate = 2, capped at 120 min -> 240 gold
    const result = calculateIdleIncome(max + 100, 0);
    expect(result.goldEarned).toBe(max * 2);
    expect(result.capped).toBe(true);
    expect(result.minutes).toBe(max);
  });

  it('getZogAffectionTier returns correct tier', () => {
    expect(getZogAffectionTier(0)).toBe(1);
    expect(getZogAffectionTier(100)).toBe(2);
    expect(getZogAffectionTier(300)).toBe(3);
    expect(getZogAffectionTier(700)).toBe(4);
    expect(getZogAffectionTier(1500)).toBe(5);
  });
});
