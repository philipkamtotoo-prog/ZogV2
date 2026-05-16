import { beforeEach, describe, expect, it } from 'vitest';
import { EQUIPMENT_UPGRADE_COSTS, FRIDGE_USES, KEYBOARD_LIMITS, useLoungeStore, ZOG_GIFT_TIERS } from './loungeStore';

function resetLounge(partial: Partial<ReturnType<typeof useLoungeStore.getState>> = {}) {
  useLoungeStore.setState({
    gold: 100,
    zogAffection: 0,
    inventory: {},
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

    const result = useLoungeStore.getState().giftZogById('glowing-can');

    expect(result?.giftId).toBe('glowing-can');
    expect(result?.totalAffection).toBeGreaterThan(0);
    expect(useLoungeStore.getState().gold).toBe(350);
    expect(useLoungeStore.getState().zogAffection).toBe(result?.totalAffection);
    expect(useLoungeStore.getState().zogGiftAttempts).toBe(1);
    expect(useLoungeStore.getState().lastZogGiftResult?.giftId).toBe('glowing-can');
  });
});
