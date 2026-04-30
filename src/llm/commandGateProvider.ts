/**
 * CommandGate Provider
 * 使用 LLM 评估玩家指令
 */

import type { BattleState, CommandGateResult, DirectorBroadcastDraft } from '../core/battle/types';
import { createLLMClient, type ChatMessage } from './clients/llmClient';
import type { LLMConfig } from './clients/byokConfig';
import { buildCommandGatePrompt, quickEvaluate } from './prompts/commandGatePrompt';
import { parseJsonOrRepair, extractJsonFromResponse } from './jsonRepair';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError, logLLMSkip } from './llmDebugLogger';

export interface CommandGateProviderConfig {
  llmConfig: LLMConfig;
  timeout: number;
  maxRetries: number;
}

/**
 * 创建 CommandGate Provider
 */
export function createCommandGateProvider(
  config: CommandGateProviderConfig
): {
  evaluate: (rawInput: string, battleState: BattleState) => Promise<CommandGateResult>;
} {
  const client = createLLMClient(config.llmConfig);

  return {
    async evaluate(
      rawInput: string,
      battleState: BattleState
    ): Promise<CommandGateResult> {
      const traceId = createTraceId();

      const quickResult = quickEvaluate(rawInput, battleState);
      if (quickResult) {
        logLLMSkip(traceId, 'CommandGate', `quickEvaluate: ${quickResult.reason}`);
        return {
          decision: quickResult.decision,
          normalizedInput: rawInput.trim().toLowerCase(),
          reason: quickResult.reason,
          directorBroadcastDraft: quickResult.draft,
          targetQuestion: quickResult.targetQuestion,
          targetOptions: quickResult.targetOptions,
        };
      }

      const prompt = buildCommandGatePrompt(rawInput, battleState);
      const messages: ChatMessage[] = [
        { role: 'system', content: '你是导演指令审查员，必须输出 JSON 格式的判定结果。' },
        { role: 'user', content: prompt },
      ];

      const request = {
        model: config.llmConfig.model,
        messages,
        temperature: 0.3,
        max_tokens: 500,
      };

      logLLMRequest({
        traceId,
        kind: 'CommandGate',
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

          interface RawLLMGateOutput {
            decision: string;
            normalizedInput: string;
            reason: string;
            directorBroadcast?: { text: string; scope: string; targetActorIds: string[] };
            directorBroadcastDraft?: { text: string; scope: string; targetActorIds: string[] };
            targetQuestion?: string;
            targetOptions?: { actorId: string; label: string }[];
          }

          const result = parseJsonOrRepair<RawLLMGateOutput>(rawOutput, {
            decision: 'REJECT',
            normalizedInput: rawInput,
            reason: 'LLM 解析失败',
          });

          if (result.success) {
            const raw = result.data;
            const broadcastSource = raw.directorBroadcastDraft ?? raw.directorBroadcast;
            let draft: DirectorBroadcastDraft | undefined;
            if (broadcastSource && (raw.decision === 'ALLOW' || raw.decision === 'DOWNGRADE')) {
              draft = {
                text: broadcastSource.text ?? rawInput,
                scope: (broadcastSource.scope === 'TARGETED' ? 'TARGETED' : 'GLOBAL'),
                targetActorIds: broadcastSource.targetActorIds ?? [],
                lifetime: 'NEXT_ACTION',
              };
            }
            const targetOptions: CommandGateResult['targetOptions'] = raw.targetOptions?.map((o) => ({
              actorId: o.actorId,
              label: o.label,
            }));
            return {
              decision: raw.decision as CommandGateResult['decision'],
              normalizedInput: raw.normalizedInput ?? rawInput,
              reason: raw.reason ?? '',
              directorBroadcastDraft: draft,
              targetQuestion: raw.targetQuestion,
              targetOptions,
            };
          }
        } catch (err) {
          logLLMError(traceId, err);
          console.warn(`CommandGate attempt ${attempt + 1} failed:`, err);
        }
      }

      return {
        decision: 'ASK',
        normalizedInput: rawInput,
        reason: '无法评估指令，请澄清目标',
      };
    },
  };
}
