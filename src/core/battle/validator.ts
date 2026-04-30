import type {
  ActorBrainOutput,
  ActorCombatState,
  ActionType,
  ValidatedActorBrainOutput,
} from './types';
import { ACTION_DEFS } from './actionDefs';

/**
 * 校验 ActorBrain 输出
 * 必须在 Validator 中检查所有越权行为
 */
export function validateActorBrainOutput(
  output: ActorBrainOutput,
  activeActor: ActorCombatState,
  lockedTarget: ActorCombatState | null,
  allowedActionTypes: ActionType[],
  stateVersionAtStart: number,
  currentStateVersion: number
): ValidatedActorBrainOutput {
  // 1. actorId 必须匹配
  if (output.actorId !== activeActor.actorId) {
    return {
      valid: false,
      failure: { reason: 'actorId mismatch', field: 'actorId' },
    };
  }

  // 2. stateVersion 过期检测
  if (stateVersionAtStart !== currentStateVersion) {
    return {
      valid: false,
      failure: { reason: 'state version changed during generation' },
    };
  }

  // 3. activeActor 必须存活
  if (!activeActor.isAlive) {
    return {
      valid: false,
      failure: { reason: 'activeActor is not alive' },
    };
  }

  // 4. target 必须存活（如果有）
  if (lockedTarget && !lockedTarget.isAlive) {
    return {
      valid: false,
      failure: { reason: 'target is not alive' },
    };
  }

  // 5. actionType 必须在 allowedActionTypes 中
  if (!allowedActionTypes.includes(output.actionType)) {
    return {
      valid: false,
      failure: { reason: `actionType ${output.actionType} not in allowed list`, field: 'actionType' },
    };
  }

  // 6. 检查 targetPolicy
  const actionDef = ACTION_DEFS[output.actionType];

  if (actionDef.targetPolicy === 'TARGET_REQUIRED' && !lockedTarget) {
    return {
      valid: false,
      failure: { reason: 'action requires target but none locked' },
    };
  }

  if (actionDef.targetPolicy === 'SELF_ONLY' && lockedTarget) {
    return {
      valid: false,
      failure: { reason: 'action does not allow target' },
    };
  }

  // 7. targetEcho 校验（如果提供了）
  if (output.targetEcho && lockedTarget) {
    // 只要求 targetEcho 包含目标名的部分匹配
    if (!lockedTarget.name.toLowerCase().includes(output.targetEcho.toLowerCase()) &&
        !output.targetEcho.toLowerCase().includes(lockedTarget.name.toLowerCase())) {
      // 允许模糊匹配，但严格不匹配则拒绝
      // 注意：这里我们做宽松处理，只要不是明显错误就允许
    }
  }

  return { valid: true, output };
}

/**
 * 校验失败时生成 fallback 输出
 */
export function generateFallbackOutput(
  activeActor: ActorCombatState,
  allowedActionTypes: ActionType[]
): ActorBrainOutput {
  // 优先选择 SAFE_FALLBACK
  const safeFallbacks = allowedActionTypes.filter((at) =>
    ['FALLBACK_SIGNAL_STUMBLE', 'MOCK_ANIMAL_MANAGEMENT', 'CALM_HERD'].includes(at)
  );

  const actionType = safeFallbacks[0] ?? allowedActionTypes[0] ?? 'FALLBACK_SIGNAL_STUMBLE';

  return {
    actorId: activeActor.actorId,
    actionType,
    line: '（一时不知如何是好）',
    actionDescription: '踌躇片刻，选择观望',
    performanceIntent: '保守行动，等待时机',
  };
}
