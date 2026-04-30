import { describe, expect, it } from 'vitest';
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
    expect(transaction.status).toBe('READY_TO_INJECT');
    expect(transaction.frozenCost).toBe(transaction.estimatedCost);
    expect(transaction.directorBroadcast?.text).toBe('下雨了下雨了');
  });

  it('records successful item use in EventLog', () => {
    const engine = createBattleEngine({ actorBrainProvider: immediateProvider(), maxActions: 40 });
    engine.init('item_event_test', 2);
    engine.start();

    const targetActorId = engine.getState()!.battleState.actors[0].actorId;
    const result = engine.useItem('HEAL_SMALL', targetActorId);

    expect(result.ok).toBe(true);
    const event = engine.getState()!.battleState.eventLog.find((e) => e.type === 'ITEM_USED');
    expect(event).toBeDefined();
    expect(event?.targetActorId).toBe(targetActorId);
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
});
