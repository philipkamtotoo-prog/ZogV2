/**
 * Showrunner Provider
 * 导演广播生成 Provider
 * L3: 直接注入模式，独立 role slot
 */

import type { BattleState, DramaBeat, DirectorBroadcast, ReporterMemoryEntry } from '../core/battle/types';
import type { LLMRoleRegistry } from './clients/llmRoleRegistry';
import { createLLMClient, type ChatMessage } from './clients/llmClient';
import { buildShowrunnerPrompt, shouldShowrunnerFire } from './prompts/showrunnerPrompt';
import { parseJsonOrRepair, extractJsonFromResponse } from './jsonRepair';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError } from './llmDebugLogger';

export interface ShowrunnerOutput {
  broadcastText: string;
  scope: 'GLOBAL' | 'TARGETED';
  targetActorIds: string[];
  beatSignal?: string;
  reasoning?: string;
}

export interface ShowrunnerProvider {
  /**
   * 判断是否应该触发 showrunner
   */
  shouldFire: (
    actorActionIndex: number,
    lastShowrunnerActionIndex: number,
    recentEvents: BattleState['eventLog']
  ) => boolean;

  /**
   * 生成导演广播（直接注入模式）
   */
  generateDirectorBroadcast: (
    battleState: BattleState,
    reporterMemory: ReporterMemoryEntry[],
    currentBeat?: DramaBeat
  ) => Promise<DirectorBroadcast | null>;
}

export interface ShowrunnerProviderConfig {
  registry: LLMRoleRegistry;
  cooldown: number; // 每 N 个 action 允许出手一次
  maxRetries: number;
}

export function createShowrunnerProvider(config: ShowrunnerProviderConfig): ShowrunnerProvider {
  const roleId = 'showrunner_director';

  return {
    shouldFire(
      actorActionIndex: number,
      lastShowrunnerActionIndex: number,
      recentEvents: BattleState['eventLog']
    ): boolean {
      if (!config.registry.isRoleEnabled(roleId)) {
        return false;
      }
      return shouldShowrunnerFire(actorActionIndex, lastShowrunnerActionIndex, config.cooldown, recentEvents);
    },

    async generateDirectorBroadcast(
      battleState: BattleState,
      reporterMemory: ReporterMemoryEntry[],
      currentBeat?: DramaBeat
    ): Promise<DirectorBroadcast | null> {
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
      const prompt = buildShowrunnerPrompt(battleState, reporterMemory, currentBeat);

      const messages: ChatMessage[] = [
        { role: 'system', content: '你是星际斗兽场的节目总导演，必须严格输出JSON格式的导演广播。' },
        { role: 'user', content: prompt },
      ];

      const temperature = roleConfig.temperature ?? 0.8;
      const maxTokens = roleConfig.maxTokens ?? 900;

      const traceId = createTraceId();

      logLLMRequest({
        traceId,
        kind: 'Showrunner',
        roleId,
        provider: roleConfig.providerId,
        baseUrl: roleConfig.baseUrl,
        model: roleConfig.model,
        messages,
        requestBody: { temperature, max_tokens: maxTokens },
      });

      const fallback: ShowrunnerOutput = {
        broadcastText: '节目继续进行...',
        scope: 'GLOBAL',
        targetActorIds: [],
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

          const parsed = parseJsonOrRepair<ShowrunnerOutput>(rawJson, fallback);

          if (parsed.success && parsed.data.broadcastText) {
            const output = parsed.data;
            const broadcast: DirectorBroadcast = {
              broadcastId: `sw_${Date.now()}`,
              text: output.broadcastText,
              scope: output.scope === 'TARGETED' ? 'TARGETED' : 'GLOBAL',
              targetActorIds: output.targetActorIds ?? [],
              lifetime: 'NEXT_ACTION',
              expiresAtActionIndex: battleState.actorActionIndex + 2,
              reactedActorIds: [],
              sourceTransactionId: 'showrunner',
            };
            return broadcast;
          }
        } catch (err) {
          logLLMError(traceId, err);
          console.warn(`Showrunner attempt ${attempt + 1} failed:`, err);
        }
      }

      return null;
    },
  };
}