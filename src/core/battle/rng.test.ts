import { describe, it, expect } from 'vitest';
import { seededRng, clamp, randomInt } from './rng';

describe('seededRng', () => {
  it('should produce deterministic results', () => {
    const result1 = seededRng('seed123', 0, 'test');
    const result2 = seededRng('seed123', 0, 'test');
    expect(result1).toBe(result2);
  });

  it('should produce different results for different indices', () => {
    const result0 = seededRng('seed123', 0, 'test');
    const result1 = seededRng('seed123', 1, 'test');
    expect(result0).not.toBe(result1);
  });
});

describe('clamp', () => {
  it('should clamp values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('randomInt', () => {
  it('should produce deterministic integers in range', () => {
    const result = randomInt('seed123', 0, 'test', 1, 10);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(10);
  });
});
