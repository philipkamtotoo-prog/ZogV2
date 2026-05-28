import {
  loadStoredLLMRoleConfigMap,
  normalizeBaseUrl,
  saveStoredLLMRoleConfigMap,
} from '../../../llm/clients/byokConfig';
import {
  ALL_LLM_ROLE_IDS,
  DEFAULT_ROLE_CONFIGS,
  type LLMRoleConfigMap,
  type LLMRoleId,
  type RoleLLMConfig,
} from '../../../llm/types/llmRoleTypes';

export interface AudioSettings {
  masterVolume: number;
}

export interface SettingsSnapshot {
  modelConfigMap: LLMRoleConfigMap;
  audio: AudioSettings;
}

const AUDIO_SETTINGS_STORAGE_KEY = 'zog_audio_settings';

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function normalizeRoleConfig(roleId: LLMRoleId, input?: Partial<RoleLLMConfig>): RoleLLMConfig {
  const defaults = DEFAULT_ROLE_CONFIGS[roleId];
  return {
    ...defaults,
    ...input,
    roleId,
    apiKey: input?.apiKey?.trim() ?? defaults.apiKey,
    baseUrl: normalizeBaseUrl(input?.baseUrl ?? defaults.baseUrl),
    model: (input?.model ?? defaults.model).trim(),
    timeout: Math.max(5000, Number(input?.timeout ?? defaults.timeout)),
    thinkingEnabled: Boolean(input?.thinkingEnabled ?? defaults.thinkingEnabled),
    debugMode: input?.debugMode ?? defaults.debugMode,
    temperature: input?.temperature ?? defaults.temperature,
    maxTokens: input?.maxTokens ?? defaults.maxTokens,
  };
}

function normalizeModelConfigMap(input: LLMRoleConfigMap | null): LLMRoleConfigMap {
  const roles = ALL_LLM_ROLE_IDS.reduce((acc, roleId) => {
    acc[roleId] = normalizeRoleConfig(roleId, input?.roles?.[roleId]);
    return acc;
  }, {} as Record<LLMRoleId, RoleLLMConfig>);

  return {
    version: 2,
    updatedAt: input?.updatedAt ?? Date.now(),
    defaultRoleFallback: input?.defaultRoleFallback,
    roles,
  };
}

export function loadSettingsSnapshot(storage: Storage | null = getStorage()): SettingsSnapshot {
  return {
    modelConfigMap: normalizeModelConfigMap(loadStoredLLMRoleConfigMap(storage)),
    audio: loadAudioSettings(storage),
  };
}

export function saveModelConfigMap(
  modelConfigMap: LLMRoleConfigMap,
  storage: Storage | null = getStorage()
): LLMRoleConfigMap {
  const normalized = normalizeModelConfigMap({
    ...modelConfigMap,
    updatedAt: Date.now(),
  });
  saveStoredLLMRoleConfigMap(normalized, storage);
  return normalized;
}

export function loadAudioSettings(storage: Storage | null = getStorage()): AudioSettings {
  if (!storage) return { masterVolume: 1 };
  try {
    const raw = storage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) return { masterVolume: 1 };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      masterVolume: clampVolume(parsed.masterVolume),
    };
  } catch {
    return { masterVolume: 1 };
  }
}

export function saveAudioSettings(
  audio: AudioSettings,
  storage: Storage | null = getStorage()
): AudioSettings {
  const normalized = { masterVolume: clampVolume(audio.masterVolume) };
  storage?.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function clampVolume(value: unknown): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 1;
  return Math.max(0, Math.min(1, numberValue));
}
