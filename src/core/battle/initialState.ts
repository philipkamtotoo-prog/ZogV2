import type { ActorCombatState, ActorPromptInjection, BattleState, ProgramMutation } from './types';
import { randomInt } from './rng';

export interface ActorTemplate {
  actorId: string;
  name: string;
  ATK: number;
  DEF: number;
  SPD: number;
  baseThreat: number;
  maxHP?: number;
}

export interface InitialBattleSetup {
  actorPromptInjections?: ActorPromptInjection[];
  selectedMutation?: ProgramMutation;
}

/**
 * 创建初始战斗状态
 */
export function createInitialBattleState(
  battleSeed: string,
  actorCount: number = 5,
  templates?: ActorTemplate[],
  itemUsesRemaining: number = 1,
  setup: InitialBattleSetup = {}
): BattleState {
  const actors: ActorCombatState[] = [];

  for (let i = 0; i < actorCount; i++) {
    const tmpl = templates?.[i];
    actors.push({
      actorId: tmpl?.actorId ?? `actor_${i}`,
      name: tmpl?.name ?? `Actor ${i}`,
      maxHP: tmpl?.maxHP ?? 100,
      currentHP: tmpl?.maxHP ?? 100,
      ATK: tmpl?.ATK ?? 10,
      DEF: tmpl?.DEF ?? 5,
      SPD: tmpl?.SPD ?? randomInt(battleSeed, i, 'initiative', 1, 20),
      baseThreat: tmpl?.baseThreat ?? 50,
      currentThreat: tmpl?.baseThreat ?? 50,
      isAlive: true,
      statuses: [],
      initiative: tmpl?.SPD ?? randomInt(battleSeed, i, 'initiative', 1, 20),
      spotlightDebt: 0,
      scene: {
        dodosControlled: 0,
        dodoTrust: setup.selectedMutation?.mutationId === 'DODO_ALERT' ? 7 : 10,
        nestInfluence: 0,
      },
      stats: {
        damageDealt: 0,
        damageTaken: 0,
        actionsTaken: 0,
        dodosGained: 0,
        dodosLost: 0,
        directorBroadcastReactedCount: 0,
      },
    });
  }

  return {
    battleId: `battle_${Date.now()}`,
    battleSeed,
    phase: 'PREPARING',
    runMode: 'AUTO',
    clockState: 'PLAYING',
    stateVersion: 0,
    actorActionIndex: 0,
    actors,
    scene: {
      totalDodos: 100,
      wildDodos: 100,
    },
    currentBeat: undefined,
    directorBroadcasts: [],
    commandTransactions: [],
    eventLog: [],
    displayQueue: [],
    itemUsesRemaining,
    usedItemIds: [],
    actorPromptInjections: setup.actorPromptInjections ?? [],
    selectedMutation: setup.selectedMutation,
    stageBriefs: [],
    salaryAwards: [],
    reporterMemory: [],
    reporterMemoryCursor: 0,
  };
}

/**
 * 检查战斗是否结束
 */
export function shouldEndBattle(state: BattleState): boolean {
  const aliveActors = state.actors.filter((a) => a.isAlive);
  return aliveActors.length <= 1 || state.actorActionIndex >= 40;
}
