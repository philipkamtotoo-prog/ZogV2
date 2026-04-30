import { describe, expect, it } from 'vitest';
import { createInitialBattleState } from './initialState';
import { selectActiveActor } from './activeActorSelector';

describe('activeActorSelector', () => {
  it('applies the recent-action penalty when lastActedActionIndex is 0', () => {
    const state = createInitialBattleState('recent_penalty_test', 2);
    const [actedAtZero, other] = state.actors;

    actedAtZero.initiative = 20;
    actedAtZero.currentThreat = 50;
    actedAtZero.spotlightDebt = 0;
    actedAtZero.lastActedActionIndex = 0;

    other.initiative = 19;
    other.currentThreat = 50;
    other.spotlightDebt = 0;

    const selected = selectActiveActor(state.actors, 1, state.battleSeed);

    expect(selected?.actorId).toBe(other.actorId);
  });
});
