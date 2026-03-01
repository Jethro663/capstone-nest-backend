import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OllamaService } from './ollama.service';

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;

beforeAll(() => {
  // Will be overridden in each test
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('OllamaService', () => {
  let service: OllamaService;
  let mockFetch: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'ollama.baseUrl': 'http://localhost:11434',
        'ollama.model': 'llama3.2:3b',
        'ollama.timeoutMs': 5000,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
  });

  // =========================================================================
  // getModelName()
  // =========================================================================

  describe('getModelName()', () => {
    it('should return the configured model name', () => {
      expect(service.getModelName()).toBe('llama3.2:3b');
    });
  });

  // =========================================================================
  // isAvailable()
  // =========================================================================

  describe('isAvailable()', () => {
    it('should return available:true and model list when Ollama responds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: 'llama3.2:3b' }, { name: 'mistral:7b' }],
          }),
      });

      const result = await service.isAvailable();

      expect(result).toEqual({
        available: true,
        models: ['llama3.2:3b', 'mistral:7b'],
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('should return available:false when Ollama responds with non-ok status', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await service.isAvailable();

      expect(result).toEqual({ available: false, models: [] });
    });

    it('should return available:false when fetch throws (network error)', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.isAvailable();

      expect(result).toEqual({ available: false, models: [] });
    });

    it('should handle missing models array in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await service.isAvailable();

      expect(result).toEqual({ available: true, models: [] });
    });
  });

  // =========================================================================
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('should return generated text on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'Generated content here' }),
      });

      const result = await service.generate('Extract lessons', 'System prompt');

      expect(result).toBe('Generated content here');
    });

    it('should send correct request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'OK' }),
      });

      await service.generate('My prompt', 'My system');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual(
        expect.objectContaining({
          model: 'llama3.2:3b',
          prompt: 'My prompt',
          system: 'My system',
          stream: false,
          options: expect.objectContaining({
            temperature: 0.3,
          }),
        }),
      );
    });

    it('should not include system field when system param is not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'OK' }),
      });

      await service.generate('My prompt');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).not.toHaveProperty('system');
    });

    it('should throw on non-ok HTTP response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(service.generate('prompt')).rejects.toThrow(
        'Ollama responded with HTTP 500',
      );
    });

    it('should throw with timeout message on AbortError', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      await expect(service.generate('prompt')).rejects.toThrow(
        'timed out after 5000ms',
      );
    });

    it('should re-throw non-abort errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      await expect(service.generate('prompt')).rejects.toThrow(
        'Network failure',
      );
    });
  });

  // =========================================================================
  // chat()
  // =========================================================================

  describe('chat()', () => {
    const messages = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
    ];

    it('should return assistant reply on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hi there!' },
          }),
      });

      const result = await service.chat(messages);

      expect(result).toBe('Hi there!');
    });

    it('should send correct request body with messages array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'OK' },
          }),
      });

      await service.chat(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual(
        expect.objectContaining({
          model: 'llama3.2:3b',
          messages,
          stream: false,
          options: expect.objectContaining({
            temperature: 0.7,
          }),
        }),
      );
    });

    it('should return empty string when message.content is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await service.chat(messages);

      expect(result).toBe('');
    });

    it('should throw on non-ok HTTP response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Model not found'),
      });

      await expect(service.chat(messages)).rejects.toThrow(
        'Ollama /api/chat responded with HTTP 404',
      );
    });

    it('should throw with timeout message on AbortError', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      await expect(service.chat(messages)).rejects.toThrow(
        'chat request timed out after 5000ms',
      );
    });

    it('should re-throw non-abort errors', async () => {
      mockFetch.mockRejectedValue(new Error('DNS failure'));

      await expect(service.chat(messages)).rejects.toThrow('DNS failure');
    });

    it('should use higher temperature (0.7) for chat vs generate (0.3)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'OK' },
          }),
      });

      await service.chat(messages);

      const chatBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(chatBody.options.temperature).toBe(0.7);
    });
  });
});
