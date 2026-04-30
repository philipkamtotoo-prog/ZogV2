import type { BattleEvent, BattleEventType, BattleEventTag } from './types';

/**
 * 创建 BattleEvent helper
 */
export function createBattleEvent(
  actorActionIndex: number,
  type: BattleEventType,
  data: {
    eventId?: string;
    activeActorId?: string;
    targetActorId?: string;
    actionType?: string;
    line?: string;
    actionDescription?: string;
    directorBroadcastId?: string;
    diffs?: unknown[];
    tags?: BattleEventTag[];
  } = {}
): BattleEvent {
  return {
    eventId: data.eventId ?? `evt_${Date.now()}_${actorActionIndex}`,
    actorActionIndex,
    type,
    activeActorId: data.activeActorId,
    targetActorId: data.targetActorId,
    actionType: data.actionType as BattleEvent['actionType'],
    line: data.line,
    actionDescription: data.actionDescription,
    directorBroadcastId: data.directorBroadcastId,
    diffs: (data.diffs ?? []) as BattleEvent['diffs'],
    tags: data.tags ?? [],
    createdAt: Date.now(),
  };
}

/**
 * 添加 event 到 eventLog
 */
export function appendEvent(
  eventLog: BattleEvent[],
  event: BattleEvent
): BattleEvent[] {
  return [...eventLog, event];
}

/**
 * 获取某演员的所有事件
 */
export function getActorEvents(
  eventLog: BattleEvent[],
  actorId: string
): BattleEvent[] {
  return eventLog.filter(
    (e) => e.activeActorId === actorId || e.targetActorId === actorId
  );
}

/**
 * 获取某回合的所有事件
 */
export function getEventsAtActionIndex(
  eventLog: BattleEvent[],
  actionIndex: number
): BattleEvent[] {
  return eventLog.filter((e) => e.actorActionIndex === actionIndex);
}

/**
 * 获取某类型的所有事件
 */
export function getEventsByType(
  eventLog: BattleEvent[],
  type: BattleEventType
): BattleEvent[] {
  return eventLog.filter((e) => e.type === type);
}

/**
 * 格式化事件为可读文本（用于战报）
 */
export function formatEventAsText(event: BattleEvent, actors: Map<string, string>): string {
  const actorName = event.activeActorId ? actors.get(event.activeActorId) ?? 'Unknown' : 'System';
  const targetName = event.targetActorId ? actors.get(event.targetActorId) ?? 'Unknown' : '';

  switch (event.type) {
    case 'ACTION_TAKEN':
      return `${actorName} 采取了行动`;
    case 'DAMAGE_DEALT':
      return `${actorName} 对 ${targetName} 造成了伤害`;
    case 'DODOS_STOLEN':
      return `${actorName} 偷走了渡渡鸟`;
    case 'DODOS_BRIBED':
      return `${actorName} 用食物引诱了渡渡鸟`;
    case 'NEST_CLAIMED':
      return `${actorName} 占领了巢区`;
    case 'ACTOR_ELIMINATED':
      return `${targetName} 被淘汰`;
    default:
      return `${actorName} 的行动`;
  }
}
