import type { BattleEvent, BattleState } from '../../../core/battle/types';
import type { DisplayEvent } from './displayTypes';

function actorName(state: BattleState, actorId: string | undefined): string {
  if (!actorId) return 'Unknown';
  return state.actors.find((actor) => actor.actorId === actorId)?.name ?? 'Unknown';
}

function buildStageLine(text: string | undefined): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const sentences = clean.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [clean];
  const short = sentences.slice(0, 2).join('').trim();
  return short.length > 42 ? `${short.slice(0, 40)}...` : short;
}

function performanceMetadata(event: BattleEvent) {
  return {
    stageLine: buildStageLine(event.line),
    actionDescription: event.actionDescription ?? '',
    performanceIntent: event.performanceIntent ?? '',
  };
}

function actorLineEvent(
  event: BattleEvent,
  fallback: string,
  suffix = ''
): DisplayEvent {
  return {
    kind: 'ACTOR_LINE',
    eventId: `display_${event.eventId}${suffix}`,
    actorActionIndex: event.actorActionIndex,
    actorId: event.activeActorId ?? '',
    content: event.line ?? fallback,
    metadata: performanceMetadata(event),
  };
}

export function mapBattleEventToDisplayEvents(
  event: BattleEvent,
  battleState: BattleState
): DisplayEvent[] {
  const items: DisplayEvent[] = [];

  switch (event.type) {
    case 'ACTION_TAKEN': {
      const name = actorName(battleState, event.activeActorId);
      items.push(actorLineEvent(event, `${name} takes action.`));
      break;
    }

    case 'DAMAGE_DEALT': {
      const attacker = actorName(battleState, event.activeActorId);
      const target = actorName(battleState, event.targetActorId);
      items.push(actorLineEvent(event, `${attacker} attacks ${target}.`, '_line'));

      const hpDiff = event.diffs.find((diff) => diff.path === 'currentHP');
      if (hpDiff) {
        const oldHp = hpDiff.oldValue as number;
        const newHp = hpDiff.newValue as number;
        const damage = Math.abs(newHp - oldHp);
        items.push({
          kind: 'DAMAGE',
          eventId: `display_${event.eventId}_hp`,
          actorActionIndex: event.actorActionIndex,
          targetId: event.targetActorId ?? '',
          damage,
          oldHp,
          newHp,
          content: `${target} takes ${damage} damage.`,
        });
      }
      break;
    }

    case 'DODOS_STOLEN': {
      const actor = actorName(battleState, event.activeActorId);
      const target = actorName(battleState, event.targetActorId);
      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: event.actionDescription ?? `${actor} steals dodos from ${target}.`,
        metadata: performanceMetadata(event),
      });
      break;
    }

    case 'DODOS_BRIBED': {
      const actor = actorName(battleState, event.activeActorId);
      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: event.actionDescription ?? `${actor} bribes wild dodos with food.`,
        metadata: performanceMetadata(event),
      });
      break;
    }

    case 'NEST_CLAIMED': {
      const actor = actorName(battleState, event.activeActorId);
      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content: event.actionDescription ?? `${actor} claims nest influence.`,
        metadata: performanceMetadata(event),
      });
      break;
    }

    case 'STATUS_APPLIED': {
      const target = actorName(battleState, event.targetActorId);
      items.push({
        kind: 'STATUS',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        targetId: event.targetActorId ?? '',
        status: event.actionType ?? 'UNKNOWN',
        added: true,
        content: `${target} gains a status.`,
      });
      break;
    }

    case 'STATUS_REMOVED': {
      const target = actorName(battleState, event.targetActorId);
      items.push({
        kind: 'STATUS',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        targetId: event.targetActorId ?? '',
        status: event.actionType ?? 'UNKNOWN',
        added: false,
        content: `${target} loses a status.`,
      });
      break;
    }

    case 'ACTOR_ELIMINATED': {
      const target = actorName(battleState, event.targetActorId);
      items.push({
        kind: 'ELIMINATION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        targetId: event.targetActorId ?? '',
        content: `${target} is eliminated.`,
      });
      break;
    }

    case 'DIRECTOR_BROADCAST_INJECTED': {
      items.push({
        kind: 'BROADCAST',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        content: `Director signal: ${event.broadcastText ?? 'The show changes course.'}`,
        metadata: {
          broadcastId: event.directorBroadcastId,
        },
      });
      break;
    }

    case 'DRAMA_BEAT_STARTED': {
      items.push({
        kind: 'BROADCAST',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        content: event.broadcastText ?? '节目 Beat 发生变化',
      });
      break;
    }

    case 'ROUND_END': {
      items.push({
        kind: 'ACTOR_ACTION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: '',
        content: `Action ${event.actorActionIndex} ends.`,
      });
      break;
    }

    case 'MUTATION_SELECTED': {
      const mutationName = (event.diffs.find((diff) => diff.path === 'selectedMutation')?.newValue as string) ?? '';
      items.push({
        kind: 'MUTATION',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        mutationId: event.mutationId ?? '',
        mutationName,
        content: `Program mutation activated: ${mutationName}`,
      });
      break;
    }

    case 'PROMPT_INJECTION_APPLIED': {
      const actor = actorName(battleState, event.activeActorId);
      items.push({
        kind: 'PROMPT',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId ?? '',
        content:
          event.promptSource === 'PERMANENT'
            ? `Permanent script injected: ${actor}`
            : `Episode script injected: ${actor}`,
        source: event.promptSource ?? 'EPISODE',
      });
      break;
    }

    case 'ZOG_REACTION_EMITTED': {
      items.push({
        kind: 'ZOG',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        content: event.zogReaction ?? 'Zog has no comment.',
      });
      break;
    }

    case 'ITEM_USED': {
      const actor = actorName(battleState, event.activeActorId);
      const target = actorName(battleState, event.targetActorId);
      items.push({
        kind: 'ITEM',
        eventId: `display_${event.eventId}`,
        actorActionIndex: event.actorActionIndex,
        actorId: event.activeActorId,
        targetId: event.targetActorId ?? '',
        itemId: event.itemId ?? event.actionType ?? 'ITEM',
        itemName: event.actionType ?? 'ITEM',
        source: 'PLAYER',
        content: event.actionDescription ?? `${actor} uses an item on ${target}.`,
      });

      const healDiff = event.diffs.find(
        (diff) => diff.path === 'currentHP' && (diff.newValue as number) > (diff.oldValue as number)
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
          content: `${target} recovers ${Math.abs(newHp - oldHp)} HP.`,
        });
      }

      const statusDiffs = event.diffs.filter((diff) => diff.path === 'statuses');
      for (const statusDiff of statusDiffs) {
        const oldStatuses = (statusDiff.oldValue as string[]) ?? [];
        const newStatuses = (statusDiff.newValue as string[]) ?? [];
        const added = newStatuses.filter((status) => !oldStatuses.includes(status));
        const removed = oldStatuses.filter((status) => !newStatuses.includes(status));

        for (const status of added) {
          items.push({
            kind: 'STATUS',
            eventId: `display_${event.eventId}_status_${status}`,
            actorActionIndex: event.actorActionIndex,
            targetId: event.targetActorId ?? '',
            status,
            added: true,
            content: `${target} gains status ${status}.`,
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
            content: `${target} loses status ${status}.`,
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return items;
}

export function mapEventLogToDisplayEvents(
  eventLog: BattleEvent[],
  battleState: BattleState
): DisplayEvent[] {
  const items: DisplayEvent[] = [];

  for (const event of eventLog) {
    items.push(...mapBattleEventToDisplayEvents(event, battleState));
  }

  return items;
}
