import type { ItemId } from '../../core/economy/items';
import { getItemDef } from '../../core/economy/items';
import { DEFAULT_ROSTER, type RosterActor } from '../actors/actorRoster';
import { getZogGiftById } from '../zog/zogAffinity';

export const ACTOR_GACHA_SINGLE_COST = 260;
export const ACTOR_GACHA_TEN_COST = 2500;
export const ACTOR_SHARDS_TO_UNLOCK = 20;
export const ACTOR_SHARD_PITY_LIMIT = 50;
export const RANDOM_ACTOR_SHARD_BASE_COST = 600;
export const RANDOM_ACTOR_SHARD_COST_STEP = 200;

export type ActorGachaPullCount = 1 | 10;

export type ActorGachaRewardKind =
  | 'DIRECT_CONTRACT'
  | 'ACTOR_SHARD'
  | 'BATTLE_ITEM'
  | 'ZOG_GIFT'
  | 'ACTOR_AFFECTION'
  | 'ACTOR_SALARY'
  | 'GOLD_REFUND';

export interface ActorGachaResult {
  resultId: string;
  kind: ActorGachaRewardKind;
  title: string;
  detail: string;
  toast: string;
  actorId?: string;
  actorName?: string;
  itemId?: ItemId;
  giftId?: string;
  amount?: number;
  shardAmount?: number;
  goldAmount?: number;
  isPremium?: boolean;
  unlockedActor?: boolean;
  duplicateConverted?: boolean;
  forcedBy?: 'TEN_PULL_GUARANTEE' | 'SHARD_PITY';
}

export interface ActorGachaRollState {
  gachaPullCount: number;
  gachaShardPityCount: number;
}

export interface ActorGachaRollResult {
  results: ActorGachaResult[];
  nextPullCount: number;
  nextShardPityCount: number;
}

type Rng = () => number;

type BaseBucket =
  | 'DIRECT_CONTRACT'
  | 'ACTOR_SHARD'
  | 'PREMIUM_BATTLE_ITEM'
  | 'NORMAL_BATTLE_ITEM'
  | 'ACTOR_AFFECTION'
  | 'ZOG_GIFT'
  | 'ACTOR_SALARY'
  | 'CONSOLATION';

const BASE_BUCKETS: { bucket: BaseBucket; weight: number }[] = [
  { bucket: 'DIRECT_CONTRACT', weight: 0.5 },
  { bucket: 'ACTOR_SHARD', weight: 2 },
  { bucket: 'PREMIUM_BATTLE_ITEM', weight: 12 },
  { bucket: 'NORMAL_BATTLE_ITEM', weight: 40 },
  { bucket: 'ACTOR_AFFECTION', weight: 10 },
  { bucket: 'ZOG_GIFT', weight: 15 },
  { bucket: 'ACTOR_SALARY', weight: 10 },
  { bucket: 'CONSOLATION', weight: 10.5 },
];

const NORMAL_ITEM_POOL: { itemId: ItemId; weight: number }[] = [
  { itemId: 'HEAL_TINY', weight: 45 },
  { itemId: 'HEAL_SMALL', weight: 35 },
];

const PREMIUM_ITEM_POOL: { itemId: ItemId; weight: number }[] = [
  { itemId: 'HEAL_MEDIUM', weight: 12 },
  { itemId: 'HEAL_GAMBLE', weight: 5 },
  { itemId: 'SHIELD_GRANT', weight: 3 },
];

const ZOG_GIFT_POOL: { giftId: string; weight: number }[] = [
  { giftId: 'expired-star-chips', weight: 45 },
  { giftId: 'glowing-can', weight: 35 },
  { giftId: 'remote-battery-jerky', weight: 15 },
  { giftId: 'antenna-noodle', weight: 5 },
];

export function getActorGachaCost(count: ActorGachaPullCount): number {
  return count === 10 ? ACTOR_GACHA_TEN_COST : ACTOR_GACHA_SINGLE_COST;
}

export function getRandomActorShardPurchaseCost(purchaseCount: number): number {
  return RANDOM_ACTOR_SHARD_BASE_COST + Math.max(0, Math.floor(purchaseCount)) * RANDOM_ACTOR_SHARD_COST_STEP;
}

export function rollRandomActorShardPurchase(purchaseCount: number, rng: Rng = Math.random): ActorGachaResult {
  const actor = pickRandomActor(rng);
  return {
    ...makeActorShardResult(actor, Math.max(0, Math.floor(purchaseCount)) + 1),
    resultId: `random_shard_${purchaseCount + 1}_${actor.actorId}`,
    detail: `随机演员碎片购买：获得 ${actor.name} 绑定合同碎片 x1。`,
    toast: `随机碎片：${actor.name} +1`,
  };
}

export function rollActorGacha(
  count: ActorGachaPullCount,
  state: ActorGachaRollState,
  unlockedActorIds: string[],
  rng: Rng = Math.random,
): ActorGachaRollResult {
  const results: ActorGachaResult[] = [];
  let shardPity = Math.max(0, Math.floor(state.gachaShardPityCount));
  const initialPullCount = Math.max(0, Math.floor(state.gachaPullCount));

  for (let index = 0; index < count; index += 1) {
    const pullNumber = initialPullCount + index + 1;
    const shouldForceShard = shardPity + 1 >= ACTOR_SHARD_PITY_LIMIT;
    const result = shouldForceShard
      ? makeActorShardResult(pickRandomActor(rng), pullNumber, 'SHARD_PITY')
      : makeResultForBucket(pickWeightedEntry(BASE_BUCKETS, rng).bucket, pullNumber, rng, unlockedActorIds);

    results.push(result);
    shardPity = resetsShardPity(result) ? 0 : shardPity + 1;
  }

  if (count === 10 && !results.some(isTenPullGuaranteeValue)) {
    const replacementIndex = findTenPullReplacementIndex(results);
    const pullNumber = initialPullCount + replacementIndex + 1;
    results[replacementIndex] = makeActorShardResult(pickRandomActor(rng), pullNumber, 'TEN_PULL_GUARANTEE');
  }

  shardPity = replayShardPity(state.gachaShardPityCount, results);

  return {
    results,
    nextPullCount: initialPullCount + count,
    nextShardPityCount: shardPity,
  };
}

export function isActorUnlocked(actorId: string, unlockedActorIds: string[]): boolean {
  const actor = DEFAULT_ROSTER.find((entry) => entry.actorId === actorId);
  return Boolean(actor?.defaultUnlocked || unlockedActorIds.includes(actorId));
}

function makeResultForBucket(
  bucket: BaseBucket,
  pullNumber: number,
  rng: Rng,
  unlockedActorIds: string[],
): ActorGachaResult {
  switch (bucket) {
    case 'DIRECT_CONTRACT': {
      const actor = pickRandomActor(rng);
      const duplicate = isActorUnlocked(actor.actorId, unlockedActorIds);
      return {
        resultId: `gacha_${pullNumber}_contract_${actor.actorId}`,
        kind: 'DIRECT_CONTRACT',
        title: duplicate ? `${actor.name} 重复合同` : `${actor.name} 完整合同`,
        detail: duplicate ? `已解锁演员重复签约，转化为 ${actor.name} 合同碎片 x5。` : `直接解锁演员 ${actor.name}。`,
        toast: duplicate ? `${actor.name} 重复合同转碎片 x5` : `新演员解锁：${actor.name}`,
        actorId: actor.actorId,
        actorName: actor.name,
        shardAmount: duplicate ? 5 : 0,
        duplicateConverted: duplicate,
        unlockedActor: !duplicate,
        isPremium: true,
      };
    }
    case 'ACTOR_SHARD':
      return makeActorShardResult(pickRandomActor(rng), pullNumber);
    case 'PREMIUM_BATTLE_ITEM':
      return makeBattleItemResult(pickWeightedEntry(PREMIUM_ITEM_POOL, rng).itemId, pullNumber, true);
    case 'NORMAL_BATTLE_ITEM':
      return makeBattleItemResult(pickWeightedEntry(NORMAL_ITEM_POOL, rng).itemId, pullNumber, false);
    case 'ACTOR_AFFECTION':
      return makeActorAffectionResult(pickRandomUnlockedActor(rng, unlockedActorIds), pullNumber, rng);
    case 'ZOG_GIFT':
      return makeZogGiftResult(pickWeightedEntry(ZOG_GIFT_POOL, rng).giftId, pullNumber);
    case 'ACTOR_SALARY':
      return makeActorSalaryResult(pickRandomUnlockedActor(rng, unlockedActorIds), pullNumber, rng);
    case 'CONSOLATION':
    default:
      return makeConsolationResult(pullNumber, rng, unlockedActorIds);
  }
}

function makeActorShardResult(
  actor: RosterActor,
  pullNumber: number,
  forcedBy?: ActorGachaResult['forcedBy'],
): ActorGachaResult {
  return {
    resultId: `gacha_${pullNumber}_shard_${actor.actorId}_${forcedBy ?? 'roll'}`,
    kind: 'ACTOR_SHARD',
    title: `${actor.name} 合同碎片`,
    detail: `获得 ${actor.name} 绑定合同碎片 x1。`,
    toast: `${actor.name} 碎片 +1`,
    actorId: actor.actorId,
    actorName: actor.name,
    shardAmount: 1,
    forcedBy,
    isPremium: true,
  };
}

function makeBattleItemResult(itemId: ItemId, pullNumber: number, isPremium: boolean): ActorGachaResult {
  const item = getItemDef(itemId);
  return {
    resultId: `gacha_${pullNumber}_item_${itemId}`,
    kind: 'BATTLE_ITEM',
    title: item.name,
    detail: `获得战斗道具：${item.name} x1。`,
    toast: `${item.name} +1`,
    itemId,
    amount: 1,
    isPremium,
  };
}

function makeZogGiftResult(giftId: string, pullNumber: number): ActorGachaResult {
  const gift = getZogGiftById(giftId);
  const name = gift?.name ?? giftId;
  return {
    resultId: `gacha_${pullNumber}_zog_${giftId}`,
    kind: 'ZOG_GIFT',
    title: name,
    detail: `获得 Zog 礼物：${name} x1。`,
    toast: `${name} +1`,
    giftId,
    amount: 1,
  };
}

function makeActorAffectionResult(actor: RosterActor, pullNumber: number, rng: Rng): ActorGachaResult {
  const amount = rng() < 0.75 ? 10 : 35;
  return {
    resultId: `gacha_${pullNumber}_affection_${actor.actorId}_${amount}`,
    kind: 'ACTOR_AFFECTION',
    title: `${actor.name} 好感`,
    detail: `原“指定演员好感券”首版替换为即时奖励：${actor.name} 好感 +${amount}。`,
    toast: `${actor.name} 好感 +${amount}`,
    actorId: actor.actorId,
    actorName: actor.name,
    amount,
    isPremium: true,
  };
}

function makeActorSalaryResult(actor: RosterActor, pullNumber: number, rng: Rng): ActorGachaResult {
  const roll = rng() * 100;
  const amount = roll < 70 ? 10 : 20;
  return {
    resultId: `gacha_${pullNumber}_salary_${actor.actorId}_${amount}`,
    kind: 'ACTOR_SALARY',
    title: `${actor.name} S 币`,
    detail: `原“指定演员 S 币券/外观折扣券”首版替换为即时奖励：${actor.name} +${amount}S。`,
    toast: `${actor.name} +${amount}S`,
    actorId: actor.actorId,
    actorName: actor.name,
    amount,
    isPremium: true,
  };
}

function makeConsolationResult(pullNumber: number, rng: Rng, unlockedActorIds: string[]): ActorGachaResult {
  const roll = rng() * 100;
  if (roll < 65) {
    const goldAmount = roll < 45 ? 20 : 40;
    return {
      resultId: `gacha_${pullNumber}_gold_${goldAmount}`,
      kind: 'GOLD_REFUND',
      title: `${goldAmount}G 返还`,
      detail: `获得安慰奖励：${goldAmount}G。`,
      toast: `返还 ${goldAmount}G`,
      goldAmount,
    };
  }

  const actor = pickRandomUnlockedActor(rng, unlockedActorIds);
  if (roll < 88) {
    return {
      resultId: `gacha_${pullNumber}_tiny_affection_${actor.actorId}`,
      kind: 'ACTOR_AFFECTION',
      title: `${actor.name} 小好感`,
      detail: `原“普通礼物碎片”首版替换为即时奖励：${actor.name} 好感 +3。`,
      toast: `${actor.name} 好感 +3`,
      actorId: actor.actorId,
      actorName: actor.name,
      amount: 3,
    };
  }

  return {
    resultId: `gacha_${pullNumber}_tiny_salary_${actor.actorId}`,
    kind: 'ACTOR_SALARY',
    title: `${actor.name} 小片酬`,
    detail: `获得安慰奖励：${actor.name} +3S。`,
    toast: `${actor.name} +3S`,
    actorId: actor.actorId,
    actorName: actor.name,
    amount: 3,
  };
}

function pickRandomActor(rng: Rng): RosterActor {
  return DEFAULT_ROSTER[Math.min(DEFAULT_ROSTER.length - 1, Math.floor(rng() * DEFAULT_ROSTER.length))] ?? DEFAULT_ROSTER[0];
}

function pickRandomUnlockedActor(rng: Rng, unlockedActorIds: string[]): RosterActor {
  const pool = DEFAULT_ROSTER.filter((actor) => actor.defaultUnlocked || unlockedActorIds.includes(actor.actorId));
  const safePool = pool.length > 0 ? pool : DEFAULT_ROSTER.filter((actor) => actor.defaultUnlocked);
  return safePool[Math.min(safePool.length - 1, Math.floor(rng() * safePool.length))] ?? DEFAULT_ROSTER[0];
}

function pickWeightedEntry<T extends { weight: number }>(entries: T[], rng: Rng): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry;
    }
  }
  return entries[entries.length - 1];
}

function resetsShardPity(result: ActorGachaResult): boolean {
  return result.kind === 'DIRECT_CONTRACT' || result.kind === 'ACTOR_SHARD';
}

function replayShardPity(initial: number, results: ActorGachaResult[]): number {
  return results.reduce((count, result) => (resetsShardPity(result) ? 0 : count + 1), Math.max(0, Math.floor(initial)));
}

function isTenPullGuaranteeValue(result: ActorGachaResult): boolean {
  return (
    result.kind === 'ACTOR_SHARD' ||
    (result.kind === 'BATTLE_ITEM' && result.isPremium) ||
    result.kind === 'ACTOR_AFFECTION' ||
    result.kind === 'ACTOR_SALARY'
  );
}

function findTenPullReplacementIndex(results: ActorGachaResult[]): number {
  const normalIndex = results.findIndex((result) => result.kind !== 'DIRECT_CONTRACT');
  return normalIndex >= 0 ? normalIndex : results.length - 1;
}
