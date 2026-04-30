import type { ActorCombatState } from './types';
import { randomInt } from './rng';

/**
 * 选择下一个 activeActor
 *
 * 优先级：initiative + spotlightDebt + danger + broadcastPriority - recentPenalty
 * 平分使用 seededRng
 */
export function selectActiveActor(
  actors: ActorCombatState[],
  actorActionIndex: number,
  battleSeed: string
): ActorCombatState | null {
  const aliveActors = actors.filter((a) => a.isAlive);
  if (aliveActors.length === 0) return null;

  // 计算优先级分数
  const scored = aliveActors.map((actor) => {
    const dangerScore = Math.floor((1 - actor.currentHP / actor.maxHP) * 100);
    const lastBreathPriority = actor.currentHP < actor.maxHP * 0.2 ? 1 : 0;
    let score =
      actor.initiative +
      actor.spotlightDebt * 30 +
      dangerScore * 25 +
      lastBreathPriority * 100 +
      actor.currentThreat;

    // 最近行动过的惩罚
    if (actor.lastActedActionIndex !== undefined) {
      const turnsSince = actorActionIndex - actor.lastActedActionIndex;
      score -= turnsSince <= 1 ? 50 : Math.max(0, 10 - turnsSince);
    }

    return { actor, score };
  });

  // 找最高分
  const maxScore = Math.max(...scored.map((s) => s.score));
  const topActors = scored.filter((s) => s.score === maxScore);

  // 平分时用 RNG
  if (topActors.length > 1) {
    const randIndex = randomInt(
      battleSeed,
      actorActionIndex,
      'activeActorTieBreak',
      0,
      topActors.length - 1
    );
    return topActors[randIndex].actor;
  }

  return topActors[0].actor;
}

/**
 * 检查是否有演员需要行动
 */
export function hasActorToAct(actors: ActorCombatState[]): boolean {
  return actors.some((a) => a.isAlive);
}
