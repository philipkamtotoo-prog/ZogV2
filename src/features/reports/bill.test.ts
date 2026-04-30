import { describe, it, expect } from 'vitest';
import { calculateEpisodeBill } from './bill';
import { runBattleSimulation } from '../../engine/battleSimulation';
import { createStubActorBrainProvider } from '../../llm/stubActorBrainProvider';
import { calculateFinalScores } from '../../core/battle/finalScore';
import { createBetSlip } from '../../core/economy/betting';

describe('bill', () => {
  it('calculates base viewing reward', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'bill_test',
      actorCount: 3,
      maxActions: 10,
      actorBrainProvider: createStubActorBrainProvider(),
    });
    const scores = calculateFinalScores(sim.battleState.actors, sim.battleState.eventLog);
    const bill = calculateEpisodeBill(sim.battleState, scores, null, 0);

    expect(bill.totalIncome).toBeGreaterThanOrEqual(10);
    expect(bill.netGold).toBeGreaterThan(0);
    expect(bill.lineItems.some((i) => i.label === '观看奖励')).toBe(true);
  });

  it('includes bet payout when winning', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'bet_bill_test',
      actorCount: 3,
      maxActions: 15,
      actorBrainProvider: createStubActorBrainProvider(),
    });
    const scores = calculateFinalScores(sim.battleState.actors, sim.battleState.eventLog);
    const winner = scores.find((s) => s.isWinner)!;

    const bet = createBetSlip(winner.actorId, 50, 2.0);
    const bill = calculateEpisodeBill(sim.battleState, scores, bet, 0);

    expect(bill.lineItems.some((i) => i.label === '押注奖金')).toBe(true);
    expect(bill.lineItems.some((i) => i.label === '下注金额')).toBe(false);
    expect(bill.totalExpense).toBe(0);
  });

  it('does not deduct prepaid bet principal in the settlement bill', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'prepaid_bet_bill_test',
      actorCount: 3,
      maxActions: 40,
      actorBrainProvider: createStubActorBrainProvider(),
    });
    const scores = calculateFinalScores(sim.battleState.actors, sim.battleState.eventLog);
    const winner = scores.find((s) => s.isWinner)!;

    const bet = createBetSlip(winner.actorId, 50, 2.0);
    const bill = calculateEpisodeBill(sim.battleState, scores, bet, 0);

    expect(bill.netGold).toBe(10 + 5 + 100);
  });

  it('deducts item usage cost', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'item_bill',
      actorCount: 3,
      maxActions: 10,
      actorBrainProvider: createStubActorBrainProvider(),
    });
    const scores = calculateFinalScores(sim.battleState.actors, sim.battleState.eventLog);
    const bill = calculateEpisodeBill(sim.battleState, scores, null, 3);

    expect(bill.totalExpense).toBe(45);
  });
});
