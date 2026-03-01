# AI Mentor Module — Architecture & Setup Guide

> **Nexora LMS** — Module Extraction + AI Mentor for Gat Andres Bonifacio High School
> SDG 4 – Quality Education | NestJS + PostgreSQL + Ollama (Local LLM)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Why Ollama (Local LLM)](#why-ollama-local-llm)
3. [Module Structure](#module-structure)
4. [Setup Instructions](#setup-instructions)
5. [API Endpoints](#api-endpoints)
6. [Request-Response Lifecycle](#request-response-lifecycle)
7. [Database Schema](#database-schema)
8. [Code Walkthrough](#code-walkthrough)
9. [Evolving from Rule-Based to AI](#evolving-from-rule-based-to-ai)
10. [Phase 2: AI Mentor Chat (Future)](#phase-2-ai-mentor-chat-future)
11. [Swapping LLM Providers](#swapping-llm-providers)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐     ┌────────────────────┐
│    Users     │────▶│  LMS Core     │────▶│  File Upload     │────▶│   AI Mentor        │
│  (JWT Auth)  │     │  (Classes,    │     │  (PDF Upload,    │     │  (Module Extract,  │
│              │     │   Lessons)    │     │   Storage)       │     │   Chat, Logging)   │
└──────────────┘     └───────────────┘     └──────────────────┘     └────────┬───────────┘
                                                                             │
                                                     ┌──────────────────────┼──────────────────────┐
                                                     │                      │                      │
                                              ┌──────▼──────┐      ┌───────▼───────┐     ┌────────▼────────┐
                                              │   Ollama    │      │  Rule-Based   │     │   DB Logging    │
                                              │  (Local LLM)│      │  Fallback     │     │  (ai_logs +     │
                                              │  llama3.2:3b│      │  Extractor    │     │   extractions)  │
                                              └─────────────┘      └───────────────┘     └─────────────────┘
```

**Data flow for Module Extraction:**
1. Teacher uploads PDF → `POST /api/files/upload` (existing endpoint)
2. Teacher triggers extraction → `POST /api/ai/extract-module` with `{ fileId }`
3. Service reads PDF from disk → `pdf-parse` extracts raw text
4. Raw text sent to Ollama (or rule-based fallback) → structured JSON
5. Result stored in `extracted_modules` table
6. Teacher reviews structured content on frontend
7. Teacher confirms → `POST /api/ai/extractions/:id/apply`
8. System creates real `lessons` + `lesson_content_blocks` rows

---

## Why Ollama (Local LLM)

| Factor | Cloud API (Gemini/OpenAI) | Local Ollama | Decision |
|--------|--------------------------|--------------|----------|
| **Cost** | Per-token pricing; scales with students | $0 per request forever | ✅ Ollama |
| **Rate limits** | 15 RPM free (Gemini), paid for more | Unlimited (hardware-bound) | ✅ Ollama |
| **Privacy** | Student data leaves campus | All data stays on-premise | ✅ Ollama |
| **Internet dependency** | Requires stable internet | Works 100% offline | ✅ Ollama |
| **Quality** | GPT-4o/Gemini superior for complex tasks | Llama 3.2 3B is "good enough" for extraction | Acceptable |
| **Hardware** | None required | 4GB RAM minimum, 8GB recommended | Acceptable |
| **Setup** | API key only | Install Ollama + pull model | Slightly more work |

**Verdict:** For a public high school deployment where many students will be using the system simultaneously, a local model eliminates all cost/rate-limit concerns. The `llama3.2:3b` model runs on modest hardware (even a school laptop with 8GB RAM) and is sufficient for structured text extraction.

### Upgrading the model later

Change one environment variable — no code changes:
```env
OLLAMA_MODEL=mistral:7b        # Better quality, needs 8GB+ RAM
OLLAMA_MODEL=llama3.1:8b       # Best open-source quality, needs 12GB+ RAM
OLLAMA_MODEL=phi3:mini         # Microsoft's small model, 4GB RAM
```

---

## Module Structure

```
backend/src/modules/ai-mentor/
├── ai-mentor.module.ts          # NestJS module definition
├── ai-mentor.controller.ts      # HTTP endpoints (routes)
├── ai-mentor.service.ts         # Business logic orchestrator
├── ollama.service.ts            # Isolated Ollama HTTP client
├── rule-based-extractor.ts      # Deterministic fallback parser
└── DTO/
    ├── chat.dto.ts              # { message: string }
    └── extract-module.dto.ts    # { fileId: string (UUID) }

backend/src/drizzle/schema/
    └── ai-mentor.schema.ts      # Database tables + relations

backend/src/config/
    └── ollama.config.ts         # OLLAMA_BASE_URL, OLLAMA_MODEL env config

backend/drizzle/
    └── 0032_add_ai_mentor_module.sql  # Migration SQL
```

---

## Setup Instructions

### 1. Install Ollama

**Windows:**
```
Download from https://ollama.com/download/windows
Run the installer
```

**Mac/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull a model

```bash
ollama pull llama3.2:3b
# ~2GB download, runs on 4GB+ RAM
```

### 3. Verify Ollama is running

```bash
curl http://localhost:11434/api/tags
# Should return JSON with available models
```

### 4. Environment variables

Add to your `.env` file (or set in terminal):
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT_MS=120000
```

All three have sensible defaults — you can skip this step for local development.

### 5. Run the database migration

```bash
# Option A: Direct SQL
psql -U postgres -d capstone -f drizzle/0032_add_ai_mentor_module.sql

# Option B: Via the run-migrations script (if it supports custom files)
node run-migrations.js
```

### 6. Start the backend

```bash
npm run start:dev
```

### 7. Verify the echo endpoint

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "hi"}'

# Expected:
# { "success": true, "message": "AI response", "data": { "reply": "hello" } }
```

### 8. Check Ollama health

```bash
curl http://localhost:3000/api/ai/health

# Expected (Ollama running):
# { "success": true, "data": { "ollamaAvailable": true, "configuredModel": "llama3.2:3b", "availableModels": ["llama3.2:3b"] } }

# Expected (Ollama not running):
# { "success": true, "data": { "ollamaAvailable": false, "configuredModel": "llama3.2:3b", "availableModels": [] } }
```

---

## API Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/api/ai/chat` | JWT | Any | Echo/debug endpoint (`{ message }` → `{ reply }`) |
| `GET` | `/api/ai/health` | Public | Any | Ollama availability check |
| `POST` | `/api/ai/extract-module` | JWT | Teacher, Admin | Extract lessons from uploaded PDF |
| `GET` | `/api/ai/extractions?classId=` | JWT | Teacher, Admin | List past extractions for a class |
| `GET` | `/api/ai/extractions/:id` | JWT | Teacher, Admin | Get single extraction details |
| `POST` | `/api/ai/extractions/:id/apply` | JWT | Teacher, Admin | Create lessons from extraction |
| `GET` | `/api/ai/history` | JWT | Any | User's AI interaction history |

---

## Request-Response Lifecycle

### Example: `POST /api/ai/extract-module`

```
Client (Browser/Mobile)
  │
  │  POST /api/ai/extract-module
  │  Headers: { Authorization: "Bearer <jwt>" }
  │  Body:    { "fileId": "abc-123-..." }
  │
  ▼
┌─────────────────────────────────────────┐
│  NestJS HTTP Pipeline                   │
│                                         │
│  1. Global JwtAuthGuard                 │
│     → Validates JWT token               │
│     → Attaches user to request          │
│     → Rejects 401 if invalid            │
│                                         │
│  2. RolesGuard                          │
│     → Checks @Roles(Teacher, Admin)     │
│     → Rejects 403 if student            │
│                                         │
│  3. ValidationPipe                      │
│     → Validates ExtractModuleDto        │
│     → Ensures fileId is valid UUID      │
│     → Rejects 400 if invalid            │
│                                         │
│  4. AiMentorController.extractModule()  │
│     → Receives validated DTO + user     │
│     → Calls AiMentorService             │
│                                         │
│  5. AiMentorService.extractModule()     │
│     → Looks up file in DB               │
│     → Checks ownership                  │
│     → Reads PDF from disk               │
│     → Extracts text via pdf-parse       │
│     → Creates extraction record         │
│     → Calls OllamaService.generate()    │
│       OR falls back to rule-based       │
│     → Updates extraction record         │
│     → Logs to ai_interaction_logs       │
│     → Returns structured result         │
│                                         │
│  6. Controller wraps in envelope        │
│     → { success, message, data }        │
└─────────────────────────────────────────┘
  │
  ▼
Client receives:
{
  "success": true,
  "message": "Module extracted successfully (llama3.2:3b)",
  "data": {
    "extractionId": "...",
    "modelUsed": "llama3.2:3b",
    "responseTimeMs": 8500,
    "structured": {
      "title": "Module 1: Introduction to Fractions",
      "description": "...",
      "lessons": [
        {
          "title": "Lesson 1: What are Fractions?",
          "blocks": [
            { "type": "text", "order": 0, "content": { "text": "..." } },
            { "type": "question", "order": 1, "content": { "text": "..." } }
          ]
        }
      ]
    }
  }
}
```

---

## Database Schema

### `ai_interaction_logs`

Every AI request/response is logged here for auditing and analytics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | Who made the request |
| `session_type` | ENUM | `module_extraction`, `mentor_chat`, `mistake_explanation` |
| `input_text` | TEXT | The prompt/input sent to AI (truncated for storage) |
| `output_text` | TEXT | The AI response (truncated) |
| `model_used` | TEXT | e.g., `llama3.2:3b` or `rule-based` |
| `context_metadata` | JSON | Flexible context (fileId, classId, etc.) |
| `response_time_ms` | INT | Round-trip time in milliseconds |
| `created_at` | TIMESTAMP | When the interaction occurred |

### `extracted_modules`

Stores PDF → structured lesson extraction results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `file_id` | UUID (FK → uploaded_files) | Source PDF |
| `class_id` | UUID (FK → classes) | Target class |
| `teacher_id` | UUID (FK → users) | Who triggered extraction |
| `raw_text` | TEXT | Full text extracted from PDF |
| `structured_content` | JSON | AI-generated lesson structure |
| `extraction_status` | ENUM | `pending` → `processing` → `completed`/`failed` |
| `error_message` | TEXT | Error details if failed |
| `model_used` | TEXT | Which model/method was used |
| `created_at` | TIMESTAMP | When extraction started |
| `updated_at` | TIMESTAMP | When extraction completed |

---

## Code Walkthrough

### OllamaService — The LLM Client

```typescript
// ollama.service.ts — Key method explained

async generate(prompt: string, system?: string): Promise<string> {
  // AbortController provides timeout support via AbortSignal
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), this.timeoutMs);

  // POST to Ollama's generate endpoint
  // stream: false means we get the full response in one JSON payload
  // temperature: 0.3 keeps output deterministic (important for JSON extraction)
  const res = await fetch(`${this.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: this.model,
      prompt,           // The user/instruction prompt
      system,           // Optional system prompt (sets AI personality)
      stream: false,
      options: { temperature: 0.3, num_predict: 4096 },
    }),
    signal: controller.signal,
  });

  const body = await res.json();
  return body.response;  // The generated text
}
```

### Rule-Based Extractor — The Fallback

When Ollama is offline, the rule-based extractor uses regex patterns to split PDF text into lesson blocks:

1. **Heading detection** — Matches patterns like `Lesson 1:`, `Chapter 3 —`, `I. Objectives`
2. **Question detection** — Lines matching `1. What is...?` or `A) option text`
3. **Paragraph grouping** — Consecutive text lines become `text` blocks

This ensures the system **never fully breaks** — teachers can always extract modules, even without AI.

### AiMentorService — The Orchestrator

The service ties everything together in `extractModule()`:

1. **Verify file** — Lookup in `uploaded_files`, check ownership
2. **Read PDF** — `fs.readFileSync()` → buffer → `PDFParse.getText()` → raw text
3. **Create record** — Insert `extracted_modules` row with status `processing`
4. **Try Ollama** — Check `isAvailable()`, if yes → build prompt → `generate()` → parse JSON
5. **Fallback** — If Ollama fails/unavailable → `extractWithRules(rawText)`
6. **Persist** — Update extraction record with result + status
7. **Log** — Insert `ai_interaction_logs` row for auditing

---

## Evolving from Rule-Based to AI

The system is designed with a clean progression path:

### Stage 1: Echo (Current — Structural Validation)
```
POST /api/ai/chat { "message": "hi" } → { "reply": "hello" }
```
Purpose: Verify the module wiring, JWT auth, role guards, and response envelope work correctly.

### Stage 2: Rule-Based Extraction (Current)
- Works immediately, no Ollama required
- Pattern-matching splits PDFs into sections/questions
- Lower quality but 100% reliable

### Stage 3: Ollama Extraction (Current — Requires Ollama Install)
- Higher quality structured output
- LLM understands context, proper section boundaries
- Automatic fallback to Stage 2 if Ollama is down

### Stage 4: AI Mentor Chat (Future — See Phase 2)
- Students ask questions about lessons they got wrong
- AI explains mistakes, gives hints, recommends remediation
- Uses assessment responses + lesson content as context

### Stage 5: Intelligent Intervention (Future)
- AI proactively identifies learning gaps from gradebook data
- Automatically recommends remedial paths
- Triggers LXP access for students below threshold

---

## Phase 2: AI Mentor Chat (Future)

The concept paper describes an "AI NPC Mentor" that:
- Explains mistakes on assessments
- Provides step-by-step hints
- Recommends remedial activities
- Logs all feedback for teacher review

### Planned Implementation

**New DTO:**
```typescript
export class MentorChatDto {
  @IsUUID()
  assessmentAttemptId: string;  // Which attempt to discuss

  @IsUUID()
  questionId: string;           // Which question to explain

  @IsString()
  message: string;              // Student's question
}
```

**New endpoint:** `POST /api/ai/mentor-chat`
- Only accessible by students with LXP access (below 60% threshold)
- Retrieves the question, correct answer, student's wrong answer
- Builds a context-rich prompt for Ollama
- Returns explanation + hints (not the answer directly)

**Context prompt template:**
```
You are a helpful tutor for a Grade {X} {subject} class.
The student answered this question incorrectly:

Question: {question_text}
Student's answer: {student_answer}
Correct answer: {correct_answer}

The student is now asking: {student_message}

RULES:
- Do NOT give the answer directly
- Provide hints that guide the student to the correct answer
- Reference the lesson material when possible
- Be encouraging and supportive
- Keep explanations appropriate for Grade {X} level
```

### How to add it:

1. Create `DTO/mentor-chat.dto.ts` with the DTO above
2. Add a `mentorChat()` method to `AiMentorService` that:
   - Loads the assessment attempt, question, responses
   - Checks the student is eligible for LXP (score < 60%)
   - Builds the context prompt
   - Calls `OllamaService.generate()`
   - Logs the interaction
3. Add a `POST /api/ai/mentor-chat` route in the controller
4. Restrict with `@Roles(RoleName.Student)` + custom LXP eligibility guard

---

## Swapping LLM Providers

The `OllamaService` is designed as a **drop-in replaceable** LLM client.

### To switch to Google Gemini:

1. Install: `npm install @google/generative-ai`
2. Create `gemini.service.ts`:
```typescript
@Injectable()
export class GeminiService {
  private model: GenerativeModel;

  constructor(private config: ConfigService) {
    const genAI = new GoogleGenerativeAI(config.get('GEMINI_API_KEY'));
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  getModelName(): string { return 'gemini-1.5-flash'; }

  async isAvailable(): Promise<{ available: boolean; models: string[] }> {
    try { /* ping API */ return { available: true, models: ['gemini-1.5-flash'] }; }
    catch { return { available: false, models: [] }; }
  }

  async generate(prompt: string, system?: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
```
3. In `ai-mentor.module.ts`, swap the provider:
```typescript
providers: [AiMentorService, GeminiService],  // instead of OllamaService
```
4. In `ai-mentor.service.ts`, change the constructor injection type.

**Zero changes to the extraction logic, controller, or DTOs.**

### To switch to OpenAI:

Same pattern — create `openai.service.ts` with the same `generate()` / `isAvailable()` / `getModelName()` interface.

### Hybrid approach (recommended for production):

Use Ollama for high-volume tasks (module extraction, student chat) and a cloud API for rare, complex tasks (generating assessment explanations):

```typescript
// In AiMentorService:
constructor(
  private readonly ollama: OllamaService,
  private readonly gemini: GeminiService,  // Optional cloud fallback
) {}

// Use ollama for extraction (high volume, cost-sensitive)
// Use gemini for detailed explanations (low volume, quality-critical)
```

---

## Troubleshooting

### Ollama not available

```
GET /api/ai/health returns { ollamaAvailable: false }
```

**Solutions:**
1. Install Ollama: https://ollama.com/download
2. Start Ollama: `ollama serve` (or restart the Ollama app)
3. Pull the model: `ollama pull llama3.2:3b`
4. Check the URL: `OLLAMA_BASE_URL` env var (default: `http://localhost:11434`)

The system will automatically use the rule-based fallback — no extraction requests will fail.

### PDF extraction returns minimal text

The PDF might be image-based (scanned). `pdf-parse` can only extract embedded text, not OCR.

**Solutions:**
1. Use digitally-created PDFs (from Word, Google Docs)
2. For scanned PDFs, add OCR preprocessing (future feature — use `tesseract.js`)
3. The service will throw a descriptive error: "PDF contains too little extractable text"

### Ollama is slow

The `llama3.2:3b` model on CPU can take 30-120 seconds for extraction prompts.

**Solutions:**
1. Increase timeout: `OLLAMA_TIMEOUT_MS=180000` (3 minutes)
2. Upgrade model hardware (GPU dramatically speeds up inference)
3. Use a smaller model: `ollama pull phi3:mini` (2GB, faster)
4. The rule-based fallback responds in <100ms as a safety net

### Migration fails

```bash
# Run the migration manually:
psql -U postgres -d capstone -f drizzle/0032_add_ai_mentor_module.sql

# Or if using the seed script connection:
# DATABASE_URL=postgresql://postgres:200411@localhost:5432/capstone
```

---

## Summary

| What was built | Status |
|----------------|--------|
| Echo endpoint (`POST /api/ai/chat`) | ✅ Working |
| Ollama health check (`GET /api/ai/health`) | ✅ Working |
| Module extraction (`POST /api/ai/extract-module`) | ✅ Working |
| Rule-based fallback (no Ollama needed) | ✅ Working |
| Apply extraction → create lessons | ✅ Working |
| List/get extractions | ✅ Working |
| AI interaction history logging | ✅ Working |
| Database schema + migration | ✅ Ready |
| AI Mentor Chat (student Q&A) | 📋 Planned (Phase 2) |
| LXP eligibility check | 📋 Planned (Phase 2) |
| Intelligent intervention triggers | 📋 Planned (Phase 3) |
