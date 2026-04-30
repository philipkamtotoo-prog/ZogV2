import type { BattleEvent, BattleState } from '../../core/battle/types';
import type { ReporterMemoryEntry, MemoryType } from './reporterMemory';

let _memorySeq = 0;
function nextMemoryId(): string {
  return `mem_${Date.now()}_${++_memorySeq}`;
}

function makeMemory(
  battleId: string,
  actorActionIndex: number,
  type: MemoryType,
  title: string,
  text: string,
  actorIds: string[],
  eventIds: string[],
  severity: 1 | 2 | 3 | 4 | 5,
  tags: string[] = [],
  source: 'SYSTEM' | 'LLM' = 'SYSTEM'
): ReporterMemoryEntry {
  return {
    memoryId: nextMemoryId(),
    battleId,
    actorActionIndex,
    type,
    title,
    text,
    actorIds,
    eventIds,
    severity,
    tags,
    source,
    createdAt: Date.now(),
  };
}

function getActorName(state: BattleState, actorId: string): string {
  return state.actors.find((a) => a.actorId === actorId)?.name ?? actorId;
}

function extractHpDamage(diffs: BattleEvent['diffs']): number {
  for (const d of diffs) {
    if (typeof d.path === 'string' && /currentHP/i.test(d.path)) {
      const oldVal = Number(d.oldValue);
      const newVal = Number(d.newValue);
      if (!isNaN(oldVal) && !isNaN(newVal) && oldVal > newVal) {
        return oldVal - newVal;
      }
    }
  }
  return 0;
}

export function evaluateEvent(
  event: BattleEvent,
  state: BattleState
): ReporterMemoryEntry | null {
  const { battleId } = state;
  const eventIndex = event.actorActionIndex;

  switch (event.type) {
    case 'ACTOR_ELIMINATED': {
      if (!event.targetActorId) return null;
      const name = getActorName(state, event.targetActorId);
      return makeMemory(
        battleId,
        eventIndex,
        'ACCIDENT',
        `${name} 阵亡！`,
        `在第 ${eventIndex} 回合，${name} 被淘汰出局，震撼全场！`,
        [event.targetActorId],
        [event.eventId],
        5,
        ['elimination'],
      );
    }

    case 'DAMAGE_DEALT': {
      const damage = extractHpDamage(event.diffs);
      if (damage === 0) return null;
      const target = event.targetActorId ? state.actors.find((a) => a.actorId === event.targetActorId) : null;
      if (!target) return null;
      const threshold = target.maxHP * 0.2;
      if (damage < threshold) return null;
      const severity = damage > target.maxHP * 0.6 ? 4 : 3;
      const actorName = event.activeActorId ? getActorName(state, event.activeActorId) : '神秘力量';
      return makeMemory(
        battleId,
        eventIndex,
        'HIGHLIGHT',
        `猛料！${target.name} 吃了 ${damage} 点伤害`,
        `${actorName} 对 ${target.name} 造成了 ${damage} 点暴击伤害，血量告急！`,
        [event.activeActorId, event.targetActorId].filter(Boolean) as string[],
        [event.eventId],
        severity as 3 | 4,
        ['damage'],
      );
    }

    case 'ITEM_USED': {
      let healAmount = 0;
      for (const d of event.diffs) {
        if (typeof d.path === 'string' && /currentHP/i.test(d.path)) {
          const oldVal = Number(d.oldValue);
          const newVal = Number(d.newValue);
          if (!isNaN(oldVal) && !isNaN(newVal) && newVal > oldVal) {
            healAmount = newVal - oldVal;
          }
        }
      }
      if (healAmount <= 0) return null;
      const targetName = event.targetActorId ? getActorName(state, event.targetActorId) : '某人';
      return makeMemory(
        battleId,
        eventIndex,
        'ITEM_DRAMA',
        `${targetName} 回血了！`,
        `第 ${eventIndex} 回合，${targetName} 使用道具回复了 ${healAmount} 点生命值，医学奇迹！`,
        event.targetActorId ? [event.targetActorId] : [],
        [event.eventId],
        2,
        ['item', 'heal'],
      );
    }

    case 'DIRECTOR_BROADCAST_INJECTED': {
      const actorNames: string[] = event.activeActorId ? [getActorName(state, event.activeActorId)] : [];
      const diffText = event.diffs[0] ? String(event.diffs[0].newValue) : '上帝降临';
      return makeMemory(
        battleId,
        eventIndex,
        'PLAYER_INTERVENTION',
        `玩家插手！${diffText.slice(0, 10)}`,
        `第 ${eventIndex} 回合，玩家发出指令：${diffText}`,
        actorNames,
        [event.eventId],
        3,
        ['broadcast', 'player'],
      );
    }

    case 'DODOS_STOLEN': {
      const diff = event.diffs.find((d) => d.path === 'dodosControlled');
      const stolen = diff ? Number(diff.oldValue) - Number(diff.newValue) : 0;
      if (stolen <= 0) return null;
      return makeMemory(
        battleId,
        eventIndex,
        'SHAME',
        `${event.activeActorId ? getActorName(state, event.activeActorId) : '某人'} 的嘟嘟鸟被偷了！`,
        `第 ${eventIndex} 回合，${event.activeActorId ? getActorName(state, event.activeActorId) : '某人'} 损失了 ${stolen} 只嘟嘟鸟，颜面尽失！`,
        event.activeActorId ? [event.activeActorId] : [],
        [event.eventId],
        2,
        ['dodo', 'shame'],
      );
    }

    case 'DODOS_BRIBED': {
      const diff = event.diffs.find((d) => d.path === 'dodoTrust');
      const trustLoss = diff ? Number(diff.oldValue) - Number(diff.newValue) : 0;
      if (trustLoss <= 0) return null;
      return makeMemory(
        battleId,
        eventIndex,
        'SHAME',
        `信任崩盘！${event.activeActorId ? getActorName(state, event.activeActorId) : '某人'} 的嘟嘟鸟叛变了`,
        `第 ${eventIndex} 回合，${event.activeActorId ? getActorName(state, event.activeActorId) : '某人'} 的嘟嘟鸟信任度暴跌 ${trustLoss}！`,
        event.activeActorId ? [event.activeActorId] : [],
        [event.eventId],
        2,
        ['dodo', 'trust', 'shame'],
      );
    }

    default:
      return null;
  }
}

/**
 * 检查低血量存留（HP < 30% 且还活着）
 * 这是 post-scan 检查，不基于单一事件
 */
export function evaluateLowHpSurvivors(state: BattleState): ReporterMemoryEntry[] {
  const memories: ReporterMemoryEntry[] = [];
  const threshold = 0.3;

  for (const actor of state.actors) {
    if (!actor.isAlive) continue;
    if (actor.currentHP < actor.maxHP * threshold) {
      memories.push(makeMemory(
        state.battleId,
        state.actorActionIndex,
        'ACCIDENT',
        `惨胜！${actor.name} 残血存活`,
        `第 ${state.actorActionIndex} 回合结算时，${actor.name} 仅剩 ${actor.currentHP}/${actor.maxHP} HP，勉强存活。`,
        [actor.actorId],
        [],
        2,
        ['lowhp'],
      ));
    }
  }

  return memories;
}

/**
 * 检查 0 嘟嘟鸟的情况
 */
export function evaluateZeroDodos(state: BattleState): ReporterMemoryEntry[] {
  const memories: ReporterMemoryEntry[] = [];

  for (const actor of state.actors) {
    if (!actor.isAlive) continue;
    if (actor.scene.dodosControlled === 0) {
      memories.push(makeMemory(
        state.battleId,
        state.actorActionIndex,
        'SHAME',
        `笑柄！${actor.name} 一只嘟嘟鸟都没有`,
        `第 ${state.actorActionIndex} 回合，${actor.name} 没有任何嘟嘟鸟在手，彻底沦为笑柄。`,
        [actor.actorId],
        [],
        2,
        ['dodo', 'shame'],
      ));
    }
  }

  return memories;
}
