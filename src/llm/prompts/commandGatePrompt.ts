/**
 * CommandGate Prompt
 * 玩家上帝指令审查
 */

import type { BattleState, CommandGateDecision, CommandTargetOption, DirectorBroadcastDraft } from '../../core/battle/types';

/**
 * 构建 CommandGate 的 Prompt
 */
export function buildCommandGatePrompt(
  rawInput: string,
  battleState: BattleState
): string {
  const aliveActors = battleState.actors.filter((a) => a.isAlive);

  // === 系统规则 ===
  const systemRules = `
【系统规则】
你是导演指令审查员。你的职责是判断玩家的指令是否可以被节目接受。
- 你只能生成 directorBroadcast，不能直接修改任何游戏状态
- 你不能宣布任何演员死亡
- 你不能直接指定伤害数值
- 如果指令试图做以上事情，你必须拒绝或降级

【可用指令类型】
1. ALLOW：指令可以安全执行，生成导演广播
2. ASK：指令需要澄清（如目标不明确）
3. DOWNGRADE：指令过于强硬，降级为更安全的版本
4. REJECT：指令违反规则，拒绝执行
`;

  // === 当前状态 ===
  const stateInfo = `
【当前战场状态】
演员数: ${aliveActors.length}
回合: ${battleState.actorActionIndex}

演员列表:
${aliveActors.map((a) => `- ${a.name} [HP: ${a.currentHP}/${a.maxHP}]`).join('\n')}
`;

  // === 指令示例 ===
  const examples = `
【判定示例】

输入: "下雨了"
判定: ALLOW
理由: 自然现象播报，无数值影响
生成广播: "天空开始下雨，渡渡鸟们惊慌地四处奔逃"

输入: "TDog 死了"
判定: REJECT
理由: 不能直接宣布演员死亡

输入: "把 TDog 打死"
判定: DOWNGRADE
理由: "打死"过于强硬，降级为暗示性广播
生成广播: "TDog 不小心踩到了陷阱，陷入了困境"

输入: "他受伤了"
判定: ASK
理由: 代词"他"指向不明确，需要澄清目标
追问文案: "你想让哪个演员受伤？"
候选目标:
  - { "actorId": "tdog", "label": "T-Dog" }
  - { "actorId": "cybercat", "label": "Cybercat" }
`;

  // === 输出格式 ===
  const outputFormat = `
【输出格式】
你必须输出一个 JSON 对象：
{
  "decision": "ALLOW | ASK | DOWNGRADE | REJECT",
  "reason": "判定理由",
  "normalizedInput": "标准化后的指令",
  "directorBroadcast": {
    "text": "生成的导演广播文本",
    "scope": "GLOBAL | TARGETED",
    "targetActorIds": ["目标演员ID列表"]
  }, // 仅 ALLOW 和 DOWNGRADE 需要
  "targetQuestion": "追问文案", // 仅 ASK 需要，如"你想让哪个演员闭嘴？"
  "targetOptions": [ // 仅 ASK 需要，当前存活演员列表
    { "actorId": "actor_id_1", "label": "演员名字1" },
    { "actorId": "actor_id_2", "label": "演员名字2" }
  ]
}
`;

  return [
    systemRules,
    stateInfo,
    examples,
    outputFormat,
    `【玩家指令】\n${rawInput}`,
  ].join('\n');
}

const WEATHER_BROADCAST_MAP: Record<string, string> = {
  '下雨': '天空突然下起了雨，渡渡鸟们惊慌地四处奔逃',
  '下雪': '大雪纷飞，整个荒岛被白雪覆盖',
  '刮风': '狂风大作，沙尘漫天飞舞',
  '闪电': '闪电划破天空，震耳欲聋的雷声回荡',
  '地震': '大地开始颤抖，脚下的地面剧烈摇晃',
};

/**
 * 快速判定（不需要 LLM）
 */
export function quickEvaluate(rawInput: string, battleState?: BattleState): {
  decision: CommandGateDecision;
  reason: string;
  draft?: DirectorBroadcastDraft;
  targetQuestion?: string;
  targetOptions?: CommandTargetOption[];
} | null {
  const input = rawInput.toLowerCase().trim();

  if (/(死了|死亡|被杀了|被干掉了)/.test(input)) {
    return { decision: 'REJECT', reason: '不能直接宣布演员死亡' };
  }

  const downgradeMatch = /把\s*(\S+)\s*(打死|重创|消灭|击杀)/.exec(input);
  if (downgradeMatch) {
    const actorName = downgradeMatch[1];
    return {
      decision: 'DOWNGRADE',
      reason: '指令过于强硬',
      draft: {
        text: `${actorName}不小心踩到了陷阱，陷入了困境`,
        scope: 'GLOBAL',
        targetActorIds: [],
        lifetime: 'NEXT_ACTION',
      },
    };
  }

  const weatherMatch = /^(下雨|下雪|刮风|闪电|地震)/.exec(input);
  if (weatherMatch) {
    const keyword = weatherMatch[1];
    return {
      decision: 'ALLOW',
      reason: '自然现象播报',
      draft: {
        text: WEATHER_BROADCAST_MAP[keyword] ?? rawInput,
        scope: 'GLOBAL',
        targetActorIds: [],
        lifetime: 'NEXT_ACTION',
      },
    };
  }

  if (/^(他|她|它)\s/.test(input)) {
    const aliveActors = battleState?.actors.filter((a) => a.isAlive) ?? [];
    return {
      decision: 'ASK',
      reason: '目标不明确',
      targetQuestion: '你想让哪个演员？',
      targetOptions: aliveActors.map((a) => ({ actorId: a.actorId, label: a.name })),
    };
  }

  return null;
}
