import { create } from 'zustand';
import type { BattleState, DisplayItem, ActorCombatState } from '../../core/battle/types';
import type { ItemId } from '../../core/economy/items';
import type { FinalScore } from '../../core/battle/finalScore';
import { calculateFinalScores } from '../../core/battle/finalScore';
import { createBattleEngine } from '../../engine/battleEngine';
import { createLLMActorBrainProvider } from '../../llm/llmActorBrainProvider';
import { createStubActorBrainProvider } from '../../llm/stubActorBrainProvider';
import { createCommandGateProvider } from '../../llm/commandGateProvider';
import { loadStoredLLMConfig, validateLLMConfig } from '../../llm/clients/byokConfig';
import { getUnlockedActors } from '../actors/actorRoster';
import { useLoungeStore } from '../lounge/loungeStore';
import type { ActorTemplate } from '../../core/battle/initialState';
import type { BetSlip } from '../../core/economy/betting';
import { calculateOdds, createBetSlip, lockBet, calculatePayout } from '../../core/economy/betting';

type BattleView = 'LOBBY' | 'BETTING' | 'BATTLE' | 'RESULTS';

interface BattleStore {
  view: BattleView;
  battleState: BattleState | null;
  displayLog: DisplayItem[];
  finalScores: FinalScore[];
  commandInput: string;
  commandStatus: string | null;
  isProcessing: boolean;

  engine: ReturnType<typeof createBattleEngine> | null;
  engineId: string | null;
  _drainInterval: ReturnType<typeof setInterval> | null;

  // 押注
  betSlip: BetSlip | null;

  initBattle: (seed?: string) => void;
  startBattle: () => void;
  pauseBattle: () => void;
  resumeBattle: () => void;
  stepBattle: () => Promise<void>;
  startAuto: () => void;
  submitCommand: (input: string) => Promise<void>;
  setCommandInput: (input: string) => void;
  consumeDisplay: () => DisplayItem | null;
  goToLobby: () => void;

  // 押注
  placeBet: (actorId: string, amount: number) => void;
  confirmBet: () => void;
  getBetPayout: () => number;

  // 道具
  useItem: (itemId: ItemId, targetActorId: string) => { ok: true; eventId: string } | { ok: false; reason: string } | undefined;
}

function getLLMConfig() {
  const config = loadStoredLLMConfig();
  if (!config) return null;
  return validateLLMConfig(config).valid ? config : null;
}

function buildRosterTemplates(): ActorTemplate[] {
  const extraIds = useLoungeStore.getState().unlockedActorIds;
  return getUnlockedActors(extraIds).map((r) => ({
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

  initBattle: (seed?: string) => {
    const { engine: oldEngine, _drainInterval: oldDrain } = get();
    if (oldDrain) clearInterval(oldDrain);
    oldEngine?.dispose();

    const battleSeed = seed ?? `battle_${Date.now()}`;
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

    const templates = buildRosterTemplates();
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
          const scores = calculateFinalScores(state.actors, state.eventLog);
          set({ finalScores: scores, view: 'RESULTS' });
        }
      },
    });

    engine.init(battleSeed, templates.length, templates, itemUsesRemaining);
    const engineState = engine.getState()!;

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
    });
  },

  startBattle: () => {
    const { engine } = get();
    if (!engine) return;
    engine.start();
    set({ battleState: { ...engine.getState()!.battleState }, view: 'BATTLE' });
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
    set({ isProcessing: true, commandStatus: null });

    const result = await engine.submitCommand(input);
    set({ commandStatus: result.status, commandInput: '', isProcessing: false });
  },

  setCommandInput: (input: string) => set({ commandInput: input }),

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
    });
  },

  // === 押注 ===
  placeBet: (actorId: string, amount: number) => {
    const { battleState } = get();
    if (!battleState) return;
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
  useItem: (itemId: ItemId, targetActorId: string) => {
    const { engine, battleState } = get();
    if (!engine || !battleState) return;
    return engine.useItem(itemId, targetActorId);
  },
}));

export function getAliveActors(actors: ActorCombatState[]): ActorCombatState[] {
  return actors.filter((a) => a.isAlive);
}
