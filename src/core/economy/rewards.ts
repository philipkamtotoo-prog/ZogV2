import type { FinalScore } from '../battle/finalScore';
import type { BetSlip } from './betting';
import { calculatePayout } from './betting';

export interface BattleReward {
  baseReward: number;
  betPayout: number;
  bonuses: { reason: string; amount: number }[];
  total: number;
}

export function calculateBattleReward(
  bet: BetSlip | null,
  scores: FinalScore[],
  watchedFull: boolean
): BattleReward {
  const baseReward = 10;
  const bonuses: { reason: string; amount: number }[] = [];

  if (watchedFull) {
    bonuses.push({ reason: 'Watched full battle', amount: 5 });
  }

  const winner = scores.find((s) => s.isWinner);
  let betPayout = 0;
  if (bet && winner) {
    const won = bet.actorId === winner.actorId;
    betPayout = calculatePayout(bet, won);
    if (won) {
      bonuses.push({ reason: 'Bet won', amount: 0 });
    }
  }

  const total = baseReward + betPayout + bonuses.reduce((sum, b) => sum + b.amount, 0);

  return { baseReward, betPayout, bonuses, total };
}
