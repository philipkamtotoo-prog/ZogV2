import type { BattleState, BattleEvent } from '../../core/battle/types';
import type { FinalScore } from '../../core/battle/finalScore';

export function buildReporterPrompt(
  battleState: BattleState,
  finalScores: FinalScore[],
  highlights: string[]
): string {
  const winner = finalScores.find((s) => s.isWinner);
  const mvp = finalScores.find((s) => s.isMVP);
  const aliveActors = battleState.actors.filter((a) => a.isAlive);
  const deadActors = battleState.actors.filter((a) => !a.isAlive);

  const eventSummary = summarizeEvents(battleState.eventLog);

  const systemRules = `
【系统规则】
你是渡渡岛大乱斗的战报记者。你需要根据真实发生的战斗事件生成一份有趣、生动的战报。
- 你只能描述已经发生的事件，不能虚构未发生的事
- 你不能修改任何战斗结果
- 战报需要有娱乐性，但必须基于事实
- 使用中文输出
`;

  const battleInfo = `
【战斗概况】
战斗ID: ${battleState.battleId}
总行动数: ${battleState.actorActionIndex}
总事件数: ${battleState.eventLog.length}
存活演员: ${aliveActors.map((a) => a.name).join(', ') || '无'}
阵亡演员: ${deadActors.map((a) => a.name).join(', ') || '无'}
`;

  const scoreBoard = `
【最终排名】
${finalScores.map((s) => `#${s.rank} ${s.name} - ${s.finalScore}分 ${s.isWinner ? '(胜者)' : ''} ${s.isMVP ? '(MVP)' : ''}`).join('\n')}
`;

  const winnerInfo = winner
    ? `胜者: ${winner.name} (${winner.finalScore}分)`
    : '无明确胜者';

  const mvpInfo = mvp
    ? `MVP: ${mvp.name} (${mvp.finalScore}分)`
    : '无MVP';

  const highlightSection = highlights.length > 0
    ? `\n【高光时刻】\n${highlights.join('\n')}`
    : '';

  const commandRecords = battleState.commandTransactions.length > 0
    ? `\n【玩家指令记录】\n${battleState.commandTransactions.map((t) => `- "${t.rawInput}" → ${t.status}`).join('\n')}`
    : '';

  const outputFormat = `
【输出格式】
你必须输出一个 JSON 对象：
{
  "title": "节目标题（10字以内，有趣的标题）",
  "summary": "本期摘要（50-100字）",
  "winnerComment": "对胜者的一句评价",
  "mvpComment": "对MVP的一句评价",
  "highlightDialogue": "最精彩的一句台词或描述",
  "biggestIncident": "本期最大的节目事故（如果有的话）",
  "zogReaction": "Zog看完节目后的反应（一句话）"
}
`;

  return [
    systemRules,
    battleInfo,
    eventSummary,
    scoreBoard,
    `${winnerInfo}\n${mvpInfo}`,
    highlightSection,
    commandRecords,
    outputFormat,
  ].join('\n');
}

function summarizeEvents(eventLog: BattleEvent[]): string {
  const typeCounts = new Map<string, number>();
  for (const e of eventLog) {
    typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
  }

  const lines = [`\n【事件统计】`];
  for (const [type, count] of typeCounts) {
    lines.push(`- ${type}: ${count}次`);
  }

  const eliminations = eventLog.filter((e) => e.type === 'ACTOR_ELIMINATED');
  if (eliminations.length > 0) {
    lines.push(`\n【淘汰顺序】`);
    eliminations.forEach((e, i) => {
      lines.push(`${i + 1}. ${e.targetActorId} 在第${e.actorActionIndex}回合被淘汰`);
    });
  }

  return lines.join('\n');
}
