/**
 * ActorBrain Prompt 构建
 * 你是演员脑，不是裁判
 */

import type { BattleState, ActorCombatState, DirectorBroadcast, ActionType } from '../../core/battle/types';
import { ACTION_DEFS } from '../../core/battle/actionDefs';

export interface ActorBrainPromptParams {
  battleState: BattleState;
  activeActor: ActorCombatState;
  allowedActionTypes: ActionType[];
  lockedTargetId: string | null;
  directorBroadcasts: DirectorBroadcast[];
}

/**
 * 构建 ActorBrain 的完整 Prompt
 */
export function buildActorBrainPrompt(params: ActorBrainPromptParams): string {
  const { battleState, activeActor, allowedActionTypes, lockedTargetId, directorBroadcasts } = params;

  const aliveActors = battleState.actors.filter((a) => a.isAlive);
  const target = lockedTargetId ? battleState.actors.find((a) => a.actorId === lockedTargetId) : null;

  // === 系统规则 ===
  const systemRules = `
【系统规则 - 必须遵守】
1. 你是一个演员，不是一个裁判
2. 你不能决定伤害数字
3. 你不能决定胜负
4. 你不能决定任何演员死亡
5. 你不能改变真实目标
6. 你只能从以下允许的 actionType 中选择一个：${allowedActionTypes.join(', ')}
7. 你生成的 line 和 actionDescription 将被用于表演，不是数值指令

【你的角色】
你是节目中的一个演员，必须围绕渡渡鸟、巢区、鸟群信任和互相陷害来行动。
`;

  // === Director Broadcast（如果有）===
  let broadcastSection = '';
  if (directorBroadcasts.length > 0) {
    const activeBroadcast = directorBroadcasts.find(
      (b) => b.expiresAtActionIndex >= battleState.actorActionIndex
    );
    if (activeBroadcast) {
      broadcastSection = `
【导演指令 / MUST ACKNOWLEDGE】
${activeBroadcast.text}
`;
    }
  }

  // === 演员人设和状态 ===
  const actorStatus = `
【你的状态】
名字: ${activeActor.name}
HP: ${activeActor.currentHP}/${activeActor.maxHP}
ATK: ${activeActor.ATK} DEF: ${activeActor.DEF} SPD: ${activeActor.SPD}
控制渡渡鸟: ${activeActor.scene.dodosControlled}
信任度: ${activeActor.scene.dodoTrust}
巢区影响: ${activeActor.scene.nestInfluence}
状态: ${activeActor.statuses.join(', ') || '正常'}
`;

  // === 目标状态（如果有）===
  let targetStatus = '';
  if (target) {
    targetStatus = `
【当前目标】
${target.name}
HP: ${target.currentHP}/${target.maxHP}
控制渡渡鸟: ${target.scene.dodosControlled}
信任度: ${target.scene.dodoTrust}
`;
  } else {
    targetStatus = `
【当前目标】
无（当前行动不需要目标）
`;
  }

  // === 战场摘要 ===
  const battlefieldSummary = `
【战场摘要】
总演员数: ${aliveActors.length}
总渡渡鸟: ${battleState.scene.totalDodos} (野生: ${battleState.scene.wildDodos})

${aliveActors
  .map(
    (a) => `${a.name} [HP: ${a.currentHP}/${a.maxHP}] ${a.isAlive ? '' : '[已淘汰]'} ${a.statuses.length > 0 ? `[${a.statuses.join(', ')}]` : ''}`
  )
  .join('\n')}
`;

  // === ActionType 说明 ===
  const actionTypeDocs = `
【可用行动】
${allowedActionTypes
  .map((at) => {
    const def = ACTION_DEFS[at];
    const targetPolicy =
      def.targetPolicy === 'TARGET_REQUIRED'
        ? '需要目标'
        : def.targetPolicy === 'SELF_ONLY'
          ? '仅自己'
          : def.targetPolicy === 'GLOBAL'
            ? '全局'
            : '可选目标';
    return `- ${at}: ${def.tags.join(', ')} (${targetPolicy})`;
  })
  .join('\n')}
`;

  // === 输出格式 ===
  const outputFormat = `
【输出格式 - 必须严格遵循】
你必须输出一个 JSON 对象，包含以下字段：
{
  "actorId": "${activeActor.actorId}",
  "targetEcho": ${target ? `"${target.name}"` : 'null'},
  "actionType": "选择的 actionType",
  "line": "你的台词（用于表演）",
  "actionDescription": "行动描述（用于展示）",
  "performanceIntent": "表演意图（简单描述你想表达的）"
}
`;

  // === 完整 Prompt ===
  return [
    systemRules,
    broadcastSection,
    actorStatus,
    targetStatus,
    battlefieldSummary,
    actionTypeDocs,
    outputFormat,
  ].join('\n');
}

/**
 * 验证 ActorBrain 输出的 actionType 是否在允许列表中
 */
export function validateActionType(output: { actionType: string }, allowedActionTypes: ActionType[]): boolean {
  return allowedActionTypes.includes(output.actionType as ActionType);
}
