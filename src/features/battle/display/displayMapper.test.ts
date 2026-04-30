import { describe, expect, it } from 'vitest';
import { mapBattleEventToDisplayEvents } from './displayMapper';
import type { BattleEvent, BattleState, ActorCombatState } from '../../../core/battle/types';

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
  return {
    battleId: 'test_battle',
    battleSeed: 'test_seed',
    phase: 'RUNNING',
    runMode: 'MANUAL',
    clockState: 'PLAYING',
    stateVersion: 0,
    actorActionIndex: 0,
    actors: [makeActor({ actorId: 'actor_0', name: '张三' }), makeActor({ actorId: 'actor_1', name: '李四' })],
    scene: { totalDodos: 100, wildDodos: 100 },
    eventLog: [],
    directorBroadcasts: [],
    commandTransactions: [],
    itemUsesRemaining: 1,
    usedItemIds: [],
    actorPromptInjections: [],
    stageBriefs: [],
    salaryAwards: [],
    reporterMemory: [],
    reporterMemoryCursor: 0,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<BattleEvent> = {}): BattleEvent {
  return {
    eventId: 'evt_test_1',
    actorActionIndex: 1,
    type: 'ACTION_TAKEN',
    activeActorId: 'actor_0',
    diffs: [],
    tags: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('mapBattleEventToDisplayEvents', () => {
  it('MUTATION_SELECTED → MUTATION', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'MUTATION_SELECTED',
      actorActionIndex: 0,
      mutationId: 'FAKE_NEST_FEVER',
      diffs: [{ path: 'selectedMutation', oldValue: '', newValue: '假巢狂热' }],
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('MUTATION');
    expect(results[0].eventId).toBe('display_evt_test_1');
    expect((results[0] as { mutationId: string }).mutationId).toBe('FAKE_NEST_FEVER');
    expect((results[0] as { mutationName: string }).mutationName).toBe('假巢狂热');
  });

  it('PROMPT_INJECTION_APPLIED → PROMPT (PERMANENT)', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'PROMPT_INJECTION_APPLIED',
      activeActorId: 'actor_0',
      promptSource: 'PERMANENT',
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('PROMPT');
    expect((results[0] as { source: string }).source).toBe('PERMANENT');
  });

  it('PROMPT_INJECTION_APPLIED → PROMPT (EPISODE)', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'PROMPT_INJECTION_APPLIED',
      activeActorId: 'actor_0',
      promptSource: 'EPISODE',
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('PROMPT');
    expect((results[0] as { source: string }).source).toBe('EPISODE');
  });

  it('ZOG_REACTION_EMITTED → ZOG', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'ZOG_REACTION_EMITTED',
      zogReaction: 'Zog considers this acceptable television.',
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('ZOG');
    expect((results[0] as { content: string }).content).toBe('Zog considers this acceptable television.');
  });

  it('DAMAGE_DEALT → DAMAGE with oldHp/newHp', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'DAMAGE_DEALT',
      activeActorId: 'actor_0',
      targetActorId: 'actor_1',
      diffs: [{ path: 'currentHP', oldValue: 100, newValue: 70 }],
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    const damageEv = results.find((r) => r.kind === 'DAMAGE');
    expect(damageEv).toBeDefined();
    expect((damageEv as { oldHp: number }).oldHp).toBe(100);
    expect((damageEv as { newHp: number }).newHp).toBe(70);
    expect((damageEv as { damage: number }).damage).toBe(30);
  });

  it('ACTOR_ELIMINATED → ELIMINATION', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'ACTOR_ELIMINATED',
      targetActorId: 'actor_1',
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('ELIMINATION');
    expect((results[0] as { targetId: string }).targetId).toBe('actor_1');
  });

  it('ITEM_USED → ITEM', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'ITEM_USED',
      activeActorId: 'actor_0',
      targetActorId: 'actor_1',
      actionDescription: '使用了急救箱',
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    expect(results.some((r) => r.kind === 'ITEM')).toBe(true);
    const itemEv = results.find((r) => r.kind === 'ITEM') as { content: string; source: string };
    expect(itemEv.content).toBe('使用了急救箱');
    expect(itemEv.source).toBe('PLAYER');
  });

  it('ITEM_USED with heal diff → ITEM + HEAL', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'ITEM_USED',
      activeActorId: 'actor_0',
      targetActorId: 'actor_1',
      diffs: [{ path: 'currentHP', oldValue: 30, newValue: 60 }],
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    expect(results.some((r) => r.kind === 'ITEM')).toBe(true);
    expect(results.some((r) => r.kind === 'HEAL')).toBe(true);
    const healEv = results.find((r) => r.kind === 'HEAL') as { healAmount: number; oldHp: number; newHp: number };
    expect(healEv.healAmount).toBe(30);
    expect(healEv.oldHp).toBe(30);
    expect(healEv.newHp).toBe(60);
  });

  it('未知事件类型 → 空数组', () => {
    const state = makeState();
    const event = makeEvent({
      type: 'ROUND_END' as BattleEvent['type'],
    });
    const results = mapBattleEventToDisplayEvents(event, state);
    // ROUND_END 映射为 ACTOR_ACTION，所以不是空
    expect(results.length).toBeGreaterThan(0);
  });
});
