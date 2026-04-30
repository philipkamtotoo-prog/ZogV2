import type { ActorCombatState, BattleEvent, SalaryAward } from './types';

export interface FinalScore {
  actorId: string;
  name: string;
  finalScore: number;
  rank: number;
  isWinner: boolean;
  isMVP: boolean;
  salaryAward: number;
  breakdown: {
    hpScore: number;
    dodoScore: number;
    trustScore: number;
    nestScore: number;
    totalDamageDealt: number;
    killScore: number;
  };
}

const RANK_SALARY: Record<number, number> = {
  1: 60,
  2: 35,
  3: 20,
  4: 10,
  5: 0,
};

export function calculateFinalScores(
  actors: ActorCombatState[],
  eventLog: BattleEvent[]
): FinalScore[] {
  const baseScores = actors.map((actor) => {
    const hpScore = Math.floor(actor.currentHP);
    const dodoScore = Math.floor(actor.scene.dodosControlled * 2);
    const trustScore = Math.floor(actor.scene.dodoTrust);
    const nestScore = Math.floor(actor.scene.nestInfluence * 1.5);
    const finalScore = hpScore + dodoScore + trustScore + nestScore;
    const killScore = eventLog.filter(
      (e) => e.type === 'ACTOR_ELIMINATED' && e.activeActorId === actor.actorId
    ).length * 50;

    return {
      actorId: actor.actorId,
      name: actor.name,
      finalScore,
      rank: 0,
      isWinner: false,
      isMVP: false,
      salaryAward: 0,
      breakdown: {
        hpScore,
        dodoScore,
        trustScore,
        nestScore,
        totalDamageDealt: actor.stats.damageDealt,
        killScore,
      },
    };
  });

  const actorById = new Map(actors.map((actor) => [actor.actorId, actor]));
  const aliveScores = baseScores
    .filter((score) => actorById.get(score.actorId)?.isAlive)
    .sort((a, b) => b.finalScore - a.finalScore || b.breakdown.totalDamageDealt - a.breakdown.totalDamageDealt);
  const eliminatedScores = baseScores
    .filter((score) => !actorById.get(score.actorId)?.isAlive)
    .sort((a, b) => {
      const aElim = actorById.get(a.actorId)?.eliminatedAtActionIndex ?? -1;
      const bElim = actorById.get(b.actorId)?.eliminatedAtActionIndex ?? -1;
      return bElim - aElim || b.finalScore - a.finalScore;
    });

  const ranked = [...aliveScores, ...eliminatedScores];
  ranked.forEach((score, index) => {
    score.rank = index + 1;
  });

  if (ranked[0]) ranked[0].isWinner = true;

  const mvp = [...ranked].sort((a, b) =>
    b.breakdown.totalDamageDealt - a.breakdown.totalDamageDealt || a.rank - b.rank
  )[0];
  if (mvp) mvp.isMVP = true;

  ranked.forEach((score) => {
    score.salaryAward = getRankSalary(score.rank) + (score.isMVP ? 25 : 0);
  });

  return ranked;
}

export function calculateSalaryAwards(scores: FinalScore[]): SalaryAward[] {
  return scores.map((score) => {
    const rankSalary = getRankSalary(score.rank);
    const mvpBonus = score.isMVP ? 25 : 0;
    return {
      actorId: score.actorId,
      name: score.name,
      rank: score.rank,
      rankSalary,
      mvpBonus,
      totalSalary: rankSalary + mvpBonus,
    };
  });
}

export function getWinner(scores: FinalScore[]): FinalScore | null {
  return scores.find((s) => s.isWinner) ?? null;
}

export function getMVP(scores: FinalScore[]): FinalScore | null {
  return scores.find((s) => s.isMVP) ?? null;
}

function getRankSalary(rank: number): number {
  return RANK_SALARY[rank] ?? 0;
}
