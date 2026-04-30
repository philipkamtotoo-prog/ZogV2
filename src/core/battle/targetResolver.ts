import type { ActorCombatState, DramaBeat, DirectorBroadcast } from './types';

/**
 * 解析锁定目标
 *
 * 优先级：
 * 1. TAUNT_1_ACTION 强制目标
 * 2. Beat 聚焦目标
 * 3. THREAT 索敌
 * 4. 无合法目标返回 null
 */
export function resolveLockedTarget(
  activeActor: ActorCombatState,
  actors: ActorCombatState[],
  currentBeat?: DramaBeat,
  _actorActionIndex?: number,
  _battleSeed?: string,
  _directorBroadcasts?: DirectorBroadcast[]
): ActorCombatState | null {
  const aliveActors = actors.filter((a) => a.isAlive && a.actorId !== activeActor.actorId);
  if (aliveActors.length === 0) return null;

  // 1. 检查 TAUNT_1_ACTION（active actor 被某 actor 嘲讽，锁定嘲讽者为目标）
  if (activeActor.statuses.includes('TAUNT_1_ACTION') && activeActor.tauntedByActorId) {
    const tauntSource = actors.find((a) => a.actorId === activeActor.tauntedByActorId);
    if (tauntSource && tauntSource.isAlive) return tauntSource;
  }

  // 2. Beat 聚焦目标
  if (currentBeat?.focusActorId) {
    const target = aliveActors.find((a) => a.actorId === currentBeat.focusActorId);
    if (target) return target;
  }

  // 3. THREAT 索敌 - 选择威胁值最高的目标
  let maxThreat = -Infinity;
  let highestThreatActor: ActorCombatState | null = null;

  for (const actor of aliveActors) {
    if (actor.currentThreat > maxThreat) {
      maxThreat = actor.currentThreat;
      highestThreatActor = actor;
    }
  }

  if (highestThreatActor) return highestThreatActor;

  // 4. 无合法目标
  return null;
}

/**
 * 获取目标的 targetEcho 字符串，用于 ActorBrain 校验
 */
export function getTargetEcho(target: ActorCombatState | null): string | null {
  if (!target) return null;
  return target.name;
}
