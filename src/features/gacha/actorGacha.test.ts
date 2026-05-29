import { describe, expect, it } from 'vitest';
import { DEFAULT_ROSTER } from '../actors/actorRoster';
import {
  ACTOR_GACHA_SINGLE_COST,
  ACTOR_GACHA_TEN_COST,
  ACTOR_SHARD_PITY_LIMIT,
  ACTOR_SHARDS_TO_UNLOCK,
  getActorGachaCost,
  getRandomActorShardPurchaseCost,
  rollActorGacha,
} from './actorGacha';

function sequenceRng(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

describe('actor gacha numbers', () => {
  it('uses the documented pull and shard-shop prices', () => {
    expect(getActorGachaCost(1)).toBe(ACTOR_GACHA_SINGLE_COST);
    expect(getActorGachaCost(10)).toBe(ACTOR_GACHA_TEN_COST);
    expect(getRandomActorShardPurchaseCost(0)).toBe(600);
    expect(getRandomActorShardPurchaseCost(1)).toBe(800);
    expect(getRandomActorShardPurchaseCost(19)).toBe(4400);
  });

  it('turns duplicate direct contracts into 5 shards', () => {
    const roll = rollActorGacha(
      1,
      { gachaPullCount: 0, gachaShardPityCount: 0 },
      [],
      sequenceRng([0, 0]),
    );

    expect(roll.results).toHaveLength(1);
    expect(roll.results[0].kind).toBe('DIRECT_CONTRACT');
    expect(roll.results[0].actorId).toBe(DEFAULT_ROSTER[0].actorId);
    expect(roll.results[0].duplicateConverted).toBe(true);
    expect(roll.results[0].shardAmount).toBe(5);
    expect(roll.nextPullCount).toBe(1);
    expect(roll.nextShardPityCount).toBe(0);
  });

  it('guarantees at least one premium result in a ten pull', () => {
    const roll = rollActorGacha(
      10,
      { gachaPullCount: 0, gachaShardPityCount: 0 },
      [],
      sequenceRng([0.99]),
    );

    expect(roll.results).toHaveLength(10);
    expect(roll.results.some((result) => result.kind === 'ACTOR_SHARD')).toBe(true);
    expect(roll.results.some((result) => result.forcedBy === 'TEN_PULL_GUARANTEE')).toBe(true);
  });

  it(`forces a shard on pull ${ACTOR_SHARD_PITY_LIMIT} and resets the pity counter`, () => {
    const roll = rollActorGacha(
      1,
      { gachaPullCount: ACTOR_SHARD_PITY_LIMIT - 1, gachaShardPityCount: ACTOR_SHARD_PITY_LIMIT - 1 },
      [],
      sequenceRng([0.99]),
    );

    expect(roll.results[0].kind).toBe('ACTOR_SHARD');
    expect(roll.results[0].forcedBy).toBe('SHARD_PITY');
    expect(roll.nextPullCount).toBe(ACTOR_SHARD_PITY_LIMIT);
    expect(roll.nextShardPityCount).toBe(0);
  });

  it('requires 20 shards to unlock an actor', () => {
    expect(ACTOR_SHARDS_TO_UNLOCK).toBe(20);
  });
});
