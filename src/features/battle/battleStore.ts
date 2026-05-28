import { create } from 'zustand';
import type { ActorPromptInjection, BattleState, ProgramMutation, ProgramMutationId } from '../../core/battle/types';
import type { DisplayEvent } from './display/displayTypes';
import type { ItemId } from '../../core/economy/items';
import type { FinalScore } from '../../core/battle/finalScore';
import { useLoungeStore, KEYBOARD_LIMITS } from '../lounge/loungeStore';
import type { BetSlip } from '../../core/economy/betting';
import { calculateOdds, createBetSlip, lockBet, calculatePayout, isValidBetAmount } from '../../core/economy/betting';
import { applyMutationToBattleState, drawMutationCandidates, getMutationById, MUTATION_LIQUID_COST } from '../../core/battle/programMutations';
import { createBattleSession } from './services/battleSessionFactory';
import { drainDisplayQueue } from './services/battleDisplayDrain';

type BattleView = 'LOBBY' | 'BETTING' | 'BATTLE' | 'RESULTS';

interface BattleStore {
  view: BattleView;
  battleState: BattleState | null;
  displayLog: DisplayEvent[];
  battleSpeedMs: number;
  finalScores: FinalScore[];
  commandInput: string;
  commandStatus: string | null;
  isProcessing: boolean;
  liveReport: { headline: string; summary: string; style: string } | null;
  lastLiveReportActionIndex: number;

  engine: ReturnType<typeof import('../../engine/battleEngine').createBattleEngine> | null;
  engineId: string | null;
  _drainInterval: ReturnType<typeof setInterval> | null;

  // 押注
  betSlip: BetSlip | null;
  actorPromptInjections: ActorPromptInjection[];
  mutationCandidates: ProgramMutation[];
  selectedMutation: ProgramMutation | null;
  rerollIndex: number;

  initBattle: (seed?: string) => void;
  startBattle: () => void;
  pauseBattle: () => void;
  resumeBattle: () => void;
  switchToManual: () => void;
  stepBattle: () => Promise<void>;
  startAuto: () => void;
  setBattleSpeed: (ms: number) => void;
  submitCommand: (input: string) => Promise<void>;
  setCommandInput: (input: string) => void;
  resolveAsk: (selectedActorId: string) => void;
  cancelAsk: () => void;
  finalizePendingCommands: () => void;
  consumeDisplay: () => DisplayEvent | null;
  goToLobby: () => void;
  clearLiveReport: () => void;

  // 押注
  placeBet: (actorId: string, amount: number) => void;
  confirmBet: () => void;
  getBetPayout: () => number;
  rerollActors: () => void;
  buyMutationLiquid: () => void;
  selectMutation: (mutationId: ProgramMutationId) => void;
  setActorPromptInjection: (actorId: string, prompt: string) => void;

  // 道具
  useItem: (itemId: ItemId, targetActorId: string) => { ok: true; eventId: string } | { ok: false; reason: string } | undefined;
}

// Module-level engineRef used during session creation (passed to handler)
const engineRef: { current: ReturnType<typeof import('../../engine/battleEngine').createBattleEngine> | null } = { current: null };

function chargeCommandTransactionIfNeeded(transaction: BattleState['commandTransactions'][number]): boolean {
  if (transaction.frozenCost <= 0 || transaction.paidCost > 0) return true;
  if (
    transaction.status !== 'READY_TO_INJECT' &&
    transaction.status !== 'INJECTED' &&
    transaction.status !== 'REJECTED'
  ) {
    return true;
  }

  const spent = useLoungeStore.getState().spendGold(transaction.frozenCost);
  if (!spent) return false;

  transaction.paidCost = transaction.frozenCost;
  return true;
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  view: 'LOBBY',
  battleState: null,
  displayLog: [],
  battleSpeedMs: 500,
  finalScores: [],
  commandInput: '',
  commandStatus: null,
  isProcessing: false,
  engine: null,
  engineId: null,
  _drainInterval: null,
  betSlip: null,
  actorPromptInjections: [],
  mutationCandidates: [],
  selectedMutation: null,
  rerollIndex: 0,
  liveReport: null,
  lastLiveReportActionIndex: 0,

  initBattle: (seed?: string) => {
    const { engine: oldEngine, _drainInterval: oldDrain } = get();
    if (oldDrain) clearInterval(oldDrain);
    oldEngine?.dispose();

    const battleSeed = seed ?? `battle_${Date.now()}`;
    const rerollIndex = 0;
    const selectedMutation = null;
    const permanentPrompts = useLoungeStore.getState().actorPermanentPrompts;
    const actorPromptInjections: ActorPromptInjection[] = Object.entries(permanentPrompts).map(([actorId, prompt]) => ({
      actorId,
      prompt,
      source: 'PERMANENT',
      createdAt: Date.now(),
    }));
    const itemUses = useLoungeStore.getState().fridgeItemUseLimit;

    engineRef.current = null;
    const unlockedActorIds = useLoungeStore.getState().unlockedActorIds;
    const session = createBattleSession(battleSeed, rerollIndex, unlockedActorIds, get, set as Parameters<typeof createBattleSession>[4], engineRef);

    session.engine.init(battleSeed, session.templates.length, session.templates, itemUses, {
      actorPromptInjections,
      selectedMutation: selectedMutation ?? undefined,
    });

    for (const inj of actorPromptInjections) {
      if (inj.source === 'PERMANENT') {
        session.engine.recordFactEvent({
          eventId: `evt_${Date.now()}_perm_prompt_${inj.actorId}`,
          actorActionIndex: 0,
          type: 'PROMPT_INJECTION_APPLIED',
          activeActorId: inj.actorId,
          diffs: [],
          tags: ['PROMPT'],
          createdAt: Date.now(),
          promptText: inj.prompt,
          promptSource: 'PERMANENT',
        });
      }
    }

    set({
      engine: session.engine,
      engineId: session.engineId,
      _drainInterval: null,
      view: 'BETTING',
      battleState: { ...session.engine.getState()!.battleState },
      displayLog: [],
      finalScores: [],
      commandStatus: null,
      betSlip: null,
      actorPromptInjections,
      mutationCandidates: [],
      selectedMutation,
      rerollIndex,
      liveReport: null,
      lastLiveReportActionIndex: 0,
    });
  },

  startBattle: () => {
    const { engine } = get();
    if (!engine) return;
    engine.start();
    set({ battleState: { ...engine.getState()!.battleState }, view: 'BATTLE' });
    get().startAuto();
  },

  pauseBattle: () => {
    const { engine, _drainInterval } = get();
    if (!engine) return;
    if (_drainInterval) clearInterval(_drainInterval);
    engine.pause();
    set({ _drainInterval: null });
  },

  resumeBattle: () => {
    const { engine } = get();
    if (!engine) return;
    const mode = engine.getState()?.battleState.runMode;
    if (mode === 'AUTO') {
      get().startAuto();
      return;
    }
    engine.resume();
  },

  switchToManual: () => {
    const { engine, _drainInterval } = get();
    if (!engine) return;
    if (_drainInterval) clearInterval(_drainInterval);

    const engineState = engine.switchManual();
    drainDisplayQueue(engine, (item) =>
      set((s) => ({ displayLog: [...s.displayLog, item] }))
    );
    set({ _drainInterval: null, battleState: { ...engineState.battleState } });
  },

  stepBattle: async () => {
    const { engine, _drainInterval } = get();
    if (!engine) return;
    if (_drainInterval) clearInterval(_drainInterval);
    set({ isProcessing: true });

    await engine.stepManual();

    drainDisplayQueue(engine, (item) =>
      set((s) => ({ displayLog: [...s.displayLog, item] }))
    );

    const state = engine.getState();
    set({
      _drainInterval: null,
      battleState: state ? { ...state.battleState } : get().battleState,
      isProcessing: false,
    });
  },

  startAuto: () => {
    const { engine, _drainInterval: oldDrain, battleSpeedMs } = get();
    if (!engine) return;
    if (oldDrain) clearInterval(oldDrain);

    engine.startAuto(battleSpeedMs);

    const displayIntervalMs = Math.max(80, Math.floor(battleSpeedMs / 2));

    const interval = setInterval(() => {
      drainDisplayQueue(engine, (item) =>
        set((s) => ({ displayLog: [...s.displayLog, item] }))
      );
      const state = engine.getState();
      if (state && state.battleState.phase === 'FINAL_REPORT') {
        clearInterval(interval);
        drainDisplayQueue(engine, (item) =>
          set((s) => ({ displayLog: [...s.displayLog, item] }))
        );
        set({ _drainInterval: null });
      }
    }, displayIntervalMs);

    set({ _drainInterval: interval });
  },

  setBattleSpeed: (ms: number) => {
    const nextMs = Math.max(120, ms);
    const { engine } = get();
    const currentState = engine?.getState()?.battleState;

    set({ battleSpeedMs: nextMs });

    if (currentState?.phase === 'RUNNING' && currentState.runMode === 'AUTO' && currentState.clockState === 'PLAYING') {
      get().startAuto();
    }
  },

  submitCommand: async (input: string) => {
    const { engine } = get();
    if (!engine) return;

    const estimatedCost = input.length * 20;
    if (useLoungeStore.getState().gold < estimatedCost) {
      set({ commandStatus: 'NOT_ENOUGH_GOLD' });
      return;
    }

    set({ isProcessing: true, commandStatus: null });

    const result = await engine.submitCommand(input);
    const engineState = engine.getState();
    const transaction = engineState?.battleState.commandTransactions.find(
      (t: import('../../core/battle/types').CommandTransaction) => t.transactionId === result.transactionId
    );

    if (!transaction) {
      set({ commandStatus: 'REJECTED', isProcessing: false });
      return;
    }

    if (transaction.status === 'WAITING_CLARIFICATION') {
      set({ isProcessing: false, commandStatus: 'WAITING_CLARIFICATION' });
      return;
    }

    if (!chargeCommandTransactionIfNeeded(transaction)) {
      set({ commandStatus: 'NOT_ENOUGH_GOLD', isProcessing: false });
      return;
    }

    set({ commandStatus: result.status, commandInput: '', isProcessing: false });
  },

  setCommandInput: (input: string) => {
    const keyboardLevel = useLoungeStore.getState().keyboardLevel;
    const limit = KEYBOARD_LIMITS[keyboardLevel] ?? 5;
    if (input.length > limit) return;
    set({ commandInput: input });
  },

  resolveAsk: (selectedActorId: string) => {
    const { engine } = get();
    if (!engine) return;

    const pending = engine.getPendingAskTransaction();
    if (!pending) return;

    set({ isProcessing: true });
    const result = engine.resolveAsk(pending.transactionId, selectedActorId);
    if (result.ok && result.chargeEffect.gold > 0) {
      useLoungeStore.getState().spendGold(result.chargeEffect.gold);
    }
    set({ commandStatus: result.ok ? 'READY_TO_INJECT' : 'REJECTED', isProcessing: false });
  },

  cancelAsk: () => {
    const { engine } = get();
    if (!engine) return;

    const pending = engine.getPendingAskTransaction();
    if (!pending) return;

    const result = engine.cancelAsk(pending.transactionId);
    if (result.ok && result.refundEffect.gold > 0) {
      useLoungeStore.getState().addGold(result.refundEffect.gold);
    }
    set({ commandStatus: 'CANCELLED' });
  },

  finalizePendingCommands: () => {
    const { engine } = get();
    if (!engine) return;

    const { refundEffects } = engine.finalizePendingCommands();
    for (const effect of refundEffects) {
      if (effect.gold > 0) {
        useLoungeStore.getState().addGold(effect.gold);
      }
    }
  },

  consumeDisplay: () => {
    const { engine } = get();
    if (!engine) return null;
    return (engine.consumeDisplayItem() as DisplayEvent | null) ?? null;
  },

  goToLobby: () => {
    const { engine, _drainInterval } = get();
    if (_drainInterval) clearInterval(_drainInterval);
    engine?.dispose();
    set({
      view: 'LOBBY', battleState: null, engine: null, engineId: null,
      _drainInterval: null, displayLog: [], finalScores: [], betSlip: null,
      actorPromptInjections: [], mutationCandidates: [], selectedMutation: null, rerollIndex: 0,
      liveReport: null, lastLiveReportActionIndex: 0,
    });
  },

  clearLiveReport: () => set({ liveReport: null }),

  // === 押注 ===
  placeBet: (actorId: string, amount: number) => {
    const { battleState } = get();
    if (!battleState) return;
    if (!isValidBetAmount(amount)) return;
    const actor = battleState.actors.find((a) => a.actorId === actorId);
    if (!actor) return;

    const spent = useLoungeStore.getState().spendGold(amount);
    if (!spent) return;
    const affectionGain = Math.floor(amount / 20);
    useLoungeStore.getState().addActorAffection(actorId, affectionGain);

    const odds = calculateOdds(actor, battleState.actors);
    set({ betSlip: createBetSlip(actorId, amount, odds) });
  },

  confirmBet: () => {
    const { betSlip } = get();
    if (!betSlip) return;
    set({ betSlip: lockBet(betSlip) });
  },

  getBetPayout: () => {
    const { betSlip, finalScores } = get();
    if (!betSlip || !betSlip.locked) return 0;
    const winner = finalScores.find((s) => s.isWinner);
    const won = winner?.actorId === betSlip.actorId;
    return calculatePayout(betSlip, won);
  },

  // === 道具 ===
  rerollActors: () => {
    const { battleState, engine, _drainInterval, rerollIndex } = get();
    if (!battleState || !engine || get().view !== 'BETTING') return;
    const spent = useLoungeStore.getState().spendGold(200);
    if (!spent) return;

    if (_drainInterval) clearInterval(_drainInterval);
    engine.dispose();

    const nextRerollIndex = rerollIndex + 1;
    const itemUses = useLoungeStore.getState().fridgeItemUseLimit;

    engineRef.current = null;
    const unlockedActorIds = useLoungeStore.getState().unlockedActorIds;
    const session = createBattleSession(battleState.battleSeed, nextRerollIndex, unlockedActorIds, get, set as Parameters<typeof createBattleSession>[4], engineRef);

    session.engine.init(battleState.battleSeed, session.templates.length, session.templates, itemUses, {
      selectedMutation: get().selectedMutation ?? undefined,
      actorPromptInjections: [],
    });

    set({
      engine: session.engine,
      engineId: session.engineId,
      _drainInterval: null,
      battleState: { ...session.engine.getState()!.battleState },
      finalScores: [],
      displayLog: [],
      betSlip: null,
      actorPromptInjections: [],
      rerollIndex: nextRerollIndex,
      liveReport: null,
      lastLiveReportActionIndex: 0,
    });
  },

  buyMutationLiquid: () => {
    const { battleState, mutationCandidates, selectedMutation, rerollIndex } = get();
    if (!battleState || mutationCandidates.length > 0 || selectedMutation) return;
    set({ mutationCandidates: drawMutationCandidates(battleState.battleSeed, rerollIndex) });
  },

  selectMutation: (mutationId: ProgramMutationId) => {
    const { battleState, engine, selectedMutation } = get();
    if (!battleState || !engine || selectedMutation) return;
    const mutation = getMutationById(mutationId);
    const engineState = engine.getState();
    if (!engineState) return;
    const spent = useLoungeStore.getState().spendGold(MUTATION_LIQUID_COST);
    if (!spent) return;
    const mutated = applyMutationToBattleState(engineState.battleState, mutation);
    engineState.battleState = mutated;
    engine.recordFactEvent({
      eventId: `evt_${Date.now()}_mutation`,
      actorActionIndex: 0,
      type: 'MUTATION_SELECTED',
      activeActorId: undefined,
      diffs: [{ path: 'selectedMutation', oldValue: '', newValue: mutation.name }],
      tags: ['MUTATION'],
      createdAt: Date.now(),
      mutationId: mutation.mutationId,
    });
    set({ selectedMutation: mutation, battleState: { ...engineState.battleState } });
  },

  setActorPromptInjection: (actorId: string, prompt: string) => {
    const { battleState, engine } = get();
    if (!battleState || !engine) return;
    const cleanPrompt = prompt.trim();
    const nextInjections = [
      ...get().actorPromptInjections.filter((p) => p.actorId !== actorId),
      ...(cleanPrompt ? [{ actorId, prompt: cleanPrompt, source: 'EPISODE' as const, createdAt: Date.now() }] : []),
    ];
    const engineState = engine.getState();
    if (engineState) {
      engineState.battleState.actorPromptInjections = nextInjections;
    }
    if (cleanPrompt) {
      engine.recordFactEvent({
        eventId: `evt_${Date.now()}_prompt_${actorId}`,
        actorActionIndex: battleState.actorActionIndex,
        type: 'PROMPT_INJECTION_APPLIED',
        activeActorId: actorId,
        diffs: [],
        tags: ['PROMPT'],
        createdAt: Date.now(),
        promptText: cleanPrompt,
        promptSource: 'EPISODE',
      });
    }
    set({
      actorPromptInjections: nextInjections,
      battleState: { ...battleState, actorPromptInjections: nextInjections },
    });
  },

  useItem: (itemId: ItemId, targetActorId: string) => {
    const { engine, battleState } = get();
    if (!engine || !battleState) return { ok: false, reason: 'Engine not ready' };

    const count = useLoungeStore.getState().inventory[itemId] ?? 0;
    if (count <= 0) return { ok: false, reason: 'Not enough in inventory' };

    const result = engine.useItem(itemId, targetActorId);
    if (result.ok) {
      useLoungeStore.getState().removeItem(itemId);
    }
    return result;
  },
}));

export function getAliveActors(actors: import('../../core/battle/types').ActorCombatState[]): import('../../core/battle/types').ActorCombatState[] {
  return actors.filter((a) => a.isAlive);
}
