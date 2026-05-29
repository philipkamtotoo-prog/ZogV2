import type { RosterActor } from './actorRoster';

export interface ActorPotentialStats {
  hpBonus: number;
  atkBonus: number;
  defBonus: number;
  spdBonus: number;
  threatReduction: number;
  totalPotentialPoints: number;
}

export type ActorPotentialRewardKind =
  | 'HP'
  | 'ATK'
  | 'DEF'
  | 'SPD'
  | 'THREAT'
  | 'SALARY'
  | 'AFFECTION';

export interface ActorPotentialTrainResult {
  kind: ActorPotentialRewardKind;
  label: string;
  toast: string;
  nextPotential: ActorPotentialStats;
  salaryReward?: number;
  affectionReward?: number;
}

type Rng = () => number;

export const ACTOR_POTENTIAL_TRAIN_SHARD_COST = 5;
export const ACTOR_POTENTIAL_MAX_POINTS = 20;

export const ACTOR_POTENTIAL_CAPS = {
  hpBonus: 30,
  atkBonus: 5,
  defBonus: 5,
  spdBonus: 3,
  threatReduction: 5,
} as const;

const EMPTY_POTENTIAL: ActorPotentialStats = {
  hpBonus: 0,
  atkBonus: 0,
  defBonus: 0,
  spdBonus: 0,
  threatReduction: 0,
  totalPotentialPoints: 0,
};

interface StatRewardOption {
  kind: Exclude<ActorPotentialRewardKind, 'SALARY' | 'AFFECTION'>;
  weight: number;
  canApply: (potential: ActorPotentialStats) => boolean;
  apply: (potential: ActorPotentialStats) => ActorPotentialStats;
  label: string;
}

const STAT_REWARD_OPTIONS: StatRewardOption[] = [
  {
    kind: 'HP',
    weight: 35,
    canApply: (potential) => potential.hpBonus < ACTOR_POTENTIAL_CAPS.hpBonus,
    apply: (potential) => ({
      ...potential,
      hpBonus: Math.min(ACTOR_POTENTIAL_CAPS.hpBonus, potential.hpBonus + 3),
      totalPotentialPoints: potential.totalPotentialPoints + 1,
    }),
    label: 'HP +3',
  },
  {
    kind: 'ATK',
    weight: 20,
    canApply: (potential) => potential.atkBonus < ACTOR_POTENTIAL_CAPS.atkBonus,
    apply: (potential) => ({
      ...potential,
      atkBonus: Math.min(ACTOR_POTENTIAL_CAPS.atkBonus, potential.atkBonus + 1),
      totalPotentialPoints: potential.totalPotentialPoints + 1,
    }),
    label: 'ATK +1',
  },
  {
    kind: 'DEF',
    weight: 20,
    canApply: (potential) => potential.defBonus < ACTOR_POTENTIAL_CAPS.defBonus,
    apply: (potential) => ({
      ...potential,
      defBonus: Math.min(ACTOR_POTENTIAL_CAPS.defBonus, potential.defBonus + 1),
      totalPotentialPoints: potential.totalPotentialPoints + 1,
    }),
    label: 'DEF +1',
  },
  {
    kind: 'SPD',
    weight: 10,
    canApply: (potential) => potential.spdBonus < ACTOR_POTENTIAL_CAPS.spdBonus,
    apply: (potential) => ({
      ...potential,
      spdBonus: Math.min(ACTOR_POTENTIAL_CAPS.spdBonus, potential.spdBonus + 1),
      totalPotentialPoints: potential.totalPotentialPoints + 1,
    }),
    label: 'SPD +1',
  },
  {
    kind: 'THREAT',
    weight: 10,
    canApply: (potential) => potential.threatReduction < ACTOR_POTENTIAL_CAPS.threatReduction,
    apply: (potential) => ({
      ...potential,
      threatReduction: Math.min(ACTOR_POTENTIAL_CAPS.threatReduction, potential.threatReduction + 1),
      totalPotentialPoints: potential.totalPotentialPoints + 1,
    }),
    label: 'THREAT -1',
  },
];

export function createEmptyActorPotential(): ActorPotentialStats {
  return { ...EMPTY_POTENTIAL };
}

export function normalizeActorPotential(value: unknown): ActorPotentialStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyActorPotential();
  }
  const raw = value as Partial<Record<keyof ActorPotentialStats, unknown>>;
  return {
    hpBonus: clampInt(raw.hpBonus, 0, ACTOR_POTENTIAL_CAPS.hpBonus),
    atkBonus: clampInt(raw.atkBonus, 0, ACTOR_POTENTIAL_CAPS.atkBonus),
    defBonus: clampInt(raw.defBonus, 0, ACTOR_POTENTIAL_CAPS.defBonus),
    spdBonus: clampInt(raw.spdBonus, 0, ACTOR_POTENTIAL_CAPS.spdBonus),
    threatReduction: clampInt(raw.threatReduction, 0, ACTOR_POTENTIAL_CAPS.threatReduction),
    totalPotentialPoints: clampInt(raw.totalPotentialPoints, 0, ACTOR_POTENTIAL_MAX_POINTS),
  };
}

export function normalizeActorPotentialMap(value: unknown): Record<string, ActorPotentialStats> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, ActorPotentialStats>>((next, [actorId, raw]) => {
    next[actorId] = normalizeActorPotential(raw);
    return next;
  }, {});
}

export function trainActorPotential(
  current: ActorPotentialStats | undefined,
  rng: Rng = Math.random,
): ActorPotentialTrainResult {
  const potential = normalizeActorPotential(current);
  const availableStatOptions =
    potential.totalPotentialPoints >= ACTOR_POTENTIAL_MAX_POINTS
      ? []
      : STAT_REWARD_OPTIONS.filter((option) => option.canApply(potential));

  if (availableStatOptions.length === 0) {
    return makeBonusResult(potential, rng);
  }

  if (rng() < 0.05) {
    return makeBonusResult(potential, rng);
  }

  const option = pickWeighted(availableStatOptions, rng);
  const nextPotential = option.apply(potential);
  return {
    kind: option.kind,
    label: option.label,
    toast: `潜能训练完成：${option.label}`,
    nextPotential,
  };
}

export function applyPotentialToRosterActor(
  actor: RosterActor,
  potential: ActorPotentialStats | undefined,
): RosterActor {
  const safePotential = normalizeActorPotential(potential);
  return {
    ...actor,
    baseHP: actor.baseHP + safePotential.hpBonus,
    baseATK: actor.baseATK + safePotential.atkBonus,
    baseDEF: actor.baseDEF + safePotential.defBonus,
    baseSPD: actor.baseSPD + safePotential.spdBonus,
    baseThreat: Math.max(1, actor.baseThreat - safePotential.threatReduction),
  };
}

function makeBonusResult(potential: ActorPotentialStats, rng: Rng): ActorPotentialTrainResult {
  if (rng() < 0.5) {
    return {
      kind: 'SALARY',
      label: 'S 币 +20',
      toast: '潜能训练跑偏了，但演员拿到 +20S。',
      nextPotential: potential,
      salaryReward: 20,
    };
  }
  return {
    kind: 'AFFECTION',
    label: '好感 +15',
    toast: '潜能训练变成营业练习，演员好感 +15。',
    nextPotential: potential,
    affectionReward: 15,
  };
}

function pickWeighted<T extends { weight: number }>(entries: T[], rng: Rng): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function clampInt(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
