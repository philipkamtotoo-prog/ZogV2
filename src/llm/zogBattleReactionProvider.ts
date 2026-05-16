/**
 * Zog Battle Reaction Provider
 * L2: 战中反应/ZOG_NOTE 的 LLM 调用封装
 * 当检测到高光事件（暴击、击杀等）时异步触发，返回 Zog 的一句话吐槽
 */

import type { BattleEvent, BattleState } from '../core/battle/types';
import { createLLMClient, type ChatMessage } from './clients/llmClient';
import { createLLMRoleRegistry } from './clients/llmRoleRegistry';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError } from './llmDebugLogger';
import { extractJsonFromResponse } from './jsonRepair';

const registry = createLLMRoleRegistry();
const roleId = 'zog_battle_reaction' as const;

export interface ZogBattleReactionProvider {
  /**
   * 生成 Zog 对特定战斗事件的吐槽
   * 完全异步，不阻塞战斗引擎
   */
  generateReaction(event: BattleEvent, battleState: BattleState): Promise<string>;
}

export interface ZogBattleReactionProviderConfig {
  /** 系统提示词模板 */
  systemPrompt?: string;
  /** 最大重试次数 */
  maxRetries?: number;
}

function buildReactionPrompt(event: BattleEvent, battleState: BattleState): string {
  const actor = battleState.actors.find((a) => a.actorId === event.activeActorId);
  const target = event.targetActorId ? battleState.actors.find((a) => a.actorId === event.targetActorId) : null;
  const actorName = actor?.name ?? 'Unknown';
  const targetName = target?.name ?? 'Unknown';

  let context = '';
  switch (event.type) {
    case 'DAMAGE_DEALT': {
      const diff = event.diffs?.find((d) => d.path.includes('currentHP'));
      const damage = diff ? Math.abs(Number(diff.newValue) - Number(diff.oldValue)) : 0;
      context = `${actorName} 对 ${targetName} 造成 ${damage} 点伤害`;
      break;
    }
    case 'ACTOR_ELIMINATED':
      context = `${actorName} 淘汰了 ${targetName}`;
      break;
    case 'STATUS_APPLIED': {
      const status = event.diffs?.find((d) => d.path.includes('status'))?.newValue ?? '';
      context = `${actorName} 给 ${targetName} 挂上 ${String(status)} 状态`;
      break;
    }
    case 'DODOS_STOLEN':
      context = `${actorName} 从 ${targetName} 那里偷走渡渡鸟`;
      break;
    case 'DODOS_BRIBED':
      context = `${actorName} 贿赂了渡渡鸟`;
      break;
    case 'NEST_CLAIMED':
      context = `${actorName} 抢占了巢区`;
      break;
    default:
      context = `${actorName} 做了一件显眼的事`;
  }

  return `${context}\n\n请用 Zog 的口吻给一句中文短吐槽。最多 22 个中文字，像电视前小声冒泡，不要解释。`;
}

export function createZogBattleReactionProvider(config: ZogBattleReactionProviderConfig = {}): ZogBattleReactionProvider {
  const {
    systemPrompt = '你是 Zog，来自 Doda 的小外星人，飞鼠系可爱、傲娇、爱捡垃圾、看不懂但很爱看宇宙电视。战斗吐槽必须中文，一句话，最多 22 个中文字，嘴硬、短促、荒诞，禁止恋爱感。',
    maxRetries = 2,
  } = config;

  return {
    async generateReaction(event: BattleEvent, battleState: BattleState): Promise<string> {
      if (!registry.isRoleEnabled(roleId)) {
        return '';
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
      const temperature = roleConfig.temperature ?? 0.9;
      const maxTokens = roleConfig.maxTokens ?? 200;

      const prompt = buildReactionPrompt(event, battleState);

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      const traceId = createTraceId();

      logLLMRequest({
        traceId,
        kind: 'ZogBattleReaction',
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
          const text = (extractJsonFromResponse(content) ?? content.trim()).replace(/^["']|["']$/g, '');
          return text || '';
        } catch (err) {
          logLLMError(traceId, err);
          console.warn(`ZogBattleReaction attempt ${attempt + 1} failed:`, err);
        }
      }

      return '';
    },
  };
}
