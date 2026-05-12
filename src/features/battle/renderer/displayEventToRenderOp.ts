/**
 * displayEventToRenderOp - DisplayEvent -> RenderOp 桥接层
 *
 * 规则（正式冻结）：
 * - DisplayEvent -> RenderOp 是 Pixi 层自己的桥接，不回写到 battle core
 * - 不让 sprite 组件直接理解完整 DisplayEvent
 */

import type { DisplayEvent } from '../display/displayTypes';

/**
 * RenderOp - Pixi 内部的渲染操作指令
 */
export type RenderOp =
  | { type: 'ACTOR_MOVE'; actorId: string; style: 'minor' | 'attack' | 'hit' | 'eliminated' }
  | { type: 'DAMAGE_NUMBER'; targetId: string; amount: number }
  | { type: 'HEAL_NUMBER'; targetId: string; amount: number }
  | { type: 'STATUS_BADGE'; targetId: string; status: string; added: boolean }
  | { type: 'ITEM_CAST'; targetId: string; itemId: string; source: 'PLAYER' | 'ACTOR'; actorId?: string }
  | { type: 'MUTATION_FLASH'; mutationName: string }
  | { type: 'PROMPT_SIGNAL'; actorId: string; source: 'PERMANENT' | 'EPISODE' };

/**
 * 将 DisplayEvent 转换为 RenderOp[]
 * 这是 Pixi 层内部的桥接函数，不回写到 battle core
 *
 * 下方日志栏已经承载完整文本信息，所以 Pixi 舞台不再重复播放台词、导演播报、
 * 战地记者和 Zog 反应文本，只保留行动、数值、状态等视觉反馈。
 */
export function displayEventToRenderOp(event: DisplayEvent): RenderOp[] {
  switch (event.kind) {
    case 'ACTOR_LINE':
      return [];

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
      return [];

    case 'REPORTER':
      return [];

    case 'ZOG':
      return [];

    case 'MUTATION':
      return [{ type: 'MUTATION_FLASH', mutationName: event.mutationName }];

    case 'PROMPT':
      return [{ type: 'PROMPT_SIGNAL', actorId: event.actorId, source: event.source }];

    default:
      return [];
  }
}
