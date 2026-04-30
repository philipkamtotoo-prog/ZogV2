import type { BattleState } from '../../core/battle/types';
import type { FinalScore } from '../../core/battle/finalScore';
import type { BetSlip } from '../../core/economy/betting';
import { calculatePayout } from '../../core/economy/betting';

export interface BillLineItem {
  label: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  appliedToSettlement?: boolean;
}

export interface EpisodeBill {
  battleId: string;
  lineItems: BillLineItem[];
  totalIncome: number;
  totalExpense: number;
  netGold: number;
}

export function calculateEpisodeBill(
  battleState: BattleState,
  finalScores: FinalScore[],
  bet: BetSlip | null,
  itemsUsedCount: number
): EpisodeBill {
  void itemsUsedCount;
  const items: BillLineItem[] = [];

  items.push({ label: 'Viewing reward', amount: 10, type: 'INCOME' });

  if (battleState.actorActionIndex >= 40) {
    items.push({ label: 'Full episode reward', amount: 5, type: 'INCOME' });
  }

  if (bet) {
    const winner = finalScores.find((s) => s.isWinner);
    const won = winner ? bet.actorId === winner.actorId : false;
    const payout = calculatePayout(bet, won);

    if (won) {
      items.push({ label: 'Bet payout', amount: payout, type: 'INCOME' });
    }
  }

  const commandCost = battleState.commandTransactions
    .filter((t) => t.status !== 'REJECTED' && t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + t.frozenCost, 0);

  if (commandCost > 0) {
    items.push({
      label: 'Director command cost (paid during battle)',
      amount: commandCost,
      type: 'EXPENSE',
      appliedToSettlement: false,
    });
  }

  const refundable = battleState.commandTransactions
    .filter((t) => (t.status === 'SYSTEM_FAILED_REFUND' || (t.status === 'CANCELLED' && t.refundedCost > 0)))
    .reduce((sum, t) => sum + t.refundedCost, 0);

  if (refundable > 0) {
    items.push({
      label: 'Command refund',
      amount: refundable,
      type: 'INCOME',
      appliedToSettlement: false,
    });
  }

  const settlementItems = items.filter((i) => i.appliedToSettlement !== false);
  const totalIncome = settlementItems.filter((i) => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0);
  const totalExpense = settlementItems.filter((i) => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0);

  return {
    battleId: battleState.battleId,
    lineItems: items,
    totalIncome,
    totalExpense,
    netGold: totalIncome - totalExpense,
  };
}
