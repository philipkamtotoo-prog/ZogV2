/**
 * ActorBrain Provider - 接口定义
 */

import type { BattleState, ActorBrainOutput, ActionType, DirectorBroadcast } from '../core/battle/types';

export interface ActorBrainProvider {
  /**
   * 生成 ActorBrain 输出
   */
  generate(
    battleState: BattleState,
    activeActorId: string,
    allowedActionTypes: ActionType[],
    lockedTargetId: string | null,
    directorBroadcasts: DirectorBroadcast[]
  ): Promise<ActorBrainOutput>;
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  // 超时时间（毫秒）
  timeout: number;

  // 最大重试次数
  maxRetries: number;
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  timeout: 20000,
  maxRetries: 2,
};
