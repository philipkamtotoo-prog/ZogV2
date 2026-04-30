import { describe, it, expect } from 'vitest';
import { extractBattleReport } from './finalReport';
import { runBattleSimulation } from '../../engine/battleSimulation';
import { createStubActorBrainProvider } from '../../llm/stubActorBrainProvider';

describe('finalReport', () => {
  it('extracts a valid report from a completed battle', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'report_test',
      actorCount: 3,
      maxActions: 15,
      actorBrainProvider: createStubActorBrainProvider(),
    });

    const report = extractBattleReport(sim.battleState);

    expect(report.reportId).toContain('report_');
    expect(report.battleId).toBeTruthy();
    expect(report.title).toBeTruthy();
    expect(report.summary).toBeTruthy();
    expect(report.rankings.length).toBe(3);
    expect(report.totalActions).toBeGreaterThan(0);
    expect(report.totalEvents).toBeGreaterThan(0);
  });

  it('identifies winner and MVP', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'winner_test',
      actorCount: 3,
      maxActions: 20,
      actorBrainProvider: createStubActorBrainProvider(),
    });

    const report = extractBattleReport(sim.battleState);

    expect(report.winner).not.toBeNull();
    expect(report.mvp).not.toBeNull();
  });

  it('records elimination order matching dead actors', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'elim_test_seed',
      actorCount: 5,
      maxActions: 40,
      actorBrainProvider: createStubActorBrainProvider(),
    });

    const report = extractBattleReport(sim.battleState);
    const elimEvents = sim.battleState.eventLog.filter((e) => e.type === 'ACTOR_ELIMINATED');
    expect(report.eliminationOrder.length).toBe(elimEvents.length);
  });
});
