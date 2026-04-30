/**
 * Stub ActorBrain Provider - 用于测试和开发
 * 使用随机但确定的输出
 */

import type { BattleState, ActorBrainOutput, ActionType, DirectorBroadcast } from '../core/battle/types';
import type { ActorBrainProvider } from './actorBrainProvider';
import { seededRng } from '../core/battle/rng';
import { ACTION_DEFS } from '../core/battle/actionDefs';
import { createTraceId, logLLMSkip } from './llmDebugLogger';

const DRAMA_LINES = [
  '各位观众，我有一个惊人的发现！',
  '这波操作，大家怎么看？',
  '我只想安静地看戏...',
  '等等，让我思考一下...',
  '事情的发展出乎我的意料！',
  '这场戏，越来越有意思了。',
  '让我来扭转局面！',
  '各位，准备好迎接惊喜了吗？',
];

export function createStubActorBrainProvider(): ActorBrainProvider {
  return {
    async generate(
      battleState: BattleState,
      activeActorId: string,
      allowedActionTypes: ActionType[],
      lockedTargetId: string | null,
      _directorBroadcasts: DirectorBroadcast[]
    ): Promise<ActorBrainOutput> {
      logLLMSkip(createTraceId(), 'ActorBrain', 'stub mode');

      const activeActor = battleState.actors.find((a: { actorId: string }) => a.actorId === activeActorId);
      if (!activeActor) {
        throw new Error(`Actor not found: ${activeActorId}`);
      }

      // 根据是否有目标来过滤 actionType
      const validActions = allowedActionTypes.filter((at) => {
        const policy = ACTION_DEFS[at].targetPolicy;
        if (policy === 'TARGET_REQUIRED' && !lockedTargetId) return false;
        if (policy === 'SELF_ONLY' && lockedTargetId) return false;
        return true;
      });

      // 优先选择需要目标的action（如果有目标），否则选择 SAFE_FALLBACK
      let preferredActions: ActionType[];
      if (lockedTargetId) {
        preferredActions = validActions.filter((at) =>
          !['FALLBACK_SIGNAL_STUMBLE', 'MOCK_ANIMAL_MANAGEMENT', 'CALM_HERD'].includes(at)
        );
        if (preferredActions.length === 0) {
          preferredActions = validActions;
        }
      } else {
        preferredActions = validActions.filter((at) =>
          ['FALLBACK_SIGNAL_STUMBLE', 'MOCK_ANIMAL_MANAGEMENT', 'CALM_HERD', 'BUILD_FAKE_NEST', 'CLAIM_NEST_AREA'].includes(at)
        );
        if (preferredActions.length === 0) {
          preferredActions = validActions;
        }
      }

      const actionIndex = Math.floor(
        seededRng(battleState.battleSeed, battleState.actorActionIndex, 'stubAction', activeActorId) *
          preferredActions.length
      );
      const actionType = preferredActions[actionIndex] ?? 'FALLBACK_SIGNAL_STUMBLE';

      // 使用 RNG 选择台词
      const lineIndex = Math.floor(
        seededRng(battleState.battleSeed, battleState.actorActionIndex, 'stubLine', activeActorId) *
          DRAMA_LINES.length
      );
      const line = DRAMA_LINES[lineIndex];

      return {
        actorId: activeActorId,
        actionType,
        line,
        actionDescription: `${activeActor.name} 采取了行动`,
        performanceIntent: '演员的表演',
      };
    },
  };
}
