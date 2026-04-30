import type { BattleState } from '../../core/battle/types';
import type { ReporterMemoryEntry } from './reporterMemory';
import { evaluateEvent } from './reporterMemoryRules';

let _briefSeq = 0;
function nextBriefId(): string {
  return `brief_${Date.now()}_${++_briefSeq}`;
}

export function scanEventsForMemories(
  state: BattleState,
  fromIndex: number
): ReporterMemoryEntry[] {
  const newEvents = state.eventLog.slice(fromIndex);
  if (newEvents.length === 0) return [];

  const memories: ReporterMemoryEntry[] = [];

  for (const event of newEvents) {
    const mem = evaluateEvent(event, state);
    if (mem) memories.push(mem);
  }

  return memories;
}

export function scanForStateBasedMemories(state: BattleState, cooldownActions = 8): ReporterMemoryEntry[] {
  const memories: ReporterMemoryEntry[] = [];

  // Build a set of (actorId, type) combos already created recently, for deduplication
  const recentKeys = new Set<string>();
  const cutoffIndex = Math.max(0, state.actorActionIndex - cooldownActions);
  for (const mem of state.reporterMemory) {
    if (mem.actorActionIndex >= cutoffIndex) {
      for (const actorId of mem.actorIds) {
        recentKeys.add(`${actorId}::${mem.type}`);
      }
    }
  }

  function pushIfNotDuplicate(
    type: ReporterMemoryEntry['type'],
    actorId: string,
    make: () => ReporterMemoryEntry
  ) {
    const key = `${actorId}::${type}`;
    if (recentKeys.has(key)) return;
    recentKeys.add(key);
    memories.push(make());
  }

  const threshold = 0.3;
  for (const actor of state.actors) {
    if (!actor.isAlive) continue;
    if (actor.currentHP < actor.maxHP * threshold) {
      pushIfNotDuplicate('ACCIDENT', actor.actorId, () =>
        makeMemory(state.battleId, state.actorActionIndex, 'ACCIDENT',
          `惨胜！${actor.name} 残血存活`,
          `第 ${state.actorActionIndex} 回合结算时，${actor.name} 仅剩 ${actor.currentHP}/${actor.maxHP} HP，勉强存活。`,
          [actor.actorId], [], 2, ['lowhp'])
      );
    }
    if (actor.scene.dodosControlled === 0) {
      pushIfNotDuplicate('SHAME', actor.actorId, () =>
        makeMemory(state.battleId, state.actorActionIndex, 'SHAME',
          `笑柄！${actor.name} 一只嘟嘟鸟都没有`,
          `第 ${state.actorActionIndex} 回合，${actor.name} 没有任何嘟嘟鸟在手，彻底沦为笑柄。`,
          [actor.actorId], [], 2, ['dodo', 'shame'])
      );
    }
  }

  return memories;
}

// Re-export makeMemory so callers can use it without importing rules
export function makeMemory(
  battleId: string,
  actorActionIndex: number,
  type: ReporterMemoryEntry['type'],
  title: string,
  text: string,
  actorIds: string[],
  eventIds: string[],
  severity: 1 | 2 | 3 | 4 | 5,
  tags: string[] = [],
  source: 'SYSTEM' | 'LLM' = 'SYSTEM'
): ReporterMemoryEntry {
  return {
    memoryId: `mem_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
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

export function createStageBrief(
  battleId: string,
  actionIndex: number,
  state: BattleState
): ReporterMemoryEntry {
  const alive = state.actors.filter((a) => a.isAlive);
  const hpList = alive.map((a) => `${a.name}:${a.currentHP}/${a.maxHP}`).join(', ');
  const text = `第 ${actionIndex} 回合当前状态：存活 ${alive.length}人。${hpList}`;

  return {
    memoryId: nextBriefId(),
    battleId,
    actorActionIndex: actionIndex,
    type: 'STAGE_BRIEF',
    title: `第 ${actionIndex} 回合战况简报`,
    text,
    actorIds: [],
    eventIds: [],
    severity: 1,
    tags: ['brief'],
    source: 'SYSTEM',
    createdAt: Date.now(),
  };
}
