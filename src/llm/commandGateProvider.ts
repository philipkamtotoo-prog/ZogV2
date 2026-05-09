/**
 * CommandGate Provider
 * 使用 LLM 评估玩家指令
 */

import type { BattleState, CommandGateResult, DirectorBroadcastDraft } from '../core/battle/types';
import { createLLMClient, type ChatMessage } from './clients/llmClient';
import type { LLMRoleRegistry } from './clients/llmRoleRegistry';
import { buildCommandGatePrompt, quickEvaluate } from './prompts/commandGatePrompt';
import { parseJsonOrRepair, extractJsonFromResponse } from './jsonRepair';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError, logLLMSkip } from './llmDebugLogger';

export interface CommandGateProviderConfig {
  registry: LLMRoleRegistry;
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
  const roleId = 'command_gate';
  const roleConfig = config.registry.getRoleConfig(roleId);

  const llmConfig = {
    providerId: roleConfig.providerId,
    apiKey: roleConfig.apiKey,
    baseUrl: roleConfig.baseUrl,
    model: roleConfig.model,
    timeout: roleConfig.timeout,
    thinkingEnabled: roleConfig.thinkingEnabled,
    debugMode: roleConfig.debugMode,
  };

  const client = createLLMClient(llmConfig);

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
          directorBroadcastDraft: quickResult.draft
            ? { ...quickResult.draft, text: toDirectorBroadcastText(rawInput, quickResult.draft.text) }
            : undefined,
          targetQuestion: quickResult.targetQuestion,
          targetOptions: quickResult.targetOptions,
        };
      }

      const prompt = buildCommandGatePrompt(rawInput, battleState);
      const messages: ChatMessage[] = [
        { role: 'system', content: '你是导演指令审查员，必须输出 JSON 格式的判定结果。' },
        { role: 'user', content: prompt },
      ];

      const temperature = roleConfig.temperature ?? 0.3;
      const maxTokens = roleConfig.maxTokens ?? 500;

      const request = {
        model: roleConfig.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      logLLMRequest({
        traceId,
        kind: 'CommandGate',
        roleId,
        provider: roleConfig.providerId,
        baseUrl: roleConfig.baseUrl,
        model: roleConfig.model,
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
                text: toDirectorBroadcastText(rawInput, broadcastSource.text ?? rawInput),
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

function toDirectorBroadcastText(rawInput: string, proposedText: string): string {
  const trimmedRaw = rawInput.trim();
  const trimmedText = proposedText.trim();

  if (!trimmedText) {
    return '导播信号切入，场上的气氛陡然绷紧。';
  }

  if (trimmedText === trimmedRaw) {
    return `导播信号切入：${trimmedText}`;
  }

  return trimmedText;
}
