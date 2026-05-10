import type { BattleEvent, BattleState } from '../../core/battle/types';
import type { ReporterMemoryEntry, MemoryType } from './reporterMemory';

let memorySeq = 0;

function nextMemoryId(): string {
  return `mem_${Date.now()}_${++memorySeq}`;
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
  return state.actors.find((actor) => actor.actorId === actorId)?.name ?? actorId;
}

function extractHpDamage(diffs: BattleEvent['diffs']): number {
  for (const diff of diffs) {
    if (/currentHP/i.test(diff.path)) {
      const oldValue = Number(diff.oldValue);
      const newValue = Number(diff.newValue);
      if (!Number.isNaN(oldValue) && !Number.isNaN(newValue) && oldValue > newValue) {
        return oldValue - newValue;
      }
    }
  }
  return 0;
}

export function evaluateEvent(event: BattleEvent, state: BattleState): ReporterMemoryEntry | null {
  const battleId = state.battleId;
  const eventIndex = event.actorActionIndex;

  switch (event.type) {
    case 'ACTOR_ELIMINATED': {
      if (!event.targetActorId) return null;
      const name = getActorName(state, event.targetActorId);
      return makeMemory(
        battleId,
        eventIndex,
        'ACCIDENT',
        `${name} 阵亡`,
        `第 ${eventIndex} 回合，${name} 被淘汰出局，震动全场。`,
        [event.targetActorId],
        [event.eventId],
        5,
        ['elimination']
      );
    }

    case 'DAMAGE_DEALT': {
      const damage = extractHpDamage(event.diffs);
      if (damage === 0) return null;
      const target = event.targetActorId
        ? state.actors.find((actor) => actor.actorId === event.targetActorId)
        : null;
      if (!target) return null;

      const threshold = target.maxHP * 0.2;
      if (damage < threshold) return null;

      const severity = damage > target.maxHP * 0.6 ? 4 : 3;
      const actorName = event.activeActorId ? getActorName(state, event.activeActorId) : '神秘力量';
      return makeMemory(
        battleId,
        eventIndex,
        'HIGHLIGHT',
        `猛料：${target.name} 吃了 ${damage} 点伤害`,
        `${actorName} 对 ${target.name} 造成了 ${damage} 点重击，血线瞬间告急。`,
        [event.activeActorId, event.targetActorId].filter(Boolean) as string[],
        [event.eventId],
        severity as 3 | 4,
        ['damage']
      );
    }

    case 'ITEM_USED': {
      let healAmount = 0;
      for (const diff of event.diffs) {
        if (/currentHP/i.test(diff.path)) {
          const oldValue = Number(diff.oldValue);
          const newValue = Number(diff.newValue);
          if (!Number.isNaN(oldValue) && !Number.isNaN(newValue) && newValue > oldValue) {
            healAmount = newValue - oldValue;
          }
        }
      }
      if (healAmount <= 0) return null;

      const targetName = event.targetActorId ? getActorName(state, event.targetActorId) : '某人';
      return makeMemory(
        battleId,
        eventIndex,
        'ITEM_DRAMA',
        `${targetName} 回血了`,
        `第 ${eventIndex} 回合，${targetName} 使用道具恢复了 ${healAmount} 点生命值。`,
        event.targetActorId ? [event.targetActorId] : [],
        [event.eventId],
        2,
        ['item', 'heal']
      );
    }

    case 'DIRECTOR_BROADCAST_INJECTED': {
      const actorIds = event.activeActorId ? [event.activeActorId] : [];
      const text = event.broadcastText ?? '节目组切入了一条导播信号';
      return makeMemory(
        battleId,
        eventIndex,
        'PLAYER_INTERVENTION',
        `导播插手：${text.slice(0, 12)}`,
        `第 ${eventIndex} 回合，节目组切入了一条导播信号：${text}`,
        actorIds,
        [event.eventId],
        3,
        ['broadcast', 'director']
      );
    }

    case 'DRAMA_BEAT_STARTED': {
      const beat = state.currentBeat;
      const conflictNames = beat?.conflictActorIds.map((id) => getActorName(state, id)).join('、') ?? '若干演员';
      const sideNames = beat?.sideActorIds.map((id) => getActorName(state, id)).join('、') || '镜头边缘的人';
      return makeMemory(
        battleId,
        eventIndex,
        'STAGE_BRIEF',
        beat?.title ?? '节目 Beat 变更',
        beat?.reporterLine ?? event.broadcastText ?? '节目节奏突然变了。',
        [...(beat?.conflictActorIds ?? []), ...(beat?.sideActorIds ?? [])],
        [event.eventId],
        4,
        ['beat', 'brief', `conflict:${conflictNames}`, `side:${sideNames}`],
      );
    }

    case 'DODOS_STOLEN': {
      const targetDodoDiff = event.diffs.find((diff) => diff.path === 'scene.dodosControlled');
      const stolen = targetDodoDiff
        ? Math.max(0, Number(targetDodoDiff.oldValue) - Number(targetDodoDiff.newValue))
        : 0;
      if (stolen <= 0) return null;

      const attackerName = event.activeActorId ? getActorName(state, event.activeActorId) : '某人';
      const targetName = event.targetActorId ? getActorName(state, event.targetActorId) : '某人';
      return makeMemory(
        battleId,
        eventIndex,
        'SHAME',
        `${targetName} 的渡渡鸟被偷了`,
        `第 ${eventIndex} 回合，${attackerName} 从 ${targetName} 手里抢走了 ${stolen} 只渡渡鸟。`,
        [event.activeActorId, event.targetActorId].filter(Boolean) as string[],
        [event.eventId],
        2,
        ['dodo', 'shame']
      );
    }

    case 'DODOS_BRIBED': {
      const dodoGainDiff = event.diffs.find((diff) => diff.path === 'scene.dodosControlled');
      const dodosGained = dodoGainDiff
        ? Math.max(0, Number(dodoGainDiff.newValue) - Number(dodoGainDiff.oldValue))
        : 0;
      const actorName = event.activeActorId ? getActorName(state, event.activeActorId) : '某人';
      if (dodosGained <= 0) return null;

      return makeMemory(
        battleId,
        eventIndex,
        'HIGHLIGHT',
        `${actorName} 引来了渡渡鸟`,
        `第 ${eventIndex} 回合，${actorName} 用食物吸引了 ${dodosGained} 只渡渡鸟靠拢。`,
        event.activeActorId ? [event.activeActorId] : [],
        [event.eventId],
        2,
        ['dodo', 'gain']
      );
    }

    default:
      return null;
  }
}

export function evaluateLowHpSurvivors(state: BattleState): ReporterMemoryEntry[] {
  const memories: ReporterMemoryEntry[] = [];

  for (const actor of state.actors) {
    if (!actor.isAlive) continue;
    if (actor.currentHP < actor.maxHP * 0.3) {
      memories.push(
        makeMemory(
          state.battleId,
          state.actorActionIndex,
          'ACCIDENT',
          `惨胜：${actor.name} 残血存活`,
          `第 ${state.actorActionIndex} 回合结算时，${actor.name} 仅剩 ${actor.currentHP}/${actor.maxHP} HP。`,
          [actor.actorId],
          [],
          2,
          ['lowhp']
        )
      );
    }
  }

  return memories;
}

export function evaluateZeroDodos(state: BattleState): ReporterMemoryEntry[] {
  const memories: ReporterMemoryEntry[] = [];

  for (const actor of state.actors) {
    if (!actor.isAlive) continue;
    if (actor.scene.dodosControlled === 0) {
      memories.push(
        makeMemory(
          state.battleId,
          state.actorActionIndex,
          'SHAME',
          `笑柄：${actor.name} 一只渡渡鸟都没有`,
          `第 ${state.actorActionIndex} 回合，${actor.name} 手里没有任何渡渡鸟，场面相当尴尬。`,
          [actor.actorId],
          [],
          2,
          ['dodo', 'shame']
        )
      );
    }
  }

  return memories;
}
