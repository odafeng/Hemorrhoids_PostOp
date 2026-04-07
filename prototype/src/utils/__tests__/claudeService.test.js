import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock errorLogger
vi.mock('../errorLogger', () => ({
  logError: vi.fn(),
}));

// Mock mockAI
vi.mock('../mockAI', () => ({
  getAIResponse: vi.fn().mockReturnValue('mock AI response text'),
}));

// Mock supabaseClient
vi.mock('../supabaseClient', () => ({
  default: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

describe('claudeService', () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getClaudeResponse — demo / no URL', () => {
    it('returns mock response in demo mode', async () => {
      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test question', { isDemo: true });
      expect(result.source).toBe('mock');
      expect(result.text).toBeTruthy();
    });

    it('returns mock response when no SUPABASE_URL configured', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', '');
      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test question');
      expect(result.source).toBe('mock');
      vi.unstubAllEnvs();
    });
  });

  describe('getClaudeResponse — API mode', () => {
    // To test API mode we need VITE_SUPABASE_URL set
    // We'll test the error/timeout paths since they're reachable

    it('returns error response on non-ok HTTP status', async () => {
      vi.resetModules();
      // Mock import.meta.env
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal Server Error' }),
        headers: new Headers(),
      });

      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test');
      expect(result.source).toBe('error');
      expect(result.text).toContain('AI 衛教暫時不可用');

      vi.unstubAllEnvs();
    });

    it('returns timeout error on AbortError', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test');
      expect(result.source).toBe('error');
      expect(result.text).toContain('逾時');
      errorSpy.mockRestore();

      vi.unstubAllEnvs();
    });

    it('returns network error on fetch failure', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test');
      expect(result.source).toBe('error');
      expect(result.text).toContain('AI 衛教暫時不可用');
      errorSpy.mockRestore();

      vi.unstubAllEnvs();
    });

    it('parses non-streaming JSON response', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ response: 'AI answer here' }),
      });

      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test');
      expect(result.source).toBe('claude');
      expect(result.text).toBe('AI answer here');

      vi.unstubAllEnvs();
    });

    it('handles SSE streaming response', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const encoder = new TextEncoder();
      const chunks = [
        'data: {"type":"delta","text":"Hello"}\n\n',
        'data: {"type":"delta","text":" World"}\n\n',
      ];
      let readIndex = 0;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              if (readIndex < chunks.length) {
                const chunk = encoder.encode(chunks[readIndex]);
                readIndex++;
                return Promise.resolve({ done: false, value: chunk });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const onChunk = vi.fn();
      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test', {}, onChunk);
      expect(result.source).toBe('claude');
      expect(result.text).toBe('Hello World');
      expect(onChunk).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });

    it('includes conversation history and recentSymptoms in request', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ response: 'ok' }),
      });

      const { getClaudeResponse } = await import('../claudeService');
      await getClaudeResponse('test', {
        recentSymptoms: { pain: 5 },
        conversationHistory: [{ role: 'user', text: 'hi' }],
      });

      const fetchCall = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.recentSymptoms).toEqual({ pain: 5 });
      expect(body.history).toEqual([{ role: 'user', text: 'hi' }]);

      vi.unstubAllEnvs();
    });

    it('returns fallback text when SSE stream is empty', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test', {}, vi.fn());
      expect(result.text).toContain('抱歉');

      vi.unstubAllEnvs();
    });

    it('handles res.json() failure gracefully on non-ok response', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: vi.fn().mockRejectedValue(new Error('not json')),
        headers: new Headers(),
      });

      const { getClaudeResponse } = await import('../claudeService');
      const result = await getClaudeResponse('test');
      expect(result.source).toBe('error');

      vi.unstubAllEnvs();
    });
  });
});
