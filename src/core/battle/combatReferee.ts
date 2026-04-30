import type {
  BattleState,
  CommitInput,
  CommitResult,
  ActorDiff,
  SceneDiff,
  StatusDiff,
  BattleEvent,
  ActorCombatState,
  BattleEventType,
  BattleEventTag,
  ActionType,
} from './types';
import { ACTION_DEFS } from './actionDefs';
import { seededRng, clamp } from './rng';

/**
 * CombatReferee - 唯一战斗裁判
 *
 * 禁止：
 * - 读取玩家原话
 * - 读取 directorBroadcast.text 做数值结算
 * - 解析演员台词含义
 * - 调 LLM
 */
export function combatRefereeCommit(
  battleState: BattleState,
  commitInput: CommitInput
): CommitResult {
  const { activeActorId, lockedTargetId, actionType, actorBrainOutput } = commitInput;

  const activeActor = battleState.actors.find((a) => a.actorId === activeActorId);
  const target = lockedTargetId
    ? battleState.actors.find((a) => a.actorId === lockedTargetId) ?? null
    : null;

  if (!activeActor) {
    throw new Error('Active actor not found');
  }

  const actionDef = ACTION_DEFS[actionType];
  const actorDiffs: ActorDiff[] = [];
  const statusDiffs: StatusDiff[] = [];
  const eliminatedActorIds: string[] = [];
  let wildDodosDelta = 0;

  // === STOMACHACHE_NO_ATTACK 检查（劣质机油副作用）===
  // 有此状态的演员本轮攻击无效（伤害为0）
  const stomachacheBlocked = activeActor.statuses.includes('STOMACHACHE_NO_ATTACK') && actionDef.damageEnabled;

  // === SHIELD_ONCE 检查 ===
  let shieldBlocked = false;
  if (target && target.statuses.includes('SHIELD_ONCE') && actionDef.damageEnabled) {
    shieldBlocked = true;
    statusDiffs.push({ actorId: target.actorId, status: 'SHIELD_ONCE', added: false });
  }

  // === 计算伤害 ===
  // 公式: clamp(max(0, ATK * actionPower - DEF) * variance, 1, 35)
  // variance ∈ [0.85, 1.15] via seeded RNG
  let damage = 0;
  if (actionDef.damageEnabled && target && !shieldBlocked && !stomachacheBlocked) {
    const variance = seededRng(
      battleState.battleSeed,
      commitInput.actorActionIndex,
      'damageVariance',
      activeActorId,
      lockedTargetId
    );
    // variance: seededRng → [0,1]; 映射到 [0.85, 1.15]
    const multiplier = 0.85 + variance * 0.3;
    const baseDamage = Math.max(0, activeActor.ATK * actionDef.actionPower - target.DEF);
    damage = clamp(Math.round(baseDamage * multiplier), 1, 35);
  }

  // === 应用结果 ===
  const actorCopies = battleState.actors.map((a) => ({
    ...a,
    stats: { ...a.stats },
    scene: { ...a.scene },
    statuses: [...a.statuses],
  }));

  for (const actor of actorCopies) {
    // 1. Active actor 基础更新
    if (actor.actorId === activeActorId) {
      actor.stats.actionsTaken += 1;
      actor.lastActedActionIndex = commitInput.actorActionIndex;
      actor.spotlightDebt = Math.max(0, actor.spotlightDebt - 10);
      if (damage > 0) {
        actor.stats.damageDealt += damage;
      }
      actorDiffs.push({
        actorId: actor.actorId,
        diffs: [{ path: 'stats.actionsTaken', oldValue: actor.stats.actionsTaken - 1, newValue: actor.stats.actionsTaken }],
      });
    }

    // 2. Target 受到伤害
    if (target && actor.actorId === target.actorId && damage > 0) {
      const oldHP = actor.currentHP;
      actor.currentHP = clamp(oldHP - damage, 0, actor.maxHP);
      actor.stats.damageTaken += damage;
      actor.lastTargetedActionIndex = commitInput.actorActionIndex;
      actor.isAlive = actor.currentHP > 0;

      if (!actor.isAlive) {
        actor.eliminatedAtActionIndex = commitInput.actorActionIndex;
        eliminatedActorIds.push(actor.actorId);
      }

      actorDiffs.push({
        actorId: actor.actorId,
        diffs: [
          { path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP },
          { path: 'isAlive', oldValue: oldHP > 0, newValue: actor.isAlive },
        ],
      });
    }

    // 3. SHIELD_ONCE 消耗
    if (shieldBlocked && target && actor.actorId === target.actorId) {
      actor.statuses = actor.statuses.filter((s) => s !== 'SHIELD_ONCE');
    }

    // 4. TAUNT_1_ACTION 消耗（active actor 行动后消耗）
    if (actor.actorId === activeActorId && actor.statuses.includes('TAUNT_1_ACTION')) {
      actor.statuses = actor.statuses.filter((s) => s !== 'TAUNT_1_ACTION');
      actor.tauntedByActorId = undefined;
      statusDiffs.push({ actorId: actor.actorId, status: 'TAUNT_1_ACTION', added: false });
    }

    // 5. STOMACHACHE_NO_ATTACK 消耗（劣质机油副作用，行动后消失）
    if (actor.actorId === activeActorId && actor.statuses.includes('STOMACHACHE_NO_ATTACK')) {
      actor.statuses = actor.statuses.filter((s) => s !== 'STOMACHACHE_NO_ATTACK');
      statusDiffs.push({ actorId: actor.actorId, status: 'STOMACHACHE_NO_ATTACK', added: false });
    }
  }

  // === 处理 actionType 特殊效果 ===
  const activeActorCopy = actorCopies.find((a) => a.actorId === activeActorId)!;
  const targetCopy = target ? actorCopies.find((a) => a.actorId === target.actorId) ?? null : null;
  const currentWild = battleState.scene.wildDodos;

  switch (actionType) {
    case 'MOCK_ANIMAL_MANAGEMENT': {
      // 嘲讽管理能力：目标 THREAT +2
      if (targetCopy) {
        targetCopy.currentThreat += 2;
      }
      break;
    }
    case 'STEAL_DODOS': {
      if (targetCopy) {
        // 偷目标最多5只，不足从wild补最多2只，总共最多偷5只
        const stealFromTarget = Math.min(targetCopy.scene.dodosControlled, 5);
        const supplementFromWild = Math.min(5 - stealFromTarget, currentWild + wildDodosDelta);
        const totalGain = stealFromTarget + supplementFromWild;

        const oldTargetDodos = targetCopy.scene.dodosControlled;
        const oldActorDodos = activeActorCopy.scene.dodosControlled;
        targetCopy.scene.dodosControlled -= stealFromTarget;
        targetCopy.stats.dodosLost += stealFromTarget;
        activeActorCopy.scene.dodosControlled += totalGain;
        activeActorCopy.stats.dodosGained += totalGain;
        wildDodosDelta -= supplementFromWild;

        actorDiffs.push({
          actorId: activeActorCopy.actorId,
          diffs: [{ path: 'scene.dodosControlled', oldValue: oldActorDodos, newValue: activeActorCopy.scene.dodosControlled }],
        });
        actorDiffs.push({
          actorId: targetCopy.actorId,
          diffs: [{ path: 'scene.dodosControlled', oldValue: oldTargetDodos, newValue: targetCopy.scene.dodosControlled }],
        });
      }
      break;
    }
    case 'BRIBE_DODOS_WITH_FOOD': {
      // 从wild吸引最多8只
      const bribeAmount = Math.min(currentWild + wildDodosDelta, 8);
      if (bribeAmount > 0) {
        const oldDodos = activeActorCopy.scene.dodosControlled;
        activeActorCopy.scene.dodosControlled += bribeAmount;
        activeActorCopy.scene.dodoTrust = Math.min(100, activeActorCopy.scene.dodoTrust + 6);
        activeActorCopy.stats.dodosGained += bribeAmount;
        wildDodosDelta -= bribeAmount;
        actorDiffs.push({
          actorId: activeActorCopy.actorId,
          diffs: [{ path: 'scene.dodosControlled', oldValue: oldDodos, newValue: activeActorCopy.scene.dodosControlled }],
        });
      }
      break;
    }
    case 'BUILD_FAKE_NEST': {
      activeActorCopy.scene.nestInfluence = Math.min(100, activeActorCopy.scene.nestInfluence + 10);
      break;
    }
    case 'FRAME_TARGET_AS_DODO_ENEMY': {
      if (targetCopy) {
        targetCopy.scene.dodoTrust = Math.max(0, targetCopy.scene.dodoTrust - 6);
      }
      break;
    }
    case 'SCARE_HERD': {
      if (targetCopy) {
        const scareAmount = Math.min(targetCopy.scene.dodosControlled, 2);
        targetCopy.scene.dodosControlled -= scareAmount;
        targetCopy.scene.dodoTrust = Math.max(0, targetCopy.scene.dodoTrust - 2);
        targetCopy.stats.dodosLost += scareAmount;
        wildDodosDelta += scareAmount;
      }
      break;
    }
    case 'CALM_HERD': {
      activeActorCopy.scene.dodoTrust = Math.min(100, activeActorCopy.scene.dodoTrust + 5);
      break;
    }
    case 'CLAIM_NEST_AREA': {
      // 自己nestInfluence +8，目标nestInfluence -5
      if (targetCopy) {
        const oldSelfNest = activeActorCopy.scene.nestInfluence;
        const oldTargetNest = targetCopy.scene.nestInfluence;
        activeActorCopy.scene.nestInfluence = Math.min(100, activeActorCopy.scene.nestInfluence + 8);
        targetCopy.scene.nestInfluence = Math.max(0, targetCopy.scene.nestInfluence - 5);
        actorDiffs.push({
          actorId: activeActorCopy.actorId,
          diffs: [{ path: 'scene.nestInfluence', oldValue: oldSelfNest, newValue: activeActorCopy.scene.nestInfluence }],
        });
        actorDiffs.push({
          actorId: targetCopy.actorId,
          diffs: [{ path: 'scene.nestInfluence', oldValue: oldTargetNest, newValue: targetCopy.scene.nestInfluence }],
        });
      }
      break;
    }
  }

  // === 渡渡鸟守恒校验 ===
  const newWild = currentWild + wildDodosDelta;
  const totalControlled = actorCopies.reduce((sum, a) => sum + a.scene.dodosControlled, 0);
  const totalInSystem = totalControlled + newWild;

  if (totalInSystem > battleState.scene.totalDodos) {
    const excess = totalInSystem - battleState.scene.totalDodos;
    let remaining = excess;
    for (const a of actorCopies) {
      if (remaining <= 0) break;
      if (a.scene.dodosControlled > 0) {
        const deduct = Math.min(a.scene.dodosControlled, remaining);
        a.scene.dodosControlled -= deduct;
        remaining -= deduct;
      }
    }
  }

  const sceneDiff: SceneDiff = {};
  if (wildDodosDelta !== 0) {
    sceneDiff.wildDodos = Math.max(0, newWild);
  }

  // === 创建 BattleEvent ===
  const mainEvent: BattleEvent = {
    eventId: `evt_${Date.now()}_${commitInput.actorActionIndex}`,
    actorActionIndex: commitInput.actorActionIndex,
    type: mapActionTypeToEventType(actionType, damage, target),
    activeActorId,
    targetActorId: lockedTargetId ?? undefined,
    actionType,
    line: actorBrainOutput.line,
    actionDescription: actorBrainOutput.actionDescription,
    diffs: actorDiffs.flatMap((d) => d.diffs),
    tags: buildEventTags(actionType, damage, target),
    createdAt: Date.now(),
  };

  const events: BattleEvent[] = [mainEvent];

  // 淘汰事件
  for (const eliminatedId of eliminatedActorIds) {
    events.push({
      eventId: `evt_${Date.now()}_${commitInput.actorActionIndex}_elim`,
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
}

function mapActionTypeToEventType(
  actionType: ActionType,
  damage: number,
  _target: ActorCombatState | null
): BattleEventType {
  if (damage > 0) return 'DAMAGE_DEALT';
  switch (actionType) {
    case 'STEAL_DODOS':
      return 'DODOS_STOLEN';
    case 'BRIBE_DODOS_WITH_FOOD':
      return 'DODOS_BRIBED';
    case 'CLAIM_NEST_AREA':
    case 'BUILD_FAKE_NEST':
      return 'NEST_CLAIMED';
    default:
      return 'ACTION_TAKEN';
  }
}

function buildEventTags(
  actionType: ActionType,
  damage: number,
  _target: ActorCombatState | null
): BattleEventTag[] {
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
  }
  return tags;
}
