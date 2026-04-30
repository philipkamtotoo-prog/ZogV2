import { describe, it, expect } from 'vitest';
import { begZogForGold, getBegCooldownMs } from './begging';

describe('begging', () => {
  it('returns a deterministic result for same seed and index', () => {
    const r1 = begZogForGold('seed1', 0);
    const r2 = begZogForGold('seed1', 0);
    expect(r1.gold).toBe(r2.gold);
    expect(r1.message).toBe(r2.message);
    expect(r1.zogMood).toBe(r2.zogMood);
  });

  it('returns different results for different indices', () => {
    const results = Array.from({ length: 10 }, (_, i) => begZogForGold('beg_test', i));
    const golds = new Set(results.map((r) => r.gold));
    expect(golds.size).toBeGreaterThan(1);
  });

  it('gold is always >= 0', () => {
    for (let i = 0; i < 20; i++) {
      const r = begZogForGold(`test_${i}`, i);
      expect(r.gold).toBeGreaterThanOrEqual(0);
    }
  });

  it('has a positive cooldown', () => {
    expect(getBegCooldownMs()).toBeGreaterThan(0);
  });
});
