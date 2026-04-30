import type { BattleState, ReporterMemoryEntry } from '../../core/battle/types';
import type { FinalScore } from '../../core/battle/finalScore';
import type { LLMConfig } from '../../llm/clients/byokConfig';
import { createLLMClient, type ChatMessage } from '../../llm/clients/llmClient';
import { buildReporterPrompt } from '../../llm/prompts/reporterPrompt';
import { buildLiveReporterPrompt } from '../../llm/prompts/liveReporterPrompt';
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

export interface LiveReport {
  headline: string;
  summary: string;
  style: string;
  sourceMemoryId?: string;
  createdAtActionIndex?: number;
}

function styleForMemory(memory?: ReporterMemoryEntry): LiveReport['style'] {
  if (!memory) return 'amused';
  if (memory.severity >= 5) return 'shocked';
  if (memory.type === 'ACCIDENT') return 'concerned';
  if (memory.type === 'SHAME' || memory.type === 'PLAYER_INTERVENTION') return 'gleeful';
  return 'amused';
}

export function generateFallbackLiveReport(
  battleState: BattleState,
  recentLogs: string[] = []
): LiveReport | null {
  const recentMemories = battleState.reporterMemory
    .filter((m) => m.actorActionIndex >= battleState.actorActionIndex - 4)
    .sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return b.actorActionIndex - a.actorActionIndex;
    });
  const memory = recentMemories.find((m) => m.type !== 'STAGE_BRIEF') ?? recentMemories[0];

  if (memory) {
    return {
      headline: memory.title,
      summary: memory.text,
      style: styleForMemory(memory),
      sourceMemoryId: memory.memoryId,
      createdAtActionIndex: memory.actorActionIndex,
    };
  }

  const latestLog = recentLogs[recentLogs.length - 1];
  if (!latestLog) return null;

  return {
    headline: '战地记者快讯',
    summary: latestLog,
    style: 'amused',
    createdAtActionIndex: battleState.actorActionIndex,
  };
}

export async function generateLiveReport(
  battleState: BattleState,
  llmConfig: LLMConfig,
  recentLogs: string[]
): Promise<LiveReport | null> {
  const prompt = buildLiveReporterPrompt(battleState, recentLogs);
  const client = createLLMClient(llmConfig);

  const messages: ChatMessage[] = [
    { role: 'system', content: '你是渡渡岛大乱斗战地解说员，必须严格输出纯JSON。' },
    { role: 'user', content: prompt },
  ];

  const traceId = createTraceId();
  try {
    const response = await client.chat({
      model: llmConfig.model,
      messages,
      temperature: 0.8,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const rawJson = extractJsonFromResponse(content);
    
    const parsed = parseJsonOrRepair<LiveReport>(rawJson, {
      headline: '',
      summary: '',
      style: 'amused'
    });

    if (parsed.success && (parsed.data.headline || parsed.data.summary)) {
      return {
        ...parsed.data,
        createdAtActionIndex: battleState.actorActionIndex,
      };
    }
  } catch (err) {
    logLLMError(traceId, err);
  }

  return generateFallbackLiveReport(battleState, recentLogs);
}
