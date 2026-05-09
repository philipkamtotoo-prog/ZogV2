import type { ActorCombatState } from './types';

/**
 * 回合开始前，累积 actor 的 readiness 指标
 * - initiative += SPD * 10
 * - spotlightDebt += 6
 * 仅存活演员参与累积
 */
export function accumulateActorReadiness(
  actors: ActorCombatState[]
): ActorCombatState[] {
  return actors.map((actor) => {
    if (!actor.isAlive) return actor;
    return {
      ...actor,
      initiative: actor.initiative + actor.SPD * 10,
      spotlightDebt: actor.spotlightDebt + 6,
    };
  });
}