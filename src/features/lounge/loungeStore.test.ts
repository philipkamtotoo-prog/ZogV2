import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACTOR_GACHA_SINGLE_COST,
  ACTOR_SHARDS_TO_UNLOCK,
  EQUIPMENT_UPGRADE_COSTS,
  FRIDGE_USES,
  KEYBOARD_LIMITS,
  getRandomActorShardPurchaseCost,
  useLoungeStore,
  ZOG_GIFT_TIERS,
} from './loungeStore';

function resetLounge(partial: Partial<ReturnType<typeof useLoungeStore.getState>> = {}) {
  useLoungeStore.setState({
    gold: 100,
    zogAffection: 0,
    inventory: {},
    zogGiftInventory: {},
    lastActiveTime: Date.now(),
    begAttempts: 0,
    lastBegTime: 0,
    begMessage: null,
    unlockedActorIds: [],
    fridgeLevel: 1,
    keyboardLevel: 1,
    fridgeItemUseLimit: 1,
    actorAffection: {},
    actorSalary: {},
    actorPurchases: {},
    actorPermanentPrompts: {},
    zogGiftAttempts: 0,
    lastZogGiftResult: null,
    actorContractShards: {},
    gachaPullCount: 0,
    gachaShardPityCount: 0,
    randomShardPurchaseCount: 0,
    lastGachaResults: [],
    actorPotential: {},
    ...partial,
  });
}

describe('loungeStore Phase 0 economy rules', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLounge();
  });

  it('upgrades fridge and keyboard together through the shared equipment tree', () => {
    resetLounge({ gold: EQUIPMENT_UPGRADE_COSTS[1] });

    const upgraded = useLoungeStore.getState().upgradeEquipment();

    expect(upgraded).toBe(true);
    expect(useLoungeStore.getState().gold).toBe(0);
    expect(useLoungeStore.getState().fridgeLevel).toBe(2);
    expect(useLoungeStore.getState().keyboardLevel).toBe(2);
    expect(useLoungeStore.getState().fridgeItemUseLimit).toBe(FRIDGE_USES[2]);
    expect(KEYBOARD_LIMITS[useLoungeStore.getState().keyboardLevel]).toBe(8);
  });

  it('uses exact Zog gift tiers and rejects arbitrary gift prices', () => {
    const totalGiftCost = ZOG_GIFT_TIERS.reduce((sum, gift) => sum + gift.cost, 0);
    const totalBaseAffection = ZOG_GIFT_TIERS.reduce((sum, gift) => sum + gift.affection, 0);
    resetLounge({ gold: totalGiftCost });

    expect(useLoungeStore.getState().giftZog(10)).toBe(false);
    expect(useLoungeStore.getState().zogAffection).toBe(0);

    for (const tier of ZOG_GIFT_TIERS) {
      expect(useLoungeStore.getState().giftZog(tier.cost)).toBe(true);
    }

    expect(useLoungeStore.getState().zogAffection).toBe(totalBaseAffection);
    expect(useLoungeStore.getState().gold).toBe(0);
  });

  it('applies a rolled effect when gifting Zog by gift id', () => {
    resetLounge({ gold: 500 });

    expect(useLoungeStore.getState().buyZogGiftById('glowing-can')).toBe(true);
    expect(useLoungeStore.getState().gold).toBe(350);
    expect(useLoungeStore.getState().zogGiftInventory['glowing-can']).toBe(1);

    const result = useLoungeStore.getState().giftZogById('glowing-can');

    expect(result?.giftId).toBe('glowing-can');
    expect(result?.totalAffection).toBeGreaterThan(0);
    expect(useLoungeStore.getState().gold).toBe(350);
    expect(useLoungeStore.getState().zogGiftInventory['glowing-can']).toBeUndefined();
    expect(useLoungeStore.getState().zogAffection).toBe(result?.totalAffection);
    expect(useLoungeStore.getState().zogGiftAttempts).toBe(1);
    expect(useLoungeStore.getState().lastZogGiftResult?.giftId).toBe('glowing-can');
  });

  it('stores multiple Zog gifts before they are used', () => {
    resetLounge({ gold: 450 });

    expect(useLoungeStore.getState().buyZogGiftById('expired-star-chips', 3)).toBe(true);
    expect(useLoungeStore.getState().gold).toBe(300);
    expect(useLoungeStore.getState().zogGiftInventory['expired-star-chips']).toBe(3);

    const result = useLoungeStore.getState().giftZogById('expired-star-chips');

    expect(result?.giftId).toBe('expired-star-chips');
    expect(useLoungeStore.getState().zogGiftInventory['expired-star-chips']).toBe(2);
  });

  it('spends gold and records actor gacha rewards', () => {
    resetLounge({ gold: ACTOR_GACHA_SINGLE_COST });

    const results = useLoungeStore.getState().pullActorGacha(1);

    expect(results).toHaveLength(1);
    expect(useLoungeStore.getState().gachaPullCount).toBe(1);
    expect(useLoungeStore.getState().lastGachaResults).toHaveLength(1);
    expect(useLoungeStore.getState().gold).toBeGreaterThanOrEqual(0);
    expect(useLoungeStore.getState().gold).toBeLessThanOrEqual(ACTOR_GACHA_SINGLE_COST);
  });

  it('unlocks an actor with bound contract shards', () => {
    resetLounge({
      actorContractShards: { glitch_witch: ACTOR_SHARDS_TO_UNLOCK },
    });

    const unlocked = useLoungeStore.getState().unlockActorByShards('glitch_witch');

    expect(unlocked).toBe(true);
    expect(useLoungeStore.getState().unlockedActorIds).toContain('glitch_witch');
    expect(useLoungeStore.getState().actorContractShards.glitch_witch).toBeUndefined();
  });

  it('buys random actor shards with permanent increasing price', () => {
    resetLounge({ gold: getRandomActorShardPurchaseCost(0) + getRandomActorShardPurchaseCost(1) });

    const first = useLoungeStore.getState().buyRandomActorShard();
    const second = useLoungeStore.getState().buyRandomActorShard();

    const shardTotal = Object.values(useLoungeStore.getState().actorContractShards).reduce((sum, count) => sum + count, 0);
    expect(first?.kind).toBe('ACTOR_SHARD');
    expect(second?.kind).toBe('ACTOR_SHARD');
    expect(shardTotal).toBe(2);
    expect(useLoungeStore.getState().randomShardPurchaseCount).toBe(2);
    expect(useLoungeStore.getState().gold).toBe(0);
  });

  it('trains unlocked actor potential with bound shards', () => {
    resetLounge({
      actorContractShards: { cybercat: 5 },
    });

    const result = useLoungeStore.getState().trainActorPotential('cybercat');
    const state = useLoungeStore.getState();
    const totalStatPotential = state.actorPotential.cybercat?.totalPotentialPoints ?? 0;
    const salaryReward = state.actorSalary.cybercat ?? 0;
    const affectionReward = state.actorAffection.cybercat ?? 0;

    expect(result).not.toBeNull();
    expect(state.actorContractShards.cybercat).toBeUndefined();
    expect(totalStatPotential + salaryReward + affectionReward).toBeGreaterThan(0);
  });
});
