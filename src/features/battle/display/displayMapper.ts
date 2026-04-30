/**
 * displayMapper - BattleEvent -> DisplayEvent
 * 将战斗事件转换为表现项
 */

import type { BattleEvent, BattleState, DisplayItem } from '../../../core/battle/types';

/**
 * 将 BattleEvent 映射为 DisplayItem
 */
export function mapBattleEventToDisplayItem(
  event: BattleEvent,
  battleState: BattleState
): DisplayItem[] {
  const items: DisplayItem[] = [];

  switch (event.type) {
    case 'ACTION_TAKEN': {
      const actor = battleState.actors.find((a: { actorId: string }) => a.actorId === event.activeActorId);
      const actorName = actor?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'LINE',
        actorId: event.activeActorId,
        content: event.line ?? `${actorName} 采取了行动`,
        metadata: {
          actionDescription: event.actionDescription,
          performanceIntent: '', // 需要从 actorBrainOutput 获取
        },
      });
      break;
    }

    case 'DAMAGE_DEALT': {
      const actor = battleState.actors.find((a: { actorId: string }) => a.actorId === event.activeActorId);
      const target = battleState.actors.find((a: { actorId: string }) => a.actorId === event.targetActorId);
      const actorName = actor?.name ?? 'Unknown';
      const targetName = target?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}_line`,
        actorActionIndex: event.actorActionIndex,
        type: 'LINE',
        actorId: event.activeActorId,
        targetId: event.targetActorId,
        content: event.line ?? `${actorName} 对 ${targetName} 造成了伤害`,
      });

      // 提取 HP 变化
      const hpDiff = event.diffs.find((d) => d.path === 'currentHP');
      if (hpDiff) {
        const oldHp = hpDiff.oldValue as number;
        const newHp = hpDiff.newValue as number;
        items.push({
          itemId: `display_${event.eventId}_hp`,
          actorActionIndex: event.actorActionIndex,
          type: 'HP_CHANGE',
          actorId: event.targetActorId,
          content: `${targetName} 受到了 ${Math.abs(newHp - oldHp)} 点伤害`,
          metadata: {
            hpChange: newHp - oldHp,
            oldHp,
            newHp,
          },
        });
      }
      break;
    }

    case 'DODOS_STOLEN': {
      const actor = battleState.actors.find((a: { actorId: string }) => a.actorId === event.activeActorId);
      const target = battleState.actors.find((a: { actorId: string }) => a.actorId === event.targetActorId);
      const actorName = actor?.name ?? 'Unknown';
      const targetName = target?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'ACTION',
        actorId: event.activeActorId,
        targetId: event.targetActorId,
        content: `${actorName} 从 ${targetName} 那里偷走了渡渡鸟！`,
      });
      break;
    }

    case 'DODOS_BRIBED': {
      const actor = battleState.actors.find((a: { actorId: string }) => a.actorId === event.activeActorId);
      const actorName = actor?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'ACTION',
        actorId: event.activeActorId,
        content: `${actorName} 用食物引诱了野生渡渡鸟！`,
      });
      break;
    }

    case 'NEST_CLAIMED': {
      const actor = battleState.actors.find((a: { actorId: string }) => a.actorId === event.activeActorId);
      const actorName = actor?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'ACTION',
        actorId: event.activeActorId,
        content: `${actorName} 占领了新的巢区！`,
      });
      break;
    }

    case 'STATUS_APPLIED': {
      const target = battleState.actors.find((a: { actorId: string }) => a.actorId === event.targetActorId);
      const targetName = target?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'STATUS_CHANGE',
        actorId: event.targetActorId,
        content: `${targetName} 被施加了新的状态`,
        metadata: {
          statusAdded: event.actionType ?? 'UNKNOWN',
        },
      });
      break;
    }

    case 'STATUS_REMOVED': {
      const target = battleState.actors.find((a: { actorId: string }) => a.actorId === event.targetActorId);
      const targetName = target?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'STATUS_CHANGE',
        actorId: event.targetActorId,
        content: `${targetName} 的状态解除了`,
      });
      break;
    }

    case 'ACTOR_ELIMINATED': {
      const target = battleState.actors.find((a: { actorId: string }) => a.actorId === event.targetActorId);
      const targetName = target?.name ?? 'Unknown';

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'ELIMINATION',
        actorId: event.targetActorId,
        content: `${targetName} 被淘汰了！`,
      });
      break;
    }

    case 'DIRECTOR_BROADCAST_INJECTED': {
      // 需要从 event.diffs 中提取 broadcast text
      const broadcastDiff = event.diffs.find((d: { path: string }) => d.path === 'directorBroadcast.text');

      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'BROADCAST',
        content: broadcastDiff
          ? (broadcastDiff.newValue as string)
          : '导演广播',
      });
      break;
    }

    case 'ROUND_END': {
      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'ROUND_END',
        content: `第 ${event.actorActionIndex} 回合结束`,
      });
      break;
    }

    default:
      // 其他事件类型，生成简单展示
      items.push({
        itemId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        type: 'ACTION',
        actorId: event.activeActorId,
        content: event.actionDescription ?? `行动 #${event.actorActionIndex}`,
      });
  }

  return items;
}

/**
 * 将多个 BattleEvent 转换为 DisplayItem 数组
 */
export function mapEventLogToDisplayQueue(eventLog: BattleEvent[], battleState: BattleState): DisplayItem[] {
  const items: DisplayItem[] = [];

  for (const event of eventLog) {
    items.push(...mapBattleEventToDisplayItem(event, battleState));
  }

  return items;
}
