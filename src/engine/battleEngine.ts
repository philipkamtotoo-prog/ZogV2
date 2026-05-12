/**
 * BattleEngine orchestrates battle flow.
 * Core owns hard rules, engine owns sequencing, features own presentation.
 */

import type {
  BattleState,
  ActorBrainOutput,
  DirectorBroadcast,
  DirectorBroadcastDraft,
  CommitResult,
  BattleEvent,
  DramaBeat,
  ReporterMemoryEntry,
} from '../core/battle/types';
import type { ActorBrainProvider } from '../llm/actorBrainProvider';
import type { Queues } from './queues';
import {
  createQueues,
  enqueueGeneration,
  dequeueGeneration,
  enqueueCommit,
  dequeueCommit,
  enqueueDisplay,
} from './queues';
import { selectActiveActor } from '../core/battle/activeActorSelector';
import { resolveLockedTarget } from '../core/battle/targetResolver';
import { buildAllowedActionTypes } from '../core/battle/actionPolicy';
import { validateActorBrainOutput, generateFallbackOutput } from '../core/battle/validator';
import { combatRefereeCommit } from '../core/battle/combatReferee';
import {
  shouldEndBattle,
  createInitialBattleState,
  type ActorTemplate,
  type InitialBattleSetup,
} from '../core/battle/initialState';
import type { ItemId } from '../core/economy/items';
import { applyGateResult, processCommand } from '../core/command/commandGate';
import { applyPlayerItem } from '../core/battle/playerActionReferee';
import { accumulateActorReadiness } from '../core/battle/turnPreparation';
import { validateItemUse } from '../core/battle/playerActionPolicy';
import { createBeatStartedEvent, createNextDramaBeat, shouldStartNewBeat } from '../core/battle/beatDeck';

export interface EngineHooks {
  mapBattleEventToDisplay?: (event: BattleEvent, state: BattleState) => unknown[];
  mapReporterMemoryToDisplay?: (entries: ReporterMemoryEntry[]) => unknown[];
  collectEventMemories?: (state: BattleState, fromIndex: number) => ReporterMemoryEntry[];
  collectStateMemories?: (state: BattleState) => ReporterMemoryEntry[];
  createStageBrief?: (state: BattleState) => ReporterMemoryEntry | null;
  onEventRecorded?: (event: BattleEvent, state: BattleState) => void;
}

export type PlayerAction =
  | { type: 'USE_ITEM'; itemId: ItemId; targetActorId: string; eventId: string }
  | { type: 'INJECT_BROADCAST'; broadcast: DirectorBroadcast };

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
  showrunnerProvider?: {
    shouldFire: (
      actorActionIndex: number,
      lastShowrunnerActionIndex: number,
      recentEvents: BattleState['eventLog']
    ) => boolean;
    generateDirectorBroadcast: (
      battleState: BattleState,
      reporterMemory: ReporterMemoryEntry[],
      currentBeat?: DramaBeat
    ) => Promise<DirectorBroadcast | null>;
  };
  maxActions: number;
  onStateChange?: (state: BattleState) => void;
  onEvent?: (event: BattleState['eventLog'][0]) => void;
  hooks?: EngineHooks;
}

export interface BattleEngineState {
  battleState: BattleState;
  queues: Queues;
  playerActionQueue: PlayerAction[];
  isRunning: boolean;
  error: string | null;
  lastShowrunnerActionIndex: number;
}

export function createBattleEngine(config: BattleEngineConfig) {
  let state: BattleEngineState;
  let autoInterval: ReturnType<typeof setInterval> | null = null;
  let disposed = false;
  let isStepping = false;

  const hooks = config.hooks ?? {};

  function init(
    battleSeed: string,
    actorCount: number = 5,
    templates?: ActorTemplate[],
    itemUsesRemaining: number = 1,
    setup: InitialBattleSetup = {}
  ): BattleEngineState {
    const initialState = createInitialBattleState(
      battleSeed,
      actorCount,
      templates,
      itemUsesRemaining,
      setup
    );

    state = {
      battleState: { ...initialState, phase: 'PREPARING' },
      queues: createQueues(),
      playerActionQueue: [],
      isRunning: false,
      error: null,
      lastShowrunnerActionIndex: -10,
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
    if (!disposed) config.onStateChange?.(state.battleState);

    autoInterval = setInterval(async () => {
      if (state.battleState.clockState !== 'PLAYING') return;

      const result = await step();
      if (!result) {
        stopAutoInterval();
      }
    }, intervalMs);
  }

  function switchManual(): BattleEngineState {
    if (!state) throw new Error('Engine not initialized');

    stopAutoInterval();
    state.battleState.runMode = 'MANUAL';
    state.battleState.clockState = 'PAUSED';
    if (!disposed) config.onStateChange?.(state.battleState);

    return state;
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

    stopAutoInterval();
    state.battleState.runMode = 'MANUAL';
    state.battleState.clockState = 'PAUSED';
    return step();
  }

  async function step(): Promise<BattleEngineState | null> {
    if (!state) throw new Error('Engine not initialized');
    if (disposed || !state.isRunning) return null;
    if (state.battleState.phase === 'FINAL_REPORT') return null;
    if (isStepping) return state;

    isStepping = true;
    try {
      if (
        shouldEndBattle(state.battleState) ||
        state.battleState.actorActionIndex >= config.maxActions
      ) {
        endBattle();
        return state;
      }

      drainPlayerActions();
      const beatStarted = advanceDramaBeatIfNeeded();

      if (!beatStarted && config.showrunnerProvider && state.battleState.phase === 'RUNNING') {
        const shouldFire = config.showrunnerProvider.shouldFire(
          state.battleState.actorActionIndex,
          state.lastShowrunnerActionIndex,
          state.battleState.eventLog
        );
        if (shouldFire) {
          const broadcast = await config.showrunnerProvider.generateDirectorBroadcast(
            state.battleState,
            state.battleState.reporterMemory,
            state.battleState.currentBeat
          );
          if (broadcast) {
            state.lastShowrunnerActionIndex = state.battleState.actorActionIndex;
            state.playerActionQueue.push({ type: 'INJECT_BROADCAST', broadcast });
            drainPlayerActions();
          }
        }
      }

      const activeActor = selectActiveActor(
        prepareActorsForSelection(),
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

      state.queues = enqueueGeneration(
        state.queues,
        activeActor.actorId,
        state.battleState.stateVersion
      );

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

        for (const event of commitResult.events) {
          recordFactEvent(event);
        }

        collectPeriodicReporterMemories();

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

  function drainPlayerActions(): void {
    if (!state || state.playerActionQueue.length === 0) return;

    for (const action of state.playerActionQueue) {
      if (action.type === 'USE_ITEM') {
        const result = applyPlayerItem(
          state.battleState,
          action.itemId,
          action.targetActorId,
          action.eventId
        );
        for (const event of result.events) {
          recordFactEvent(event);
        }
      } else if (action.type === 'INJECT_BROADCAST') {
        state.battleState.directorBroadcasts.push(action.broadcast);
        const tx = state.battleState.commandTransactions.find(
          (t) => t.transactionId === action.broadcast.sourceTransactionId
        );
        if (tx && tx.status === 'READY_TO_INJECT') {
          tx.status = 'INJECTED';
        }
        recordFactEvent({
          eventId: `evt_${Date.now()}_broadcast`,
          actorActionIndex: state.battleState.actorActionIndex,
          type: 'DIRECTOR_BROADCAST_INJECTED',
          activeActorId: undefined,
          directorBroadcastId: action.broadcast.broadcastId,
          broadcastText: action.broadcast.text,
          diffs: [{ path: 'broadcast', oldValue: '', newValue: action.broadcast.text }],
          tags: ['BROADCAST'],
          createdAt: Date.now(),
        });
      }
    }

    state.playerActionQueue = [];
    if (!disposed) config.onStateChange?.(state.battleState);
  }

  function advanceDramaBeatIfNeeded(): boolean {
    if (!state || state.battleState.phase !== 'RUNNING') return false;
    if (!shouldStartNewBeat(state.battleState)) return false;

    const nextBeat = createNextDramaBeat(state.battleState);
    if (!nextBeat) {
      state.battleState.currentBeat = undefined;
      return false;
    }

    const event = createBeatStartedEvent(state.battleState, nextBeat);
    state.battleState.currentBeat = nextBeat;
    recordFactEvent(event);
    state.lastShowrunnerActionIndex = state.battleState.actorActionIndex;
    return true;
  }

  function prepareActorsForSelection(): BattleState['actors'] {
    state.battleState.actors = accumulateActorReadiness(state.battleState.actors);
    return state.battleState.actors;
  }

  function enqueueDisplayPayloads(payloads: unknown[]): void {
    for (const payload of payloads) {
      state.queues = enqueueDisplay(state.queues, payload);
    }
  }

  function appendReporterMemories(entries: ReporterMemoryEntry[]): void {
    if (!entries.length) return;
    state.battleState.reporterMemory.push(...entries);
    if (hooks.mapReporterMemoryToDisplay) {
      enqueueDisplayPayloads(hooks.mapReporterMemoryToDisplay(entries));
    }
  }

  function collectEventReporterMemories(): void {
    if (!hooks.collectEventMemories) return;
    const entries = hooks.collectEventMemories(
      state.battleState,
      state.battleState.reporterMemoryCursor
    );
    appendReporterMemories(entries);
    state.battleState.reporterMemoryCursor = state.battleState.eventLog.length;
  }

  function collectPeriodicReporterMemories(): void {
    if (state.battleState.actorActionIndex % 8 !== 0) return;

    const staged: ReporterMemoryEntry[] = [];
    const stageBrief = hooks.createStageBrief?.(state.battleState) ?? null;
    if (stageBrief) staged.push(stageBrief);

    if (hooks.collectStateMemories) {
      staged.push(...hooks.collectStateMemories(state.battleState));
    }

    appendReporterMemories(staged);
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
    return item ?? null;
  }

  function enqueueDisplayEvent(event: unknown): void {
    if (!state) return;
    state.queues = enqueueDisplay(state.queues, event);
  }

  function recordFactEvent(event: BattleEvent): void {
    if (!state) return;

    state.battleState.eventLog.push(event);

    if (hooks.mapBattleEventToDisplay) {
      enqueueDisplayPayloads(hooks.mapBattleEventToDisplay(event, state.battleState));
    }

    collectEventReporterMemories();

    if (!disposed) {
      config.onEvent?.(event);
      hooks.onEventRecorded?.(event, state.battleState);
    }
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
      if (result.decision === 'REJECT') {
        const hasPriorReject = state.battleState.commandTransactions.some(
          (t) => t.transactionId !== transaction.transactionId && t.status === 'REJECTED'
        );
        transaction.frozenCost = hasPriorReject ? Math.floor(transaction.estimatedCost * 0.3) : 0;
      }

      if (
        result.directorBroadcastDraft &&
        (result.decision === 'ALLOW' || result.decision === 'DOWNGRADE')
      ) {
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
        transaction.directorBroadcast = broadcast;
        state.playerActionQueue.push({ type: 'INJECT_BROADCAST', broadcast });
        if (!isStepping) {
          drainPlayerActions();
        }
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

  function useItem(
    itemId: ItemId,
    targetActorId: string
  ): { ok: true; eventId: string } | { ok: false; reason: string } {
    if (!state) return { ok: false, reason: 'Engine not initialized' };

    const validation = validateItemUse(state.battleState, itemId, targetActorId);
    if (!validation.valid) return { ok: false, reason: validation.reason! };

    const eventId = `item_${Date.now()}`;
    state.battleState.itemUsesRemaining = Math.max(0, state.battleState.itemUsesRemaining - 1);

    state.playerActionQueue.push({ type: 'USE_ITEM', itemId, targetActorId, eventId });

    if (!isStepping) {
      drainPlayerActions();
    }

    return { ok: true, eventId };
  }

  function resolveAsk(transactionId: string, selectedActorId: string): {
    ok: boolean;
    chargeEffect: { gold: number };
    error?: string;
  } {
    if (!state) return { ok: false, chargeEffect: { gold: 0 }, error: 'Engine not initialized' };

    const tx = state.battleState.commandTransactions.find((t) => t.transactionId === transactionId);
    if (!tx || tx.status !== 'WAITING_CLARIFICATION') {
      return { ok: false, chargeEffect: { gold: 0 }, error: 'Transaction not in WAITING_CLARIFICATION' };
    }

    const rawInput = tx.pendingRawInput ?? tx.rawInput;
    const targetName =
      state.battleState.actors.find((actor) => actor.actorId === selectedActorId)?.name ?? selectedActorId;
    const broadcast: DirectorBroadcast = {
      broadcastId: `broadcast_${Date.now()}`,
      text: `导播信号切向 ${targetName}：${rawInput}`,
      scope: 'TARGETED',
      targetActorIds: [selectedActorId],
      lifetime: 'NEXT_ACTION',
      expiresAtActionIndex: state.battleState.actorActionIndex + 1,
      reactedActorIds: [],
      sourceTransactionId: tx.transactionId,
    };

    tx.status = 'READY_TO_INJECT';
    tx.directorBroadcast = broadcast;
    tx.paidCost = tx.estimatedCost;
    state.playerActionQueue.push({ type: 'INJECT_BROADCAST', broadcast });

    if (!isStepping) drainPlayerActions();
    config.onStateChange?.(state.battleState);

    return { ok: true, chargeEffect: { gold: tx.estimatedCost } };
  }

  function cancelAsk(transactionId: string): {
    ok: boolean;
    refundEffect: { gold: number };
    error?: string;
  } {
    if (!state) return { ok: false, refundEffect: { gold: 0 }, error: 'Engine not initialized' };

    const tx = state.battleState.commandTransactions.find((t) => t.transactionId === transactionId);
    if (!tx || tx.status !== 'WAITING_CLARIFICATION') {
      return { ok: false, refundEffect: { gold: 0 }, error: 'Transaction not in WAITING_CLARIFICATION' };
    }

    tx.status = 'CANCELLED';
    tx.refundedCost = tx.frozenCost;
    config.onStateChange?.(state.battleState);

    return { ok: true, refundEffect: { gold: tx.frozenCost } };
  }

  function getPendingAskTransaction(): {
    transactionId: string;
    targetQuestion: string;
    targetOptions: { actorId: string; label: string }[];
  } | null {
    if (!state) return null;
    const tx = state.battleState.commandTransactions.find((t) => t.status === 'WAITING_CLARIFICATION');
    if (!tx || !tx.result) return null;
    return {
      transactionId: tx.transactionId,
      targetQuestion: tx.result.targetQuestion ?? '请选择目标',
      targetOptions: tx.result.targetOptions?.map((o) => ({ actorId: o.actorId, label: o.label })) ?? [],
    };
  }

  function finalizePendingCommands(): { refundEffects: { gold: number; transactionId: string }[] } {
    if (!state) return { refundEffects: [] };
    const refundEffects: { gold: number; transactionId: string }[] = [];

    for (const tx of state.battleState.commandTransactions) {
      if (tx.status === 'READY_TO_INJECT' && tx.frozenCost > 0) {
        tx.status = 'CANCELLED';
        tx.refundedCost = tx.frozenCost;
        refundEffects.push({ gold: tx.frozenCost, transactionId: tx.transactionId });
      }
    }

    if (refundEffects.length > 0) config.onStateChange?.(state.battleState);
    return { refundEffects };
  }

  return {
    init,
    start,
    pause,
    resume,
    startAuto,
    switchManual,
    stepManual,
    step,
    endBattle,
    dispose,
    getState,
    getNextDisplayItem,
    consumeDisplayItem,
    enqueueDisplayEvent,
    recordFactEvent,
    submitCommand,
    useItem,
    resolveAsk,
    cancelAsk,
    getPendingAskTransaction,
    finalizePendingCommands,
  };
}

function applyCommitResult(state: BattleState, result: CommitResult): BattleState {
  return {
    ...state,
    stateVersion: result.newStateVersion,
    actors: result.newActors ?? state.actors,
    scene: {
      ...state.scene,
      ...result.sceneDiff,
    },
  };
}
