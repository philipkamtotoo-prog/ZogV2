/**
 * 战斗模拟器 - 完整战斗流程
 * 用于开发阶段验证游戏逻辑
 */

import type { BattleState, ActorBrainOutput, CommitResult } from '../core/battle/types';
import type { ActorBrainProvider } from '../llm/actorBrainProvider';
import { createInitialBattleState, shouldEndBattle } from '../core/battle/initialState';
import { selectActiveActor } from '../core/battle/activeActorSelector';
import { resolveLockedTarget } from '../core/battle/targetResolver';
import { buildAllowedActionTypes } from '../core/battle/actionPolicy';
import { validateActorBrainOutput, generateFallbackOutput } from '../core/battle/validator';
import { combatRefereeCommit } from '../core/battle/combatReferee';
import { calculateFinalScores, calculateSalaryAwards, type FinalScore } from '../core/battle/finalScore';

export interface BattleSimulationResult {
  battleState: BattleState;
  finalScores: FinalScore[];
  eventCount: number;
  winner: FinalScore | null;
}

export interface BattleSimulationOptions {
  battleSeed: string;
  actorCount: number;
  maxActions: number;
  actorBrainProvider: ActorBrainProvider;
  itemUsesRemaining?: number;
  onStateChange?: (state: BattleState) => void;
  onEvent?: (event: BattleState['eventLog'][0], state: BattleState) => void;
}

/**
 * 运行一场完整战斗
 */
export async function runBattleSimulation(
  options: BattleSimulationOptions
): Promise<BattleSimulationResult> {
  const {
    battleSeed,
    actorCount,
    maxActions,
    actorBrainProvider,
    itemUsesRemaining = 1,
    onStateChange,
    onEvent,
  } = options;

  // 创建初始状态
  let state = createInitialBattleState(battleSeed, actorCount, undefined, itemUsesRemaining);
  state.phase = 'PREPARING';

  onStateChange?.(state);

  // === 准备阶段 ===
  state.phase = 'RUNNING';
  onStateChange?.(state);

  // === 战斗循环 ===
  for (let i = 0; i < maxActions; i++) {
    if (shouldEndBattle(state)) {
      break;
    }

    // 1. 选择 activeActor
    state = {
      ...state,
      actors: state.actors.map((actor) => actor.isAlive
        ? { ...actor, initiative: actor.initiative + actor.SPD * 10, spotlightDebt: actor.spotlightDebt + 6 }
        : actor
      ),
    };
    const activeActor = selectActiveActor(state.actors, state.actorActionIndex, state.battleSeed);
    if (!activeActor) {
      console.warn('No actor to act, ending battle');
      break;
    }

    // 2. 解析目标
    const lockedTarget = resolveLockedTarget(
      activeActor,
      state.actors,
      state.currentBeat,
      state.actorActionIndex,
      state.battleSeed,
      state.directorBroadcasts
    );

    // 3. 生成 allowedActionTypes
    const allowedActionTypes = buildAllowedActionTypes(
      activeActor,
      lockedTarget,
      state.scene,
      state.currentBeat,
      state.directorBroadcasts
    );

    // 4. 调用 ActorBrain
    let brainOutput: ActorBrainOutput;
    try {
      brainOutput = await actorBrainProvider.generate(
        state,
        activeActor.actorId,
        allowedActionTypes,
        lockedTarget?.actorId ?? null,
        state.directorBroadcasts
      );
    } catch (err) {
      console.error('ActorBrain error:', err);
      brainOutput = generateFallbackOutput(activeActor, allowedActionTypes);
    }

    // 5. 校验
    const validation = validateActorBrainOutput(
      brainOutput,
      activeActor,
      lockedTarget,
      allowedActionTypes,
      state.stateVersion,
      state.stateVersion
    );

    if (!validation.valid) {
      console.warn('Validation failed:', validation.failure);
      brainOutput = generateFallbackOutput(activeActor, allowedActionTypes);
    }

    // 6. 结算
    const commitResult = combatRefereeCommit(state, {
      battleId: state.battleId,
      stateVersion: state.stateVersion,
      actorActionIndex: state.actorActionIndex,
      activeActorId: activeActor.actorId,
      lockedTargetId: lockedTarget?.actorId ?? null,
      actionType: brainOutput.actionType,
      actorBrainOutput: brainOutput,
    });

    // 7. 应用结果
    state = applyCommitResult(state, commitResult);
    state.actorActionIndex++;

    for (const event of commitResult.events) {
      onEvent?.(event, state);
    }
    onStateChange?.(state);
  }

  // === 结算阶段 ===
  state.phase = 'FINAL_REPORT';
  const finalScores = calculateFinalScores(state.actors, state.eventLog);
  state.salaryAwards = calculateSalaryAwards(finalScores);

  return {
    battleState: state,
    finalScores,
    eventCount: state.eventLog.length,
    winner: finalScores.find((s) => s.isWinner) ?? null,
  };
}

/**
 * 应用 CommitResult 到 BattleState
 */
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

/**
 * 创建默认配置
 */
export function createDefaultSimulationOptions(
  actorBrainProvider: ActorBrainProvider
): Omit<BattleSimulationOptions, 'battleSeed'> {
  return {
    actorCount: 5,
    maxActions: 40,
    actorBrainProvider,
  };
}
