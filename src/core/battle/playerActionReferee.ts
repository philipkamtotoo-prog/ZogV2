import type { BattleState, BattleEvent, BattleDiff } from './types';
import { ITEM_DEFS, type ItemId } from '../economy/items';
import { seededRng } from './rng';

export function applyPlayerItem(
  battleState: BattleState,
  itemId: ItemId,
  targetActorId: string,
  eventId: string
): { events: BattleEvent[] } {
  const itemDef = ITEM_DEFS[itemId];
  const actor = battleState.actors.find((a) => a.actorId === targetActorId);
  if (!actor || !actor.isAlive) return { events: [] };

  const diffs: BattleDiff[] = [];

  switch (itemId) {
    case 'HEAL_SMALL': {
      const healAmount = 20;
      const oldHP = actor.currentHP;
      actor.currentHP = Math.min(actor.maxHP, actor.currentHP + healAmount);
      actor.lastHealedAtActorActionIndex = battleState.actorActionIndex;
      diffs.push({ path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP });

      const roll = seededRng(battleState.battleSeed, battleState.actorActionIndex, 'itemStomachache', actor.actorId);
      if (roll < 0.2) {
        if (!actor.statuses.includes('STOMACHACHE_NO_ATTACK')) {
          const oldStatuses = [...actor.statuses];
          actor.statuses.push('STOMACHACHE_NO_ATTACK');
          diffs.push({ path: 'statuses', oldValue: oldStatuses, newValue: [...actor.statuses] });
        }
      }
      break;
    }
    case 'HEAL_MEDIUM': {
      const healAmount = 35;
      const oldHP = actor.currentHP;
      actor.currentHP = Math.min(actor.maxHP, actor.currentHP + healAmount);
      actor.lastHealedAtActorActionIndex = battleState.actorActionIndex;
      diffs.push({ path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP });
      break;
    }
    case 'SHIELD_GRANT': {
      const healAmount = 60;
      const oldHP = actor.currentHP;
      actor.currentHP = Math.min(actor.maxHP, actor.currentHP + healAmount);
      actor.lastHealedAtActorActionIndex = battleState.actorActionIndex;
      diffs.push({ path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP });

      if (!actor.statuses.includes('SHIELD_ONCE')) {
        const oldStatuses = [...actor.statuses];
        actor.statuses.push('SHIELD_ONCE');
        diffs.push({ path: 'statuses', oldValue: oldStatuses, newValue: [...actor.statuses] });
      }
      if (!actor.statuses.includes('TAUNT_1_ACTION')) {
        const oldStatuses = [...actor.statuses];
        actor.statuses.push('TAUNT_1_ACTION');
        actor.tauntedByActorId = undefined;
        diffs.push({ path: 'statuses', oldValue: oldStatuses, newValue: [...actor.statuses] });
      }
      break;
    }
  }

  const oldUsedItemIds = [...battleState.usedItemIds];
  battleState.usedItemIds.push(itemId);
  battleState.stateVersion += 1;

  const event: BattleEvent = {
    eventId,
    actorActionIndex: battleState.actorActionIndex,
    type: 'ITEM_USED',
    activeActorId: actorId,
    targetActorId,
    itemId,
    diffs: [
      ...diffs,
      { path: 'usedItemIds', oldValue: oldUsedItemIds, newValue: [...battleState.usedItemIds] },
    ],
    tags: ['ITEM'],
    actionDescription: `对 ${actor.name} 使用了 ${itemDef.name}`,
    createdAt: Date.now(),
  };

  return { events: [event] };
}
