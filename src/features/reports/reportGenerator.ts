import type { BattleState } from '../../core/battle/types';
import type { FinalScore } from '../../core/battle/finalScore';
import type { LLMConfig } from '../../llm/clients/byokConfig';
import { createLLMClient, type ChatMessage } from '../../llm/clients/llmClient';
import { buildReporterPrompt } from '../../llm/prompts/reporterPrompt';
import { parseJsonOrRepair, extractJsonFromResponse } from '../../llm/jsonRepair';
import { createTraceId, logLLMRequest, logLLMResponse, logLLMError } from '../../llm/llmDebugLogger';
import type { BattleReport } from './finalReport';
import { extractBattleReport } from './finalReport';

export interface LLMReportFields {
  title: string;
  summary: string;
  winnerComment: string;
  mvpComment: string;
  highlightDialogue: string;
  biggestIncident: string;
  zogReaction: string;
}

export async function generateLLMReport(
  battleState: BattleState,
  finalScores: FinalScore[],
  llmConfig: LLMConfig
): Promise<BattleReport> {
  const base = extractBattleReport(battleState);

  const highlights = battleState.eventLog
    .filter((e) => e.line)
    .map((e) => `[#${e.actorActionIndex}] ${e.line}`);

  const prompt = buildReporterPrompt(battleState, finalScores, highlights);
  const client = createLLMClient(llmConfig);

  const messages: ChatMessage[] = [
    { role: 'system', content: '你是渡渡岛大乱斗战报记者，必须输出JSON格式的战报。' },
    { role: 'user', content: prompt },
  ];

  const traceId = createTraceId();
  const request = {
    model: llmConfig.model,
    messages,
    temperature: 0.7,
    max_tokens: 800,
  };

  logLLMRequest({
    traceId,
    kind: 'Reporter',
    provider: llmConfig.providerId,
    baseUrl: llmConfig.baseUrl,
    model: llmConfig.model,
    messages,
    requestBody: {
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    },
  });

  try {
    const response = await client.chat(request);

    logLLMResponse(traceId, response);

    const content = response.choices[0]?.message?.content ?? '';
    const rawJson = extractJsonFromResponse(content);

    const parsed = parseJsonOrRepair<LLMReportFields>(rawJson, {
      title: base.title,
      summary: base.summary,
      winnerComment: '',
      mvpComment: '',
      highlightDialogue: base.highlightDialogue,
      biggestIncident: base.biggestIncident,
      zogReaction: base.zogReaction,
    });

    if (parsed.success) {
      return {
        ...base,
        title: parsed.data.title || base.title,
        summary: parsed.data.summary || base.summary,
        highlightDialogue: parsed.data.highlightDialogue || base.highlightDialogue,
        biggestIncident: parsed.data.biggestIncident || base.biggestIncident,
        zogReaction: parsed.data.zogReaction || base.zogReaction,
      };
    }
  } catch (err) {
    logLLMError(traceId, err);
    console.warn('LLM report generation failed, using fallback:', err);
  }

  return base;
}
