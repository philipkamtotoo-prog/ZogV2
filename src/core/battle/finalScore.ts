import type { ActorCombatState, BattleEvent } from './types';

/**
 * 最终排名计算
 * 基于 FinalScore = Σ(伤害输出 × 0.3 + 击杀 × 50 + 生存 × 20 + 特殊行为 × 10)
 */
export interface FinalScore {
  actorId: string;
  name: string;
  finalScore: number;
  rank: number;
  isWinner: boolean;
  isMVP: boolean;
  breakdown: {
    damageScore: number;
    killScore: number;
    survivalScore: number;
    specialScore: number;
  };
}

export function calculateFinalScores(
  actors: ActorCombatState[],
  eventLog: BattleEvent[]
): FinalScore[] {
  // 按存活状态分组
  const ranked: FinalScore[] = actors.map((actor) => {
    // 伤害得分
    const damageScore = actor.stats.damageDealt * 0.3;

    // 击杀得分（通过 eventLog 统计）
    const killCount = eventLog.filter(
      (e) =>
        e.type === 'ACTOR_ELIMINATED' &&
        e.activeActorId === actor.actorId
    ).length;
    const killScore = killCount * 50;

    // 生存得分
    const survivalScore = actor.isAlive ? 20 : 0;

    // 特殊行为得分
    const specialScore =
      actor.stats.dodosGained * 2 +
      actor.stats.dodosLost * -1 +
      actor.stats.directorBroadcastReactedCount * 5;

    const finalScore = Math.floor(
      damageScore + killScore + survivalScore + specialScore
    );

    return {
      actorId: actor.actorId,
      name: actor.name,
      finalScore,
      rank: 0,
      isWinner: false,
      isMVP: false,
      breakdown: {
        damageScore,
        killScore,
        survivalScore,
        specialScore,
      },
    };
  });

  // 排序（降序）
  ranked.sort((a, b) => b.finalScore - a.finalScore);

  // 分配排名
  ranked.forEach((r, index) => {
    r.rank = index + 1;
  });

  // 第一名为胜者
  if (ranked.length > 0) {
    ranked[0].isWinner = true;
  }

  // MVP = 最高 FinalScore
  if (ranked.length > 0) {
    ranked[0].isMVP = true;
  }

  // 平分处理
  handleTies(ranked);

  return ranked;
}

/**
 * 处理平分情况
 */
function handleTies(ranked: FinalScore[]): void {
  for (let i = 0; i < ranked.length; i++) {
    const current = ranked[i];
    let tieCount = 1;

    // 找相同分数
    for (let j = i + 1; j < ranked.length; j++) {
      if (ranked[j].finalScore === current.finalScore) {
        tieCount++;
      } else {
        break;
      }
    }

    // 平分排名（例如 1,2,2,4）
    if (tieCount > 1) {
      const avgRank = (2 * i + tieCount + 1) / 2;
      for (let j = i; j < i + tieCount; j++) {
        ranked[j].rank = avgRank;
      }
      i += tieCount - 1;
    }
  }
}

/**
 * 获取胜者
 */
export function getWinner(scores: FinalScore[]): FinalScore | null {
  return scores.find((s) => s.isWinner) ?? null;
}

/**
 * 获取 MVP
 */
export function getMVP(scores: FinalScore[]): FinalScore | null {
  return scores.find((s) => s.isMVP) ?? null;
}
