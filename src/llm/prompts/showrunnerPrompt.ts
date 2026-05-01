/**
 * Showrunner Prompt
 * 导演广播生成 Prompt
 * L3: showrunner_director 独立角色
 */

import type { BattleState, DramaBeat, ReporterMemoryEntry } from '../../core/battle/types';

/**
 * 构建 Showrunner 的 Prompt
 * 直接注入模式：输出导演广播和节目节奏信号
 */
export function buildShowrunnerPrompt(
  battleState: BattleState,
  reporterMemory: ReporterMemoryEntry[],
  currentBeat?: DramaBeat
): string {
  const aliveActors = battleState.actors.filter((a) => a.isAlive);
  const deadActors = battleState.actors.filter((a) => !a.isAlive);

  const stageInfo = `
【当前阶段】
回合: ${battleState.actorActionIndex}
阶段: ${battleState.phase}
存活演员: ${aliveActors.length}
`;

  const actorList = aliveActors.map((a) =>
    `- ${a.name} [HP: ${a.currentHP}/${a.maxHP}] [ATK: ${a.ATK}] [DEF: ${a.DEF}] [SPD: ${a.SPD}]`
  ).join('\n');

  const beatInfo = currentBeat
    ? `\n【当前节目节奏】\n类型: ${currentBeat.type}\n描述: ${currentBeat.text}`
    : '\n【当前节目节奏】\n（暂无特别节奏）';

  const recentMemories = reporterMemory
    .slice(-10)
    .map((m) => `[#${m.actorActionIndex}] [${m.type}] ${m.title}: ${m.text}`)
    .join('\n');

  const systemRules = `
【系统规则】
你是星际斗兽场的节目总导演（Showrunner）。
你的职责是控制节目节奏、制造看点、引导演员表演方向。
- 你只能生成导演广播，不能直接修改任何游戏状态
- 你不能宣布任何演员死亡
- 你不能直接指定伤害数值
- 所有输出必须通过 DirectorBroadcast 注入，不经过审批

【导演广播原则】
1. 广播应该制造紧张感或戏剧性
2. 可以暗示危险、机会或意外
3. 应该引导演员的表演方向
4. 语气要像节目旁白，有娱乐性

【节目节奏类型】
- INTRO: 开场介绍
- TENSION: 紧张积累
- CLIMAX: 高潮时刻
- COOLDOWN: 缓冲阶段
- FINAL: 最终对决
`;

  const outputFormat = `
【输出格式】
必须输出一个 JSON 对象：
{
  "broadcastText": "导演广播文本（1-3句话，有戏剧性）",
  "scope": "GLOBAL | TARGETED",
  "targetActorIds": ["目标演员ID列表，如果scope是GLOBAL则为空数组"],
  "beatSignal": "INTRO | TENSION | CLIMAX | COOLDOWN | FINAL（当前节目节奏）",
  "reasoning": "为什么选择这个广播（50字以内）"
}
`;

  return [
    systemRules,
    stageInfo,
    `\n【存活演员】\n${actorList || '（无）'}`,
    deadActors.length > 0 ? `\n【已阵亡】\n${deadActors.map((a) => `- ${a.name}`).join('\n')}` : '',
    beatInfo,
    `\n【最近ReporterMemory】\n${recentMemories || '（暂无）'}`,
    outputFormat,
  ].join('\n');
}

/**
 * 最小调度规则：判断是否应该触发 showrunner
 * 触发条件三选一：阶段切换 / 重大事件 / 每 N 个 action
 */
export function shouldShowrunnerFire(
  actorActionIndex: number,
  lastShowrunnerActionIndex: number,
  cooldown: number,
  recentEvents: BattleState['eventLog']
): boolean {
  // Cooldown check
  if (actorActionIndex - lastShowrunnerActionIndex < cooldown) {
    return false;
  }

  // 阶段切换
  if (actorActionIndex === 0 || actorActionIndex === 10 || actorActionIndex === 20 || actorActionIndex === 30) {
    return true;
  }

  // 重大事件触发
  const hasMajorEvent = recentEvents.slice(-3).some(
    (e) => e.type === 'ACTOR_ELIMINATED' || e.type === 'MUTATION_SELECTED'
  );
  if (hasMajorEvent) {
    return true;
  }

  // 每 N 个 action 触发（默认每 5 个 action 一次）
  if (cooldown > 0 && actorActionIndex % cooldown === 0) {
    return true;
  }

  return false;
}