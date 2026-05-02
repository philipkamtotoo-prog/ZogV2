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
export const LLM_ROLE_CONFIG_MAP_STORAGE_KEY = 'zog_llm_role_config_map';
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

// === L1: Role-based BYOK Config ===

import type { LLMRoleId, RoleLLMConfig, LLMRoleConfigMap } from '../types/llmRoleTypes';
import { DEFAULT_ROLE_CONFIGS } from '../types/llmRoleTypes';

function migrateFromLegacyConfig(storage: Storage | null): LLMRoleConfigMap {
  const legacy = loadStoredLLMConfig(storage);
  const now = Date.now();

  const roles: Record<LLMRoleId, RoleLLMConfig> = {
    actor_brain: {
      ...DEFAULT_ROLE_CONFIGS.actor_brain,
      apiKey: legacy?.apiKey ?? '',
      baseUrl: legacy?.baseUrl ?? DEFAULT_ROLE_CONFIGS.actor_brain.baseUrl,
      model: legacy?.model ?? DEFAULT_ROLE_CONFIGS.actor_brain.model,
      timeout: legacy?.timeout ?? DEFAULT_ROLE_CONFIGS.actor_brain.timeout,
      providerId: legacy?.providerId ?? 'deepseek',
      thinkingEnabled: legacy?.thinkingEnabled ?? false,
      debugMode: legacy?.debugMode ?? 'off',
    },
    command_gate: {
      ...DEFAULT_ROLE_CONFIGS.command_gate,
      apiKey: legacy?.apiKey ?? '',
      baseUrl: legacy?.baseUrl ?? DEFAULT_ROLE_CONFIGS.command_gate.baseUrl,
      model: legacy?.model ?? DEFAULT_ROLE_CONFIGS.command_gate.model,
      timeout: legacy?.timeout ?? DEFAULT_ROLE_CONFIGS.command_gate.timeout,
      providerId: legacy?.providerId ?? 'deepseek',
      thinkingEnabled: legacy?.thinkingEnabled ?? false,
      debugMode: legacy?.debugMode ?? 'off',
    },
    showrunner_director: {
      // 新角色默认关闭，避免"显示启用但实际无法调用"的半坏状态
      ...DEFAULT_ROLE_CONFIGS.showrunner_director,
    },
    live_reporter: {
      ...DEFAULT_ROLE_CONFIGS.live_reporter,
      apiKey: legacy?.apiKey ?? '',
      baseUrl: legacy?.baseUrl ?? DEFAULT_ROLE_CONFIGS.live_reporter.baseUrl,
      model: legacy?.model ?? DEFAULT_ROLE_CONFIGS.live_reporter.model,
      timeout: legacy?.timeout ?? DEFAULT_ROLE_CONFIGS.live_reporter.timeout,
      providerId: legacy?.providerId ?? 'deepseek',
      thinkingEnabled: legacy?.thinkingEnabled ?? false,
      debugMode: legacy?.debugMode ?? 'off',
    },
    final_reporter: {
      ...DEFAULT_ROLE_CONFIGS.final_reporter,
      apiKey: legacy?.apiKey ?? '',
      baseUrl: legacy?.baseUrl ?? DEFAULT_ROLE_CONFIGS.final_reporter.baseUrl,
      model: legacy?.model ?? DEFAULT_ROLE_CONFIGS.final_reporter.model,
      timeout: legacy?.timeout ?? DEFAULT_ROLE_CONFIGS.final_reporter.timeout,
      providerId: legacy?.providerId ?? 'deepseek',
      thinkingEnabled: legacy?.thinkingEnabled ?? false,
      debugMode: legacy?.debugMode ?? 'off',
    },
    referee_llm_advisor: {
      // 默认关闭，保持不污染硬规则
      ...DEFAULT_ROLE_CONFIGS.referee_llm_advisor,
    },
    zog_lounge: {
      ...DEFAULT_ROLE_CONFIGS.zog_lounge,
    },
    zog_battle_reaction: {
      ...DEFAULT_ROLE_CONFIGS.zog_battle_reaction,
    },
  };

  return { version: 2, updatedAt: now, roles };
}

export function loadStoredLLMRoleConfigMap(storage: Storage | null = getStorage()): LLMRoleConfigMap | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(LLM_ROLE_CONFIG_MAP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 兼容 v1 格式
      if (parsed.version === 2) {
        return parsed as LLMRoleConfigMap;
      }
    }
    // 无新格式，检查旧格式并迁移
    const legacy = loadStoredLLMConfig(storage);
    if (legacy) {
      const migrated = migrateFromLegacyConfig(storage);
      saveStoredLLMRoleConfigMap(migrated, storage);
      return migrated;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveStoredLLMRoleConfigMap(
  configMap: LLMRoleConfigMap,
  storage: Storage | null = getStorage()
): LLMRoleConfigMap {
  if (!storage) return configMap;
  storage.setItem(LLM_ROLE_CONFIG_MAP_STORAGE_KEY, JSON.stringify(configMap));
  return configMap;
}

export function getDefaultRoleLLMConfig(roleId: LLMRoleId): RoleLLMConfig {
  return { ...DEFAULT_ROLE_CONFIGS[roleId] };
}
