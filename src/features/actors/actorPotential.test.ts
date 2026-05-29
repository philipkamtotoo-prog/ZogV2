import { describe, expect, it } from 'vitest';
import { DEFAULT_ROSTER } from './actorRoster';
import {
  ACTOR_POTENTIAL_CAPS,
  ACTOR_POTENTIAL_MAX_POINTS,
  ACTOR_POTENTIAL_TRAIN_SHARD_COST,
  applyPotentialToRosterActor,
  createEmptyActorPotential,
  trainActorPotential,
} from './actorPotential';

function sequenceRng(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

describe('actor potential numbers', () => {
  it('starts empty and keeps the documented training cost and caps', () => {
    expect(createEmptyActorPotential()).toEqual({
      hpBonus: 0,
      atkBonus: 0,
      defBonus: 0,
      spdBonus: 0,
      threatReduction: 0,
      totalPotentialPoints: 0,
    });
    expect(ACTOR_POTENTIAL_TRAIN_SHARD_COST).toBe(5);
    expect(ACTOR_POTENTIAL_MAX_POINTS).toBe(20);
    expect(ACTOR_POTENTIAL_CAPS).toEqual({
      hpBonus: 30,
      atkBonus: 5,
      defBonus: 5,
      spdBonus: 3,
      threatReduction: 5,
    });
  });

  it('applies potential to battle stats without touching the roster base data', () => {
    const actor = DEFAULT_ROSTER[0];
    const result = applyPotentialToRosterActor(actor, {
      hpBonus: 6,
      atkBonus: 2,
      defBonus: 3,
      spdBonus: 1,
      threatReduction: 4,
      totalPotentialPoints: 12,
    });

    expect(result.baseHP).toBe(actor.baseHP + 6);
    expect(result.baseATK).toBe(actor.baseATK + 2);
    expect(result.baseDEF).toBe(actor.baseDEF + 3);
    expect(result.baseSPD).toBe(actor.baseSPD + 1);
    expect(result.baseThreat).toBe(Math.max(1, actor.baseThreat - 4));
    expect(actor.baseHP).toBe(DEFAULT_ROSTER[0].baseHP);
  });

  it('rolls a stat increase with the documented weights', () => {
    const result = trainActorPotential(createEmptyActorPotential(), sequenceRng([0.1, 0.0]));

    expect(result.kind).toBe('HP');
    expect(result.nextPotential.hpBonus).toBe(3);
    expect(result.nextPotential.totalPotentialPoints).toBe(1);
  });

  it('converts maxed potential into salary or affection instead of adding more stats', () => {
    const result = trainActorPotential(
      {
        hpBonus: 30,
        atkBonus: 5,
        defBonus: 5,
        spdBonus: 3,
        threatReduction: 5,
        totalPotentialPoints: 20,
      },
      sequenceRng([0.01, 0.25]),
    );

    expect(result.kind).toBe('SALARY');
    expect(result.salaryReward).toBe(20);
    expect(result.affectionReward).toBeUndefined();
    expect(result.nextPotential.totalPotentialPoints).toBe(20);
    expect(result.nextPotential.hpBonus).toBe(30);
    expect(result.nextPotential.atkBonus).toBe(5);
    expect(result.nextPotential.defBonus).toBe(5);
    expect(result.nextPotential.spdBonus).toBe(3);
    expect(result.nextPotential.threatReduction).toBe(5);
  });
});
