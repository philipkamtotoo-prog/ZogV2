import type { ActorCombatState, DirectorBroadcast, DramaBeat } from './types';
import { seededRng } from './rng';

export function resolveLockedTarget(
  activeActor: ActorCombatState,
  actors: ActorCombatState[],
  currentBeat?: DramaBeat,
  actorActionIndex?: number,
  battleSeed?: string,
  _directorBroadcasts?: DirectorBroadcast[]
): ActorCombatState | null {
  const aliveTargets = actors.filter((a) => a.isAlive && a.actorId !== activeActor.actorId);
  if (aliveTargets.length === 0) return null;

  const tauntedTarget = aliveTargets.find((a) => a.statuses.includes('TAUNT_1_ACTION'));
  if (tauntedTarget) return tauntedTarget;

  if (activeActor.statuses.includes('TAUNT_1_ACTION') && activeActor.tauntedByActorId) {
    const legacyTauntSource = aliveTargets.find((a) => a.actorId === activeActor.tauntedByActorId);
    if (legacyTauntSource) return legacyTauntSource;
  }

  if (currentBeat?.focusActorId) {
    const target = aliveTargets.find((a) => a.actorId === currentBeat.focusActorId);
    if (target) return target;
  }

  // Consecutive targeting penalty: reduce weight for actors targeted in last 3 actions
  const recentTargetPenalty = 5;
  const targetsWithWeight = aliveTargets.map((a) => {
    const consec =
      a.lastTargetedActionIndex !== undefined &&
      actorActionIndex !== undefined &&
      actorActionIndex - a.lastTargetedActionIndex <= 3;
    return {
      actor: a,
      effectiveThreat: consec ? Math.max(0, a.currentThreat - recentTargetPenalty) : a.currentThreat,
    };
  });

  // Weighted random: threat越高概率越高，但非100%锁定
  const totalWeight = targetsWithWeight.reduce((sum, t) => sum + t.effectiveThreat, 0);
  if (totalWeight === 0) return targetsWithWeight[0]?.actor ?? null;

  const seed = battleSeed ?? '';
  const actionIdx = actorActionIndex ?? 0;
  const rand = seededRng(seed, actionIdx, 'targetSelect', activeActor.actorId);
  const scaledRand = rand * totalWeight;
  let cumulative = 0;
  for (const { actor, effectiveThreat } of targetsWithWeight) {
    cumulative += effectiveThreat;
    if (scaledRand < cumulative) return actor;
  }
  return targetsWithWeight[targetsWithWeight.length - 1].actor;
}

export function getTargetEcho(target: ActorCombatState | null): string | null {
  return target?.name ?? null;
}
