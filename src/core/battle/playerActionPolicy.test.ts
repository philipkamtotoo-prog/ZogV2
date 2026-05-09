import { describe, expect, it } from 'vitest';
import { createInitialBattleState } from './initialState';
import { validateItemUse } from './playerActionPolicy';

describe('playerActionPolicy', () => {
  describe('validateItemUse', () => {
    it('returns invalid when battle phase is not RUNNING', () => {
      const state = createInitialBattleState('test', 2);
      state.phase = 'PREPARING';
      const result = validateItemUse(state, 'HEAL_SMALL', state.actors[0].actorId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Battle not running');
    });

    it('returns invalid for unknown item', () => {
      const state = createInitialBattleState('test', 2);
      state.phase = 'RUNNING';
      const result = validateItemUse(state, 'UNKNOWN_ITEM' as any, state.actors[0].actorId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Unknown item');
    });

    it('returns invalid when actor not found', () => {
      const state = createInitialBattleState('test', 2);
      state.phase = 'RUNNING';
      const result = validateItemUse(state, 'HEAL_SMALL', 'nonexistent_actor');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Actor not found');
    });

    it('returns invalid when actor is dead', () => {
      const state = createInitialBattleState('test', 2);
      state.phase = 'RUNNING';
      state.actors[0].isAlive = false;
      const result = validateItemUse(state, 'HEAL_SMALL', state.actors[0].actorId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Actor is dead');
    });

    it('returns invalid when no item uses remaining', () => {
      const state = createInitialBattleState('test', 2, undefined, 0);
      state.phase = 'RUNNING';
      const result = validateItemUse(state, 'HEAL_SMALL', state.actors[0].actorId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No uses remaining');
    });

    it('returns invalid when actor was already healed this action interval', () => {
      const state = createInitialBattleState('test', 2);
      state.phase = 'RUNNING';
      state.actorActionIndex = 5;
      state.actors[0].lastHealedAtActorActionIndex = 5; // same action index
      const result = validateItemUse(state, 'HEAL_SMALL', state.actors[0].actorId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Actor was already healed this action interval');
    });

    it('returns valid when all checks pass', () => {
      const state = createInitialBattleState('test', 2, undefined, 1);
      state.phase = 'RUNNING';
      const result = validateItemUse(state, 'HEAL_SMALL', state.actors[0].actorId);
      expect(result.valid).toBe(true);
    });

    it('allows healing after different action interval', () => {
      const state = createInitialBattleState('test', 2, undefined, 1);
      state.phase = 'RUNNING';
      state.actorActionIndex = 5;
      state.actors[0].lastHealedAtActorActionIndex = 3;
      const result = validateItemUse(state, 'HEAL_SMALL', state.actors[0].actorId);
      expect(result.valid).toBe(true);
    });

    it('allows non-heal items without lastHealedAtActorActionIndex check', () => {
      const state = createInitialBattleState('test', 2, undefined, 1);
      state.phase = 'RUNNING';
      // SHIELD_GRANT has healAmount too
      const result = validateItemUse(state, 'SHIELD_GRANT', state.actors[0].actorId);
      expect(result.valid).toBe(true);
    });
  });
});