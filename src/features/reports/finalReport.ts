import type { BattleState, BattleEvent } from '../../core/battle/types';
import type { FinalScore } from '../../core/battle/finalScore';
import { calculateFinalScores } from '../../core/battle/finalScore';

export interface BattleReport {
  reportId: string;
  battleId: string;
  createdAt: number;

  title: string;
  summary: string;

  winner: { actorId: string; name: string; score: number } | null;
  mvp: { actorId: string; name: string; score: number } | null;
  rankings: FinalScore[];

  highlightDialogue: string;
  biggestIncident: string;
  playerCommands: { input: string; status: string }[];

  zogReaction: string;

  totalActions: number;
  totalEvents: number;
  eliminationOrder: { actorId: string; name: string; atAction: number }[];
}

export function extractBattleReport(battleState: BattleState): BattleReport {
  const scores = calculateFinalScores(battleState.actors, battleState.eventLog);
  const winnerScore = scores.find((s) => s.isWinner);
  const mvpScore = scores.find((s) => s.isMVP);

  const eliminations = battleState.eventLog
    .filter((e) => e.type === 'ACTOR_ELIMINATED')
    .map((e) => {
      const actor = battleState.actors.find((a) => a.actorId === e.targetActorId);
      return {
        actorId: e.targetActorId ?? '',
        name: actor?.name ?? 'Unknown',
        atAction: e.actorActionIndex,
      };
    });

  const highlights = extractHighlights(battleState.eventLog, battleState);

  return {
    reportId: `report_${battleState.battleId}`,
    battleId: battleState.battleId,
    createdAt: Date.now(),

    title: generateQuickTitle(battleState, winnerScore),
    summary: generateQuickSummary(battleState, scores),

    winner: winnerScore
      ? { actorId: winnerScore.actorId, name: winnerScore.name, score: winnerScore.finalScore }
      : null,
    mvp: mvpScore
      ? { actorId: mvpScore.actorId, name: mvpScore.name, score: mvpScore.finalScore }
      : null,
    rankings: scores,

    highlightDialogue: highlights.bestLine,
    biggestIncident: highlights.biggestIncident,
    playerCommands: battleState.commandTransactions.map((t) => ({
      input: t.rawInput,
      status: t.status,
    })),

    zogReaction: generateZogReaction(scores),

    totalActions: battleState.actorActionIndex,
    totalEvents: battleState.eventLog.length,
    eliminationOrder: eliminations,
  };
}

function generateQuickTitle(state: BattleState, winner: FinalScore | undefined): string {
  const dead = state.actors.filter((a) => !a.isAlive).length;
  if (dead >= 4) return '大逃杀之夜';
  if (dead === 0) return '和平的一天';
  if (winner) return `${winner.name}的胜利`;
  return '渡渡岛风云';
}

function generateQuickSummary(state: BattleState, scores: FinalScore[]): string {
  const alive = state.actors.filter((a) => a.isAlive);
  const winner = scores.find((s) => s.isWinner);
  const parts: string[] = [];

  parts.push(`经过${state.actorActionIndex}回合的激烈角逐`);

  if (winner) {
    parts.push(`${winner.name}以${winner.finalScore}分的成绩夺得冠军`);
  }

  parts.push(`最终${alive.length}名演员存活`);

  return parts.join('，') + '。';
}

interface Highlights {
  bestLine: string;
  biggestIncident: string;
}

function extractHighlights(eventLog: BattleEvent[], state: BattleState): Highlights {
  const lines = eventLog
    .filter((e) => e.line)
    .map((e) => e.line!);
  const bestLine = lines.length > 0 ? lines[Math.floor(lines.length / 2)] : '（无精彩台词）';

  const elimEvent = eventLog.find((e) => e.type === 'ACTOR_ELIMINATED');
  let biggestIncident = '（平安无事）';
  if (elimEvent) {
    const victim = state.actors.find((a) => a.actorId === elimEvent.targetActorId);
    biggestIncident = `${victim?.name ?? '某演员'}在第${elimEvent.actorActionIndex}回合被淘汰`;
  }

  return { bestLine, biggestIncident };
}

function generateZogReaction(scores: FinalScore[]): string {
  const topScore = scores[0]?.finalScore ?? 0;
  if (topScore > 200) return 'Zog看得目瞪口呆，连薯片都忘了吃。';
  if (topScore > 100) return 'Zog满意地点了点头，觉得今天的节目不错。';
  return 'Zog打了个哈欠，觉得今天的节目有点无聊。';
}
