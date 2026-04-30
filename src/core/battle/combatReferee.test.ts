import { describe, expect, it } from 'vitest';
import { combatRefereeCommit } from './combatReferee';
import { createInitialBattleState } from './initialState';

describe('combatReferee', () => {
  it('supplements STEAL_DODOS from wild dodos when the target has fewer than five', () => {
    const state = createInitialBattleState('steal_wild_test', 2);
    state.phase = 'RUNNING';
    state.scene.wildDodos = 10;
    state.actors[0].scene.dodosControlled = 0;
    state.actors[1].scene.dodosControlled = 1;

    const result = combatRefereeCommit(state, {
      battleId: state.battleId,
      stateVersion: state.stateVersion,
      actorActionIndex: 0,
      activeActorId: state.actors[0].actorId,
      lockedTargetId: state.actors[1].actorId,
      actionType: 'STEAL_DODOS',
      actorBrainOutput: {
        actorId: state.actors[0].actorId,
        actionType: 'STEAL_DODOS',
        line: 'steal',
        actionDescription: 'steal dodos',
        performanceIntent: 'test',
      },
    });

    // 文档：目标有1只，偷1只；补充=min(5-1, 10)=4；总计gain=5
    expect(result.newActors?.[0].scene.dodosControlled).toBe(5);
    expect(result.newActors?.[1].scene.dodosControlled).toBe(0);
    expect(result.sceneDiff.wildDodos).toBe(6);
  });
});
