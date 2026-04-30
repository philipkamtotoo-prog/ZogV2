import type { ChatMessage, ChatCompletionResponse } from './clients/llmClient';
import { LLM_CONFIG_STORAGE_KEY, LLM_DEBUG_STORAGE_KEY } from './clients/byokConfig';

export type LLMTraceKind = 'ActorBrain' | 'CommandGate' | 'Reporter';

export interface LLMTracePayload {
  traceId: string;
  kind: LLMTraceKind;
  provider: string;
  baseUrl?: string;
  model: string;
  messages: ChatMessage[];
  requestBody?: Record<string, unknown>;
}

let traceCounter = 0;

export function createTraceId(): string {
  traceCounter = (traceCounter + 1) % 100000;
  return `llm_${Date.now()}_${traceCounter}`;
}

export function shouldLogLLM(): boolean {
  try {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem(LLM_DEBUG_STORAGE_KEY) === 'verbose') return true;
      const rawConfig = localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
      if (!rawConfig) return false;
      return JSON.parse(rawConfig).debugMode === 'verbose';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = (globalThis as any).process;
    if (proc?.env) {
      return proc.env.ZOG_LLM_DEBUG === 'verbose';
    }
  } catch { /* ignore */ }
  return false;
}

export function logLLMRequest(payload: LLMTracePayload): void {
  if (!shouldLogLLM()) return;
  const title = `[LLM:REQ][${payload.traceId}][${payload.kind}]`;
  const meta = {
    provider: payload.provider,
    baseUrl: payload.baseUrl ?? payload.provider,
    model: payload.model,
    requestBody: payload.requestBody,
  };
  const messages = payload.messages.map((m) => ({
      role: m.role,
      contentLength: m.content.length,
      content: m.content,
  }));

  if (console.groupCollapsed) {
    console.groupCollapsed(title);
    console.log(meta);
    console.log('messages', messages);
    console.groupEnd();
    return;
  }

  console.log(title, meta, 'messages', messages);
}

export function logLLMResponse(traceId: string, response: ChatCompletionResponse): void {
  if (!shouldLogLLM()) return;
  const choice = response.choices[0];
  const title = `[LLM:RES][${traceId}]`;
  const payload = {
    finishReason: choice?.finish_reason,
    usage: response.usage ?? {},
    content: choice?.message?.content ?? '(empty)',
    raw: response,
  };

  if (console.groupCollapsed) {
    console.groupCollapsed(title);
    console.log(payload);
    console.groupEnd();
    return;
  }

  console.log(title, payload);
}

export function logLLMError(traceId: string, error: unknown): void {
  if (!shouldLogLLM()) return;
  console.error(`[LLM:ERR][${traceId}]`, error);
}

export function logLLMSkip(traceId: string, kind: LLMTraceKind, reason: string): void {
  if (!shouldLogLLM()) return;
  console.info(`[LLM:SKIP][${traceId}][${kind}]`, reason);
}
