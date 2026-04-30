import type { FinalScore } from '../../core/battle/finalScore';

export function generateZogReaction(scores: FinalScore[]): string {
  const winner = scores.find((s) => s.isWinner);
  const mvp = scores.find((s) => s.isMVP);
  if (winner && mvp && winner.actorId !== mvp.actorId) {
    return `Zog enjoyed that the winner and MVP were different disasters.`;
  }
  if ((winner?.finalScore ?? 0) > 160) return 'Zog considers this acceptable television.';
  return 'Zog writes a complaint to the island, then eats it.';
}
