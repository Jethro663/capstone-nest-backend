import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import * as fs from 'fs';

import { DatabaseService } from '../../database/database.service';
import {
  uploadedFiles,
  aiInteractionLogs,
  extractedModules,
  lessons,
  lessonContentBlocks,
  classes,
} from '../../drizzle/schema';
import { OllamaService } from './ollama.service';
import { type ExtractionResult } from './rule-based-extractor';
import { type ExtractionJobData } from './extraction.processor';
import { randomUUID } from 'crypto';

// ────────────────────────────────────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────────────────────────────────────

interface RequestUser {
  id: string;
  email: string;
  roles: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Prompts
// ────────────────────────────────────────────────────────────────────────────

const JAKIPIR_SYSTEM_PROMPT = `You are J.A.K.I.P.I.R — Just-in-time Adaptive Knowledge Instructor & Personalized Intelligence Resource. Your nickname is "Ja".

You are the AI Mentor of Nexora, a Learning Management System for Gat Andres Bonifacio High School (Grades 7–10, Philippines DepEd curriculum).

PERSONALITY:
- You have a perceptive, detective-like demeanor. You notice patterns, pick up on clues in what students say, and investigate their learning gaps like a case to be cracked.
- Use investigative language naturally: "I notice...", "That's an interesting clue...", "Let's piece this together...", "I've been observing your progress and...", "The evidence suggests..."
- You are a hype coach at heart — you genuinely celebrate student effort and achievements. You get excited about breakthroughs. But you maintain formality and professionalism.
- Be warm, supportive, and encouraging, but never condescending. Speak at a high school level.
- When a student is struggling, be empathetic and frame challenges as mysteries to solve together.

RULES:
1. ALWAYS end your response with a study tip or learning strategy under the heading "📌 Ja's Study Tip:". The tip should be practical and relevant to the conversation topic.
2. NEVER give direct answers to test or assessment questions. Instead, guide students with hints, analogies, and step-by-step reasoning.
3. When a student shares progress or success, celebrate it enthusiastically but professionally — like a detective who just cracked a big case.
4. Keep responses concise — aim for 2-4 paragraphs max, plus the study tip.
5. If the student greets you or asks who you are, introduce yourself briefly: "I'm Ja — your AI Mentor here at Nexora! Think of me as your personal learning detective. I'm here to help you crack the case on any topic you're studying."
6. If you don't know something or the question is outside academics, say so honestly and redirect to academic topics.
7. Use Filipino cultural context when appropriate (e.g., referencing DepEd subjects, local examples) but respond in English unless the student writes in Filipino.`;

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AiMentorService {
  private readonly logger = new Logger(AiMentorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ollama: OllamaService,
    @InjectQueue('module-extraction')
    private readonly extractionQueue: Queue<ExtractionJobData>,
  ) {}

  private get database() {
    return this.db.db;
  }

  // ─── JAKIPIR Chat ──────────────────────────────────────────────────────

  /**
   * Multi-turn AI Mentor chat powered by Ollama.
   *
   * - If `sessionId` is provided, loads prior messages from that session
   *   and sends the full history to Ollama for contextual replies.
   * - If omitted, starts a new session and returns its ID.
   * - Falls back to a graceful message when Ollama is unreachable.
   */
  async chat(
    message: string,
    user: RequestUser,
    sessionId?: string,
  ): Promise<{ reply: string; sessionId: string; modelUsed: string }> {
    // ── 1. Session management ────────────────────────────────────────────
    const chatSessionId = sessionId ?? randomUUID();

    // ── 2. Load conversation history (if continuing) ─────────────────────
    const ollamaMessages: { role: string; content: string }[] = [
      { role: 'system', content: JAKIPIR_SYSTEM_PROMPT },
    ];

    if (sessionId) {
      // Fetch only the last 20 exchanges (desc order), then reverse for chronological order
      const history = await this.database.query.aiInteractionLogs.findMany({
        where: and(
          eq(aiInteractionLogs.userId, user.id),
          eq(aiInteractionLogs.sessionId, sessionId),
          eq(aiInteractionLogs.sessionType, 'mentor_chat'),
        ),
        orderBy: [desc(aiInteractionLogs.createdAt)],
        limit: 20,
        columns: { inputText: true, outputText: true },
      });

      const recentHistory = history.reverse();
      for (const entry of recentHistory) {
        ollamaMessages.push({ role: 'user', content: entry.inputText });
        ollamaMessages.push({ role: 'assistant', content: entry.outputText });
      }
    }

    // Append the new user message
    ollamaMessages.push({ role: 'user', content: message });

    // ── 3. Call Ollama ───────────────────────────────────────────────────
    let reply: string;
    let modelUsed: string;
    let responseTimeMs: number;
    const startTime = Date.now();

    const { available } = await this.ollama.isAvailable();

    if (available) {
      try {
        reply = await this.ollama.chat(ollamaMessages);
        responseTimeMs = Date.now() - startTime;
        modelUsed = this.ollama.getModelName();
      } catch (err) {
        this.logger.warn(
          `Ollama chat failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        reply =
          "Hmm, it seems my investigation tools are temporarily offline — like a detective without a magnifying glass! 🔍 Please try again in a moment. In the meantime, review your notes — that's always a solid lead!\n\n📌 Ja's Study Tip: While waiting, try writing down one thing you learned today. It helps lock it into memory!";
        responseTimeMs = Date.now() - startTime;
        modelUsed = 'fallback (ollama-unavailable)';
      }
    } else {
      this.logger.log('Ollama unavailable for chat — returning fallback');
      reply =
        "I'm currently recharging my detective instincts — Ollama (my brain!) isn't running right now. Ask your teacher to start it up, and I'll be right back on the case! 🕵️\n\n📌 Ja's Study Tip: Use this downtime to quiz yourself on what you studied last. Self-testing is one of the most powerful study techniques!";
      responseTimeMs = Date.now() - startTime;
      modelUsed = 'fallback (ollama-offline)';
    }

    // ── 4. Log the interaction ────────────────────────────────────────────
    await this.database.insert(aiInteractionLogs).values({
      userId: user.id,
      sessionType: 'mentor_chat',
      inputText: message.substring(0, 2000),
      outputText: reply.substring(0, 5000),
      modelUsed,
      responseTimeMs,
      sessionId: chatSessionId,
      contextMetadata: { sessionId: chatSessionId },
    });

    return { reply, sessionId: chatSessionId, modelUsed };
  }

  // ─── Health ────────────────────────────────────────────────────────────

  async healthCheck() {
    const { available, models } = await this.ollama.isAvailable();
    return {
      ollamaAvailable: available,
      configuredModel: this.ollama.getModelName(),
      availableModels: models,
    };
  }

  // ─── Module Extraction ─────────────────────────────────────────────────

  /**
   * Queues a PDF extraction job via BullMQ.
   * Returns immediately with the extraction ID — the actual processing
   * happens in ExtractionProcessor (background job).
   *
   * Flow:
   *   1. Verify file ownership
   *   2. Verify file physically exists
   *   3. Create `extracted_modules` record (status: pending)
   *   4. Enqueue BullMQ job
   *   5. Return extraction ID for polling
   */
  async extractModule(fileId: string, user: RequestUser) {
    // ── 1. Look up file record ───────────────────────────────────────────
    const file = await this.database.query.uploadedFiles.findFirst({
      where: and(
        eq(uploadedFiles.id, fileId),
        isNull(uploadedFiles.deletedAt),
      ),
    });

    if (!file) {
      throw new NotFoundException(`File "${fileId}" not found or deleted`);
    }

    // Ownership: teacher must own the file, admins can extract any file
    const isAdmin = user.roles.includes('admin');
    if (!isAdmin && file.teacherId !== user.id) {
      throw new ForbiddenException('You can only extract your own files');
    }

    // Verify file physically exists on disk
    if (!fs.existsSync(file.filePath)) {
      throw new NotFoundException(
        'Physical file not found on server — it may have been moved or deleted',
      );
    }

    // ── 2. Create extraction record (status: pending) ────────────────────
    const [extraction] = await this.database
      .insert(extractedModules)
      .values({
        fileId: file.id,
        classId: file.classId,
        teacherId: user.id,
        rawText: '', // Will be filled by the processor
        extractionStatus: 'pending',
        progressPercent: 0,
      })
      .returning();

    // ── 3. Enqueue BullMQ job ────────────────────────────────────────────
    const jobData: ExtractionJobData = {
      extractionId: extraction.id,
      fileId: file.id,
      userId: user.id,
    };

    await this.extractionQueue.add('extract', jobData, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(
      `[extraction] Queued job for file "${file.originalName}" → extraction ${extraction.id}`,
    );

    return {
      extractionId: extraction.id,
      status: 'pending',
      message: 'Extraction queued — poll GET /ai/extractions/:id/status for progress',
    };
  }

  // ─── Extraction Status (poll endpoint) ─────────────────────────────────

  async getExtractionStatus(extractionId: string, user: RequestUser) {
    const extraction = await this.database.query.extractedModules.findFirst({
      where: eq(extractedModules.id, extractionId),
      columns: {
        id: true,
        extractionStatus: true,
        progressPercent: true,
        totalChunks: true,
        processedChunks: true,
        errorMessage: true,
        modelUsed: true,
        isApplied: true,
        updatedAt: true,
        teacherId: true,
      },
    });

    if (!extraction) {
      throw new NotFoundException(`Extraction "${extractionId}" not found`);
    }

    const isAdmin = user.roles.includes('admin');
    if (!isAdmin && extraction.teacherId !== user.id) {
      throw new ForbiddenException('You can only view your own extractions');
    }

    return {
      id: extraction.id,
      status: extraction.extractionStatus,
      progressPercent: extraction.progressPercent,
      totalChunks: extraction.totalChunks,
      processedChunks: extraction.processedChunks,
      errorMessage: extraction.errorMessage,
      modelUsed: extraction.modelUsed,
      isApplied: extraction.isApplied,
      updatedAt: extraction.updatedAt,
    };
  }

  // ─── List past extractions ─────────────────────────────────────────────

  async listExtractions(classId: string, user: RequestUser) {
    const isAdmin = user.roles.includes('admin');

    const conditions = isAdmin
      ? eq(extractedModules.classId, classId)
      : and(
          eq(extractedModules.classId, classId),
          eq(extractedModules.teacherId, user.id),
        );

    return this.database.query.extractedModules.findMany({
      where: conditions,
      orderBy: [desc(extractedModules.createdAt)],
      columns: {
        id: true,
        classId: true,
        teacherId: true,
        extractionStatus: true,
        progressPercent: true,
        totalChunks: true,
        processedChunks: true,
        errorMessage: true,
        modelUsed: true,
        isApplied: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        file: {
          columns: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
      },
    });
  }

  // ─── Get single extraction ─────────────────────────────────────────────

  async getExtraction(extractionId: string, user: RequestUser) {
    const extraction = await this.database.query.extractedModules.findFirst({
      where: eq(extractedModules.id, extractionId),
      with: {
        file: {
          columns: { id: true, originalName: true },
        },
      },
    });

    if (!extraction) {
      throw new NotFoundException(`Extraction "${extractionId}" not found`);
    }

    const isAdmin = user.roles.includes('admin');
    if (!isAdmin && extraction.teacherId !== user.id) {
      throw new ForbiddenException('You can only view your own extractions');
    }

    return extraction;
  }

  // ─── Update extraction (edit structured content before applying) ───────

  /**
   * Allows the teacher to edit the structured content of a completed
   * extraction before applying it as lessons.
   */
  async updateExtraction(
    extractionId: string,
    structuredContent: ExtractionResult,
    user: RequestUser,
  ) {
    const extraction = await this.getExtraction(extractionId, user);

    if (extraction.extractionStatus !== 'completed') {
      throw new BadRequestException(
        `Extraction is "${extraction.extractionStatus}" — only completed extractions can be edited`,
      );
    }

    if (extraction.isApplied) {
      throw new BadRequestException(
        'This extraction has already been applied and cannot be edited',
      );
    }

    // Validate the incoming structured content
    if (!structuredContent?.lessons || !Array.isArray(structuredContent.lessons)) {
      throw new BadRequestException('Invalid structured content: "lessons" array is required');
    }

    await this.database
      .update(extractedModules)
      .set({
        structuredContent: structuredContent,
        updatedAt: new Date(),
      })
      .where(eq(extractedModules.id, extractionId));

    return this.getExtraction(extractionId, user);
  }

  // ─── Apply extraction → create real lessons ────────────────────────────

  /**
   * Takes a completed extraction and creates actual `lessons` +
   * `lesson_content_blocks` rows from its structured content.
   *
   * Supports selective application:
   * - If `lessonIndices` is provided, only those lessons are created
   * - If omitted, all lessons are applied
   *
   * All created lessons are `isDraft: true` — teacher publishes manually.
   * Each lesson records `sourceExtractionId` for traceability.
   */
  async applyExtraction(
    extractionId: string,
    user: RequestUser,
    lessonIndices?: number[],
  ) {
    const extraction = await this.getExtraction(extractionId, user);

    if (extraction.extractionStatus !== 'completed') {
      throw new BadRequestException(
        `Extraction is "${extraction.extractionStatus}" — only completed extractions can be applied`,
      );
    }

    // Prevent duplicate application
    if (extraction.isApplied) {
      throw new BadRequestException(
        'This extraction has already been applied',
      );
    }

    const content: ExtractionResult =
      extraction.structuredContent as unknown as ExtractionResult;

    if (!content?.lessons?.length) {
      throw new BadRequestException('No lessons found in extraction result');
    }

    // Determine which lessons to apply
    let lessonsToApply: Array<{ lesson: ExtractionResult['lessons'][0]; originalIndex: number }>;

    if (lessonIndices && lessonIndices.length > 0) {
      // Validate indices
      const invalidIndices = lessonIndices.filter(i => i < 0 || i >= content.lessons.length);
      if (invalidIndices.length > 0) {
        throw new BadRequestException(
          `Invalid lesson indices: ${invalidIndices.join(', ')}. Valid range: 0–${content.lessons.length - 1}`,
        );
      }
      lessonsToApply = lessonIndices.map(i => ({
        lesson: content.lessons[i],
        originalIndex: i,
      }));
    } else {
      lessonsToApply = content.lessons.map((lesson, i) => ({
        lesson,
        originalIndex: i,
      }));
    }

    // Verify the target class exists
    const classRecord = await this.database.query.classes.findFirst({
      where: eq(classes.id, extraction.classId),
    });
    if (!classRecord) {
      throw new NotFoundException(
        `Class "${extraction.classId}" not found`,
      );
    }

    // Find the highest existing lesson order for this class
    const lastLesson = await this.database.query.lessons.findFirst({
      where: eq(lessons.classId, extraction.classId),
      orderBy: (l, { desc }) => [desc(l.order)],
    });
    let lessonOrder = (lastLesson?.order ?? 0) + 1;

    const createdLessons: { id: string; title: string }[] = [];

    // Use a transaction to ensure all-or-nothing lesson creation
    await this.database.transaction(async (tx) => {
      for (const { lesson } of lessonsToApply) {
        // Create lesson with sourceExtractionId for traceability
        const [newLesson] = await tx
          .insert(lessons)
          .values({
            title: lesson.title || `Lesson ${lessonOrder}`,
            description: lesson.description || '',
            classId: extraction.classId,
            order: lessonOrder++,
            isDraft: true, // Always draft — teacher publishes manually
            sourceExtractionId: extractionId,
          })
          .returning();

        // Create content blocks for this lesson
        if (lesson.blocks?.length) {
          const blockValues = lesson.blocks.map((block, idx) => ({
            lessonId: newLesson.id,
            type: (['text', 'image', 'video', 'question', 'file', 'divider'].includes(block.type)
              ? block.type
              : 'text') as 'text' | 'image' | 'video' | 'question' | 'file' | 'divider',
            order: block.order ?? idx,
            content: block.content ?? {},
            metadata: block.metadata ?? {},
          }));

          await tx
            .insert(lessonContentBlocks)
            .values(blockValues);
        }

        createdLessons.push({ id: newLesson.id, title: newLesson.title });
      }

      // Mark extraction as applied
      await tx
        .update(extractedModules)
        .set({
          isApplied: true,
          extractionStatus: 'applied',
          updatedAt: new Date(),
        })
        .where(eq(extractedModules.id, extractionId));
    });

    return {
      classId: extraction.classId,
      extractionId,
      lessonsCreated: createdLessons.length,
      totalLessonsAvailable: content.lessons.length,
      lessons: createdLessons,
    };
  }

  // ─── Delete extraction ─────────────────────────────────────────────────

  async deleteExtraction(extractionId: string, user: RequestUser) {
    const extraction = await this.getExtraction(extractionId, user);

    if (extraction.isApplied) {
      throw new BadRequestException(
        'Cannot delete an extraction that has already been applied',
      );
    }

    await this.database
      .delete(extractedModules)
      .where(eq(extractedModules.id, extractionId));

    return { deleted: true, id: extractionId };
  }

  // ─── AI Interaction History ────────────────────────────────────────────

  async getInteractionHistory(user: RequestUser, limit = 20) {
    return this.database.query.aiInteractionLogs.findMany({
      where: eq(aiInteractionLogs.userId, user.id),
      orderBy: [desc(aiInteractionLogs.createdAt)],
      limit,
    });
  }
}
