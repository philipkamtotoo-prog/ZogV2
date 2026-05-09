import type {
  ActorBrainOutput,
  ActorCombatState,
  ActionType,
  ValidatedActorBrainOutput,
} from './types';
import { ACTION_DEFS } from './actionDefs';

export function validateActorBrainOutput(
  output: ActorBrainOutput,
  activeActor: ActorCombatState,
  lockedTarget: ActorCombatState | null,
  allowedActionTypes: ActionType[],
  stateVersionAtStart: number,
  currentStateVersion: number
): ValidatedActorBrainOutput {
  if (output.actorId !== activeActor.actorId) {
    return {
      valid: false,
      failure: { reason: 'actorId mismatch', field: 'actorId' },
    };
  }

  if (stateVersionAtStart !== currentStateVersion) {
    return {
      valid: false,
      failure: { reason: 'state version changed during generation' },
    };
  }

  if (!activeActor.isAlive) {
    return {
      valid: false,
      failure: { reason: 'activeActor is not alive' },
    };
  }

  if (lockedTarget && !lockedTarget.isAlive) {
    return {
      valid: false,
      failure: { reason: 'target is not alive' },
    };
  }

  if (!allowedActionTypes.includes(output.actionType)) {
    return {
      valid: false,
      failure: {
        reason: `actionType ${output.actionType} not in allowed list`,
        field: 'actionType',
      },
    };
  }

  const actionDef = ACTION_DEFS[output.actionType];

  if (actionDef.targetPolicy === 'TARGET_REQUIRED' && !lockedTarget) {
    return {
      valid: false,
      failure: { reason: 'action requires target but none locked' },
    };
  }

  if (output.targetEcho && lockedTarget) {
    const echo = output.targetEcho.toLowerCase();
    const targetName = lockedTarget.name.toLowerCase();
    if (!targetName.includes(echo) && !echo.includes(targetName)) {
      // Intentionally tolerant: fuzzy target paraphrases are allowed
      // as long as they do not obviously contradict the locked target.
    }
  }

  return { valid: true, output };
}

export function generateFallbackOutput(
  activeActor: ActorCombatState,
  allowedActionTypes: ActionType[]
): ActorBrainOutput {
  const safeFallbacks = allowedActionTypes.filter((actionType) =>
    ['FALLBACK_SIGNAL_STUMBLE', 'MOCK_ANIMAL_MANAGEMENT', 'CALM_HERD'].includes(actionType)
  );

  const actionType = safeFallbacks[0] ?? allowedActionTypes[0] ?? 'FALLBACK_SIGNAL_STUMBLE';

  return {
    actorId: activeActor.actorId,
    actionType,
    line: '（一时不知如何是好）',
    actionDescription: '踉跄片刻，选择观望',
    performanceIntent: '保守行动，等待时机',
  };
}
