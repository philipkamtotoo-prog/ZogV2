/**
 * LLM 客户端 - OpenAI 兼容格式
 * 支持自定义 baseUrl（DeepSeek 等）
 */

import { normalizeBaseUrl, validateLLMConfig, type LLMConfig } from './byokConfig';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  thinking?: boolean;
  reasoning_effort?: 'low' | 'medium' | 'high';
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMClient {
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}

function shouldForceLocalLLMLog(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function logLocalLLMRequest(baseUrl: string, request: ChatCompletionRequest): void {
  if (!shouldForceLocalLLMLog()) return;
  console.warn('[LLM:FETCH:REQ]', {
    baseUrl,
    url: `${baseUrl}/chat/completions`,
    model: request.model,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    messages: request.messages.map((message) => ({
      role: message.role,
      contentLength: message.content.length,
      content: message.content,
    })),
  });
}

function logLocalLLMResponse(baseUrl: string, response: ChatCompletionResponse): void {
  if (!shouldForceLocalLLMLog()) return;
  const choice = response.choices[0];
  console.warn('[LLM:FETCH:RES]', {
    baseUrl,
    finishReason: choice?.finish_reason,
    usage: response.usage ?? {},
    content: choice?.message?.content ?? '(empty)',
    raw: response,
  });
}

function logLocalLLMError(baseUrl: string, status: number, errorText: string): void {
  if (!shouldForceLocalLLMLog()) return;
  console.error('[LLM:FETCH:ERR]', {
    baseUrl,
    status,
    errorText,
  });
}

export function createLLMClient(config: LLMConfig): LLMClient {
  return {
    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      const validation = validateLLMConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid LLM config: ${validation.error}`);
      }

      const baseUrl = normalizeBaseUrl(config.baseUrl);
      const body = {
        ...request,
        model: request.model || config.model,
        thinking: config.thinkingEnabled ? true : undefined,
      };
      logLocalLLMRequest(baseUrl, body);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(config.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logLocalLLMError(baseUrl, response.status, errorText);
        throw new Error(`LLM API error: ${response.status} ${baseUrl} - ${errorText}`);
      }

      const data = await response.json();
      logLocalLLMResponse(baseUrl, data);
      return data;
    },
  };
}
