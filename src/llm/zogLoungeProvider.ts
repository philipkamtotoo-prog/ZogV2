/**
 * Zog Lounge Chat Provider
 * L2: 客厅聊天的 LLM 调用封装
 * 接收外部注入的 Prompt 模板，返回 Zog 的回复文本
 */

import { createLLMClient, type ChatMessage } from './clients/llmClient';
import { createLLMRoleRegistry } from './clients/llmRoleRegistry';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError } from './llmDebugLogger';
import { extractJsonFromResponse } from './jsonRepair';
import type { ChatMessage as StoreChatMessage } from '../features/lounge/loungeStore';

const registry = createLLMRoleRegistry();
const roleId = 'zog_lounge' as const;

export interface ZogLoungeProvider {
  /**
   * 发送消息并获取 Zog 回复
   * @param userMessage 用户输入的消息
   * @param history 历史聊天记录（不含当前消息）
   */
  chat(userMessage: string, history: StoreChatMessage[]): Promise<string>;
}

export interface ZogLoungeProviderConfig {
  /** 系统提示词模板，注入到 system role */
  systemPrompt?: string;
  /** 最大重试次数 */
  maxRetries?: number;
}

export function createZogLoungeProvider(config: ZogLoungeProviderConfig = {}): ZogLoungeProvider {
  const { systemPrompt = '你是 Zog，来自 Doda 的小外星人，傲娇、护食、爱捡垃圾，正在客厅冰箱旁和玩家短句聊天。回复中文，1-3 个短句，不超过 42 个中文字。', maxRetries = 2 } = config;

  return {
    async chat(userMessage: string, history: StoreChatMessage[]): Promise<string> {
      if (!registry.isRoleEnabled(roleId)) {
        return '冰箱信号没接好。先去设置里把 Zog 接上线。';
      }

      const roleConfig = registry.getRoleConfig(roleId);

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
      const temperature = roleConfig.temperature ?? 0.8;
      const maxTokens = roleConfig.maxTokens ?? 500;

      // 构建消息历史
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      for (const msg of history.slice(-20)) { // 最多保留最近20条
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
      }
      messages.push({ role: 'user', content: userMessage });

      const traceId = createTraceId();

      logLLMRequest({
        traceId,
        kind: 'ZogLounge',
        roleId,
        provider: roleConfig.providerId,
        baseUrl: roleConfig.baseUrl,
        model: roleConfig.model,
        messages,
        requestBody: { temperature, max_tokens: maxTokens },
      });

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await client.chat({
            model: roleConfig.model,
            messages,
            temperature,
            max_tokens: maxTokens,
          });

          logLLMResponse(traceId, response);

          const content = response.choices[0]?.message?.content ?? '';
          // 尝试从 JSON 响应中提取文字
          const text = extractJsonFromResponse(content) ?? content.trim();
          return text || 'Zog 暂时只想盯着冰箱。';
        } catch (err) {
          logLLMError(traceId, err);
          console.warn(`ZogLounge attempt ${attempt + 1} failed:`, err);
        }
      }

      return 'Zog 现在装作没听见。';
    },
  };
}
