import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBattleStore } from './battleStore';
import { useLoungeStore } from '../lounge/loungeStore';

function resetLounge() {
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
  });
}

describe('battleStore control flow', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLounge();
    useBattleStore.getState().goToLobby();
  });

  afterEach(() => {
    useBattleStore.getState().goToLobby();
    vi.useRealTimers();
  });

  it('pauses AUTO progression and resumeBattle restores AUTO ticking', async () => {
    vi.useFakeTimers();

    useBattleStore.getState().initBattle('store_pause_resume_test');
    useBattleStore.getState().startBattle();

    await vi.advanceTimersByTimeAsync(850);
    const progressedActionIndex = useBattleStore.getState().battleState!.actorActionIndex;
    expect(progressedActionIndex).toBeGreaterThan(0);

    useBattleStore.getState().pauseBattle();
    expect(useBattleStore.getState().battleState!.clockState).toBe('PAUSED');

    await vi.advanceTimersByTimeAsync(2400);
    expect(useBattleStore.getState().battleState!.actorActionIndex).toBe(progressedActionIndex);

    useBattleStore.getState().resumeBattle();
    expect(useBattleStore.getState().battleState!.clockState).toBe('PLAYING');
    expect(useBattleStore.getState().battleState!.runMode).toBe('AUTO');

    await vi.advanceTimersByTimeAsync(850);
    expect(useBattleStore.getState().battleState!.actorActionIndex).toBeGreaterThan(progressedActionIndex);
  });

  it('only draws unlocked actors into battle setup', () => {
    useLoungeStore.setState({ unlockedActorIds: ['glitch_witch'] });

    useBattleStore.getState().initBattle('unlocked_actor_pool_test');

    const actorIds = useBattleStore.getState().battleState!.actors.map((actor) => actor.actorId);
    expect(actorIds).toHaveLength(4);
    expect(actorIds).toContain('tdog');
    expect(actorIds).toContain('cybercat');
    expect(actorIds).toContain('nanobot');
    expect(actorIds).toContain('glitch_witch');
    expect(actorIds).not.toContain('dodo_bishop');
  });
});
