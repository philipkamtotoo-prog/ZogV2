import { describe, expect, it } from 'vitest';
import { createInitialBattleState } from './initialState';
import { applyPlayerItem } from './playerActionReferee';
import { seededRng } from './rng';

function findSeed(itemId: 'HEAL_GAMBLE', shouldFail: boolean): string {
  for (let i = 0; i < 5000; i++) {
    const seed = `item_seed_${i}`;
    const roll = seededRng(seed, 0, 'itemHealFail', 'actor_0', itemId);
    if ((shouldFail && roll < 0.35) || (!shouldFail && roll >= 0.35)) {
      return seed;
    }
  }

  throw new Error(`Could not find seed for ${shouldFail ? 'failure' : 'success'} case`);
}

describe('applyPlayerItem', () => {
  it('applies HEAL_TINY as a 10 HP pure heal', () => {
    const battleState = createInitialBattleState('heal_tiny_seed', 1);
    battleState.phase = 'RUNNING';
    battleState.actors[0].currentHP = 50;

    const result = applyPlayerItem(battleState, 'HEAL_TINY', 'actor_0', 'evt_item_tiny');

    expect(battleState.actors[0].currentHP).toBe(60);
    expect(result.events[0].itemId).toBe('HEAL_TINY');
    expect(result.events[0].diffs.some((diff) => diff.path === 'currentHP' && diff.newValue === 60)).toBe(true);
  });

  it('applies HEAL_GAMBLE as a 100 HP heal on a success roll', () => {
    const battleState = createInitialBattleState(findSeed('HEAL_GAMBLE', false), 1);
    battleState.phase = 'RUNNING';
    battleState.actors[0].currentHP = 1;

    const result = applyPlayerItem(battleState, 'HEAL_GAMBLE', 'actor_0', 'evt_item_gamble_success');

    expect(battleState.actors[0].currentHP).toBe(100);
    expect(result.events[0].diffs.some((diff) => diff.path === 'currentHP' && diff.newValue === 100)).toBe(true);
  });

  it('records HEAL_GAMBLE failure without restoring HP', () => {
    const battleState = createInitialBattleState(findSeed('HEAL_GAMBLE', true), 1);
    battleState.phase = 'RUNNING';
    battleState.actors[0].currentHP = 22;

    const result = applyPlayerItem(battleState, 'HEAL_GAMBLE', 'actor_0', 'evt_item_gamble_fail');

    expect(battleState.actors[0].currentHP).toBe(22);
    expect(result.events[0].diffs.some((diff) => diff.path === 'currentHP')).toBe(false);
    expect(result.events[0].actionDescription).toContain('charge fizzled');
  });
});
