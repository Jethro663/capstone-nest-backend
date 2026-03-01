import { registerAs } from '@nestjs/config';

export default registerAs('ollama', () => ({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  // Maximum time (ms) to wait for a single Ollama generation call.
  // Module-extraction prompts can be lengthy — 120 s is a safe ceiling for 3B models on CPU.
  timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '120000', 10),
}));
