import { describe, expect, it } from 'vitest';
import { createInitialBattleState } from './initialState';
import { resolveLockedTarget } from './targetResolver';

describe('targetResolver', () => {
  it('locks a taunted actor onto the living taunt source', () => {
    const state = createInitialBattleState('taunt_target_test', 3);
    const [tauntedActor, tauntSource, highThreatActor] = state.actors;

    tauntedActor.statuses = ['TAUNT_1_ACTION'];
    tauntedActor.tauntedByActorId = tauntSource.actorId;
    highThreatActor.currentThreat = tauntSource.currentThreat + 100;

    const target = resolveLockedTarget(
      tauntedActor,
      state.actors,
      undefined,
      state.actorActionIndex,
      state.battleSeed,
      state.directorBroadcasts
    );

    expect(target?.actorId).toBe(tauntSource.actorId);
  });
});
