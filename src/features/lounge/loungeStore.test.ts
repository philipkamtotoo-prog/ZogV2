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
    resetLounge({ gold: 700 });

    expect(useLoungeStore.getState().giftZog(10)).toBe(false);
    expect(useLoungeStore.getState().zogAffection).toBe(0);

    for (const tier of ZOG_GIFT_TIERS) {
      expect(useLoungeStore.getState().giftZog(tier.cost)).toBe(true);
    }

    expect(useLoungeStore.getState().zogAffection).toBe(10 + 35 + 130);
    expect(useLoungeStore.getState().gold).toBe(0);
  });
});
