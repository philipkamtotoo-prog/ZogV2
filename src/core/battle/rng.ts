/**
 * Seeded RNG - 所有随机必须通过此入口
 * 禁止使用 Math.random
 */
export function seededRng(
  battleSeed: string,
  actorActionIndex: number,
  namespace: string,
  actorId?: string | null,
  targetId?: string | null
): number {
  const input = [
    battleSeed,
    actorActionIndex.toString(),
    namespace,
    actorId ?? '',
    targetId ?? '',
  ].join('|');

  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomInt(
  battleSeed: string,
  actorActionIndex: number,
  namespace: string,
  min: number,
  max: number,
  actorId?: string | null,
  targetId?: string | null
): number {
  const rand = seededRng(battleSeed, actorActionIndex, namespace, actorId, targetId);
  return Math.floor(rand * (max - min + 1)) + min;
}
