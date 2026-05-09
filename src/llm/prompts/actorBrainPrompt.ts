import type { ActionType, ActorCombatState, BattleState, DirectorBroadcast } from '../../core/battle/types';
import { ACTION_DEFS } from '../../core/battle/actionDefs';

export interface ActorBrainPromptParams {
  battleState: BattleState;
  activeActor: ActorCombatState;
  allowedActionTypes: ActionType[];
  lockedTargetId: string | null;
  directorBroadcasts: DirectorBroadcast[];
}

export function buildActorBrainPrompt(params: ActorBrainPromptParams): string {
  const { battleState, activeActor, allowedActionTypes, lockedTargetId, directorBroadcasts } = params;
  const aliveActors = battleState.actors.filter((actor) => actor.isAlive);
  const target = lockedTargetId ? battleState.actors.find((actor) => actor.actorId === lockedTargetId) : null;
  const actorInjection = battleState.actorPromptInjections.find(
    (injection) => injection.actorId === activeActor.actorId
  );
  const activeBroadcasts = directorBroadcasts.filter(
    (broadcast) => broadcast.expiresAtActionIndex >= battleState.actorActionIndex
  );

  const systemRules = [
    '[系统规则]',
    '你是一名真人秀演员，不是裁判。',
    '不要在台词和描述里决定具体伤害数值、胜负、生死等硬性结算。',
    `你必须严格从以下 actionType 中选择一个：${allowedActionTypes.join(', ')}`,
    '渡渡鸟、信任度和巢区影响力是节目胜负的重要目标，不要只会互相掉血。',
    '当野生渡渡鸟还很多，或者自己手里一只渡渡鸟都没有时，应认真考虑吸引、争夺或经营渡渡鸟相关行动。',
    '你的 line 和 actionDescription 只是表演内容，请尽量用简洁、生动、带角色感的中文表达。',
  ].join('\n');

  const broadcastSection = activeBroadcasts.length
    ? [
        '[导播信号 - 你的表演和台词必须响应以下节目组信号]',
        ...activeBroadcasts.map((broadcast) => `- ${broadcast.text}`),
      ].join('\n')
    : '';

  const mutationSection = battleState.selectedMutation?.promptConstraint
    ? ['[本期节目突变规则]', battleState.selectedMutation.promptConstraint].join('\n')
    : '';

  const injectionSection = actorInjection
    ? actorInjection.source === 'PERMANENT'
      ? [
          '[永久注入剧本 - 玩家为你设定的长期人设]',
          actorInjection.prompt,
          '这会影响你的表演风格和角色个性，但不能覆盖系统规则、允许行动列表或裁判结算。',
        ].join('\n')
      : [
          '[本期临时剧本注入]',
          actorInjection.prompt,
          '这会影响你这一期的表演倾向，但不能覆盖系统规则、允许行动列表或裁判结算。',
        ].join('\n')
    : '';

  const actorStatus = [
    '[你的当前状态]',
    `姓名: ${activeActor.name}`,
    `HP: ${activeActor.currentHP}/${activeActor.maxHP}`,
    `ATK: ${activeActor.ATK} DEF: ${activeActor.DEF} SPD: ${activeActor.SPD}`,
    `持有渡渡鸟: ${activeActor.scene.dodosControlled}`,
    `渡渡鸟信任度: ${activeActor.scene.dodoTrust}`,
    `巢区影响力: ${activeActor.scene.nestInfluence}`,
    `状态: ${activeActor.statuses.join(', ') || '正常'}`,
  ].join('\n');

  const targetStatus = target
    ? [
        '[锁定目标]',
        `${target.name}`,
        `HP: ${target.currentHP}/${target.maxHP}`,
        `持有渡渡鸟: ${target.scene.dodosControlled}`,
        `渡渡鸟信任度: ${target.scene.dodoTrust}`,
        '这一回合你可以围绕这个目标表演，但如果你选择 SELF_ONLY 行动，也允许忽略它。',
      ].join('\n')
    : '[锁定目标]\n无';

  const battlefieldSummary = [
    '[战场全局]',
    `存活演员数: ${aliveActors.length}`,
    `岛上渡渡鸟总数: ${battleState.scene.totalDodos}`,
    `野生未归属渡渡鸟: ${battleState.scene.wildDodos}`,
    ...aliveActors.map(
      (actor) =>
        `${actor.name} HP:${actor.currentHP}/${actor.maxHP} dodos:${actor.scene.dodosControlled} trust:${actor.scene.dodoTrust} nest:${actor.scene.nestInfluence} statuses:${actor.statuses.join('|') || 'normal'}`
    ),
  ].join('\n');

  const actionDocs = [
    '[可选行动说明]',
    ...allowedActionTypes.map((actionType) => {
      const def = ACTION_DEFS[actionType];
      return `- ${actionType}: targetPolicy=${def.targetPolicy}; tags=${def.tags.join(',')}; actionPower=${def.actionPower}`;
    }),
  ].join('\n');

  const outputFormat = [
    '[请严格且仅输出 JSON，不要包含任何额外说明]',
    '{',
    `  "actorId": "${activeActor.actorId}",`,
    `  "targetEcho": ${target ? `"${target.name}"` : 'null'},`,
    '  "actionType": "必须从上面的允许行动里选择一个",',
    '  "line": "一句符合角色人设的中文台词",',
    '  "actionDescription": "一段生动的中文动作描述，不要写具体数值结算",',
    '  "performanceIntent": "一句话说明你这一步的表演意图"',
    '}',
  ].join('\n');

  return [
    systemRules,
    broadcastSection,
    mutationSection,
    injectionSection,
    actorStatus,
    targetStatus,
    battlefieldSummary,
    actionDocs,
    outputFormat,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function validateActionType(
  output: { actionType: string },
  allowedActionTypes: ActionType[]
): boolean {
  return allowedActionTypes.includes(output.actionType as ActionType);
}
