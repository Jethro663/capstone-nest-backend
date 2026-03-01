import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Isolated HTTP client for the local Ollama LLM server.
 *
 * Design note — this service owns *all* Ollama communication.
 * If you later switch to Gemini / OpenAI, create an alternative service
 * implementing the same `generate()` signature and swap the provider
 * in `AiMentorModule`.  Zero changes to the extraction/chat logic.
 */
@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('ollama.baseUrl')!;
    this.model = this.config.get<string>('ollama.model')!;
    this.timeoutMs = this.config.get<number>('ollama.timeoutMs')!;
    this.logger.log(
      `Ollama configured → ${this.baseUrl}  model=${this.model}  timeout=${this.timeoutMs}ms`,
    );
  }

  /** The model name currently configured (stored in logs / extraction records). */
  getModelName(): string {
    return this.model;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Health check
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Pings `GET /api/tags` to verify Ollama is reachable and the configured
   * model is available.
   */
  async isAvailable(): Promise<{ available: boolean; models: string[] }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) return { available: false, models: [] };

      const body = (await res.json()) as {
        models?: { name: string }[];
      };
      const models = (body.models ?? []).map((m) => m.name);
      return { available: true, models };
    } catch {
      return { available: false, models: [] };
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Text generation
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Sends a prompt to Ollama and returns the generated text.
   *
   * @param prompt   - The user/instruction prompt.
   * @param system   - Optional system prompt to set context/personality.
   * @returns        - The raw text response from the model.
   * @throws         - Re-throws on network/timeout errors so callers can
   *                   fall back to the rule-based extractor.
   */
  async generate(prompt: string, system?: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          ...(system ? { system } : {}),
          stream: false, // we want the full response in one shot
          options: {
            // Keep output deterministic for structured extraction tasks
            temperature: 0.3,
            num_predict: 4096,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          `Ollama responded with HTTP ${res.status}: ${errBody}`,
        );
      }

      const body = (await res.json()) as { response: string };
      return body.response;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          `Ollama request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw err;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Multi-turn chat (uses /api/chat with message history)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Sends a multi-turn conversation to Ollama's `/api/chat` endpoint.
   *
   * Unlike `generate()`, this endpoint natively supports a message array
   * with `system`, `user`, and `assistant` roles — perfect for multi-turn
   * chat with history.
   *
   * @param messages  - Array of { role: 'system'|'user'|'assistant', content: string }
   * @returns         - The assistant's reply text.
   */
  async chat(
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: 0.7, // more creative for conversation
            num_predict: 1024,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          `Ollama /api/chat responded with HTTP ${res.status}: ${errBody}`,
        );
      }

      const body = (await res.json()) as {
        message?: { role: string; content: string };
      };
      return body.message?.content ?? '';
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          `Ollama chat request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw err;
    }
  }
}
