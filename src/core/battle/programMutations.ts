import type { BattleState, ProgramMutation, ProgramMutationId } from './types';
import { randomInt } from './rng';

export const MUTATION_LIQUID_COST = 500;

export const PROGRAM_MUTATIONS: Record<ProgramMutationId, ProgramMutation> = {
  STUTTER_CUT: {
    mutationId: 'STUTTER_CUT',
    name: 'Stutter Cut',
    description: 'Actors must perform with obvious stutters. No stat changes.',
    promptConstraint: 'This episode has STUTTER CUT: your line should include an obvious stutter or broken delivery, but do not change output format.',
  },
  LOW_BUDGET_RAIN: {
    mutationId: 'LOW_BUDGET_RAIN',
    name: 'Low Budget Rain',
    description: 'A rain fact is injected as a director broadcast. No hard state changes.',
    directorBroadcastText: 'Low-budget rain starts falling on the island. Actors must acknowledge the rain in performance, but it does not directly change combat numbers.',
  },
  FAKE_NEST_FEVER: {
    mutationId: 'FAKE_NEST_FEVER',
    name: 'Fake Nest Fever',
    description: 'BUILD_FAKE_NEST gains +5 extra nestInfluence.',
  },
  DODO_ALERT: {
    mutationId: 'DODO_ALERT',
    name: 'Dodo Alert',
    description: 'All actors start with dodoTrust -3.',
  },
  NEST_PRIME_TIME: {
    mutationId: 'NEST_PRIME_TIME',
    name: 'Nest Prime Time',
    description: 'CLAIM_NEST_AREA grants +4 extra nestInfluence to the active actor.',
  },
  LEAKY_MIC: {
    mutationId: 'LEAKY_MIC',
    name: 'Leaky Mic',
    description: 'ActorBrain prompts add a leaked-microphone performance constraint. No stat changes.',
    promptConstraint: 'This episode has LEAKY MIC: act as if the crew microphone leaked private comments and your character may be exposed on-air.',
  },
};

const MUTATION_IDS = Object.keys(PROGRAM_MUTATIONS) as ProgramMutationId[];

export function drawMutationCandidates(seed: string, rerollIndex: number): ProgramMutation[] {
  const pool = [...MUTATION_IDS];
  const picked: ProgramMutation[] = [];

  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const index = randomInt(seed, rerollIndex + i, 'programMutation', 0, pool.length - 1);
    const [id] = pool.splice(index, 1);
    picked.push(PROGRAM_MUTATIONS[id]);
  }

  return picked;
}

export function applyMutationToBattleState(state: BattleState, mutation: ProgramMutation): BattleState {
  let next: BattleState = {
    ...state,
    selectedMutation: mutation,
  };

  if (mutation.mutationId === 'DODO_ALERT') {
    next = {
      ...next,
      actors: next.actors.map((actor) => ({
        ...actor,
        scene: {
          ...actor.scene,
          dodoTrust: Math.max(0, actor.scene.dodoTrust - 3),
        },
      })),
    };
  }

  if (mutation.directorBroadcastText) {
    next = {
      ...next,
      directorBroadcasts: [
        ...next.directorBroadcasts,
        {
          broadcastId: `mutation_${mutation.mutationId}_${Date.now()}`,
          text: mutation.directorBroadcastText,
          scope: 'GLOBAL',
          targetActorIds: [],
          lifetime: 'CURRENT_BEAT',
          expiresAtActionIndex: 40,
          reactedActorIds: [],
          sourceTransactionId: `mutation_${mutation.mutationId}`,
        },
      ],
    };
  }

  return next;
}

export function getMutationById(mutationId: ProgramMutationId): ProgramMutation {
  return PROGRAM_MUTATIONS[mutationId];
}
