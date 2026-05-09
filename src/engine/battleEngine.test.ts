import { describe, expect, it, vi } from 'vitest';
import { createBattleEngine } from './battleEngine';
import type { ActorBrainProvider } from '../core/battle/types';

function immediateProvider(): ActorBrainProvider {
  return {
    async generate(_state, activeActorId, allowedActionTypes) {
      return {
        actorId: activeActorId,
        actionType: allowedActionTypes[0] ?? 'FALLBACK_SIGNAL_STUMBLE',
        line: '测试行动',
        actionDescription: '测试行动',
        performanceIntent: '测试',
      };
    },
  };
}

describe('battleEngine', () => {
  it('does not return null for a second step while one step is already running', async () => {
    let releaseGenerate!: () => void;
    const delayedProvider: ActorBrainProvider = {
      generate(_state, activeActorId, allowedActionTypes) {
        return new Promise((resolve) => {
          releaseGenerate = () => resolve({
            actorId: activeActorId,
            actionType: allowedActionTypes[0] ?? 'FALLBACK_SIGNAL_STUMBLE',
            line: '延迟行动',
            actionDescription: '延迟行动',
            performanceIntent: '测试',
          });
        });
      },
    };

    const engine = createBattleEngine({ actorBrainProvider: delayedProvider, maxActions: 40 });
    engine.init('busy_step_test', 2);
    engine.start();

    const firstStep = engine.step();
    const busyStepResult = await engine.step();

    expect(busyStepResult).toBe(engine.getState());

    releaseGenerate();
    await firstStep;
  });

  it('freezes full command cost when a command is allowed', async () => {
    const engine = createBattleEngine({
      actorBrainProvider: immediateProvider(),
      commandGateProvider: {
        async evaluate(rawInput) {
          return {
            decision: 'ALLOW',
            normalizedInput: rawInput,
            reason: '测试允许',
            directorBroadcastDraft: {
              text: rawInput,
              scope: 'GLOBAL',
              targetActorIds: [],
              lifetime: 'NEXT_ACTION',
            },
          };
        },
      },
      maxActions: 40,
    });

    engine.init('command_fee_test', 2);
    engine.start();
    await engine.submitCommand('下雨了下雨了');

    const transaction = engine.getState()!.battleState.commandTransactions[0];
    expect(transaction.status).toBe('INJECTED');
    expect(transaction.frozenCost).toBe(transaction.estimatedCost);
    expect(transaction.directorBroadcast?.text).toBe('下雨了下雨了');
  });

  it('records successful item use in EventLog', () => {
    const engine = createBattleEngine({ actorBrainProvider: immediateProvider(), maxActions: 40 });
    engine.init('item_event_test', 2, undefined, 1);
    engine.start();

    const targetActorId = engine.getState()!.battleState.actors[0].actorId;
    const result = engine.useItem('HEAL_SMALL', targetActorId);

    expect(result.ok).toBe(true);
    expect(engine.getState()!.battleState.itemUsesRemaining).toBe(0);
    const event = engine.getState()!.battleState.eventLog.find((e) => e.type === 'ITEM_USED');
    expect(event).toBeDefined();
    expect(event?.targetActorId).toBe(targetActorId);

    const secondResult = engine.useItem('HEAL_SMALL', targetActorId);
    expect(secondResult.ok).toBe(false);
    expect(engine.getState()!.battleState.eventLog.filter((e) => e.type === 'ITEM_USED')).toHaveLength(1);
  });

  it('rejects item use when the fridge grants zero uses for the battle', () => {
    const engine = createBattleEngine({ actorBrainProvider: immediateProvider(), maxActions: 40 });
    engine.init('item_limit_test', 2, undefined, 0);
    engine.start();

    const targetActorId = engine.getState()!.battleState.actors[0].actorId;
    const result = engine.useItem('HEAL_SMALL', targetActorId);

    expect(result.ok).toBe(false);
    expect(engine.getState()!.battleState.itemUsesRemaining).toBe(0);
    expect(engine.getState()!.battleState.eventLog.some((e) => e.type === 'ITEM_USED')).toBe(false);
  });

  it('enqueues REPORTER display events for normal battle steps', async () => {
    const engine = createBattleEngine({
      actorBrainProvider: immediateProvider(),
      maxActions: 40,
      hooks: {
        createStageBrief: (battleState) => ({
          memoryId: `mem_${battleState.actorActionIndex}`,
          battleId: battleState.battleId,
          actorActionIndex: battleState.actorActionIndex,
          type: 'STAGE_BRIEF',
          title: 'Stage brief',
          text: 'A reporter summary',
          actorIds: [],
          eventIds: [],
          severity: 1,
          tags: ['brief'],
          source: 'SYSTEM',
          createdAt: Date.now(),
        }),
        mapReporterMemoryToDisplay: (entries) =>
          entries.map((entry) => ({
            kind: 'REPORTER',
            eventId: entry.memoryId,
            actorActionIndex: entry.actorActionIndex,
            content: entry.text,
            memoryType: entry.type,
            severity: entry.severity,
          })),
      },
    });
    engine.init('reporter_queue_test', 3);
    engine.start();

    for (let i = 0; i < 8; i++) {
      await engine.stepManual();
    }

    const consumedKinds: string[] = [];
    let item = engine.consumeDisplayItem() as { kind: string } | null;
    while (item) {
      consumedKinds.push(item.kind);
      item = engine.consumeDisplayItem() as { kind: string } | null;
    }

    expect(consumedKinds).toContain('REPORTER');
  });

  it('stops AUTO progression when paused and resumes after auto is started again', async () => {
    vi.useFakeTimers();
    const engine = createBattleEngine({ actorBrainProvider: immediateProvider(), maxActions: 40 });

    try {
      engine.init('pause_resume_auto_test', 3);
      engine.start();
      engine.startAuto(20);

      await vi.advanceTimersByTimeAsync(25);
      const progressedActionIndex = engine.getState()!.battleState.actorActionIndex;
      expect(progressedActionIndex).toBeGreaterThan(0);

      engine.pause();
      await vi.advanceTimersByTimeAsync(100);
      expect(engine.getState()!.battleState.actorActionIndex).toBe(progressedActionIndex);

      engine.startAuto(20);
      await vi.advanceTimersByTimeAsync(25);
      expect(engine.getState()!.battleState.actorActionIndex).toBeGreaterThan(progressedActionIndex);
    } finally {
      engine.dispose();
      vi.useRealTimers();
    }
  });
});
