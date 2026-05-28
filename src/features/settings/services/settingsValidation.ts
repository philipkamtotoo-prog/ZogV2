import { normalizeBaseUrl } from '../../../llm/clients/byokConfig';
import type { RoleLLMConfig } from '../../../llm/types/llmRoleTypes';

export interface SettingsValidationIssue {
  field: 'apiKey' | 'baseUrl' | 'model' | 'timeout';
  message: string;
}

export function validateRoleModelSettings(config: RoleLLMConfig): SettingsValidationIssue[] {
  if (!config.enabled) return [];

  const issues: SettingsValidationIssue[] = [];
  if (!config.apiKey.trim()) {
    issues.push({ field: 'apiKey', message: 'API Key 不能为空' });
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (
    !baseUrl.startsWith('https://') &&
    !baseUrl.startsWith('http://localhost') &&
    !baseUrl.startsWith('http://127.0.0.1') &&
    !baseUrl.startsWith('http://[::1]')
  ) {
    issues.push({ field: 'baseUrl', message: 'Base URL 需要是 https 或 localhost' });
  }

  if (!config.model.trim()) {
    issues.push({ field: 'model', message: 'Model 不能为空' });
  }

  if (!Number.isFinite(config.timeout) || config.timeout < 5000) {
    issues.push({ field: 'timeout', message: 'Timeout 至少 5000ms' });
  }

  return issues;
}
