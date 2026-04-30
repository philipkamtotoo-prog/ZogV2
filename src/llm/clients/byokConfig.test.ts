import { afterEach, describe, expect, it } from 'vitest';
import {
  LLM_CONFIG_STORAGE_KEY,
  LEGACY_API_KEY_STORAGE_KEY,
  LLM_DEBUG_STORAGE_KEY,
  loadStoredLLMConfig,
  saveStoredLLMConfig,
  validateLLMConfig,
} from './byokConfig';

describe('byokConfig', () => {
  afterEach(() => {
    localStorage.removeItem(LLM_CONFIG_STORAGE_KEY);
    localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
    localStorage.removeItem(LLM_DEBUG_STORAGE_KEY);
  });

  it('migrates the legacy api-key-only storage shape into a full provider config', () => {
    localStorage.setItem(LEGACY_API_KEY_STORAGE_KEY, 'legacy-key');

    const config = loadStoredLLMConfig();

    expect(config?.apiKey).toBe('legacy-key');
    expect(config?.providerId).toBe('deepseek');
    expect(config?.baseUrl).toBe('https://api.deepseek.com');
    expect(config?.model).toBe('deepseek-v4-flash');
  });

  it('saves provider, baseUrl, model, key, and debug mode together', () => {
    const saved = saveStoredLLMConfig({
      providerId: 'openai',
      baseUrl: 'https://api.openai.com/v1/',
      model: 'gpt-4o-mini',
      apiKey: 'openai-key',
      timeout: 20000,
      thinkingEnabled: false,
      debugMode: 'verbose',
    });

    const loaded = loadStoredLLMConfig();

    expect(saved.baseUrl).toBe('https://api.openai.com/v1');
    expect(loaded).toMatchObject({
      providerId: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      apiKey: 'openai-key',
      debugMode: 'verbose',
    });
    expect(localStorage.getItem(LLM_DEBUG_STORAGE_KEY)).toBe('verbose');
  });

  it('rejects configs without an explicit endpoint/key/model binding', () => {
    const invalid = validateLLMConfig({
      providerId: 'custom',
      baseUrl: '',
      model: '',
      apiKey: '',
      timeout: 20000,
      thinkingEnabled: false,
      debugMode: 'off',
    });

    expect(invalid.valid).toBe(false);
  });
});
