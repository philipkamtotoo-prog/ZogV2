import { describe, expect, it } from 'vitest';
import { calculateFinalScores } from './finalScore';
import { createInitialBattleState } from './initialState';
import type { BattleEvent } from './types';

describe('finalScore', () => {
  it('awards kill score to the eliminator, not the eliminated actor', () => {
    const state = createInitialBattleState('kill_score_test', 2);
    const killer = state.actors[0];
    const victim = state.actors[1];

    const eliminationEvent: BattleEvent = {
      eventId: 'evt_elim',
      actorActionIndex: 3,
      type: 'ACTOR_ELIMINATED',
      activeActorId: killer.actorId,
      targetActorId: victim.actorId,
      diffs: [],
      tags: ['ELIMINATION'],
      createdAt: 0,
    };

    const scores = calculateFinalScores(state.actors, [eliminationEvent]);
    const killerScore = scores.find((s) => s.actorId === killer.actorId)!;
    const victimScore = scores.find((s) => s.actorId === victim.actorId)!;

    expect(killerScore.breakdown.killScore).toBe(50);
    expect(victimScore.breakdown.killScore).toBe(0);
  });
});
