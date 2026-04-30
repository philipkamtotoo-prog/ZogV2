import { describe, it, expect } from 'vitest';
import { runBattleSimulation } from '../../engine/battleSimulation';
import { createStubActorBrainProvider } from '../../llm/stubActorBrainProvider';

describe('battleSimulation', () => {
  it('runs a full battle and produces a winner', async () => {
    const result = await runBattleSimulation({
      battleSeed: 'test_seed_001',
      actorCount: 3,
      maxActions: 20,
      actorBrainProvider: createStubActorBrainProvider(),
    });

    expect(result.battleState.phase).toBe('FINAL_REPORT');
    expect(result.finalScores.length).toBe(3);
    expect(result.eventCount).toBeGreaterThan(0);

    const winner = result.finalScores.find((s) => s.isWinner);
    expect(winner).toBeDefined();
  });

  it('deterministic: same seed produces same result', async () => {
    const opts = {
      battleSeed: 'determinism_test',
      actorCount: 3,
      maxActions: 15,
      actorBrainProvider: createStubActorBrainProvider(),
    };

    const r1 = await runBattleSimulation(opts);
    const r2 = await runBattleSimulation(opts);

    expect(r1.finalScores.map((s) => s.actorId)).toEqual(r2.finalScores.map((s) => s.actorId));
    expect(r1.finalScores.map((s) => s.finalScore)).toEqual(r2.finalScores.map((s) => s.finalScore));
    expect(r1.eventCount).toBe(r2.eventCount);
  });

  it('respects maxActions limit', async () => {
    const result = await runBattleSimulation({
      battleSeed: 'max_actions_test',
      actorCount: 5,
      maxActions: 5,
      actorBrainProvider: createStubActorBrainProvider(),
    });

    expect(result.battleState.actorActionIndex).toBeLessThanOrEqual(5);
  });
});
