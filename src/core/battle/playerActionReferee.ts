import type { BattleState, BattleEvent, BattleDiff, ActorCombatState } from './types';
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
  let actionDescription = `Used ${itemDef.name} on ${actor.name}`;

  switch (itemId) {
    case 'HEAL_TINY': {
      applyHeal(actor, 10, diffs, battleState.actorActionIndex);
      break;
    }
    case 'HEAL_SMALL': {
      applyHeal(actor, 20, diffs, battleState.actorActionIndex);

      const roll = seededRng(
        battleState.battleSeed,
        battleState.actorActionIndex,
        'itemStomachache',
        actor.actorId
      );
      if (roll < 0.2 && !actor.statuses.includes('STOMACHACHE_NO_ATTACK')) {
        const oldStatuses = [...actor.statuses];
        actor.statuses.push('STOMACHACHE_NO_ATTACK');
        diffs.push({ path: 'statuses', oldValue: oldStatuses, newValue: [...actor.statuses] });
      }
      break;
    }
    case 'HEAL_MEDIUM': {
      applyHeal(actor, 35, diffs, battleState.actorActionIndex);
      break;
    }
    case 'HEAL_GAMBLE': {
      const failChance = itemDef.healFailChance ?? 0;
      const roll = seededRng(
        battleState.battleSeed,
        battleState.actorActionIndex,
        'itemHealFail',
        actor.actorId,
        itemId
      );

      if (roll < failChance) {
        actionDescription = `Used ${itemDef.name} on ${actor.name}, but the charge fizzled`;
        break;
      }

      applyHeal(actor, 100, diffs, battleState.actorActionIndex);
      break;
    }
    case 'SHIELD_GRANT': {
      applyHeal(actor, 60, diffs, battleState.actorActionIndex);

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
    targetActorId,
    itemId,
    diffs: [
      ...diffs,
      { path: 'usedItemIds', oldValue: oldUsedItemIds, newValue: [...battleState.usedItemIds] },
    ],
    tags: ['ITEM'],
    actionDescription,
    createdAt: Date.now(),
  };

  return { events: [event] };
}

function applyHeal(
  actor: ActorCombatState,
  amount: number,
  diffs: BattleDiff[],
  actorActionIndex: number
): void {
  const oldHP = actor.currentHP;
  actor.currentHP = Math.min(actor.maxHP, actor.currentHP + amount);
  actor.lastHealedAtActorActionIndex = actorActionIndex;
  diffs.push({ path: 'currentHP', oldValue: oldHP, newValue: actor.currentHP });
}
