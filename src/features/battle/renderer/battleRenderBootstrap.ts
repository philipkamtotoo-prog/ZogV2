/**
 * battleRenderBootstrap - Pixi 表现层的初始化数据合同
 *
 * 规则：
 * - seatIndex 在 bootstrap 创建时按 battleState.actors 数组顺序一次性计算
 * - 整局冻结，不随 HP、淘汰、initiative、UI 排序变化而变化
 * - 不给 BattleState / ActorCombatState 新增 seatIndex 字段
 */

import type { BattleState } from '../../../core/battle/types';
import type { DisplayEvent } from '../display/displayTypes';

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

/**
 * RenderOp - Pixi 内部的渲染操作指令
 * DisplayEvent -> RenderOp 是 Pixi 层自己的桥接
 */
export type RenderOp =
  | { type: 'ACTOR_SPEAK'; actorId: string; text: string }
  | { type: 'ACTOR_MOVE'; actorId: string; style: 'minor' | 'attack' | 'hit' | 'eliminated' }
  | { type: 'DAMAGE_NUMBER'; targetId: string; amount: number }
  | { type: 'HEAL_NUMBER'; targetId: string; amount: number }
  | { type: 'STATUS_BADGE'; targetId: string; status: string; added: boolean }
  | { type: 'ITEM_CAST'; targetId: string; itemId: string; source: 'PLAYER' | 'ACTOR'; actorId?: string }
  | { type: 'BROADCAST_BANNER'; text: string }
  | { type: 'REPORTER_BANNER'; text: string; severity: number }
  | { type: 'MUTATION_FLASH'; mutationName: string }
  | { type: 'PROMPT_SIGNAL'; actorId: string; source: 'PERMANENT' | 'EPISODE' }
  | { type: 'ZOG_REACTION'; text: string };

/**
 * 将 DisplayEvent 转换为 RenderOp
 * 这是 Pixi 层内部的桥接函数，不回写到 battle core
 */
export function displayEventToRenderOp(event: DisplayEvent): RenderOp[] {
  switch (event.kind) {
    case 'ACTOR_LINE':
      return [{ type: 'ACTOR_SPEAK', actorId: event.actorId, text: event.content }];

    case 'ACTOR_ACTION':
      return [{ type: 'ACTOR_MOVE', actorId: event.actorId, style: 'minor' }];

    case 'DAMAGE':
      return [{ type: 'DAMAGE_NUMBER', targetId: event.targetId, amount: event.damage }];

    case 'HEAL':
      return [{ type: 'HEAL_NUMBER', targetId: event.targetId, amount: event.healAmount }];

    case 'STATUS':
      return [{ type: 'STATUS_BADGE', targetId: event.targetId, status: event.status, added: event.added }];

    case 'ELIMINATION':
      return [{ type: 'ACTOR_MOVE', actorId: event.targetId, style: 'eliminated' }];

    case 'ITEM':
      return [{
        type: 'ITEM_CAST',
        targetId: event.targetId,
        itemId: event.itemId,
        source: event.source,
        actorId: event.actorId,
      }];

    case 'BROADCAST':
      return [{ type: 'BROADCAST_BANNER', text: event.content }];

    case 'REPORTER':
      return [{ type: 'REPORTER_BANNER', text: event.content, severity: event.severity }];

    case 'ZOG':
      return [{ type: 'ZOG_REACTION', text: event.content }];

    case 'MUTATION':
      return [{ type: 'MUTATION_FLASH', mutationName: event.mutationName }];

    case 'PROMPT':
      return [{ type: 'PROMPT_SIGNAL', actorId: event.actorId, source: event.source }];

    default:
      return [];
  }
}
