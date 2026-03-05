import { Test, TestingModule } from '@nestjs/testing';
import { AiMentorController } from './ai-mentor.controller';
import { AiMentorService } from './ai-mentor.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXTRACTION_ID = 'extraction-uuid-1';
const CLASS_ID = 'class-uuid-1';
const SESSION_ID = 'session-uuid-1';

const STUDENT_USER = { id: 'user-1', email: 'student@school.edu', roles: ['student'] };
const TEACHER_USER = { id: 'teacher-1', email: 'teacher@school.edu', roles: ['teacher'] };
const ADMIN_USER = { id: 'admin-1', email: 'admin@school.edu', roles: ['admin'] };

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAiMentorService = {
  chat: jest.fn(),
  healthCheck: jest.fn(),
  extractModule: jest.fn(),
  listExtractions: jest.fn(),
  getExtraction: jest.fn(),
  applyExtraction: jest.fn(),
  getInteractionHistory: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AiMentorController', () => {
  let controller: AiMentorController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiMentorController],
      providers: [
        { provide: AiMentorService, useValue: mockAiMentorService },
      ],
    }).compile();

    controller = module.get<AiMentorController>(AiMentorController);
  });

  // =========================================================================
  // POST /ai/chat
  // =========================================================================

  describe('chat()', () => {
    const chatResult = {
      reply: 'Hello from Ja!',
      sessionId: SESSION_ID,
      modelUsed: 'llama3.2:3b',
    };

    it('should return success envelope with chat data', async () => {
      mockAiMentorService.chat.mockResolvedValue(chatResult);

      const result = await controller.chat(
        { message: 'Hi Ja', sessionId: undefined },
        STUDENT_USER,
      );

      expect(result).toEqual({
        success: true,
        message: 'Ja responded',
        data: chatResult,
      });
    });

    it('should pass message and user to service', async () => {
      mockAiMentorService.chat.mockResolvedValue(chatResult);

      await controller.chat({ message: 'Hello', sessionId: undefined }, STUDENT_USER);

      expect(mockAiMentorService.chat).toHaveBeenCalledWith(
        'Hello',
        STUDENT_USER,
        undefined,
      );
    });

    it('should pass sessionId when provided', async () => {
      mockAiMentorService.chat.mockResolvedValue(chatResult);

      await controller.chat({ message: 'Follow up', sessionId: SESSION_ID }, STUDENT_USER);

      expect(mockAiMentorService.chat).toHaveBeenCalledWith(
        'Follow up',
        STUDENT_USER,
        SESSION_ID,
      );
    });

    it('should propagate service errors', async () => {
      mockAiMentorService.chat.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.chat({ message: 'Hi', sessionId: undefined }, STUDENT_USER),
      ).rejects.toThrow('Service error');
    });
  });

  // =========================================================================
  // GET /ai/health
  // =========================================================================

  describe('health()', () => {
    it('should return success envelope with health data', async () => {
      const healthData = {
        ollamaAvailable: true,
        configuredModel: 'llama3.2:3b',
        availableModels: ['llama3.2:3b'],
      };
      mockAiMentorService.healthCheck.mockResolvedValue(healthData);

      const result = await controller.health();

      expect(result).toEqual({
        success: true,
        message: 'AI health status',
        data: healthData,
      });
    });

    it('should return unavailable health data', async () => {
      const healthData = {
        ollamaAvailable: false,
        configuredModel: 'llama3.2:3b',
        availableModels: [],
      };
      mockAiMentorService.healthCheck.mockResolvedValue(healthData);

      const result = await controller.health();

      expect(result.data.ollamaAvailable).toBe(false);
    });
  });

  // =========================================================================
  // POST /ai/extract-module
  // =========================================================================

  describe('extractModule()', () => {
    const extractResult = {
      extractionId: EXTRACTION_ID,
      status: 'pending',
      message: 'Extraction queued — poll GET /ai/extractions/:id/status for progress',
    };

    it('should return success envelope with extraction data', async () => {
      mockAiMentorService.extractModule.mockResolvedValue(extractResult);

      const result = await controller.extractModule(
        { fileId: 'file-uuid-1' },
        TEACHER_USER,
      );

      expect(result).toEqual({
        success: true,
        message: extractResult.message,
        data: extractResult,
      });
    });

    it('should pass fileId and user to service', async () => {
      mockAiMentorService.extractModule.mockResolvedValue(extractResult);

      await controller.extractModule({ fileId: 'file-uuid-1' }, TEACHER_USER);

      expect(mockAiMentorService.extractModule).toHaveBeenCalledWith(
        'file-uuid-1',
        TEACHER_USER,
      );
    });

    it('should include message in response', async () => {
      mockAiMentorService.extractModule.mockResolvedValue(extractResult);

      const result = await controller.extractModule(
        { fileId: 'file-uuid-1' },
        TEACHER_USER,
      );

      expect(result.message).toContain('Extraction queued');
    });
  });

  // =========================================================================
  // GET /ai/extractions
  // =========================================================================

  describe('listExtractions()', () => {
    it('should return success envelope with extraction list', async () => {
      const extractions = [{ id: EXTRACTION_ID }];
      mockAiMentorService.listExtractions.mockResolvedValue(extractions);

      const result = await controller.listExtractions(CLASS_ID, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        message: 'Found 1 extraction(s)',
        data: extractions,
      });
    });

    it('should pass classId and user to service', async () => {
      mockAiMentorService.listExtractions.mockResolvedValue([]);

      await controller.listExtractions(CLASS_ID, TEACHER_USER);

      expect(mockAiMentorService.listExtractions).toHaveBeenCalledWith(
        CLASS_ID,
        TEACHER_USER,
      );
    });

    it('should handle empty results', async () => {
      mockAiMentorService.listExtractions.mockResolvedValue([]);

      const result = await controller.listExtractions(CLASS_ID, TEACHER_USER);

      expect(result.message).toBe('Found 0 extraction(s)');
      expect(result.data).toEqual([]);
    });
  });

  // =========================================================================
  // GET /ai/extractions/:id
  // =========================================================================

  describe('getExtraction()', () => {
    it('should return success envelope with extraction details', async () => {
      const extraction = { id: EXTRACTION_ID, classId: CLASS_ID };
      mockAiMentorService.getExtraction.mockResolvedValue(extraction);

      const result = await controller.getExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        message: 'Extraction details',
        data: extraction,
      });
    });

    it('should pass id and user to service', async () => {
      mockAiMentorService.getExtraction.mockResolvedValue({});

      await controller.getExtraction(EXTRACTION_ID, ADMIN_USER);

      expect(mockAiMentorService.getExtraction).toHaveBeenCalledWith(
        EXTRACTION_ID,
        ADMIN_USER,
      );
    });
  });

  // =========================================================================
  // POST /ai/extractions/:id/apply
  // =========================================================================

  describe('applyExtraction()', () => {
    const applyResult = {
      classId: CLASS_ID,
      extractionId: EXTRACTION_ID,
      lessonsCreated: 3,
      lessons: [
        { id: 'lesson-1', title: 'Lesson 1' },
        { id: 'lesson-2', title: 'Lesson 2' },
        { id: 'lesson-3', title: 'Lesson 3' },
      ],
    };

    it('should return success envelope with created lessons data', async () => {
      mockAiMentorService.applyExtraction.mockResolvedValue(applyResult);

      const result = await controller.applyExtraction(EXTRACTION_ID, {}, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        message: 'Created 3 lesson(s) from extraction',
        data: applyResult,
      });
    });

    it('should pass extractionId and user to service', async () => {
      mockAiMentorService.applyExtraction.mockResolvedValue(applyResult);

      await controller.applyExtraction(EXTRACTION_ID, {}, TEACHER_USER);

      expect(mockAiMentorService.applyExtraction).toHaveBeenCalledWith(
        EXTRACTION_ID,
        TEACHER_USER,
        undefined,
      );
    });

    it('should include lessonsCreated count in message', async () => {
      mockAiMentorService.applyExtraction.mockResolvedValue({
        ...applyResult,
        lessonsCreated: 5,
      });

      const result = await controller.applyExtraction(EXTRACTION_ID, {}, TEACHER_USER);

      expect(result.message).toBe('Created 5 lesson(s) from extraction');
    });
  });

  // =========================================================================
  // GET /ai/history
  // =========================================================================

  describe('history()', () => {
    it('should return success envelope with interaction history', async () => {
      const history = [
        { id: 'log-1', sessionType: 'mentor_chat' },
        { id: 'log-2', sessionType: 'module_extraction' },
      ];
      mockAiMentorService.getInteractionHistory.mockResolvedValue(history);

      const result = await controller.history(STUDENT_USER);

      expect(result).toEqual({
        success: true,
        message: 'Found 2 interaction(s)',
        data: history,
      });
    });

    it('should pass user to service', async () => {
      mockAiMentorService.getInteractionHistory.mockResolvedValue([]);

      await controller.history(TEACHER_USER);

      expect(mockAiMentorService.getInteractionHistory).toHaveBeenCalledWith(
        TEACHER_USER,
      );
    });

    it('should handle empty history', async () => {
      mockAiMentorService.getInteractionHistory.mockResolvedValue([]);

      const result = await controller.history(STUDENT_USER);

      expect(result.message).toBe('Found 0 interaction(s)');
      expect(result.data).toEqual([]);
    });
  });
});
