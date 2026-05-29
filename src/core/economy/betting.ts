import type { ActorCombatState } from '../battle/types';
import { calculatePreBattlePower } from '../../features/actors/actorRoster';
import type { RosterActor } from '../../features/actors/actorRoster';

export interface BetSlip {
  actorId: string;
  amount: number;
  odds: number;
  locked: boolean;
}

export const MIN_BET_AMOUNT = 50;
export const MAX_BET_AMOUNT = 500;

/**
 * 固定赔率表（文档9.3节）：按preBattlePower排名
 */
const ODDS_BY_RANK: Record<number, number> = {
  1: 1.5,
  2: 2.0,
  3: 2.8,
  4: 3.8,
  5: 5.0,
};

/**
 * 计算赔率
 * 1. 先用 preBattlePower 将所有演员排序
 * 2. 按排名从第1名到第5名分别给 x1.5 / x2.0 / x2.8 / x3.8 / x5.0
 * 文档：preBattlePower = HP + ATK*3 + DEF*5 + SPD*4 - THREAT*2
 */
export function calculateOdds(
  actor: ActorCombatState,
  allActors: ActorCombatState[],
  rosterMap?: Map<string, RosterActor>
): number {
  const alive = allActors.filter((a) => a.isAlive);
  if (alive.length <= 1) return 1;

  // 构建 preBattlePower 排名
  const withPower = alive.map((a) => {
    const rosterEntry = rosterMap?.get(a.actorId);
    const power = calculatePreBattlePower({
      baseHP: rosterEntry?.baseHP ?? a.maxHP,
      baseATK: rosterEntry?.baseATK ?? a.ATK,
      baseDEF: rosterEntry?.baseDEF ?? a.DEF,
      baseSPD: rosterEntry?.baseSPD ?? a.SPD,
      baseThreat: rosterEntry?.baseThreat ?? a.baseThreat,
      maxHP: rosterEntry?.baseHP ?? a.maxHP,
    });
    return { actor: a, power };
  });

  // 降序排列
  withPower.sort((a, b) => b.power - a.power);

  const rank = withPower.findIndex((e) => e.actor.actorId === actor.actorId) + 1;
  if (rank === 0) return 1;

  return ODDS_BY_RANK[rank] ?? 1;
}

export function createBetSlip(actorId: string, amount: number, odds: number): BetSlip {
  return { actorId, amount, odds, locked: false };
}

export function isValidBetAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= MIN_BET_AMOUNT && amount <= MAX_BET_AMOUNT;
}

export function lockBet(bet: BetSlip): BetSlip {
  return { ...bet, locked: true };
}

export function calculatePayout(bet: BetSlip, won: boolean): number {
  if (!won) return 0;
  return Math.floor(bet.amount * bet.odds);
}
