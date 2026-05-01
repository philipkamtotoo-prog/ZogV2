/**
 * battleRenderBootstrap - Pixi 表现层的初始化数据合同
 *
 * 规则：
 * - seatIndex 在 bootstrap 创建时按 battleState.actors 数组顺序一次性计算
 * - 整局冻结，不随 HP、淘汰、initiative、UI 排序变化而变化
 * - 不给 BattleState / ActorCombatState 新增 seatIndex 字段
 */

import type { BattleState } from '../../../core/battle/types';

export interface BattleRenderBootstrap {
  battleId: string;
  battleSeed: string;
  actorSlots: Array<{
    actorId: string;
    name: string;
    seatIndex: number;
    maxHP: number;
    assetKey?: string;
  }>;
  scene: {
    totalDodos: number;
  };
  selectedMutationId?: string;
}

/**
 * 在战斗开局时生成一次 bootstrap 数据
 * 只在 startBattle() 调用时生成，不每帧重新计算
 */
export function createBattleRenderBootstrap(
  battleState: BattleState,
  battleId: string
): BattleRenderBootstrap {
  return {
    battleId,
    battleSeed: battleState.battleSeed,
    actorSlots: battleState.actors.map((actor, index) => ({
      actorId: actor.actorId,
      name: actor.name,
      seatIndex: index,
      maxHP: actor.maxHP,
      assetKey: undefined, // 后续替换美术资源时填充
    })),
    scene: {
      totalDodos: battleState.scene.totalDodos,
    },
    selectedMutationId: battleState.selectedMutation?.mutationId,
  };
}

