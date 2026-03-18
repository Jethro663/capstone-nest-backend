import { registerAs } from '@nestjs/config';

export default registerAs('ollama', () => ({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  textModel:
    process.env.OLLAMA_TEXT_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  visionModel: process.env.OLLAMA_VISION_MODEL || 'gemma3:4b',
  timeoutChatMs: parseInt(process.env.AI_SERVICE_TIMEOUT_CHAT_MS ?? '70000', 10),
  timeoutExtractionMs: parseInt(
    process.env.AI_SERVICE_TIMEOUT_EXTRACTION_MS ?? '300000',
    10,
  ),
}));
