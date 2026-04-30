import type { ActionDef, ActionType, TargetPolicy } from './types';

export const ACTION_DEFS: Record<ActionType, ActionDef> = {
  MOCK_ANIMAL_MANAGEMENT: {
    actionType: 'MOCK_ANIMAL_MANAGEMENT',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: false,
    actionPower: 0.8,
    tags: ['SAFE_FALLBACK'],
  },
  STEAL_DODOS: {
    actionType: 'STEAL_DODOS',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 0.8,
    tags: ['DODO_STEAL', 'DAMAGE'],
  },
  BRIBE_DODOS_WITH_FOOD: {
    actionType: 'BRIBE_DODOS_WITH_FOOD',
    targetPolicy: 'SELF_ONLY',
    damageEnabled: false,
    actionPower: 0,
    tags: ['DODO_GAIN', 'TRUST_GAIN'],
  },
  BUILD_FAKE_NEST: {
    actionType: 'BUILD_FAKE_NEST',
    targetPolicy: 'SELF_ONLY',
    damageEnabled: false,
    actionPower: 0,
    tags: ['NEST_GAIN', 'SAFE_FALLBACK'],
  },
  FRAME_TARGET_AS_DODO_ENEMY: {
    actionType: 'FRAME_TARGET_AS_DODO_ENEMY',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 1.0,
    tags: ['DAMAGE', 'TRUST_LOSS'],
  },
  SCARE_HERD: {
    actionType: 'SCARE_HERD',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 1.1,
    tags: ['DAMAGE', 'DODO_STEAL'],
  },
  TRIGGER_STAMPEDE: {
    actionType: 'TRIGGER_STAMPEDE',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 1.3,
    tags: ['DAMAGE'],
  },
  CALM_HERD: {
    actionType: 'CALM_HERD',
    targetPolicy: 'SELF_ONLY',
    damageEnabled: false,
    actionPower: 0,
    tags: ['TRUST_GAIN', 'SAFE_FALLBACK'],
  },
  CLAIM_NEST_AREA: {
    actionType: 'CLAIM_NEST_AREA',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 0.7,
    tags: ['NEST_GAIN'],
  },
  FALLBACK_SIGNAL_STUMBLE: {
    actionType: 'FALLBACK_SIGNAL_STUMBLE',
    targetPolicy: 'SELF_ONLY',
    damageEnabled: false,
    actionPower: 0,
    tags: ['SAFE_FALLBACK'],
  },
};

export function getActionDef(actionType: ActionType): ActionDef {
  return ACTION_DEFS[actionType];
}

export function getAllowedTargets(
  actionType: ActionType
): TargetPolicy {
  return ACTION_DEFS[actionType].targetPolicy;
}
