import { afterEach, describe, expect, it, vi } from 'vitest';
import { logLLMRequest } from './llmDebugLogger';

describe('llmDebugLogger', () => {
  afterEach(() => {
    localStorage.removeItem('zog_llm_debug');
    vi.restoreAllMocks();
  });

  it('prints full message content in verbose mode', () => {
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
    const longPrompt = 'x'.repeat(700);

    localStorage.setItem('zog_llm_debug', 'verbose');
    logLLMRequest({
      traceId: 'trace_test',
      kind: 'ActorBrain',
      provider: 'test-provider',
      model: 'test-model',
      messages: [{ role: 'user', content: longPrompt }],
    });

    const loggedMessages = logSpy.mock.calls[1][1] as Array<{ content: string }>;
    expect(loggedMessages[0].content).toBe(longPrompt);
  });
});
