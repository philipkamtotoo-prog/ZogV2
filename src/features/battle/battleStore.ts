import { create } from 'zustand';
import type { ActorCombatState, ActorPromptInjection, BattleState, ProgramMutation, ProgramMutationId } from '../../core/battle/types';
import type { DisplayEvent } from './display/displayTypes';
import type { ItemId } from '../../core/economy/items';
import type { FinalScore } from '../../core/battle/finalScore';
import { calculateFinalScores } from '../../core/battle/finalScore';
import { generateFallbackLiveReport, generateLiveReport, type LiveReport } from '../reports/reportGenerator';
import { createBattleEngine } from '../../engine/battleEngine';
import { createLLMActorBrainProvider } from '../../llm/llmActorBrainProvider';
import { createStubActorBrainProvider } from '../../llm/stubActorBrainProvider';
import { createCommandGateProvider } from '../../llm/commandGateProvider';
import { loadStoredLLMConfig, validateLLMConfig } from '../../llm/clients/byokConfig';
import { DEFAULT_ROSTER, type RosterActor } from '../actors/actorRoster';
import { useLoungeStore, KEYBOARD_LIMITS } from '../lounge/loungeStore';
import type { ActorTemplate } from '../../core/battle/initialState';
import type { BetSlip } from '../../core/economy/betting';
import { calculateOdds, createBetSlip, lockBet, calculatePayout, isValidBetAmount } from '../../core/economy/betting';
import { randomInt } from '../../core/battle/rng';
import { applyMutationToBattleState, drawMutationCandidates, getMutationById, MUTATION_LIQUID_COST } from '../../core/battle/programMutations';
import { calculateSalaryAwards } from '../../core/battle/finalScore';
import { generateZogReaction } from '../reports/zogReaction';

type BattleView = 'LOBBY' | 'BETTING' | 'BATTLE' | 'RESULTS';

interface BattleStore {
  view: BattleView;
  battleState: BattleState | null;
  displayLog: DisplayEvent[];
  finalScores: FinalScore[];
  commandInput: string;
  commandStatus: string | null;
  isProcessing: boolean;
  liveReport: LiveReport | null;
  lastLiveReportActionIndex: number;

  engine: ReturnType<typeof createBattleEngine> | null;
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
  stepBattle: () => Promise<void>;
  startAuto: () => void;
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

function getLLMConfig() {
  const config = loadStoredLLMConfig();
  if (!config) return null;
  return validateLLMConfig(config).valid ? config : null;
}

function drawEpisodeRoster(seed: string, rerollIndex: number, count = 5): RosterActor[] {
  const pool = [...DEFAULT_ROSTER];
  const picked: RosterActor[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = randomInt(seed, rerollIndex * 10 + i, 'episodeRoster', 0, pool.length - 1);
    const [actor] = pool.splice(index, 1);
    picked.push(actor);
  }

  return picked;
}

function buildRosterTemplates(seed: string, rerollIndex: number): ActorTemplate[] {
  return drawEpisodeRoster(seed, rerollIndex).map((r) => ({
    actorId: r.actorId,
    name: r.name,
    ATK: r.baseATK,
    DEF: r.baseDEF,
    SPD: r.baseSPD,
    baseThreat: r.baseThreat,
    maxHP: r.baseHP ?? 100,
  }));
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  view: 'LOBBY',
  battleState: null,
  displayLog: [],
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
    const llmConfig = getLLMConfig();
    const itemUsesRemaining = useLoungeStore.getState().fridgeItemUseLimit;

    if (llmConfig) {
      console.info(
        `[LLM:MODE] provider=${llmConfig.providerId} baseUrl=${llmConfig.baseUrl} model=${llmConfig.model} debug=${llmConfig.debugMode}`
      );
      if (llmConfig.debugMode !== 'verbose') {
        console.info('[LLM:MODE] Prompt/response logging is disabled. Set LLM BYOK Settings -> debug verbose, then Save.');
      }
    } else {
      console.info('[LLM:MODE] Stub mode: no valid BYOK config. No LLM request will be sent.');
    }

    const provider = llmConfig
      ? createLLMActorBrainProvider({ llmConfig, timeout: 20000, maxRetries: 2 })
      : createStubActorBrainProvider();

    const commandGateProvider = llmConfig
      ? createCommandGateProvider({ llmConfig, timeout: 15000, maxRetries: 1 })
      : undefined;

    const templates = buildRosterTemplates(battleSeed, rerollIndex);
    const engineId = `engine_${Date.now()}`;
    const capturedId = engineId;

    const engine = createBattleEngine({
      actorBrainProvider: provider,
      commandGateProvider,
      maxActions: 40,
      onStateChange: (state) => {
        if (get().engineId !== capturedId) return;
        set({ battleState: { ...state } });

        if (state.phase === 'FINAL_REPORT') {
          get().finalizePendingCommands();
          const scores = calculateFinalScores(state.actors, state.eventLog);
          const salaryAwards = calculateSalaryAwards(scores);
          state.salaryAwards = salaryAwards;
          for (const award of salaryAwards) {
            useLoungeStore.getState().addActorSalary(award.actorId, award.totalSalary);
          }
          // 写入 Zog 反应事件
          const engine = get().engine;
          if (engine) {
            const reaction = generateZogReaction(scores);
            engine.recordFactEvent({
              eventId: `evt_${Date.now()}_zog`,
              actorActionIndex: state.actorActionIndex,
              type: 'ZOG_REACTION_EMITTED',
              activeActorId: undefined,
              diffs: [],
              tags: ['ZOG'],
              createdAt: Date.now(),
              zogReaction: reaction,
            });
          }
          set({ finalScores: scores, battleState: { ...state }, view: 'RESULTS' });
        } else if (state.phase === 'RUNNING') {
          const currentStore = get();
          const previousLiveReportActionIndex = currentStore.lastLiveReportActionIndex;
          if (state.actorActionIndex - previousLiveReportActionIndex >= 3) {
            set({ lastLiveReportActionIndex: state.actorActionIndex });
            const llmConfig = getLLMConfig();
            const memoryLogs = state.reporterMemory
              .filter((m) => m.actorActionIndex > previousLiveReportActionIndex)
              .sort((a, b) => b.severity - a.severity || b.actorActionIndex - a.actorActionIndex)
              .map((m) => `[#${m.actorActionIndex}] ${m.title}: ${m.text}`);
            const eventLogs = state.eventLog
              .slice(-20)
              .filter(e => e.line || e.type === 'ACTOR_ELIMINATED' || e.type === 'DIRECTOR_BROADCAST_INJECTED')
              .map(e => {
                if (e.type === 'ACTOR_ELIMINATED') return `[#${e.actorActionIndex}] 致命击杀: ${state.actors.find(a=>a.actorId===e.targetActorId)?.name} 阵亡！`;
                if (e.type === 'DIRECTOR_BROADCAST_INJECTED') return `[#${e.actorActionIndex}] ✨ 上帝降临: ${e.diffs[0]?.newValue}`;
                return `[#${e.actorActionIndex}] ${state.actors.find(a=>a.actorId===e.activeActorId)?.name}: ${e.line}`;
              });
            const recentLogs = memoryLogs.length > 0 ? memoryLogs : eventLogs;
            if (llmConfig) {
              generateLiveReport(state, llmConfig, recentLogs).then((res: LiveReport | null) => {
                if (res && get().engineId === capturedId) {
                  set({ liveReport: res });
                }
              });
            } else {
              const fallback = generateFallbackLiveReport(state, recentLogs);
              if (fallback) set({ liveReport: fallback });
            }
          }
        }
      },
    });

    engine.init(battleSeed, 5, templates, itemUsesRemaining, {
      actorPromptInjections,
      selectedMutation: selectedMutation ?? undefined,
    });
    const engineState = engine.getState()!;

    // 对每个永久注入写入 PROMPT_INJECTION_APPLIED 事件
    for (const inj of actorPromptInjections) {
      if (inj.source === 'PERMANENT') {
        engine.recordFactEvent({
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
      engine,
      engineId,
      _drainInterval: null,
      view: 'BETTING',
      battleState: { ...engineState.battleState },
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
    const { engine } = get();
    if (!engine) return;
    engine.pause();
  },

  resumeBattle: () => {
    const { engine } = get();
    if (!engine) return;
    engine.resume();
  },

  stepBattle: async () => {
    const { engine } = get();
    if (!engine) return;
    set({ isProcessing: true });

    await engine.stepManual();

    let item = engine.consumeDisplayItem();
    while (item) {
      set((s) => ({ displayLog: [...s.displayLog, item!] }));
      item = engine.consumeDisplayItem();
    }

    set({ isProcessing: false });
  },

  startAuto: () => {
    const { engine, _drainInterval: oldDrain } = get();
    if (!engine) return;
    if (oldDrain) clearInterval(oldDrain);

    const drain = () => {
      let item = engine.consumeDisplayItem();
      while (item) {
        set((s) => ({ displayLog: [...s.displayLog, item!] }));
        item = engine.consumeDisplayItem();
      }
    };

    engine.startAuto(800);

    const interval = setInterval(() => {
      drain();
      const state = engine.getState();
      if (state && state.battleState.phase === 'FINAL_REPORT') {
        clearInterval(interval);
        set({ _drainInterval: null });
        drain();
      }
    }, 400);

    set({ _drainInterval: interval });
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
      (t) => t.transactionId === result.transactionId
    );

    if (!transaction) {
      set({ commandStatus: 'REJECTED', isProcessing: false });
      return;
    }

    if (transaction.status === 'WAITING_CLARIFICATION') {
      set({ isProcessing: false, commandStatus: 'WAITING_CLARIFICATION' });
      return;
    }

    if ((transaction.status === 'READY_TO_INJECT' || transaction.status === 'REJECTED') && transaction.frozenCost > 0) {
      if (transaction.status === 'READY_TO_INJECT') {
        const spent = useLoungeStore.getState().spendGold(transaction.frozenCost);
        if (!spent) {
          set({ commandStatus: 'NOT_ENOUGH_GOLD', isProcessing: false });
          return;
        }
        transaction.paidCost = transaction.frozenCost;
      } else if (transaction.status === 'REJECTED') {
        useLoungeStore.getState().spendGold(transaction.frozenCost);
        transaction.paidCost = transaction.frozenCost;
      }
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

    engine.finalizePendingCommands();
  },

  consumeDisplay: () => {
    const { engine } = get();
    if (!engine) return null;
    return engine.consumeDisplayItem() ?? null;
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

    // 扣本金 + 增加演员好感（文档7.1节）
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
    const llmConfig = getLLMConfig();
    const provider = llmConfig
      ? createLLMActorBrainProvider({ llmConfig, timeout: 20000, maxRetries: 2 })
      : createStubActorBrainProvider();
    const commandGateProvider = llmConfig
      ? createCommandGateProvider({ llmConfig, timeout: 15000, maxRetries: 1 })
      : undefined;
    const engineId = `engine_${Date.now()}`;
    const capturedId = engineId;
    const templates = buildRosterTemplates(battleState.battleSeed, nextRerollIndex);
    const newEngine = createBattleEngine({
      actorBrainProvider: provider,
      commandGateProvider,
      maxActions: 40,
      onStateChange: (state) => {
        if (get().engineId !== capturedId) return;
        set({ battleState: { ...state } });
        if (state.phase === 'FINAL_REPORT') {
          get().finalizePendingCommands();
          const scores = calculateFinalScores(state.actors, state.eventLog);
          const salaryAwards = calculateSalaryAwards(scores);
          state.salaryAwards = salaryAwards;
          const reaction = generateZogReaction(scores);
          newEngine.recordFactEvent({
            eventId: `evt_${Date.now()}_zog`,
            actorActionIndex: state.actorActionIndex,
            type: 'ZOG_REACTION_EMITTED',
            activeActorId: undefined,
            diffs: [],
            tags: ['ZOG'],
            createdAt: Date.now(),
            zogReaction: reaction,
          });
          set({ finalScores: scores, battleState: { ...state }, view: 'RESULTS' });
        } else if (state.phase === 'RUNNING') {
          const currentStore = get();
          const previousLiveReportActionIndex = currentStore.lastLiveReportActionIndex;
          if (state.actorActionIndex - previousLiveReportActionIndex >= 3) {
            set({ lastLiveReportActionIndex: state.actorActionIndex });
            const llmConfig = getLLMConfig();
            const memoryLogs = state.reporterMemory
              .filter((m) => m.actorActionIndex > previousLiveReportActionIndex)
              .sort((a, b) => b.severity - a.severity || b.actorActionIndex - a.actorActionIndex)
              .map((m) => `[#${m.actorActionIndex}] ${m.title}: ${m.text}`);
            const eventLogs = state.eventLog
              .slice(-20)
              .filter(e => e.line || e.type === 'ACTOR_ELIMINATED' || e.type === 'DIRECTOR_BROADCAST_INJECTED')
              .map(e => {
                if (e.type === 'ACTOR_ELIMINATED') return `[#${e.actorActionIndex}] 致命击杀: ${state.actors.find(a=>a.actorId===e.targetActorId)?.name} 阵亡！`;
                if (e.type === 'DIRECTOR_BROADCAST_INJECTED') return `[#${e.actorActionIndex}] ✨ 上帝降临: ${e.diffs[0]?.newValue}`;
                return `[#${e.actorActionIndex}] ${state.actors.find(a=>a.actorId===e.activeActorId)?.name}: ${e.line}`;
              });
            const recentLogs = memoryLogs.length > 0 ? memoryLogs : eventLogs;
            if (llmConfig) {
              generateLiveReport(state, llmConfig, recentLogs).then((res: LiveReport | null) => {
                if (res && get().engineId === capturedId) {
                  set({ liveReport: res });
                }
              });
            } else {
              const fallback = generateFallbackLiveReport(state, recentLogs);
              if (fallback) set({ liveReport: fallback });
            }
          }
        }
      },
    });

    newEngine.init(battleState.battleSeed, 5, templates, useLoungeStore.getState().fridgeItemUseLimit, {
      selectedMutation: get().selectedMutation ?? undefined,
      actorPromptInjections: [],
    });

    set({
      engine: newEngine,
      engineId,
      _drainInterval: null,
      battleState: { ...newEngine.getState()!.battleState },
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
    const spent = useLoungeStore.getState().spendGold(MUTATION_LIQUID_COST);
    if (!spent) return;
    set({ mutationCandidates: drawMutationCandidates(battleState.battleSeed, rerollIndex) });
  },

  selectMutation: (mutationId: ProgramMutationId) => {
    const { battleState, engine, selectedMutation } = get();
    if (!battleState || !engine || selectedMutation) return;
    const mutation = getMutationById(mutationId);
    const engineState = engine.getState();
    if (!engineState) return;
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

export function getAliveActors(actors: ActorCombatState[]): ActorCombatState[] {
  return actors.filter((a) => a.isAlive);
}
