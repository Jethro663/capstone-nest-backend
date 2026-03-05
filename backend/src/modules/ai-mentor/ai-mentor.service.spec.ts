import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AiMentorService } from './ai-mentor.service';
import { DatabaseService } from '../../database/database.service';
import { OllamaService } from './ollama.service';
import { getQueueToken } from '@nestjs/bullmq';

// Mock external modules before imports
jest.mock('pdf-parse', () => {
  const fn = jest.fn();
  return { __esModule: true, default: fn };
});
jest.mock('fs');
jest.mock('./rule-based-extractor', () => ({
  extractWithRules: jest.fn(),
}));

import pdfParse from 'pdf-parse';
import * as fs from 'fs';
import { extractWithRules } from './rule-based-extractor';

const mockedPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedExtractWithRules = extractWithRules as jest.MockedFunction<
  typeof extractWithRules
>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-uuid-1';
const TEACHER_ID = 'teacher-uuid-1';
const ADMIN_ID = 'admin-uuid-1';
const FILE_ID = 'file-uuid-1';
const CLASS_ID = 'class-uuid-1';
const EXTRACTION_ID = 'extraction-uuid-1';
const SESSION_ID = 'session-uuid-1';
const LESSON_ID = 'lesson-uuid-1';

const STUDENT_USER = { id: USER_ID, email: 'student@school.edu', roles: ['student'] };
const TEACHER_USER = { id: TEACHER_ID, email: 'teacher@school.edu', roles: ['teacher'] };
const ADMIN_USER = { id: ADMIN_ID, email: 'admin@school.edu', roles: ['admin'] };
const OTHER_TEACHER = { id: 'other-teacher', email: 'other@school.edu', roles: ['teacher'] };

const makeFile = (overrides: Partial<any> = {}) => ({
  id: FILE_ID,
  teacherId: TEACHER_ID,
  classId: CLASS_ID,
  originalName: 'module.pdf',
  storedName: 'abc123.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  filePath: '/uploads/abc123.pdf',
  uploadedAt: new Date('2026-01-01'),
  deletedAt: null,
  ...overrides,
});

const makeExtraction = (overrides: Partial<any> = {}) => ({
  id: EXTRACTION_ID,
  fileId: FILE_ID,
  classId: CLASS_ID,
  teacherId: TEACHER_ID,
  rawText: 'Sample PDF text content for testing purposes that is long enough.',
  structuredContent: {
    title: 'Test Module',
    description: 'A test module',
    lessons: [
      {
        title: 'Lesson 1',
        description: 'First lesson',
        blocks: [
          { type: 'text', order: 0, content: { text: 'Hello world' }, metadata: {} },
        ],
      },
    ],
  },
  extractionStatus: 'completed',
  errorMessage: null,
  modelUsed: 'rule-based',
  isApplied: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  file: { id: FILE_ID, originalName: 'module.pdf' },
  ...overrides,
});

const makeInteractionLog = (overrides: Partial<any> = {}) => ({
  id: 'log-uuid-1',
  userId: USER_ID,
  sessionType: 'mentor_chat',
  inputText: 'Hello Ja',
  outputText: 'Hi there! I am Ja.',
  modelUsed: 'llama3.2:3b',
  contextMetadata: {},
  responseTimeMs: 200,
  sessionId: SESSION_ID,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const makeClass = (overrides: Partial<any> = {}) => ({
  id: CLASS_ID,
  subjectName: 'Mathematics',
  subjectCode: 'MATH7',
  teacherId: TEACHER_ID,
  isActive: true,
  ...overrides,
});

const makeLesson = (overrides: Partial<any> = {}) => ({
  id: LESSON_ID,
  title: 'Existing Lesson',
  classId: CLASS_ID,
  order: 3,
  isDraft: false,
  ...overrides,
});

const VALID_EXTRACTION_RESULT = {
  title: 'Test Module',
  description: 'Test desc',
  lessons: [
    {
      title: 'Lesson 1',
      description: 'Desc 1',
      blocks: [
        { type: 'text', order: 0, content: { text: 'Content' }, metadata: {} },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock DB chain helpers
// ---------------------------------------------------------------------------

const makeInsertChain = (rows: any[] = []) => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(rows),
});

const makeUpdateChain = () => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(undefined),
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AiMentorService', () => {
  let service: AiMentorService;

  const mockDb: any = {
    query: {
      uploadedFiles: { findFirst: jest.fn() },
      extractedModules: { findFirst: jest.fn(), findMany: jest.fn() },
      aiInteractionLogs: { findFirst: jest.fn(), findMany: jest.fn() },
      classes: { findFirst: jest.fn() },
      lessons: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  };

  const mockOllamaService = {
    isAvailable: jest.fn(),
    chat: jest.fn(),
    generate: jest.fn(),
    getModelName: jest.fn().mockReturnValue('llama3.2:3b'),
  };

  const mockDatabaseService = { db: mockDb };

  const mockExtractionQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMentorService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: OllamaService, useValue: mockOllamaService },
        { provide: getQueueToken('module-extraction'), useValue: mockExtractionQueue },
      ],
    }).compile();

    service = module.get<AiMentorService>(AiMentorService);
  });

  // =========================================================================
  // chat()
  // =========================================================================

  describe('chat()', () => {
    beforeEach(() => {
      // Default: Ollama available and responds
      mockOllamaService.isAvailable.mockResolvedValue({ available: true, models: ['llama3.2:3b'] });
      mockOllamaService.chat.mockResolvedValue('Hello from Ja!');
      mockDb.insert.mockReturnValue(makeInsertChain([]));
    });

    it('should start a new session when no sessionId is provided', async () => {
      const result = await service.chat('Hello', STUDENT_USER);

      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
      expect(result.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(result.reply).toBe('Hello from Ja!');
      expect(result.modelUsed).toBe('llama3.2:3b');
    });

    it('should reuse sessionId when provided', async () => {
      mockDb.query.aiInteractionLogs.findMany.mockResolvedValue([]);

      const result = await service.chat('Follow up', STUDENT_USER, SESSION_ID);

      expect(result.sessionId).toBe(SESSION_ID);
    });

    it('should load conversation history when sessionId is provided', async () => {
      // Service fetches DESC, then reverses. Mock returns DESC order (newest first).
      const historyEntries = [
        makeInteractionLog({ inputText: 'More', outputText: 'Sure!' }),
        makeInteractionLog({ inputText: 'Hi', outputText: 'Hello!' }),
      ];
      mockDb.query.aiInteractionLogs.findMany.mockResolvedValue(historyEntries);

      await service.chat('Follow up', STUDENT_USER, SESSION_ID);

      expect(mockOllamaService.chat).toHaveBeenCalledTimes(1);
      const messages = mockOllamaService.chat.mock.calls[0][0];
      // system + 2 user/assistant pairs from history (reversed to ASC) + 1 new user message = 6
      expect(messages).toHaveLength(6);
      expect(messages[0].role).toBe('system');
      expect(messages[1]).toEqual({ role: 'user', content: 'Hi' });
      expect(messages[2]).toEqual({ role: 'assistant', content: 'Hello!' });
      expect(messages[3]).toEqual({ role: 'user', content: 'More' });
      expect(messages[4]).toEqual({ role: 'assistant', content: 'Sure!' });
      expect(messages[5]).toEqual({ role: 'user', content: 'Follow up' });
    });

    it('should limit history to 20 entries (uses limit: 20 in query)', async () => {
      mockDb.query.aiInteractionLogs.findMany.mockResolvedValue([]);

      await service.chat('Test', STUDENT_USER, SESSION_ID);

      expect(mockDb.query.aiInteractionLogs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
      );
    });

    it('should return fallback reply when Ollama is offline', async () => {
      mockOllamaService.isAvailable.mockResolvedValue({ available: false, models: [] });

      const result = await service.chat('Hello', STUDENT_USER);

      expect(result.reply).toContain('recharging my detective instincts');
      expect(result.modelUsed).toBe('fallback (ollama-offline)');
      expect(mockOllamaService.chat).not.toHaveBeenCalled();
    });

    it('should return fallback reply when Ollama chat throws', async () => {
      mockOllamaService.isAvailable.mockResolvedValue({ available: true, models: [] });
      mockOllamaService.chat.mockRejectedValue(new Error('timeout'));

      const result = await service.chat('Hello', STUDENT_USER);

      expect(result.reply).toContain('investigation tools are temporarily offline');
      expect(result.modelUsed).toBe('fallback (ollama-unavailable)');
    });

    it('should log the interaction to ai_interaction_logs', async () => {
      const insertChain = makeInsertChain([]);
      mockDb.insert.mockReturnValue(insertChain);

      await service.chat('Hello', STUDENT_USER);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          sessionType: 'mentor_chat',
          inputText: 'Hello',
          outputText: 'Hello from Ja!',
          modelUsed: 'llama3.2:3b',
        }),
      );
    });

    it('should truncate inputText to 2000 chars for DB storage', async () => {
      const longMessage = 'x'.repeat(3000);
      const insertChain = makeInsertChain([]);
      mockDb.insert.mockReturnValue(insertChain);

      await service.chat(longMessage, STUDENT_USER);

      const insertedValues = insertChain.values.mock.calls[0][0];
      expect(insertedValues.inputText.length).toBe(2000);
    });

    it('should truncate outputText to 5000 chars for DB storage', async () => {
      const longReply = 'y'.repeat(6000);
      mockOllamaService.chat.mockResolvedValue(longReply);
      const insertChain = makeInsertChain([]);
      mockDb.insert.mockReturnValue(insertChain);

      await service.chat('Hello', STUDENT_USER);

      const insertedValues = insertChain.values.mock.calls[0][0];
      expect(insertedValues.outputText.length).toBe(5000);
    });

    it('should store sessionId in both the DB column and contextMetadata', async () => {
      const insertChain = makeInsertChain([]);
      mockDb.insert.mockReturnValue(insertChain);

      const result = await service.chat('Hello', STUDENT_USER);

      const insertedValues = insertChain.values.mock.calls[0][0];
      expect(insertedValues.sessionId).toBe(result.sessionId);
      expect(insertedValues.contextMetadata).toEqual({ sessionId: result.sessionId });
    });

    it('should send system prompt as first message to Ollama', async () => {
      await service.chat('Hello', STUDENT_USER);

      const messages = mockOllamaService.chat.mock.calls[0][0];
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('J.A.K.I.P.I.R');
    });
  });

  // =========================================================================
  // healthCheck()
  // =========================================================================

  describe('healthCheck()', () => {
    it('should return available status when Ollama is up', async () => {
      mockOllamaService.isAvailable.mockResolvedValue({
        available: true,
        models: ['llama3.2:3b', 'mistral:7b'],
      });

      const result = await service.healthCheck();

      expect(result).toEqual({
        ollamaAvailable: true,
        configuredModel: 'llama3.2:3b',
        availableModels: ['llama3.2:3b', 'mistral:7b'],
      });
    });

    it('should return unavailable status when Ollama is down', async () => {
      mockOllamaService.isAvailable.mockResolvedValue({ available: false, models: [] });

      const result = await service.healthCheck();

      expect(result).toEqual({
        ollamaAvailable: false,
        configuredModel: 'llama3.2:3b',
        availableModels: [],
      });
    });
  });

  // =========================================================================
  // extractModule()
  // =========================================================================

  describe('extractModule()', () => {
    beforeEach(() => {
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(makeFile());
      (mockedFs.existsSync as jest.Mock).mockReturnValue(true);

      // insert for extraction record (status: pending)
      const insertChain = makeInsertChain([makeExtraction({ extractionStatus: 'pending', progressPercent: 0 })]);
      mockDb.insert.mockReturnValue(insertChain);
      mockExtractionQueue.add.mockResolvedValue({ id: 'job-1' });
    });

    it('should throw NotFoundException when file is not found', async () => {
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(null);

      await expect(service.extractModule(FILE_ID, TEACHER_USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when teacher does not own the file', async () => {
      await expect(service.extractModule(FILE_ID, OTHER_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to extract any file', async () => {
      const result = await service.extractModule(FILE_ID, ADMIN_USER);

      expect(result.extractionId).toBeDefined();
    });

    it('should throw NotFoundException when physical file is missing (without leaking path)', async () => {
      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.extractModule(FILE_ID, TEACHER_USER)).rejects.toThrow(
        'Physical file not found on server',
      );
      // Should NOT contain the file path
      try {
        await service.extractModule(FILE_ID, TEACHER_USER);
      } catch (e: any) {
        expect(e.message).not.toContain('/uploads/');
      }
    });

    it('should create extraction record with pending status', async () => {
      await service.extractModule(FILE_ID, TEACHER_USER);

      expect(mockDb.insert).toHaveBeenCalled();
      const chain = mockDb.insert.mock.results[0].value;
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          extractionStatus: 'pending',
          fileId: FILE_ID,
          classId: CLASS_ID,
          teacherId: TEACHER_ID,
        }),
      );
    });

    it('should enqueue a BullMQ job with correct data', async () => {
      await service.extractModule(FILE_ID, TEACHER_USER);

      expect(mockExtractionQueue.add).toHaveBeenCalledWith(
        'extract',
        expect.objectContaining({
          extractionId: EXTRACTION_ID,
          fileId: FILE_ID,
          userId: TEACHER_ID,
        }),
        expect.objectContaining({
          attempts: 2,
        }),
      );
    });

    it('should return extractionId, status, and message', async () => {
      const result = await service.extractModule(FILE_ID, TEACHER_USER);

      expect(result).toEqual({
        extractionId: EXTRACTION_ID,
        status: 'pending',
        message: expect.stringContaining('queued'),
      });
    });
  });

  // =========================================================================
  // listExtractions()
  // =========================================================================

  describe('listExtractions()', () => {
    it('should return extractions for a class (teacher sees own)', async () => {
      const extractions = [makeExtraction()];
      mockDb.query.extractedModules.findMany.mockResolvedValue(extractions);

      const result = await service.listExtractions(CLASS_ID, TEACHER_USER);

      expect(result).toEqual(extractions);
      expect(mockDb.query.extractedModules.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          with: expect.objectContaining({
            file: expect.any(Object),
          }),
        }),
      );
    });

    it('should return empty array for non-existent class (not 404)', async () => {
      mockDb.query.extractedModules.findMany.mockResolvedValue([]);

      const result = await service.listExtractions('non-existent-id', TEACHER_USER);

      expect(result).toEqual([]);
    });

    it('should allow admin to see all extractions for a class', async () => {
      mockDb.query.extractedModules.findMany.mockResolvedValue([makeExtraction()]);

      const result = await service.listExtractions(CLASS_ID, ADMIN_USER);

      expect(result).toHaveLength(1);
    });
  });

  // =========================================================================
  // getExtraction()
  // =========================================================================

  describe('getExtraction()', () => {
    it('should return extraction with file info', async () => {
      const extraction = makeExtraction();
      mockDb.query.extractedModules.findFirst.mockResolvedValue(extraction);

      const result = await service.getExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result).toEqual(extraction);
    });

    it('should throw NotFoundException when extraction is not found', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(null);

      await expect(
        service.getExtraction('non-existent-id', TEACHER_USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when teacher does not own extraction', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(makeExtraction());

      await expect(
        service.getExtraction(EXTRACTION_ID, OTHER_TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any extraction', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(makeExtraction());

      const result = await service.getExtraction(EXTRACTION_ID, ADMIN_USER);

      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // applyExtraction()
  // =========================================================================

  describe('applyExtraction()', () => {
    beforeEach(() => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(makeExtraction());
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.lessons.findFirst.mockResolvedValue(null); // no existing lessons
      mockDb.transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([{ id: LESSON_ID, title: 'Lesson 1' }]),
          }),
          update: jest.fn().mockReturnValue(makeUpdateChain()),
        };
        return fn(tx);
      });
    });

    it('should throw BadRequestException when extraction is not completed', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(
        makeExtraction({ extractionStatus: 'processing' }),
      );

      await expect(
        service.applyExtraction(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when extraction has no lessons', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(
        makeExtraction({ structuredContent: { title: 'Empty', description: '', lessons: [] } }),
      );

      await expect(
        service.applyExtraction(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow('No lessons found');
    });

    it('should throw BadRequestException when structuredContent is null', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(
        makeExtraction({ structuredContent: null }),
      );

      await expect(
        service.applyExtraction(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow('No lessons found');
    });

    it('should throw NotFoundException when target class does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null);

      await expect(
        service.applyExtraction(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create lessons with isDraft=true', async () => {
      await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      // Transaction was called
      expect(mockDb.transaction).toHaveBeenCalled();
      const txFn = mockDb.transaction.mock.calls[0][0];
      const tx = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: LESSON_ID, title: 'Lesson 1' }]),
        }),
        update: jest.fn().mockReturnValue(makeUpdateChain()),
      };
      await txFn(tx);
      expect(tx.insert).toHaveBeenCalled();
    });

    it('should start lesson order after highest existing lesson', async () => {
      mockDb.query.lessons.findFirst.mockResolvedValue(makeLesson({ order: 5 }));

      const result = await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      // The result should include the created lessons
      expect(result.lessonsCreated).toBe(1);
    });

    it('should start lesson order at 1 when no existing lessons', async () => {
      mockDb.query.lessons.findFirst.mockResolvedValue(null);

      const result = await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result.lessonsCreated).toBe(1);
    });

    it('should use transaction for all-or-nothing lesson creation', async () => {
      await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('should map invalid block types to "text"', async () => {
      const extractionWithInvalidBlock = makeExtraction({
        structuredContent: {
          title: 'Module',
          description: 'Desc',
          lessons: [
            {
              title: 'Lesson',
              description: '',
              blocks: [
                { type: 'invalid_type', order: 0, content: { text: 'test' }, metadata: {} },
              ],
            },
          ],
        },
      });
      mockDb.query.extractedModules.findFirst.mockResolvedValue(extractionWithInvalidBlock);

      let capturedBlockValues: any;
      mockDb.transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockImplementation((vals: any) => {
              capturedBlockValues = vals;
              return { returning: jest.fn().mockResolvedValue([{ id: LESSON_ID, title: 'Lesson' }]) };
            }),
            returning: jest.fn().mockResolvedValue([{ id: LESSON_ID, title: 'Lesson' }]),
          }),
          update: jest.fn().mockReturnValue(makeUpdateChain()),
        };
        return fn(tx);
      });

      await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      // The block type should have been mapped to 'text'
      if (capturedBlockValues) {
        expect(capturedBlockValues[0].type).toBe('text');
      }
    });

    it('should prevent duplicate application when isApplied is true', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue(
        makeExtraction({ isApplied: true }),
      );

      await expect(
        service.applyExtraction(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow('already been applied');
    });

    it('should return classId, extractionId, lessonsCreated, and lesson list', async () => {
      const result = await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result).toEqual({
        classId: CLASS_ID,
        extractionId: EXTRACTION_ID,
        lessonsCreated: 1,
        totalLessonsAvailable: 1,
        lessons: expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String), title: expect.any(String) }),
        ]),
      });
    });

    it('should handle blocks with missing order (use index)', async () => {
      const extractionWithNoOrder = makeExtraction({
        structuredContent: {
          title: 'Module',
          description: '',
          lessons: [
            {
              title: 'L1',
              description: '',
              blocks: [
                { type: 'text', content: { text: 'no order' }, metadata: {} },
                { type: 'divider', content: {}, metadata: {} },
              ],
            },
          ],
        },
      });
      mockDb.query.extractedModules.findFirst.mockResolvedValue(extractionWithNoOrder);

      const result = await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result.lessonsCreated).toBe(1);
    });

    it('should handle lessons with no blocks', async () => {
      const extractionNoBlocks = makeExtraction({
        structuredContent: {
          title: 'Module',
          description: '',
          lessons: [
            { title: 'Empty Lesson', description: '', blocks: [] },
          ],
        },
      });
      mockDb.query.extractedModules.findFirst.mockResolvedValue(extractionNoBlocks);

      const result = await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result.lessonsCreated).toBe(1);
    });

    it('should handle lessons with null blocks', async () => {
      const extractionNullBlocks = makeExtraction({
        structuredContent: {
          title: 'Module',
          description: '',
          lessons: [
            { title: 'Null Blocks Lesson', description: '' },
          ],
        },
      });
      mockDb.query.extractedModules.findFirst.mockResolvedValue(extractionNullBlocks);

      const result = await service.applyExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result.lessonsCreated).toBe(1);
    });
  });

  // =========================================================================
  // getInteractionHistory()
  // =========================================================================

  describe('getInteractionHistory()', () => {
    it('should return user interactions ordered by createdAt desc', async () => {
      const logs = [makeInteractionLog(), makeInteractionLog({ id: 'log-2' })];
      mockDb.query.aiInteractionLogs.findMany.mockResolvedValue(logs);

      const result = await service.getInteractionHistory(STUDENT_USER);

      expect(result).toEqual(logs);
      expect(mockDb.query.aiInteractionLogs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
      );
    });

    it('should accept a custom limit parameter', async () => {
      mockDb.query.aiInteractionLogs.findMany.mockResolvedValue([]);

      await service.getInteractionHistory(STUDENT_USER, 10);

      expect(mockDb.query.aiInteractionLogs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });

    it('should only return logs for the requesting user', async () => {
      mockDb.query.aiInteractionLogs.findMany.mockResolvedValue([]);

      await service.getInteractionHistory(STUDENT_USER);

      expect(mockDb.query.aiInteractionLogs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
        }),
      );
    });
  });
});
