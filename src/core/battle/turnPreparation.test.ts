import { describe, expect, it } from 'vitest';
import type { ActorCombatState } from './types';
import { accumulateActorReadiness } from './turnPreparation';

function makeActor(overrides: Partial<ActorCombatState> = {}): ActorCombatState {
  return {
    actorId: 'test_actor',
    name: 'Test Actor',
    maxHP: 100,
    currentHP: 80,
    ATK: 10,
    DEF: 5,
    SPD: 8,
    baseThreat: 50,
    currentThreat: 50,
    isAlive: true,
    statuses: [],
    initiative: 0,
    spotlightDebt: 0,
    scene: { dodosControlled: 0, dodoTrust: 0, nestInfluence: 0 },
    stats: {
      damageDealt: 0,
      damageTaken: 0,
      actionsTaken: 0,
      dodosGained: 0,
      dodosLost: 0,
      directorBroadcastReactedCount: 0,
    },
    ...overrides,
  };
}

describe('turnPreparation', () => {
  describe('accumulateActorReadiness', () => {
    it('adds SPD*10 to initiative for alive actors', () => {
      const actors = [makeActor({ SPD: 8, initiative: 0 })];
      const result = accumulateActorReadiness(actors);
      expect(result[0].initiative).toBe(80);
    });

    it('adds 6 to spotlightDebt for alive actors', () => {
      const actors = [makeActor({ spotlightDebt: 0 })];
      const result = accumulateActorReadiness(actors);
      expect(result[0].spotlightDebt).toBe(6);
    });

    it('does not mutate dead actors', () => {
      const actors = [makeActor({ isAlive: false, initiative: 100, spotlightDebt: 10 })];
      const result = accumulateActorReadiness(actors);
      expect(result[0].initiative).toBe(100);
      expect(result[0].spotlightDebt).toBe(10);
    });

    it('accumulates across multiple calls', () => {
      const actors = [makeActor({ SPD: 5, initiative: 0, spotlightDebt: 0 })];
      const first = accumulateActorReadiness(actors);
      const second = accumulateActorReadiness(first);
      expect(second[0].initiative).toBe(100); // 50 + 50
      expect(second[0].spotlightDebt).toBe(12); // 6 + 6
    });

    it('handles multiple actors', () => {
      const actors = [
        makeActor({ actorId: 'a', SPD: 10, initiative: 0, spotlightDebt: 0 }),
        makeActor({ actorId: 'b', SPD: 3, initiative: 0, spotlightDebt: 0 }),
      ];
      const result = accumulateActorReadiness(actors);
      expect(result.find((a) => a.actorId === 'a')?.initiative).toBe(100);
      expect(result.find((a) => a.actorId === 'b')?.initiative).toBe(30);
    });
  });
});
