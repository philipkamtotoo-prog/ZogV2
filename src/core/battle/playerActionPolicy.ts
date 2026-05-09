import type { BattleState } from './types';
import { ITEM_DEFS, type ItemId } from '../economy/items';

export interface ItemUseValidation {
  valid: boolean;
  reason?: string;
}

/**
 * 校验道具使用是否合法
 * - 道具是否存在
 * - 目标演员是否存在
 * - 目标是否存活
 * - 剩余使用次数是否足够
 * - 回血间隔是否合法（同一个 action interval 内不能重复回血）
 */
export function validateItemUse(
  battleState: BattleState,
  itemId: ItemId,
  targetActorId: string
): ItemUseValidation {
  if (battleState.phase !== 'RUNNING') {
    return { valid: false, reason: 'Battle not running' };
  }

  const itemDef = ITEM_DEFS[itemId];
  if (!itemDef) {
    return { valid: false, reason: 'Unknown item' };
  }

  const actor = battleState.actors.find((a) => a.actorId === targetActorId);
  if (!actor) {
    return { valid: false, reason: 'Actor not found' };
  }

  if (!actor.isAlive) {
    return { valid: false, reason: 'Actor is dead' };
  }

  if (battleState.itemUsesRemaining <= 0) {
    return { valid: false, reason: 'No uses remaining' };
  }

  if (
    itemDef.healAmount &&
    actor.lastHealedAtActorActionIndex !== undefined &&
    battleState.actorActionIndex - actor.lastHealedAtActorActionIndex < 1
  ) {
    return { valid: false, reason: 'Actor was already healed this action interval' };
  }

  return { valid: true };
}