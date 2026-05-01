/**
 * Live Reporter Provider
 * 战中战地记者 Provider
 * L2: 接入 llmRoleRegistry，按 live_reporter role 取配置
 */

import type { BattleState } from '../core/battle/types';
import type { LLMRoleRegistry } from './clients/llmRoleRegistry';
import { createLLMClient, type ChatMessage } from './clients/llmClient';
import { buildLiveReporterPrompt } from './prompts/liveReporterPrompt';
import { parseJsonOrRepair, extractJsonFromResponse } from './jsonRepair';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError } from './llmDebugLogger';

export interface LiveReportOutput {
  headline: string;
  summary: string;
  style: string;
  thoughtProcess?: string;
}

export interface LiveReporterProvider {
  generateLiveReport: (
    battleState: BattleState,
    recentLogs: string[]
  ) => Promise<LiveReportOutput | null>;
}

export interface LiveReporterProviderConfig {
  registry: LLMRoleRegistry;
  maxRetries: number;
}

export function createLiveReporterProvider(config: LiveReporterProviderConfig): LiveReporterProvider {
  const roleId = 'live_reporter';

  return {
    async generateLiveReport(
      battleState: BattleState,
      recentLogs: string[]
    ): Promise<LiveReportOutput | null> {
      const roleConfig = config.registry.getRoleConfig(roleId);
      if (!config.registry.isRoleEnabled(roleId)) {
        return null;
      }

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
      const prompt = buildLiveReporterPrompt(battleState, recentLogs);

      const messages: ChatMessage[] = [
        { role: 'system', content: '你是渡渡岛大乱斗战地解说员，必须严格输出纯JSON。' },
        { role: 'user', content: prompt },
      ];

      const temperature = roleConfig.temperature ?? 0.7;
      const maxTokens = roleConfig.maxTokens ?? 700;

      const traceId = createTraceId();

      logLLMRequest({
        traceId,
        kind: 'Reporter',
        roleId,
        provider: roleConfig.providerId,
        baseUrl: roleConfig.baseUrl,
        model: roleConfig.model,
        messages,
        requestBody: { temperature, max_tokens: maxTokens },
      });

      for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
          const response = await client.chat({
            model: roleConfig.model,
            messages,
            temperature,
            max_tokens: maxTokens,
          });

          logLLMResponse(traceId, response);

          const content = response.choices[0]?.message?.content ?? '';
          const rawJson = extractJsonFromResponse(content);

          const parsed = parseJsonOrRepair<LiveReportOutput>(rawJson, {
            headline: '',
            summary: '',
            style: 'amused',
          });

          if (parsed.success && (parsed.data.headline || parsed.data.summary)) {
            return parsed.data;
          }
        } catch (err) {
          logLLMError(traceId, err);
          console.warn(`LiveReporter attempt ${attempt + 1} failed:`, err);
        }
      }

      return null;
    },
  };
}