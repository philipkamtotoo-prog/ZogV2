/**
 * Battle session factory.
 * Creates all LLM providers, the battle engine, and the state change handler.
 * Called from battleStore.ts initBattle and rerollActors.
 */

import type { ActorTemplate } from '../../../core/battle/initialState';
import { DEFAULT_ROSTER, getUnlockedActors, type RosterActor } from '../../actors/actorRoster';
import { applyPotentialToRosterActor, type ActorPotentialStats } from '../../actors/actorPotential';
import { randomInt } from '../../../core/battle/rng';
import { createBattleEngine, type EngineHooks } from '../../../engine/battleEngine';
import { createLLMActorBrainProvider } from '../../../llm/llmActorBrainProvider';
import { createStubActorBrainProvider } from '../../../llm/stubActorBrainProvider';
import { createCommandGateProvider } from '../../../llm/commandGateProvider';
import { createLLMRoleRegistry } from '../../../llm/clients/llmRoleRegistry';
import { createShowrunnerProvider } from '../../../llm/showrunnerProvider';
import { createLiveReporterProvider } from '../../../llm/liveReporterProvider';
import type { LiveReporterProvider } from '../../../llm/liveReporterProvider';
import { createBattleStateChangeHandler } from './battleStateChangeHandler';
import { mapBattleEventToDisplayEvents } from '../../battle/display/displayMapper';
import { mapReporterMemoryToDisplayEvents } from '../../battle/display/reporterMemoryMapper';
import {
  scanEventsForMemories,
  scanForStateBasedMemories,
  createStageBrief,
} from '../../reports/reporterMemoryCollector';

function drawEpisodeRoster(seed: string, rerollIndex: number, count = 5, unlockedActorIds: string[] = []): RosterActor[] {
  const unlockedPool = getUnlockedActors(unlockedActorIds);
  const pool = unlockedPool.length > 0 ? [...unlockedPool] : [...DEFAULT_ROSTER.filter((actor) => actor.defaultUnlocked)];
  const picked: RosterActor[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = randomInt(seed, rerollIndex * 10 + i, 'episodeRoster', 0, pool.length - 1);
    const [actor] = pool.splice(index, 1);
    picked.push(actor);
  }

  return picked;
}

function buildRosterTemplates(
  seed: string,
  rerollIndex: number,
  unlockedActorIds: string[],
  actorPotential: Record<string, ActorPotentialStats> = {},
): ActorTemplate[] {
  return drawEpisodeRoster(seed, rerollIndex, 5, unlockedActorIds).map((baseActor) => {
    const r = applyPotentialToRosterActor(baseActor, actorPotential[baseActor.actorId]);
    return {
    actorId: r.actorId,
    name: r.name,
    ATK: r.baseATK,
    DEF: r.baseDEF,
    SPD: r.baseSPD,
    baseThreat: r.baseThreat,
    maxHP: r.baseHP ?? 100,
    };
  });
}

interface BattleStoreSnapshot {
  engineId: string | null;
  lastLiveReportActionIndex: number;
  finalizePendingCommands: () => void;
}

type SetStateFn = (
  partial: {
    battleState?: unknown;
    finalScores?: unknown[];
    liveReport?: unknown | null;
    lastLiveReportActionIndex?: number;
    view?: string;
  }
) => void;

export interface BattleSessionResult {
  llmRegistry: ReturnType<typeof createLLMRoleRegistry>;
  actorBrainProvider: ReturnType<typeof createLLMActorBrainProvider>;
  commandGateProvider: ReturnType<typeof createCommandGateProvider> | undefined;
  showrunnerProvider: ReturnType<typeof createShowrunnerProvider>;
  liveReporterProvider: LiveReporterProvider;
  engine: ReturnType<typeof createBattleEngine>;
  templates: ActorTemplate[];
  engineId: string;
  capturedId: string;
}

export function createBattleSession(
  seed: string,
  rerollIndex: number,
  unlockedActorIds: string[],
  actorPotential: Record<string, ActorPotentialStats>,
  getState: () => BattleStoreSnapshot,
  setState: SetStateFn,
  engineRef: { current: ReturnType<typeof createBattleEngine> | null }
): BattleSessionResult {
  const llmRegistry = createLLMRoleRegistry();

  const actorBrainEnabled =
    llmRegistry.isRoleEnabled('actor_brain') &&
    !!llmRegistry.getRoleConfig('actor_brain').apiKey;
  const commandGateEnabled =
    llmRegistry.isRoleEnabled('command_gate') &&
    !!llmRegistry.getRoleConfig('command_gate').apiKey;

  const actorBrainProvider = actorBrainEnabled
    ? createLLMActorBrainProvider({ registry: llmRegistry, timeout: 20000, maxRetries: 2 })
    : createStubActorBrainProvider();

  const commandGateProvider = commandGateEnabled
    ? createCommandGateProvider({ registry: llmRegistry, timeout: 15000, maxRetries: 1 })
    : undefined;

  const showrunnerProvider = createShowrunnerProvider({
    registry: llmRegistry,
    cooldown: 5,
    maxRetries: 1,
  });

  const liveReporterProvider = createLiveReporterProvider({
    registry: llmRegistry,
    maxRetries: 2,
  });

  const templates = buildRosterTemplates(seed, rerollIndex, unlockedActorIds, actorPotential);
  const engineId = `engine_${Date.now()}`;
  const capturedId = engineId;

  const handler = createBattleStateChangeHandler(getState, setState, {
    engineRef,
    capturedId,
    liveReporterProvider,
  });

  const hooks: EngineHooks = {
    mapBattleEventToDisplay: (event, battleState) =>
      mapBattleEventToDisplayEvents(event, battleState),
    mapReporterMemoryToDisplay: (entries) => mapReporterMemoryToDisplayEvents(entries),
    collectEventMemories: (battleState, fromIndex) =>
      scanEventsForMemories(battleState, fromIndex),
    collectStateMemories: (battleState) => scanForStateBasedMemories(battleState),
    createStageBrief: (battleState) =>
      createStageBrief(
        battleState.battleId,
        battleState.actorActionIndex,
        battleState
      ),
  };

  const engine = createBattleEngine({
    actorBrainProvider,
    commandGateProvider,
    showrunnerProvider,
    maxActions: 40,
    onStateChange: handler.onStateChange,
    hooks,
  });

  engineRef.current = engine;

  return {
    llmRegistry,
    actorBrainProvider,
    commandGateProvider,
    showrunnerProvider,
    liveReporterProvider,
    engine,
    templates,
    engineId,
    capturedId,
  };
}
