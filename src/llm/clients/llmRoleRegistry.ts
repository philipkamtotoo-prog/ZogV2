/**
 * LLM Role Registry
 * L1: 提供按 roleId 取配置的统一入口
 */

import type { LLMRoleId, RoleLLMConfig, LLMRoleConfigMap } from '../types/llmRoleTypes';
import { DEFAULT_ROLE_CONFIGS } from '../types/llmRoleTypes';
import {
  loadStoredLLMRoleConfigMap,
  getDefaultRoleLLMConfig,
  normalizeBaseUrl,
  type LLMConfig,
} from './byokConfig';
import type { LLMClient } from './llmClient';
import { createLLMClient } from './llmClient';

export interface LLMRoleRegistry {
  getRoleConfig(roleId: LLMRoleId): RoleLLMConfig;
  isRoleEnabled(roleId: LLMRoleId): boolean;
}

function normalizeRoleLLMConfig(input: Partial<RoleLLMConfig>, roleId: LLMRoleId): RoleLLMConfig {
  const defaults = DEFAULT_ROLE_CONFIGS[roleId];
  return {
    roleId,
    enabled: input.enabled ?? defaults.enabled,
    providerId: input.providerId ?? defaults.providerId,
    apiKey: input.apiKey?.trim() ?? defaults.apiKey,
    baseUrl: normalizeBaseUrl(input.baseUrl ?? defaults.baseUrl),
    model: (input.model ?? defaults.model).trim(),
    timeout: Math.max(5000, Number(input.timeout ?? defaults.timeout)),
    thinkingEnabled: Boolean(input.thinkingEnabled ?? defaults.thinkingEnabled),
    debugMode: input.debugMode ?? defaults.debugMode,
    temperature: input.temperature ?? defaults.temperature,
    maxTokens: input.maxTokens ?? defaults.maxTokens,
    topP: input.topP ?? defaults.topP,
    promptVersion: input.promptVersion ?? defaults.promptVersion,
    systemPromptOverride: input.systemPromptOverride ?? defaults.systemPromptOverride,
    tags: input.tags ?? defaults.tags,
  };
}

export function createLLMRoleRegistry(storage: Storage | null = (() => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch { return null; }
})()): LLMRoleRegistry {
  let configMap: LLMRoleConfigMap | null = null;

  function ensureLoaded(): LLMRoleConfigMap {
    if (!configMap) {
      configMap = loadStoredLLMRoleConfigMap(storage);
      if (!configMap) {
        configMap = { version: 2, updatedAt: Date.now(), roles: { ...DEFAULT_ROLE_CONFIGS } };
      }
    }
    return configMap;
  }

  return {
    getRoleConfig(roleId: LLMRoleId): RoleLLMConfig {
      const map = ensureLoaded();
      const raw = map.roles[roleId];
      if (!raw) {
        return getDefaultRoleLLMConfig(roleId);
      }
      // 确保所有字段都有值（防御性）
      return normalizeRoleLLMConfig(raw, roleId);
    },

    isRoleEnabled(roleId: LLMRoleId): boolean {
      const map = ensureLoaded();
      return map.roles[roleId]?.enabled ?? false;
    },
  };
}

/**
 * 创建用于特定 role 的 LLMClient
 */
export function createLLMClientForRole(
  roleId: LLMRoleId,
  registry: LLMRoleRegistry
): LLMClient {
  const config = registry.getRoleConfig(roleId);
  const llmConfig: LLMConfig = {
    providerId: config.providerId,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    timeout: config.timeout,
    thinkingEnabled: config.thinkingEnabled,
    debugMode: config.debugMode,
  };
  return createLLMClient(llmConfig);
}