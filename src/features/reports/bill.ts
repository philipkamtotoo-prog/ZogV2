import type { BattleState } from '../../core/battle/types';
import type { FinalScore } from '../../core/battle/finalScore';
import type { BetSlip } from '../../core/economy/betting';
import { calculatePayout } from '../../core/economy/betting';

export interface BillLineItem {
  label: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
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
  const items: BillLineItem[] = [];

  items.push({ label: '观看奖励', amount: 10, type: 'INCOME' });

  if (battleState.actorActionIndex >= 40) {
    items.push({ label: '完整观看奖励', amount: 5, type: 'INCOME' });
  }

  if (bet) {
    const winner = finalScores.find((s) => s.isWinner);
    const won = winner ? bet.actorId === winner.actorId : false;
    const payout = calculatePayout(bet, won);

    if (won) {
      items.push({ label: '押注奖金', amount: payout, type: 'INCOME' });
    }
  }

  if (itemsUsedCount > 0) {
    items.push({ label: `道具使用 (×${itemsUsedCount})`, amount: itemsUsedCount * 15, type: 'EXPENSE' });
  }

  const commandCost = battleState.commandTransactions
    .filter((t) => t.status !== 'REJECTED' && t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + t.frozenCost, 0);

  if (commandCost > 0) {
    items.push({ label: '导演指令费用', amount: commandCost, type: 'EXPENSE' });
  }

  const refundable = battleState.commandTransactions
    .filter((t) => t.status === 'SYSTEM_FAILED_REFUND')
    .reduce((sum, t) => sum + t.frozenCost, 0);

  if (refundable > 0) {
    items.push({ label: '指令失败退款', amount: refundable, type: 'INCOME' });
  }

  const totalIncome = items.filter((i) => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0);
  const totalExpense = items.filter((i) => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0);

  return {
    battleId: battleState.battleId,
    lineItems: items,
    totalIncome,
    totalExpense,
    netGold: totalIncome - totalExpense,
  };
}
