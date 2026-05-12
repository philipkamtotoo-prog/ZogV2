/**
 * 功能备注：战斗 UI 展示文本工具。
 * 负责战报去重、记者前缀清理、DisplayEvent 类型转标题/标签等纯函数。
 */
import type { DisplayEvent } from '../display/displayTypes';

export function reportFingerprint(title: string, content: string): string {
  return `${title}|${content}`.replace(/\s+/g, ' ').trim();
}

export function stripReporterLabel(text: string): string {
  return text.replace(/战地记者[：:，,\s]*/g, '').trim();
}

export function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const results: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}

export function eventKindLabel(kind: DisplayEvent['kind']): string {
  if (kind === 'ACTOR_LINE') return '台词';
  if (kind === 'ACTOR_ACTION') return '动作';
  if (kind === 'DAMAGE') return '攻击';
  if (kind === 'HEAL') return '恢复';
  if (kind === 'STATUS') return '状态';
  if (kind === 'ELIMINATION') return '退场';
  if (kind === 'ITEM') return '道具';
  if (kind === 'BROADCAST') return '导演播报';
  if (kind === 'REPORTER') return '战地记者';
  if (kind === 'ZOG') return 'Zog';
  if (kind === 'MUTATION') return '突变';
  if (kind === 'PROMPT') return '人设注入';
  return kind;
}

export function displayEventTitle(item: DisplayEvent): string {
  if (item.kind === 'BROADCAST') return 'DramaBeat / 导演播报';
  if (item.kind === 'REPORTER') return '战地记者信息';
  if (item.kind === 'ZOG') return 'Zog 旁观';
  if (item.kind === 'MUTATION') return item.mutationName;
  if (item.kind === 'PROMPT') return '演员人设注入';
  return eventKindLabel(item.kind);
}
