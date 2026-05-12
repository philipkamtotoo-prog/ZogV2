import type { BattleState } from '../../core/battle/types';
import type { FinalScore } from '../../core/battle/finalScore';
import { calculateSalaryAwards } from '../../core/battle/finalScore';
import type { BetSlip } from '../../core/economy/betting';
import { calculatePayout } from '../../core/economy/betting';
import { ITEM_DEFS, type ItemId } from '../../core/economy/items';

export type BillCurrency = 'G' | 'S' | 'AFFECTION';

export interface BillLineItem {
  label: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  currency?: BillCurrency;
  appliedToSettlement?: boolean;
  note?: string;
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

  items.push({ label: 'Viewing reward', amount: 10, type: 'INCOME' });

  if (battleState.actorActionIndex >= 40) {
    items.push({ label: 'Full episode reward', amount: 5, type: 'INCOME' });
  }

  if (bet) {
    const winner = finalScores.find((s) => s.isWinner);
    const won = winner ? bet.actorId === winner.actorId : false;
    const payout = calculatePayout(bet, won);
    const actorName = battleState.actors.find((a) => a.actorId === bet.actorId)?.name ?? bet.actorId;

    items.push({
      label: `Prepaid bet stake: ${actorName}`,
      amount: bet.amount,
      type: 'EXPENSE',
      appliedToSettlement: false,
      note: 'Paid before battle; shown for the real episode bill, not charged again here.',
    });

    if (won) {
      items.push({ label: 'Bet payout', amount: payout, type: 'INCOME' });
    }

    const affectionGain = Math.floor(bet.amount / 20);
    if (affectionGain > 0) {
      items.push({
        label: `Relationship gain: ${actorName}`,
        amount: affectionGain,
        type: 'INCOME',
        currency: 'AFFECTION',
        appliedToSettlement: false,
        note: 'Support bet affection is applied before battle and listed for audit only.',
      });
    }
  }

  const usedItemCounts = countUsedItems(battleState.usedItemIds);
  for (const [itemId, count] of usedItemCounts) {
    const itemDef = ITEM_DEFS[itemId];
    items.push({
      label: `Item stock consumed: ${itemDef.name} x${count}`,
      amount: itemDef.cost * count,
      type: 'EXPENSE',
      appliedToSettlement: false,
      note: `${itemDef.cost}G stock value each; inventory was paid before or outside this settlement.`,
    });
  }

  if (usedItemCounts.size === 0 && itemsUsedCount > 0) {
    items.push({
      label: `Battle items consumed: ${itemsUsedCount}`,
      amount: 0,
      type: 'EXPENSE',
      appliedToSettlement: false,
      note: 'Legacy count only; exact item ids were not recorded on this battle state.',
    });
  }

  const salaryAwards = battleState.salaryAwards.length > 0
    ? battleState.salaryAwards
    : calculateSalaryAwards(finalScores);
  for (const award of salaryAwards) {
    if (award.totalSalary <= 0) continue;
    items.push({
      label: `Actor salary: ${award.name}`,
      amount: award.totalSalary,
      type: 'INCOME',
      currency: 'S',
      appliedToSettlement: false,
      note: `Rank #${award.rank}: ${award.rankSalary}S + MVP ${award.mvpBonus}S.`,
    });
  }

  const commandCost = battleState.commandTransactions
    .filter((t) => t.status !== 'REJECTED' && t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + (t.paidCost > 0 ? t.paidCost : t.frozenCost), 0);

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

  const settlementItems = items.filter((i) => (i.currency ?? 'G') === 'G' && i.appliedToSettlement !== false);
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

function countUsedItems(usedItemIds: string[]): Map<ItemId, number> {
  const counts = new Map<ItemId, number>();
  for (const itemId of usedItemIds) {
    if (!isItemId(itemId)) continue;
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return counts;
}

function isItemId(itemId: string): itemId is ItemId {
  return itemId in ITEM_DEFS;
}
