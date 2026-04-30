import type { ActorCombatState, DirectorBroadcast, DramaBeat } from './types';

export function resolveLockedTarget(
  activeActor: ActorCombatState,
  actors: ActorCombatState[],
  currentBeat?: DramaBeat,
  _actorActionIndex?: number,
  _battleSeed?: string,
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

  return aliveTargets.reduce((best, actor) =>
    actor.currentThreat > best.currentThreat ? actor : best
  );
}

export function getTargetEcho(target: ActorCombatState | null): string | null {
  return target?.name ?? null;
}
