/**
 * LLM ActorBrain Provider
 * 使用 DeepSeek 或 OpenAI 兼容 API
 */

import type { BattleState, ActorBrainOutput, ActionType, DirectorBroadcast } from '../core/battle/types';
import type { ActorBrainProvider, ProviderConfig } from './actorBrainProvider';
import { createLLMClient, type ChatMessage } from './clients/llmClient';
import type { LLMConfig } from './clients/byokConfig';
import { buildActorBrainPrompt } from './prompts/actorBrainPrompt';
import { parseJsonOrRepair, extractJsonFromResponse } from './jsonRepair';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError } from './llmDebugLogger';

export interface LLMProviderConfig extends ProviderConfig {
  llmConfig: LLMConfig;
}

/**
 * 创建 LLM ActorBrain Provider
 */
export function createLLMActorBrainProvider(config: LLMProviderConfig): ActorBrainProvider {
  const client = createLLMClient(config.llmConfig);

  return {
    async generate(
      battleState: BattleState,
      activeActorId: string,
      allowedActionTypes: ActionType[],
      lockedTargetId: string | null,
      directorBroadcasts: DirectorBroadcast[]
    ): Promise<ActorBrainOutput> {
      const activeActor = battleState.actors.find((a: { actorId: string }) => a.actorId === activeActorId);
      if (!activeActor) {
        throw new Error(`Actor not found: ${activeActorId}`);
      }

      // 构建 Prompt
      const prompt = buildActorBrainPrompt({
        battleState,
        activeActor,
        allowedActionTypes,
        lockedTargetId,
        directorBroadcasts,
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: '你是一个演员，你必须从允许的 actionType 中选择一个来行动。' },
        { role: 'user', content: prompt },
      ];

      let lastError: Error | null = null;
      const traceId = createTraceId();

      const request = {
        model: config.llmConfig.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      };

      logLLMRequest({
        traceId,
        kind: 'ActorBrain',
        provider: config.llmConfig.providerId,
        baseUrl: config.llmConfig.baseUrl,
        model: config.llmConfig.model,
        messages,
        requestBody: {
          temperature: request.temperature,
          max_tokens: request.max_tokens,
        },
      });

      for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
          const response = await client.chat(request);

          logLLMResponse(traceId, response);

          const content = response.choices[0]?.message?.content ?? '';
          const rawOutput = extractJsonFromResponse(content);

          const result = parseJsonOrRepair<ActorBrainOutput>(rawOutput, {
            actorId: activeActorId,
            actionType: 'FALLBACK_SIGNAL_STUMBLE',
            line: '（一时语塞）',
            actionDescription: '踌躇片刻，选择观望',
            performanceIntent: '保守行动，等待时机',
          });

          if (result.success) {
            if (!allowedActionTypes.includes(result.data.actionType)) {
              console.warn(`Invalid actionType ${result.data.actionType}, falling back`);
              return {
                actorId: activeActorId,
                actionType: 'FALLBACK_SIGNAL_STUMBLE',
                line: result.data.line || '（一时语塞）',
                actionDescription: result.data.actionDescription || '踌躇片刻',
                performanceIntent: result.data.performanceIntent || '保守行动',
              };
            }
            return result.data;
          } else {
            console.warn(`JSON parse failed: ${result.error}`);
            lastError = new Error(result.error);
          }
        } catch (err) {
          logLLMError(traceId, err);
          console.warn(`Attempt ${attempt + 1} failed:`, err);
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      // 所有重试都失败，返回 fallback
      console.error('All LLM attempts failed, using fallback:', lastError);
      return {
        actorId: activeActorId,
        actionType: 'FALLBACK_SIGNAL_STUMBLE',
        line: '（一时语塞）',
        actionDescription: '踌躇片刻，选择观望',
        performanceIntent: '保守行动，等待时机',
      };
    },
  };
}
