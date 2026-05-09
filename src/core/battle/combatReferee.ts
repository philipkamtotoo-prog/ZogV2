import type {
  ActionType,
  ActorCombatState,
  ActorDiff,
  BattleDiff,
  BattleEvent,
  BattleEventTag,
  BattleEventType,
  CommitInput,
  CommitResult,
  SceneDiff,
  StatusDiff,
} from './types';
import { ACTION_DEFS } from './actionDefs';
import { clamp, seededRng } from './rng';

export function combatRefereeCommit(
  battleState: import('./types').BattleState,
  commitInput: CommitInput
): CommitResult {
  const { activeActorId, lockedTargetId, actionType, actorBrainOutput } = commitInput;
  const activeActor = battleState.actors.find((a) => a.actorId === activeActorId);
  const target = lockedTargetId
    ? battleState.actors.find((a) => a.actorId === lockedTargetId) ?? null
    : null;

  if (!activeActor) throw new Error('Active actor not found');

  const actionDef = ACTION_DEFS[actionType];
  const actorDiffs: ActorDiff[] = [];
  const statusDiffs: StatusDiff[] = [];
  const eliminatedActorIds: string[] = [];
  let wildDodosDelta = 0;

  const pushActorDiff = (
    actorId: string,
    path: string,
    oldValue: unknown,
    newValue: unknown
  ) => {
    actorDiffs.push({ actorId, diffs: [{ path, oldValue, newValue }] });
  };

  const actorCopies = battleState.actors.map((a) => ({
    ...a,
    stats: { ...a.stats },
    scene: { ...a.scene },
    statuses: [...a.statuses],
  }));

  const activeActorCopy = actorCopies.find((a) => a.actorId === activeActorId)!;
  const targetCopy = target ? actorCopies.find((a) => a.actorId === target.actorId) ?? null : null;

  const stomachacheBlocked =
    activeActor.statuses.includes('STOMACHACHE_NO_ATTACK') && actionDef.damageEnabled;
  const shieldBlocked =
    Boolean(targetCopy?.statuses.includes('SHIELD_ONCE')) && actionDef.damageEnabled;

  let damage = 0;
  if (actionDef.damageEnabled && targetCopy && !shieldBlocked && !stomachacheBlocked) {
    const variance = seededRng(
      battleState.battleSeed,
      commitInput.actorActionIndex,
      'damageVariance',
      activeActorId,
      lockedTargetId
    );
    const multiplier = 0.85 + variance * 0.3;
    const baseDamage = Math.max(0, activeActor.ATK * actionDef.actionPower - targetCopy.DEF);
    damage = clamp(Math.round(baseDamage * multiplier), 1, 35);
  }

  applyActorTurnBaseUpdates();

  if (!stomachacheBlocked) {
    applyActionSpecialEffects();
  }

  const sceneDiff = buildSceneDiff();
  const events = buildEvents(sceneDiff);

  return {
    newStateVersion: battleState.stateVersion + 1,
    events,
    actorDiffs: actorCopies.map((a) => ({
      actorId: a.actorId,
      diffs: actorDiffs.filter((d) => d.actorId === a.actorId).flatMap((d) => d.diffs),
    })),
    sceneDiff,
    statusDiffs,
    eliminatedActorIds,
    shouldCheckEnd: eliminatedActorIds.length > 0 || battleState.actorActionIndex >= 39,
    newActors: actorCopies,
  };

  function applyActorTurnBaseUpdates() {
    const oldActionsTaken = activeActorCopy.stats.actionsTaken;
    const oldSpotlightDebt = activeActorCopy.spotlightDebt;
    const oldInitiative = activeActorCopy.initiative;

    activeActorCopy.stats.actionsTaken += 1;
    activeActorCopy.lastActedActionIndex = commitInput.actorActionIndex;
    activeActorCopy.spotlightDebt = 0;
    activeActorCopy.initiative = Math.max(0, activeActorCopy.initiative - 100);

    const activeDiffs: BattleDiff[] = [
      { path: 'stats.actionsTaken', oldValue: oldActionsTaken, newValue: activeActorCopy.stats.actionsTaken },
      { path: 'spotlightDebt', oldValue: oldSpotlightDebt, newValue: activeActorCopy.spotlightDebt },
      { path: 'initiative', oldValue: oldInitiative, newValue: activeActorCopy.initiative },
    ];

    if (damage > 0) {
      const oldDamageDealt = activeActorCopy.stats.damageDealt;
      activeActorCopy.stats.damageDealt += damage;
      activeDiffs.push({
        path: 'stats.damageDealt',
        oldValue: oldDamageDealt,
        newValue: activeActorCopy.stats.damageDealt,
      });
    }

    actorDiffs.push({ actorId: activeActorCopy.actorId, diffs: activeDiffs });

    if (targetCopy && damage > 0) {
      const oldHP = targetCopy.currentHP;
      const oldDamageTaken = targetCopy.stats.damageTaken;
      const oldAlive = targetCopy.isAlive;

      targetCopy.currentHP = clamp(oldHP - damage, 0, targetCopy.maxHP);
      targetCopy.stats.damageTaken += damage;
      targetCopy.lastTargetedActionIndex = commitInput.actorActionIndex;
      targetCopy.isAlive = targetCopy.currentHP > 0;

      if (!targetCopy.isAlive && oldAlive) {
        targetCopy.eliminatedAtActionIndex = commitInput.actorActionIndex;
        eliminatedActorIds.push(targetCopy.actorId);
      }

      actorDiffs.push({
        actorId: targetCopy.actorId,
        diffs: [
          { path: 'currentHP', oldValue: oldHP, newValue: targetCopy.currentHP },
          { path: 'stats.damageTaken', oldValue: oldDamageTaken, newValue: targetCopy.stats.damageTaken },
          { path: 'isAlive', oldValue: oldAlive, newValue: targetCopy.isAlive },
        ],
      });
    }

    if (shieldBlocked && targetCopy) {
      removeStatus(targetCopy, 'SHIELD_ONCE');
    }

    if (targetCopy?.statuses.includes('TAUNT_1_ACTION')) {
      removeStatus(targetCopy, 'TAUNT_1_ACTION');
      targetCopy.tauntedByActorId = undefined;
    }

    if (activeActorCopy.statuses.includes('STOMACHACHE_NO_ATTACK')) {
      removeStatus(activeActorCopy, 'STOMACHACHE_NO_ATTACK');
    }

    // 所有存活演员 threat 衰减（每 action -2，但不能低于 baseThreat）
    for (const actorCopy of actorCopies) {
      if (actorCopy.isAlive && actorCopy.currentThreat > actorCopy.baseThreat) {
        const oldThreat = actorCopy.currentThreat;
        actorCopy.currentThreat = Math.max(actorCopy.baseThreat, actorCopy.currentThreat - 2);
        if (actorCopy.currentThreat !== oldThreat) {
          pushActorDiff(actorCopy.actorId, 'currentThreat', oldThreat, actorCopy.currentThreat);
        }
      }
    }
  }

  function removeStatus(actor: ActorCombatState, status: ActorCombatState['statuses'][number]) {
    const oldStatuses = [...actor.statuses];
    actor.statuses = actor.statuses.filter((s) => s !== status);
    statusDiffs.push({ actorId: actor.actorId, status, added: false });
    pushActorDiff(actor.actorId, 'statuses', oldStatuses, [...actor.statuses]);
  }

  function applyActionSpecialEffects() {
    const currentWild = battleState.scene.wildDodos;

    switch (actionType) {
      case 'MOCK_ANIMAL_MANAGEMENT': {
        if (targetCopy) {
          const oldThreat = targetCopy.currentThreat;
          targetCopy.currentThreat += 2;
          pushActorDiff(targetCopy.actorId, 'currentThreat', oldThreat, targetCopy.currentThreat);
        }
        break;
      }

      case 'STEAL_DODOS': {
        if (targetCopy) {
          const stealFromTarget = Math.min(targetCopy.scene.dodosControlled, 5);
          const supplementFromWild = Math.min(5 - stealFromTarget, 2, currentWild + wildDodosDelta);
          const totalGain = stealFromTarget + supplementFromWild;

          const oldTargetDodos = targetCopy.scene.dodosControlled;
          const oldActorDodos = activeActorCopy.scene.dodosControlled;
          const oldActorGained = activeActorCopy.stats.dodosGained;
          const oldTargetLost = targetCopy.stats.dodosLost;

          targetCopy.scene.dodosControlled -= stealFromTarget;
          targetCopy.stats.dodosLost += stealFromTarget;
          activeActorCopy.scene.dodosControlled += totalGain;
          activeActorCopy.stats.dodosGained += totalGain;
          wildDodosDelta -= supplementFromWild;

          actorDiffs.push({
            actorId: activeActorCopy.actorId,
            diffs: [
              { path: 'scene.dodosControlled', oldValue: oldActorDodos, newValue: activeActorCopy.scene.dodosControlled },
              { path: 'stats.dodosGained', oldValue: oldActorGained, newValue: activeActorCopy.stats.dodosGained },
            ],
          });
          actorDiffs.push({
            actorId: targetCopy.actorId,
            diffs: [
              { path: 'scene.dodosControlled', oldValue: oldTargetDodos, newValue: targetCopy.scene.dodosControlled },
              { path: 'stats.dodosLost', oldValue: oldTargetLost, newValue: targetCopy.stats.dodosLost },
            ],
          });
        }
        break;
      }

      case 'BRIBE_DODOS_WITH_FOOD': {
        const bribeAmount = Math.min(currentWild + wildDodosDelta, 8);
        if (bribeAmount > 0) {
          const oldDodos = activeActorCopy.scene.dodosControlled;
          const oldTrust = activeActorCopy.scene.dodoTrust;
          const oldGained = activeActorCopy.stats.dodosGained;

          activeActorCopy.scene.dodosControlled += bribeAmount;
          activeActorCopy.scene.dodoTrust = Math.min(100, activeActorCopy.scene.dodoTrust + 6);
          activeActorCopy.stats.dodosGained += bribeAmount;
          wildDodosDelta -= bribeAmount;

          actorDiffs.push({
            actorId: activeActorCopy.actorId,
            diffs: [
              { path: 'scene.dodosControlled', oldValue: oldDodos, newValue: activeActorCopy.scene.dodosControlled },
              { path: 'scene.dodoTrust', oldValue: oldTrust, newValue: activeActorCopy.scene.dodoTrust },
              { path: 'stats.dodosGained', oldValue: oldGained, newValue: activeActorCopy.stats.dodosGained },
            ],
          });
        }
        break;
      }

      case 'BUILD_FAKE_NEST': {
        const oldNest = activeActorCopy.scene.nestInfluence;
        const bonus = battleState.selectedMutation?.mutationId === 'FAKE_NEST_FEVER' ? 5 : 0;
        activeActorCopy.scene.nestInfluence = Math.min(100, activeActorCopy.scene.nestInfluence + 10 + bonus);
        pushActorDiff(activeActorCopy.actorId, 'scene.nestInfluence', oldNest, activeActorCopy.scene.nestInfluence);
        break;
      }

      case 'FRAME_TARGET_AS_DODO_ENEMY': {
        if (targetCopy) {
          const oldTrust = targetCopy.scene.dodoTrust;
          const oldThreat = targetCopy.currentThreat;
          targetCopy.scene.dodoTrust = Math.max(0, targetCopy.scene.dodoTrust - 6);
          targetCopy.currentThreat += 4;
          actorDiffs.push({
            actorId: targetCopy.actorId,
            diffs: [
              { path: 'scene.dodoTrust', oldValue: oldTrust, newValue: targetCopy.scene.dodoTrust },
              { path: 'currentThreat', oldValue: oldThreat, newValue: targetCopy.currentThreat },
            ],
          });
        }
        break;
      }

      case 'SCARE_HERD': {
        if (targetCopy) {
          const oldTrust = targetCopy.scene.dodoTrust;
          targetCopy.scene.dodoTrust = Math.max(0, targetCopy.scene.dodoTrust - 2);
          pushActorDiff(targetCopy.actorId, 'scene.dodoTrust', oldTrust, targetCopy.scene.dodoTrust);
        }
        break;
      }

      case 'TRIGGER_STAMPEDE': {
        const oldThreat = activeActorCopy.currentThreat;
        activeActorCopy.currentThreat += 5;
        pushActorDiff(activeActorCopy.actorId, 'currentThreat', oldThreat, activeActorCopy.currentThreat);
        break;
      }

      case 'CALM_HERD': {
        const oldTrust = activeActorCopy.scene.dodoTrust;
        activeActorCopy.scene.dodoTrust = Math.min(100, activeActorCopy.scene.dodoTrust + 5);
        pushActorDiff(activeActorCopy.actorId, 'scene.dodoTrust', oldTrust, activeActorCopy.scene.dodoTrust);
        break;
      }

      case 'CLAIM_NEST_AREA': {
        if (targetCopy) {
          const oldSelfNest = activeActorCopy.scene.nestInfluence;
          const oldTargetNest = targetCopy.scene.nestInfluence;
          const bonus = battleState.selectedMutation?.mutationId === 'NEST_PRIME_TIME' ? 4 : 0;

          activeActorCopy.scene.nestInfluence = Math.min(100, activeActorCopy.scene.nestInfluence + 8 + bonus);
          targetCopy.scene.nestInfluence = Math.max(0, targetCopy.scene.nestInfluence - 5);

          pushActorDiff(activeActorCopy.actorId, 'scene.nestInfluence', oldSelfNest, activeActorCopy.scene.nestInfluence);
          pushActorDiff(targetCopy.actorId, 'scene.nestInfluence', oldTargetNest, targetCopy.scene.nestInfluence);
        }
        break;
      }
    }
  }

  function buildSceneDiff(): SceneDiff {
    if (wildDodosDelta === 0) return {};
    return {
      wildDodos: clamp(battleState.scene.wildDodos + wildDodosDelta, 0, battleState.scene.totalDodos),
    };
  }

  function buildEvents(sceneDiff: SceneDiff): BattleEvent[] {
    const mainEvent: BattleEvent = {
      eventId: `evt_${Date.now()}_${commitInput.actorActionIndex}`,
      actorActionIndex: commitInput.actorActionIndex,
      type: mapActionTypeToEventType(actionType, damage),
      activeActorId,
      targetActorId: lockedTargetId ?? undefined,
      actionType,
      line: actorBrainOutput.line,
      actionDescription: actorBrainOutput.actionDescription,
      performanceIntent: actorBrainOutput.performanceIntent,
      diffs: [
        ...actorDiffs.flatMap((d) => d.diffs),
        ...Object.entries(sceneDiff).map(([path, newValue]) => ({
          path,
          oldValue: battleState.scene[path as keyof SceneDiff],
          newValue,
        })),
      ],
      tags: buildEventTags(actionType, damage),
      createdAt: Date.now(),
    };

    const events: BattleEvent[] = [mainEvent];

    for (const eliminatedId of eliminatedActorIds) {
      events.push({
        eventId: `evt_${Date.now()}_${commitInput.actorActionIndex}_elim_${eliminatedId}`,
        actorActionIndex: commitInput.actorActionIndex,
        type: 'ACTOR_ELIMINATED',
        activeActorId,
        targetActorId: eliminatedId,
        actionType,
        diffs: [],
        tags: ['DAMAGE', 'ELIMINATION'],
        createdAt: Date.now(),
      });
    }

    return events;
  }
}

function mapActionTypeToEventType(actionType: ActionType, damage: number): BattleEventType {
  switch (actionType) {
    case 'STEAL_DODOS':
      return 'DODOS_STOLEN';
    case 'BRIBE_DODOS_WITH_FOOD':
      return 'DODOS_BRIBED';
    case 'CLAIM_NEST_AREA':
    case 'BUILD_FAKE_NEST':
      return 'NEST_CLAIMED';
    default:
      return damage > 0 ? 'DAMAGE_DEALT' : 'ACTION_TAKEN';
  }
}

function buildEventTags(actionType: ActionType, damage: number): BattleEventTag[] {
  const tags: BattleEventTag[] = [];
  if (damage > 0) tags.push('DAMAGE');

  switch (actionType) {
    case 'STEAL_DODOS':
    case 'BRIBE_DODOS_WITH_FOOD':
      tags.push('DODO');
      break;
    case 'BUILD_FAKE_NEST':
    case 'CLAIM_NEST_AREA':
      tags.push('NEST');
      break;
    case 'MOCK_ANIMAL_MANAGEMENT':
    case 'FRAME_TARGET_AS_DODO_ENEMY':
      tags.push('SHAME');
      break;
  }

  return tags;
}
