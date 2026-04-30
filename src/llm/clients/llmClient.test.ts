import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLLMClient } from './llmClient';
import type { LLMConfig } from './byokConfig';

const config: LLMConfig = {
  providerId: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: 'test-key',
  timeout: 20000,
  thinkingEnabled: false,
  debugMode: 'off',
};

describe('llmClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends browser requests to the configured baseUrl, not a hardcoded proxy', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 'cmpl_test',
        choices: [{ message: { role: 'assistant', content: '{}' }, finish_reason: 'stop' }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createLLMClient(config);
    await client.chat({
      model: config.model,
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    );
  });
});
