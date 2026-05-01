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
 * 将 DisplayEvent 转换为 RenderOp[]
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
