import type { FinalScore } from '../../core/battle/finalScore';

export function generateZogReaction(scores: FinalScore[]): string {
  const winner = scores.find((s) => s.isWinner);
  const mvp = scores.find((s) => s.isMVP);
  if (winner && mvp && winner.actorId !== mvp.actorId) {
    return '赢的人和最会闹的人不是同一个。好，节目有皱褶。';
  }
  if ((winner?.finalScore ?? 0) > 160) return '这期电视很响。Zog 批准它进入垃圾收藏。';
  return 'Zog 写了投诉信，然后把信吃掉了。';
}
