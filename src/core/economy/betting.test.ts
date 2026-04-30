import { describe, it, expect } from 'vitest';
import { calculateOdds, createBetSlip, lockBet, calculatePayout } from './betting';
import type { ActorCombatState } from '../battle/types';

/**
 * preBattlePower = HP + ATK*3 + DEF*5 + SPD*4 - THREAT*2
 * 文档赔率: rank1=x1.5, rank2=x2.0, rank3=x2.8, rank4=x3.8, rank5=x5.0
 */
function makeActor(
  id: string,
  hp: number,
  atk: number,
  def: number,
  spd: number,
  threat: number,
  alive = true
): ActorCombatState {
  return {
    actorId: id,
    name: id,
    maxHP: hp,
    currentHP: alive ? hp : 0,
    ATK: atk,
    DEF: def,
    SPD: spd,
    baseThreat: threat,
    currentThreat: threat,
    isAlive: alive,
    statuses: [],
    initiative: spd,
    spotlightDebt: 0,
    scene: { dodosControlled: 0, dodoTrust: 0, nestInfluence: 0 },
    stats: { damageDealt: 0, damageTaken: 0, actionsTaken: 0, dodosGained: 0, dodosLost: 0, directorBroadcastReactedCount: 0 },
  };
}

describe('betting', () => {
  it('odds match rank by preBattlePower - higher power gets rank 1 (x1.5)', () => {
    // Actor a: power = 100 + 18*3 + 8*5 + 6*4 - 22*2 = 100+54+40+24-44 = 174 (rank 1)
    // Actor b: power = 90  + 21*3 + 5*5 + 9*4 - 24*2 = 90+63+20+36-48 = 161 (rank 2)
    const actors = [
      makeActor('a', 100, 18, 8, 6, 22), // rank 1 -> x1.5
      makeActor('b', 90, 21, 5, 9, 24),   // rank 2 -> x2.0
    ];
    expect(calculateOdds(actors[0], actors)).toBe(1.5);
    expect(calculateOdds(actors[1], actors)).toBe(2.0);
  });

  it('lower preBattlePower gets higher odds', () => {
    // Strong actor: 120hp + 12*3 + 10*5 + 4*4 - 12*2 = 120+36+50+16-24 = 198
    // Weak actor:  75hp  + 14*3 + 12*5 + 7*4 - 10*2 = 75+42+60+28-20 = 185
    const actors = [
      makeActor('strong', 120, 12, 10, 4, 12),
      makeActor('weak', 75, 14, 12, 7, 10),
    ];
    const strongOdds = calculateOdds(actors[0], actors);
    const weakOdds = calculateOdds(actors[1], actors);
    expect(strongOdds).toBeLessThan(weakOdds);
  });

  it('dead actors are excluded from odds calculation', () => {
    const actors = [
      makeActor('a', 100, 18, 8, 6, 22),
      makeActor('b', 90, 21, 5, 9, 24, false), // dead
    ];
    // Only alive actor 'a' -> length=1 -> returns 1
    expect(calculateOdds(actors[0], actors)).toBe(1);
  });

  it('createBetSlip and lockBet', () => {
    const bet = createBetSlip('a', 100, 2.5);
    expect(bet.locked).toBe(false);
    const locked = lockBet(bet);
    expect(locked.locked).toBe(true);
  });

  it('calculatePayout returns 0 on loss', () => {
    const bet = createBetSlip('a', 100, 2.5);
    expect(calculatePayout(bet, false)).toBe(0);
  });

  it('calculatePayout returns amount * odds on win', () => {
    const bet = createBetSlip('a', 100, 2.5);
    expect(calculatePayout(bet, true)).toBe(250);
  });
});
