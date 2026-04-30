import { describe, expect, it } from 'vitest';
import { scanEventsForMemories, scanForStateBasedMemories, createStageBrief } from './reporterMemoryCollector';
import type { BattleState, BattleEvent, ActorCombatState } from '../../core/battle/types';

function makeEvent(overrides: Partial<BattleEvent> = {}): BattleEvent {
  return {
    eventId: `evt_${Math.random().toString(36).slice(2)}`,
    actorActionIndex: 1,
    type: 'ACTION_TAKEN',
    activeActorId: 'actor_0',
    diffs: [],
    tags: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeActor(overrides: Partial<ActorCombatState> = {}): ActorCombatState {
  const id = overrides.actorId ?? 'actor_0';
  return {
    actorId: id,
    name: overrides.name ?? id,
    maxHP: 100,
    currentHP: 100,
    ATK: 10,
    DEF: 5,
    SPD: 10,
    baseThreat: 50,
    currentThreat: 50,
    isAlive: true,
    statuses: [],
    initiative: 10,
    spotlightDebt: 0,
    scene: { dodosControlled: 5, dodoTrust: 8, nestInfluence: 0 },
    stats: { damageDealt: 0, damageTaken: 0, actionsTaken: 0, dodosGained: 0, dodosLost: 0, directorBroadcastReactedCount: 0 },
    ...overrides,
  };
}

function makeState(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    battleId: 'test_battle',
    battleSeed: 'test_seed',
    phase: 'RUNNING',
    runMode: 'MANUAL',
    clockState: 'PLAYING',
    stateVersion: 0,
    actorActionIndex: 0,
    actors: [makeActor({ actorId: 'actor_0', name: '张三' }), makeActor({ actorId: 'actor_1', name: '李四' }), makeActor({ actorId: 'actor_2', name: '王五' })],
    scene: { totalDodos: 100, wildDodos: 100 },
    directorBroadcasts: [],
    commandTransactions: [],
    eventLog: [],
    itemUsesRemaining: 1,
    usedItemIds: [],
    actorPromptInjections: [],
    stageBriefs: [],
    salaryAwards: [],
    reporterMemory: [],
    reporterMemoryCursor: 0,
  };

  if (overrides.eventLog !== undefined) {
    base.eventLog = overrides.eventLog;
  }
  if (overrides.reporterMemoryCursor !== undefined) {
    base.reporterMemoryCursor = overrides.reporterMemoryCursor;
  }
  if (overrides.actorActionIndex !== undefined) {
    base.actorActionIndex = overrides.actorActionIndex;
  }
  if (overrides.actors !== undefined) {
    base.actors = overrides.actors;
  }

  return base;
}

describe('reporterMemoryCollector', () => {
  describe('scanEventsForMemories', () => {
    it('returns empty array when no new events', () => {
      const state = makeState({ eventLog: [makeEvent()] });
      const result = scanEventsForMemories(state, 1);
      expect(result).toHaveLength(0);
    });

    it('generates ACCIDENT memory for ACTOR_ELIMINATED', () => {
      const state = makeState({
        eventLog: [
          makeEvent({ type: 'ACTOR_ELIMINATED', targetActorId: 'actor_1', actorActionIndex: 5 }),
        ],
        reporterMemoryCursor: 0,
      });
      const result = scanEventsForMemories(state, 0);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ACCIDENT');
      expect(result[0].severity).toBe(5);
      expect(result[0].actorIds).toContain('actor_1');
    });

    it('generates HIGHLIGHT memory for big damage (>20% maxHP)', () => {
      const state = makeState({
        actors: [
          makeActor({ actorId: 'actor_0', name: '张三', maxHP: 100, currentHP: 30 }),
          makeActor({ actorId: 'actor_1', name: '李四', maxHP: 100, currentHP: 20 }),
        ],
        eventLog: [
          makeEvent({
            type: 'DAMAGE_DEALT',
            activeActorId: 'actor_0',
            targetActorId: 'actor_1',
            actorActionIndex: 3,
            diffs: [{ path: 'currentHP', oldValue: 100, newValue: 20 }],
          }),
        ],
        reporterMemoryCursor: 0,
      });
      const result = scanEventsForMemories(state, 0);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('HIGHLIGHT');
      expect(result[0].severity).toBe(4);
    });

    it('does not generate HIGHLIGHT for small damage (<20% maxHP)', () => {
      const state = makeState({
        eventLog: [
          makeEvent({
            type: 'DAMAGE_DEALT',
            activeActorId: 'actor_0',
            targetActorId: 'actor_1',
            diffs: [{ path: 'currentHP', oldValue: 100, newValue: 95 }],
          }),
        ],
        reporterMemoryCursor: 0,
      });
      const result = scanEventsForMemories(state, 0);
      expect(result).toHaveLength(0);
    });

    it('generates ITEM_DRAMA memory for healing', () => {
      const state = makeState({
        eventLog: [
          makeEvent({
            type: 'ITEM_USED',
            targetActorId: 'actor_0',
            actorActionIndex: 7,
            diffs: [{ path: 'currentHP', oldValue: 30, newValue: 80 }],
            actionDescription: '使用了治疗药水',
          }),
        ],
        reporterMemoryCursor: 0,
      });
      const result = scanEventsForMemories(state, 0);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ITEM_DRAMA');
      expect(result[0].severity).toBe(2);
    });

    it('does not generate ITEM_DRAMA for non-healing items', () => {
      const state = makeState({
        eventLog: [
          makeEvent({
            type: 'ITEM_USED',
            targetActorId: 'actor_0',
            diffs: [{ path: 'usedItemIds', oldValue: [], newValue: ['potion'] }],
          }),
        ],
        reporterMemoryCursor: 0,
      });
      const result = scanEventsForMemories(state, 0);
      expect(result).toHaveLength(0);
    });

    it('generates PLAYER_INTERVENTION memory for director broadcast injected', () => {
      const state = makeState({
        eventLog: [
          makeEvent({
            type: 'DIRECTOR_BROADCAST_INJECTED',
            activeActorId: 'actor_0',
            actorActionIndex: 4,
            diffs: [{ path: 'broadcast', oldValue: '', newValue: 'rain' }],
          }),
        ],
        reporterMemoryCursor: 0,
      });
      const result = scanEventsForMemories(state, 0);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('PLAYER_INTERVENTION');
      expect(result[0].severity).toBe(3);
    });

    it('skips already-scanned events (cursor boundary)', () => {
      const evt = makeEvent({ type: 'ACTOR_ELIMINATED', targetActorId: 'actor_2', actorActionIndex: 2 });
      const state = makeState({
        eventLog: [evt],
        reporterMemoryCursor: 1,
      });
      const result = scanEventsForMemories(state, 1);
      expect(result).toHaveLength(0);
    });
  });

  describe('scanForStateBasedMemories', () => {
    it('generates ACCIDENT for low HP survivor', () => {
      const state = makeState({
        actors: [
          makeActor({ actorId: 'actor_0', name: '张三', currentHP: 10, isAlive: true }),
          makeActor({ actorId: 'actor_1', name: '李四', currentHP: 0, isAlive: false }),
        ],
        actorActionIndex: 10,
      });
      const result = scanForStateBasedMemories(state);
      const lowHp = result.find((m) => m.type === 'ACCIDENT');
      expect(lowHp).toBeDefined();
      expect(lowHp!.actorIds).toContain('actor_0');
    });

    it('generates SHAME for zero dodos', () => {
      const state = makeState({
        actors: [
          makeActor({ actorId: 'actor_0', name: '张三', scene: { dodosControlled: 0, dodoTrust: 5, nestInfluence: 0 }, isAlive: true }),
        ],
        actorActionIndex: 10,
      });
      const result = scanForStateBasedMemories(state);
      const shame = result.find((m) => m.type === 'SHAME' && m.tags.includes('dodo'));
      expect(shame).toBeDefined();
    });
  });

  describe('createStageBrief', () => {
    it('creates a STAGE_BRIEF memory', () => {
      const state = makeState({ actorActionIndex: 8 });
      const brief = createStageBrief(state.battleId, 8, state);
      expect(brief.type).toBe('STAGE_BRIEF');
      expect(brief.severity).toBe(1);
      expect(brief.actorActionIndex).toBe(8);
    });
  });
});
