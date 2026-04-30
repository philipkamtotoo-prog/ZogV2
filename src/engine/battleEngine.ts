/**
 * BattleEngine - 战斗编排引擎
 */

import type { BattleState, ActorBrainOutput, DirectorBroadcast, DirectorBroadcastDraft, CommitResult, DisplayItem, BattleEvent, BattleDiff } from '../core/battle/types';
import type { ActorBrainProvider } from '../llm/actorBrainProvider';
import type { Queues } from './queues';
import { createQueues, enqueueGeneration, dequeueGeneration, enqueueCommit, dequeueCommit, enqueueDisplay } from './queues';
import { selectActiveActor } from '../core/battle/activeActorSelector';
import { resolveLockedTarget } from '../core/battle/targetResolver';
import { buildAllowedActionTypes } from '../core/battle/actionPolicy';
import { validateActorBrainOutput, generateFallbackOutput } from '../core/battle/validator';
import { combatRefereeCommit } from '../core/battle/combatReferee';
import { shouldEndBattle, createInitialBattleState, type ActorTemplate } from '../core/battle/initialState';
import { mapBattleEventToDisplayItem } from '../features/battle/display/displayMapper';
import { ITEM_DEFS, type ItemId } from '../core/economy/items';
import { applyGateResult, processCommand } from '../core/command/commandGate';
import { seededRng } from '../core/battle/rng';

export interface BattleEngineConfig {
  actorBrainProvider: ActorBrainProvider;

  commandGateProvider?: {
    evaluate: (rawInput: string, battleState: BattleState) => Promise<{
      decision: 'ALLOW' | 'ASK' | 'DOWNGRADE' | 'REJECT';
      normalizedInput: string;
      reason: string;
      directorBroadcastDraft?: DirectorBroadcastDraft;
    }>;
  };

  maxActions: number;
  onStateChange?: (state: BattleState) => void;
  onEvent?: (event: BattleState['eventLog'][0]) => void;
}

export interface BattleEngineState {
  battleState: BattleState;
  queues: Queues;
  isRunning: boolean;
  error: string | null;
}

export function createBattleEngine(config: BattleEngineConfig) {
  let state: BattleEngineState;
  let autoInterval: ReturnType<typeof setInterval> | null = null;
  let disposed = false;
  let isStepping = false;

  function init(
    battleSeed: string,
    actorCount: number = 5,
    templates?: ActorTemplate[],
    itemUsesRemaining: number = 3
  ): BattleEngineState {
    const initialState = createInitialBattleState(battleSeed, actorCount, templates, itemUsesRemaining);

    state = {
      battleState: { ...initialState, phase: 'PREPARING' },
      queues: createQueues(),
      isRunning: false,
      error: null,
    };

    return state;
  }

  function start(): BattleEngineState {
    if (!state) throw new Error('Engine not initialized');

    state.battleState.phase = 'RUNNING';
    state.isRunning = true;
    if (!disposed) config.onStateChange?.(state.battleState);

    return state;
  }

  function pause(): BattleEngineState {
    if (!state) throw new Error('Engine not initialized');

    state.battleState.clockState = 'PAUSED';
    stopAutoInterval();
    if (!disposed) config.onStateChange?.(state.battleState);

    return state;
  }

  function resume(): BattleEngineState {
    if (!state) throw new Error('Engine not initialized');

    state.battleState.clockState = 'PLAYING';
    if (!disposed) config.onStateChange?.(state.battleState);

    return state;
  }

  function startAuto(intervalMs: number = 1000): void {
    if (!state) throw new Error('Engine not initialized');

    stopAutoInterval();
    state.battleState.runMode = 'AUTO';
    state.battleState.clockState = 'PLAYING';

    autoInterval = setInterval(async () => {
      if (state.battleState.clockState !== 'PLAYING') return;

      const result = await step();
      if (!result) {
        stopAutoInterval();
      }
    }, intervalMs);
  }

  function stopAutoInterval(): void {
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
    }
  }

  function dispose(): void {
    disposed = true;
    stopAutoInterval();
    if (state) state.isRunning = false;
  }

  function stepManual(): Promise<BattleEngineState | null> {
    if (!state) throw new Error('Engine not initialized');

    state.battleState.runMode = 'MANUAL';
    return step();
  }

  async function step(): Promise<BattleEngineState | null> {
    if (!state) throw new Error('Engine not initialized');
    if (disposed || !state.isRunning) return null;
    if (state.battleState.phase === 'FINAL_REPORT') return null;
    if (isStepping) return state;

    isStepping = true;
    try {
      if (shouldEndBattle(state.battleState) || state.battleState.actorActionIndex >= config.maxActions) {
        endBattle();
        return state;
      }

      const activeActor = selectActiveActor(
        state.battleState.actors,
        state.battleState.actorActionIndex,
        state.battleState.battleSeed
      );

      if (!activeActor) {
        endBattle();
        return state;
      }

      const lockedTarget = resolveLockedTarget(
        activeActor,
        state.battleState.actors,
        state.battleState.currentBeat,
        state.battleState.actorActionIndex,
        state.battleState.battleSeed,
        state.battleState.directorBroadcasts
      );

      const allowedActionTypes = buildAllowedActionTypes(
        activeActor,
        lockedTarget,
        state.battleState.scene,
        state.battleState.currentBeat,
        state.battleState.directorBroadcasts
      );

      state.queues = enqueueGeneration(state.queues, activeActor.actorId, state.battleState.stateVersion);

      try {
        let brainOutput: ActorBrainOutput;
        try {
          brainOutput = await config.actorBrainProvider.generate(
            state.battleState,
            activeActor.actorId,
            allowedActionTypes,
            lockedTarget?.actorId ?? null,
            state.battleState.directorBroadcasts
          );
        } catch (err) {
          console.error('ActorBrain error:', err);
          brainOutput = generateFallbackOutput(activeActor, allowedActionTypes);
        }

        if (disposed) return null;

        state.queues = dequeueGeneration(state.queues, activeActor.actorId);
        state.queues = enqueueCommit(
          state.queues,
          activeActor.actorId,
          state.battleState.stateVersion,
          state.battleState.actorActionIndex
        );

        const validation = validateActorBrainOutput(
          brainOutput,
          activeActor,
          lockedTarget,
          allowedActionTypes,
          state.battleState.stateVersion,
          state.battleState.stateVersion
        );

        if (!validation.valid) {
          console.warn('Validation failed:', validation.failure);
          brainOutput = generateFallbackOutput(activeActor, allowedActionTypes);
        }

        const commitResult = combatRefereeCommit(state.battleState, {
          battleId: state.battleState.battleId,
          stateVersion: state.battleState.stateVersion,
          actorActionIndex: state.battleState.actorActionIndex,
          activeActorId: activeActor.actorId,
          lockedTargetId: lockedTarget?.actorId ?? null,
          actionType: brainOutput.actionType,
          actorBrainOutput: brainOutput,
        });

        state.battleState = applyCommitResult(state.battleState, commitResult);
        state.battleState.actorActionIndex++;

        state.queues = dequeueCommit(state.queues, activeActor.actorId);

        const displayItems = commitResult.events.flatMap((e) =>
          mapBattleEventToDisplayItem(e, state.battleState)
        );
        for (const item of displayItems) {
          state.queues = enqueueDisplay(state.queues, item);
        }

        for (const event of commitResult.events) {
          if (!disposed) config.onEvent?.(event);
        }
        if (!disposed) config.onStateChange?.(state.battleState);

        if (shouldEndBattle(state.battleState)) {
          endBattle();
        }

        return state;
      } catch (err) {
        state.error = err instanceof Error ? err.message : String(err);
        state.queues = dequeueGeneration(state.queues, activeActor.actorId);
        if (!disposed) config.onStateChange?.(state.battleState);
        return null;
      }
    } finally {
      isStepping = false;
    }
  }

  function endBattle(): void {
    if (!state) throw new Error('Engine not initialized');

    stopAutoInterval();
    state.battleState.phase = 'FINAL_REPORT';
    state.isRunning = false;
    if (!disposed) config.onStateChange?.(state.battleState);
  }

  function getState(): BattleEngineState | null {
    return state;
  }

  function getNextDisplayItem() {
    if (!state) return null;
    return state.queues.displayQueue[0] ?? null;
  }

  function consumeDisplayItem() {
    if (!state) return null;

    const [item, ...rest] = state.queues.displayQueue;
    state.queues = { ...state.queues, displayQueue: rest };
    return item;
  }

  async function submitCommand(rawInput: string): Promise<{
    transactionId: string;
    status: string;
    error?: string;
  }> {
    if (!state) throw new Error('Engine not initialized');

    const transaction = processCommand(
      rawInput,
      state.battleState,
      undefined,
      `cmd_${state.battleState.battleId}_${state.battleState.actorActionIndex}_${state.battleState.commandTransactions.length}`
    );

    state.battleState.commandTransactions.push(transaction);

    if (!config.commandGateProvider) {
      transaction.status = 'REJECTED';
      transaction.rejectReason = 'CommandGate not configured';
      return {
        transactionId: transaction.transactionId,
        status: 'REJECTED',
        error: 'CommandGate not configured',
      };
    }

    try {
      const result = await config.commandGateProvider.evaluate(rawInput, state.battleState);
      Object.assign(transaction, applyGateResult(transaction, result));

      if (result.directorBroadcastDraft && (result.decision === 'ALLOW' || result.decision === 'DOWNGRADE')) {
        const draft = result.directorBroadcastDraft;
        const broadcast: DirectorBroadcast = {
          broadcastId: `broadcast_${Date.now()}`,
          text: draft.text,
          scope: draft.scope,
          targetActorIds: draft.targetActorIds,
          lifetime: draft.lifetime,
          expiresAtActionIndex: state.battleState.actorActionIndex + 1,
          reactedActorIds: [],
          sourceTransactionId: transaction.transactionId,
        };
        state.battleState.directorBroadcasts.push(broadcast);
        transaction.directorBroadcast = broadcast;
      }

      if (!disposed) config.onStateChange?.(state.battleState);

      return {
        transactionId: transaction.transactionId,
        status: transaction.status,
      };
    } catch (err) {
      transaction.status = 'REJECTED';
      transaction.rejectReason = err instanceof Error ? err.message : String(err);
      if (!disposed) config.onStateChange?.(state.battleState);

      return {
        transactionId: transaction.transactionId,
        status: 'REJECTED',
        error: transaction.rejectReason,
      };
    }
  }

  function useItem(itemId: ItemId, targetActorId: string): { ok: true; eventId: string } | { ok: false; reason: string } {
    if (!state) return { ok: false, reason: 'Engine not initialized' };
    if (state.battleState.phase !== 'RUNNING') return { ok: false, reason: 'Battle not running' };

    const itemDef = ITEM_DEFS[itemId];
    if (!itemDef) return { ok: false, reason: 'Unknown item' };

    const actor = state.battleState.actors.find((a) => a.actorId === targetActorId);
    if (!actor) return { ok: false, reason: 'Actor not found' };
    if (!actor.isAlive) return { ok: false, reason: 'Actor is dead' };

    if (state.battleState.itemUsesRemaining <= 0) return { ok: false, reason: 'No uses remaining' };

    const eventId = `item_${Date.now()}`;
    const oldItemUsesRemaining = state.battleState.itemUsesRemaining;
    const oldUsedItemIds = [...state.battleState.usedItemIds];
    const diffs: BattleDiff[] = [];

    switch (itemId) {
      case 'HEAL_SMALL': {
        // 文档：恢复20HP，20%概率触发"肠胃不适"
        const healAmount = 20;
        const oldHP = actor.currentHP;
        actor.currentHP = Math.min(actor.maxHP, actor.currentHP + healAmount);
        actor.lastHealedAtActorActionIndex = state.battleState.actorActionIndex;
        diffs.push({ path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP });
        // 20% 概率触发 STOMACHACHE_NO_ATTACK
        const roll = seededRng(state.battleState.battleSeed, state.battleState.actorActionIndex, 'itemStomachache', actor.actorId);
        if (roll < 0.2) {
          if (!actor.statuses.includes('STOMACHACHE_NO_ATTACK')) {
            actor.statuses.push('STOMACHACHE_NO_ATTACK');
            diffs.push({ path: 'statuses', oldValue: [...actor.statuses], newValue: [...actor.statuses] });
          }
        }
        break;
      }
      case 'HEAL_MEDIUM': {
        // 文档：恢复35HP，无副作用
        const healAmount = 35;
        const oldHP = actor.currentHP;
        actor.currentHP = Math.min(actor.maxHP, actor.currentHP + healAmount);
        actor.lastHealedAtActorActionIndex = state.battleState.actorActionIndex;
        diffs.push({ path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP });
        break;
      }
      case 'SHIELD_GRANT': {
        // 文档：恢复60HP + 护盾 + TAUNT_1_ACTION
        const healAmount = 60;
        const oldHP = actor.currentHP;
        actor.currentHP = Math.min(actor.maxHP, actor.currentHP + healAmount);
        actor.lastHealedAtActorActionIndex = state.battleState.actorActionIndex;
        diffs.push({ path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP });
        if (!actor.statuses.includes('SHIELD_ONCE')) {
          actor.statuses.push('SHIELD_ONCE');
          diffs.push({ path: 'statuses', oldValue: [...actor.statuses.filter(s => s !== 'SHIELD_ONCE')], newValue: [...actor.statuses] });
        }
        if (!actor.statuses.includes('TAUNT_1_ACTION')) {
          actor.statuses.push('TAUNT_1_ACTION');
          actor.tauntedByActorId = actor.actorId; // 被自己的道具嘲讽
          diffs.push({ path: 'statuses', oldValue: [...actor.statuses.filter(s => s !== 'TAUNT_1_ACTION')], newValue: [...actor.statuses] });
        }
        break;
      }
      case 'THREAT_BOOST': {
        const oldThreat = actor.currentThreat;
        actor.currentThreat += 20;
        diffs.push({ path: 'currentThreat', oldValue: oldThreat, newValue: actor.currentThreat });
        break;
      }
      case 'SPOTLIGHT_FORCE': {
        const oldSpotlight = actor.spotlightDebt;
        actor.spotlightDebt += 50;
        diffs.push({ path: 'spotlightDebt', oldValue: oldSpotlight, newValue: actor.spotlightDebt });
        break;
      }
    }

    state.battleState.usedItemIds.push(itemId);
    state.battleState.itemUsesRemaining = Math.max(0, state.battleState.itemUsesRemaining - 1);
    state.battleState.stateVersion += 1;

    const event: BattleEvent = {
      eventId,
      actorActionIndex: state.battleState.actorActionIndex,
      type: 'ITEM_USED',
      targetActorId,
      diffs: [
        ...diffs,
        { path: 'usedItemIds', oldValue: oldUsedItemIds, newValue: [...state.battleState.usedItemIds] },
        { path: 'itemUsesRemaining', oldValue: oldItemUsesRemaining, newValue: state.battleState.itemUsesRemaining },
      ],
      tags: ['ITEM'],
      actionDescription: `对 ${actor.name} 使用了 ${itemDef.name}`,
      createdAt: Date.now(),
    };
    state.battleState.eventLog.push(event);

    const displayItem: DisplayItem = {
      itemId: eventId,
      actorActionIndex: state.battleState.actorActionIndex,
      type: 'ACTION',
      actorId: targetActorId,
      content: `🎁 对 ${actor.name} 使用了 ${itemDef.name}`,
    };
    state.queues = enqueueDisplay(state.queues, displayItem);

    if (!disposed) config.onEvent?.(event);
    if (!disposed) config.onStateChange?.(state.battleState);

    return { ok: true, eventId };
  }

  return {
    init,
    start,
    pause,
    resume,
    startAuto,
    stepManual,
    step,
    endBattle,
    dispose,
    getState,
    getNextDisplayItem,
    consumeDisplayItem,
    submitCommand,
    useItem,
  };
}

function applyCommitResult(state: BattleState, result: CommitResult): BattleState {
  return {
    ...state,
    stateVersion: result.newStateVersion,
    actors: result.newActors ?? state.actors,
    eventLog: [...state.eventLog, ...result.events],
    scene: {
      ...state.scene,
      ...result.sceneDiff,
    },
  };
}
