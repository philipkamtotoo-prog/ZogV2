import { describe, expect, it } from 'vitest';
import { calculateFinalScores } from '../../core/battle/finalScore';
import { createBetSlip } from '../../core/economy/betting';
import { getItemDef } from '../../core/economy/items';
import { runBattleSimulation } from '../../engine/battleSimulation';
import { createStubActorBrainProvider } from '../../llm/stubActorBrainProvider';
import { calculateEpisodeBill } from './bill';

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
    expect(bill.lineItems.some((i) => i.label === 'Viewing reward')).toBe(true);
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

    expect(bill.lineItems.some((i) => i.label.startsWith('Prepaid bet stake'))).toBe(true);
    expect(bill.lineItems.some((i) => i.label === 'Bet payout')).toBe(true);
    expect(bill.lineItems.some((i) => i.label === 'Bet principal')).toBe(false);
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

  it('does not deduct item usage again in settlement', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'item_bill',
      actorCount: 3,
      maxActions: 10,
      actorBrainProvider: createStubActorBrainProvider(),
    });
    const scores = calculateFinalScores(sim.battleState.actors, sim.battleState.eventLog);
    sim.battleState.usedItemIds = ['HEAL_SMALL', 'HEAL_SMALL', 'HEAL_TINY'];
    const bill = calculateEpisodeBill(sim.battleState, scores, null, 3);

    const smallOilLine = bill.lineItems.find((i) => i.label === `Item stock consumed: ${getItemDef('HEAL_SMALL').name} x2`);
    const coolantLine = bill.lineItems.find((i) => i.label === `Item stock consumed: ${getItemDef('HEAL_TINY').name} x1`);
    expect(smallOilLine?.amount).toBe(160);
    expect(smallOilLine?.appliedToSettlement).toBe(false);
    expect(coolantLine?.amount).toBe(45);
    expect(bill.totalExpense).toBe(0);
  });

  it('shows actor salary and relationship changes without mixing them into gold settlement', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'salary_relationship_bill',
      actorCount: 3,
      maxActions: 10,
      actorBrainProvider: createStubActorBrainProvider(),
    });
    const scores = calculateFinalScores(sim.battleState.actors, sim.battleState.eventLog);
    const supported = scores[0];
    const bet = createBetSlip(supported.actorId, 50, 2.0);
    const bill = calculateEpisodeBill(sim.battleState, scores, bet, 0);

    expect(bill.lineItems.some((i) => i.label.startsWith('Actor salary:') && i.currency === 'S')).toBe(true);
    expect(bill.lineItems.some((i) => i.label === `Relationship gain: ${supported.name}` && i.currency === 'AFFECTION')).toBe(true);
    expect(bill.totalIncome).toBeGreaterThanOrEqual(10);
    expect(bill.totalExpense).toBe(0);
  });

  it('shows paid command costs without charging them again at settlement', async () => {
    const sim = await runBattleSimulation({
      battleSeed: 'paid_command_bill',
      actorCount: 3,
      maxActions: 10,
      actorBrainProvider: createStubActorBrainProvider(),
    });
    sim.battleState.commandTransactions.push({
      transactionId: 'cmd_paid',
      rawInput: 'rain',
      normalizedInput: 'rain',
      status: 'READY_TO_INJECT',
      createdAtActionIndex: 0,
      estimatedCost: 80,
      frozenCost: 80,
      paidCost: 80,
      refundedCost: 0,
    });
    const scores = calculateFinalScores(sim.battleState.actors, sim.battleState.eventLog);
    const bill = calculateEpisodeBill(sim.battleState, scores, null, 0);

    const commandLine = bill.lineItems.find((i) => i.label === 'Director command cost (paid during battle)');
    expect(commandLine?.amount).toBe(80);
    expect(commandLine?.appliedToSettlement).toBe(false);
    expect(bill.totalExpense).toBe(0);
    expect(bill.netGold).toBe(10);
  });
});
