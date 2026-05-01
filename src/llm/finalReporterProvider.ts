/**
 * Final Reporter Provider
 * 战后战报生成 Provider
 * L2: 接入 llmRoleRegistry，按 final_reporter role 取配置
 */

import type { BattleState } from '../core/battle/types';
import type { FinalScore } from '../core/battle/finalScore';
import type { LLMRoleRegistry } from './clients/llmRoleRegistry';
import { createLLMClient, type ChatMessage } from './clients/llmClient';
import { buildReporterPrompt } from './prompts/reporterPrompt';
import { parseJsonOrRepair, extractJsonFromResponse } from './jsonRepair';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError } from './llmDebugLogger';

export interface FinalReportOutput {
  title: string;
  summary: string;
  winnerComment: string;
  mvpComment: string;
  highlightDialogue: string;
  biggestIncident: string;
  zogReaction: string;
}

export interface FinalReporterProvider {
  generateFinalReport: (
    battleState: BattleState,
    finalScores: FinalScore[],
    highlights: string[]
  ) => Promise<FinalReportOutput | null>;
}

export interface FinalReporterProviderConfig {
  registry: LLMRoleRegistry;
  maxRetries: number;
}

export function createFinalReporterProvider(config: FinalReporterProviderConfig): FinalReporterProvider {
  const roleId = 'final_reporter';

  return {
    async generateFinalReport(
      battleState: BattleState,
      finalScores: FinalScore[],
      highlights: string[]
    ): Promise<FinalReportOutput | null> {
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
      const prompt = buildReporterPrompt(battleState, finalScores, highlights);

      const messages: ChatMessage[] = [
        { role: 'system', content: '你是渡渡岛大乱斗战报记者，必须输出JSON格式的战报。' },
        { role: 'user', content: prompt },
      ];

      const temperature = roleConfig.temperature ?? 0.8;
      const maxTokens = roleConfig.maxTokens ?? 1500;

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

      const fallback: FinalReportOutput = {
        title: '战斗结束',
        summary: '战斗已结束',
        winnerComment: '',
        mvpComment: '',
        highlightDialogue: '',
        biggestIncident: '',
        zogReaction: '',
      };

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

          const parsed = parseJsonOrRepair<FinalReportOutput>(rawJson, fallback);

          if (parsed.success) {
            return parsed.data;
          }
        } catch (err) {
          logLLMError(traceId, err);
          console.warn(`FinalReporter attempt ${attempt + 1} failed:`, err);
        }
      }

      return null;
    },
  };
}