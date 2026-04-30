/**
 * BYOK configuration. The provider, base URL, model, and API key are stored
 * together so a user's key is only sent to the endpoint they selected.
 */

export type LLMProviderId = 'deepseek' | 'openai' | 'custom';
export type LLMDebugMode = 'off' | 'summary' | 'verbose';

export interface LLMConfig {
  providerId: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  thinkingEnabled: boolean;
  debugMode: LLMDebugMode;
}

export interface LLMProviderDefinition {
  providerId: LLMProviderId;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
}

export const LLM_CONFIG_STORAGE_KEY = 'zog_llm_config';
export const LEGACY_API_KEY_STORAGE_KEY = 'zog_api_key';
export const LLM_DEBUG_STORAGE_KEY = 'zog_llm_debug';

export const PROVIDER_DEFS: Record<LLMProviderId, LLMProviderDefinition> = {
  deepseek: {
    providerId: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  },
  openai: {
    providerId: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o'],
  },
  custom: {
    providerId: 'custom',
    name: 'Custom OpenAI Compatible',
    baseUrl: '',
    defaultModel: '',
    models: [],
  },
};

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  providerId: 'deepseek',
  apiKey: '',
  baseUrl: PROVIDER_DEFS.deepseek.baseUrl,
  model: PROVIDER_DEFS.deepseek.defaultModel,
  timeout: 20000,
  thinkingEnabled: false,
  debugMode: 'off',
};

export const SUPPORTED_MODELS = [
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', providerId: 'deepseek', provider: 'DeepSeek' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', providerId: 'deepseek', provider: 'DeepSeek' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai', provider: 'OpenAI' },
  { id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai', provider: 'OpenAI' },
] as const;

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function normalizeProviderId(providerId: unknown): LLMProviderId {
  return providerId === 'openai' || providerId === 'custom' ? providerId : 'deepseek';
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function normalizeLLMConfig(input: Partial<LLMConfig> = {}): LLMConfig {
  const providerId = normalizeProviderId(input.providerId);
  const provider = PROVIDER_DEFS[providerId];
  const baseUrl = normalizeBaseUrl(input.baseUrl ?? provider.baseUrl);
  const model = (input.model ?? provider.defaultModel).trim();
  const debugMode: LLMDebugMode =
    input.debugMode === 'summary' || input.debugMode === 'verbose' ? input.debugMode : 'off';

  return {
    providerId,
    apiKey: input.apiKey?.trim() ?? '',
    baseUrl,
    model,
    timeout: Math.max(5000, Number(input.timeout ?? DEFAULT_LLM_CONFIG.timeout)),
    thinkingEnabled: Boolean(input.thinkingEnabled),
    debugMode,
  };
}

export function loadStoredLLMConfig(storage: Storage | null = getStorage()): LLMConfig | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(LLM_CONFIG_STORAGE_KEY);
    if (raw) {
      return normalizeLLMConfig(JSON.parse(raw) as Partial<LLMConfig>);
    }

    const legacyKey = storage.getItem(LEGACY_API_KEY_STORAGE_KEY);
    if (legacyKey) {
      return normalizeLLMConfig({ ...DEFAULT_LLM_CONFIG, apiKey: legacyKey });
    }
  } catch {
    return null;
  }

  return null;
}

export function saveStoredLLMConfig(
  config: LLMConfig,
  storage: Storage | null = getStorage()
): LLMConfig {
  const normalized = normalizeLLMConfig(config);
  if (!storage) return normalized;

  storage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  storage.setItem(LLM_DEBUG_STORAGE_KEY, normalized.debugMode);
  storage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
  return normalized;
}

export function validateLLMConfig(config: LLMConfig): { valid: boolean; error?: string } {
  if (!config.apiKey.trim()) {
    return { valid: false, error: 'API key is required' };
  }
  if (
    !config.baseUrl.startsWith('https://') &&
    !config.baseUrl.startsWith('http://localhost') &&
    !config.baseUrl.startsWith('http://127.0.0.1') &&
    !config.baseUrl.startsWith('http://[::1]')
  ) {
    return { valid: false, error: 'Base URL must be https:// or localhost' };
  }
  if (!config.model.trim()) {
    return { valid: false, error: 'Model is required' };
  }
  if (!config.timeout || config.timeout < 5000) {
    return { valid: false, error: 'Timeout must be at least 5000ms' };
  }
  return { valid: true };
}
