/**
 * displayMapper - BattleEvent -> DisplayEvent
 * 将战斗事件转换为表现项（DisplayEvent discriminated union）
 */

import type { BattleEvent, BattleState } from '../../../core/battle/types';
import type { DisplayEvent } from './displayTypes';

/**
 * 将 BattleEvent 映射为 DisplayEvent[]
 */
export function mapBattleEventToDisplayEvents(
  event: BattleEvent,
  battleState: BattleState
): DisplayEvent[] {
  const items: DisplayEvent[] = [];

  switch (event.type) {
    case 'ACTION_TAKEN': {
      const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
      const actorName = actor?.name ?? 'Unknown';

      items.push({
        kind: 'ACTOR_LINE',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: event.line ?? `${actorName} 采取了行动`,
        metadata: {
          actionDescription: event.actionDescription,
          performanceIntent: '',
        },
      });
      break;
    }

    case 'DAMAGE_DEALT': {
      const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
      const target = battleState.actors.find((a) => a.actorId === event.targetActorId);
      const actorName = actor?.name ?? 'Unknown';
      const targetName = target?.name ?? 'Unknown';

      items.push({
        kind: 'ACTOR_LINE',
        eventId: `display_${event.eventId}_line`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: event.line ?? `${actorName} 对 ${targetName} 造成了伤害`,
      });

      const hpDiff = event.diffs.find((d) => d.path === 'currentHP');
      if (hpDiff) {
        const oldHp = hpDiff.oldValue as number;
        const newHp = hpDiff.newValue as number;
        items.push({
          kind: 'DAMAGE',
          eventId: `display_${event.eventId}_hp`,
          actorActionIndex: event.actorActionIndex,
          targetId: event.targetActorId ?? '',
          damage: Math.abs(newHp - oldHp),
          oldHp,
          newHp,
          content: `${targetName} 受到了 ${Math.abs(newHp - oldHp)} 点伤害`,
        });
      }
      break;
    }

    case 'DODOS_STOLEN': {
      const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
      const target = battleState.actors.find((a) => a.actorId === event.targetActorId);
      const actorName = actor?.name ?? 'Unknown';
      const targetName = target?.name ?? 'Unknown';

      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: `${actorName} 从 ${targetName} 那里偷走了渡渡鸟！`,
      });
      break;
    }

    case 'DODOS_BRIBED': {
      const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
      const actorName = actor?.name ?? 'Unknown';

      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: `${actorName} 用食物引诱了野生渡渡鸟！`,
      });
      break;
    }

    case 'NEST_CLAIMED': {
      const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
      const actorName = actor?.name ?? 'Unknown';

      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: `${actorName} 占领了新的巢区！`,
      });
      break;
    }

    case 'STATUS_APPLIED': {
      const target = battleState.actors.find((a) => a.actorId === event.targetActorId);
      const targetName = target?.name ?? 'Unknown';

      items.push({
        kind: 'STATUS',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        targetId: event.targetActorId ?? '',
        status: event.actionType ?? 'UNKNOWN',
        added: true,
        content: `${targetName} 被施加了新的状态`,
      });
      break;
    }

    case 'STATUS_REMOVED': {
      const target = battleState.actors.find((a) => a.actorId === event.targetActorId);
      const targetName = target?.name ?? 'Unknown';

      items.push({
        kind: 'STATUS',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        targetId: event.targetActorId ?? '',
        status: event.actionType ?? 'UNKNOWN',
        added: false,
        content: `${targetName} 的状态解除了`,
      });
      break;
    }

    case 'ACTOR_ELIMINATED': {
      const target = battleState.actors.find((a) => a.actorId === event.targetActorId);
      const targetName = target?.name ?? 'Unknown';

      items.push({
        kind: 'ELIMINATION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        targetId: event.targetActorId ?? '',
        content: `${targetName} 被淘汰了！`,
      });
      break;
    }

    case 'DIRECTOR_BROADCAST_INJECTED': {
      items.push({
        kind: 'BROADCAST',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        content: event.broadcastText ?? '导演广播',
        metadata: {
          broadcastId: event.directorBroadcastId,
        },
      });
      break;
    }

    case 'ROUND_END': {
      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: '',
        content: `第 ${event.actorActionIndex} 回合结束`,
      });
      break;
    }

    case 'MUTATION_SELECTED': {
      const mutationName = event.diffs.find((d) => d.path === 'selectedMutation')?.newValue as string ?? '';
      items.push({
        kind: 'MUTATION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        mutationId: event.mutationId ?? '',
        mutationName,
        content: `节目突变规则激活：${mutationName}`,
      });
      break;
    }

    case 'PROMPT_INJECTION_APPLIED': {
      const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
      items.push({
        kind: 'PROMPT',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: event.promptSource === 'PERMANENT'
          ? `永久剧本指令已激活：${actor?.name ?? event.activeActorId}`
          : `为 ${actor?.name ?? event.activeActorId} 注入了临时剧本指令`,
        source: event.promptSource ?? 'EPISODE',
      });
      break;
    }

    case 'ZOG_REACTION_EMITTED': {
      items.push({
        kind: 'ZOG',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        content: event.zogReaction ?? 'Zog 无话可说',
      });
      break;
    }

    case 'ITEM_USED': {
      const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
      const target = battleState.actors.find((a) => a.actorId === event.targetActorId);
      const actorName = actor?.name ?? 'Unknown';
      const targetName = target?.name ?? 'Unknown';

        items.push({
          kind: 'ITEM',
          eventId: `display_${event.eventId}`,
          actorActionIndex: event.actorActionIndex,
          actorId: event.activeActorId,
          targetId: event.targetActorId ?? '',
          itemId: event.itemId ?? event.actionType ?? 'ITEM',
          itemName: event.actionType ?? 'ITEM',
        source: 'PLAYER',
        content: event.actionDescription ?? `${actorName} 对 ${targetName} 使用了道具`,
      });

      // 如果有回血 diff，额外出 HEAL
      const healDiff = event.diffs.find(
        (d) => d.path === 'currentHP' && (d.newValue as number) > (d.oldValue as number)
      );
      if (healDiff) {
        const oldHp = healDiff.oldValue as number;
        const newHp = healDiff.newValue as number;
        items.push({
          kind: 'HEAL',
          eventId: `display_${event.eventId}_heal`,
          actorActionIndex: event.actorActionIndex,
          targetId: event.targetActorId ?? '',
          healAmount: Math.abs(newHp - oldHp),
          oldHp,
          newHp,
          content: `${targetName} 回复了 HP`,
        });
      }

      // 如果有状态 diff（可能有多条），额外出 STATUS
      const statusDiffs = event.diffs.filter((d) => d.path === 'statuses');
      for (const statusDiff of statusDiffs) {
        const oldStatuses = (statusDiff.oldValue as string[]) ?? [];
        const newStatuses = (statusDiff.newValue as string[]) ?? [];
        const added = newStatuses.filter((s) => !oldStatuses.includes(s));
        const removed = oldStatuses.filter((s) => !newStatuses.includes(s));
        for (const status of added) {
          items.push({
            kind: 'STATUS',
            eventId: `display_${event.eventId}_status_${status}`,
            actorActionIndex: event.actorActionIndex,
            targetId: event.targetActorId ?? '',
            status,
            added: true,
            content: `${targetName} 获得了状态: ${status}`,
          });
        }
        for (const status of removed) {
          items.push({
            kind: 'STATUS',
            eventId: `display_${event.eventId}_status_${status}_rm`,
            actorActionIndex: event.actorActionIndex,
            targetId: event.targetActorId ?? '',
            status,
            added: false,
            content: `${targetName} 失去了状态: ${status}`,
          });
        }
      }
      break;
    }

    default:
      // 未识别的事件类型，静默返回空数组
      break;
  }

  return items;
}

/**
 * 将多个 BattleEvent 转换为 DisplayEvent 数组
 */
export function mapEventLogToDisplayEvents(eventLog: BattleEvent[], battleState: BattleState): DisplayEvent[] {
  const items: DisplayEvent[] = [];

  for (const event of eventLog) {
    items.push(...mapBattleEventToDisplayEvents(event, battleState));
  }

  return items;
}
