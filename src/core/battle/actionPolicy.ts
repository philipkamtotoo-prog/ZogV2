import type {
  ActorCombatState,
  ActionType,
  SceneState,
  DramaBeat,
  DirectorBroadcast,
} from './types';
import { ACTION_DEFS } from './actionDefs';

/**
 * 生成当前可用的 ActionType 列表
 */
export function buildAllowedActionTypes(
  activeActor: ActorCombatState,
  lockedTarget: ActorCombatState | null,
  _scene: SceneState,
  _currentBeat?: DramaBeat,
  _directorBroadcasts?: DirectorBroadcast[]
): ActionType[] {
  const allowed: ActionType[] = [];

  // 基础：所有 actionType 都可以选择（白名单限制在 Validator）
  const allActionTypes: ActionType[] = [
    'MOCK_ANIMAL_MANAGEMENT',
    'STEAL_DODOS',
    'BRIBE_DODOS_WITH_FOOD',
    'BUILD_FAKE_NEST',
    'FRAME_TARGET_AS_DODO_ENEMY',
    'SCARE_HERD',
    'TRIGGER_STAMPEDE',
    'CALM_HERD',
    'CLAIM_NEST_AREA',
    'FALLBACK_SIGNAL_STUMBLE',
  ];

  // 检查 STOMACHACHE_NO_ATTACK 状态
  if (activeActor.statuses.includes('STOMACHACHE_NO_ATTACK')) {
    // 只能选择 SAFE_FALLBACK
    return ['FALLBACK_SIGNAL_STUMBLE', 'MOCK_ANIMAL_MANAGEMENT', 'CALM_HERD'];
  }

  // 检查是否有 TARGET_REQUIRED 但没有目标
  for (const actionType of allActionTypes) {
    const def = ACTION_DEFS[actionType];

    if (def.targetPolicy === 'TARGET_REQUIRED' && !lockedTarget) {
      continue; // 需要目标但没有，跳过
    }

    if (def.targetPolicy === 'SELF_ONLY') {
      allowed.push(actionType);
      continue;
    }

    // GLOBAL 或 OPTIONAL_TARGET
    allowed.push(actionType);
  }

  return allowed;
}

/**
 * 获取当前战场摘要信息（用于 Prompt 构建）
 */
export function buildBattlefieldSummary(
  activeActor: ActorCombatState,
  actors: ActorCombatState[],
  scene: SceneState
): string {
  const aliveActors = actors.filter((a) => a.isAlive);

  const summaryLines = [
    `=== 战场摘要 ===`,
    `总演员数: ${aliveActors.length}`,
    `总渡渡鸟: ${scene.totalDodos} (野生: ${scene.wildDodos})`,
    ``,
    `=== 演员状态 ===`,
    ...aliveActors.map(
      (a) =>
        `${a.name} [HP: ${a.currentHP}/${a.maxHP}] [ATK: ${a.ATK}] [DEF: ${a.DEF}] [SPD: ${a.SPD}] ${a.statuses.length > 0 ? `[状态: ${a.statuses.join(', ')}]` : ''}`
    ),
    ``,
    `=== 你的状态 ===`,
    `HP: ${activeActor.currentHP}/${activeActor.maxHP}`,
    `ATK: ${activeActor.ATK} DEF: ${activeActor.DEF} SPD: ${activeActor.SPD}`,
    `控制渡渡鸟: ${activeActor.scene.dodosControlled}`,
    `信任度: ${activeActor.scene.dodoTrust}`,
    `巢区影响: ${activeActor.scene.nestInfluence}`,
    `状态: ${activeActor.statuses.join(', ') || '无'}`,
  ];

  return summaryLines.join('\n');
}
