import { Test, TestingModule } from '@nestjs/testing';
import { AiMentorController } from './ai-mentor.controller';
import { AiProxyService } from './ai-proxy.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXTRACTION_ID = 'extraction-uuid-1';
const CLASS_ID = 'class-uuid-1';
const JOB_ID = '11111111-1111-1111-1111-111111111111';

const STUDENT_USER = {
  id: 'user-1',
  email: 'student@school.edu',
  roles: ['student'],
};
const TEACHER_USER = {
  id: 'teacher-1',
  email: 'teacher@school.edu',
  roles: ['teacher'],
};
const ADMIN_USER = {
  id: 'admin-1',
  email: 'admin@school.edu',
  roles: ['admin'],
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockProxy = { forward: jest.fn() };

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AiMentorController', () => {
  let controller: AiMentorController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiMentorController],
      providers: [{ provide: AiProxyService, useValue: mockProxy }],
    }).compile();

    controller = module.get<AiMentorController>(AiMentorController);
  });

  // =========================================================================
  // POST /ai/chat
  // =========================================================================

  describe('chat()', () => {
    it('should forward POST /chat with dto and user', async () => {
      const dto = { message: 'Hi Ja', sessionId: undefined };
      mockProxy.forward.mockResolvedValue({ reply: 'Hello!' });

      const result = await controller.chat(dto, STUDENT_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        '/chat',
        STUDENT_USER,
        dto,
      );
      expect(result).toEqual({ reply: 'Hello!' });
    });

    it('should propagate proxy errors', async () => {
      mockProxy.forward.mockRejectedValue(new Error('timeout'));

      await expect(
        controller.chat({ message: 'Hi', sessionId: undefined }, STUDENT_USER),
      ).rejects.toThrow('timeout');
    });
  });

  // =========================================================================
  // GET /ai/health
  // =========================================================================

  describe('health()', () => {
    it('should forward GET /health with empty user', async () => {
      mockProxy.forward.mockResolvedValue({ status: 'ok' });

      const result = await controller.health();

      expect(mockProxy.forward).toHaveBeenCalledWith('GET', '/health', {
        id: '',
        email: '',
        roles: [],
      });
      expect(result).toEqual({ status: 'ok' });
    });

    it('should return an offline fallback when the AI service is unavailable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await controller.health();

      expect(result).toEqual({
        success: true,
        degraded: true,
        message: 'AI service unavailable; reporting offline status.',
        data: {
          ollamaAvailable: false,
          configuredModel: 'offline',
        },
      });
    });
  });

  // =========================================================================
  // POST /ai/extract-module
  // =========================================================================

  describe('extractModule()', () => {
    it('should forward POST /extract with dto and user', async () => {
      const dto = { fileId: 'file-uuid-1' };
      mockProxy.forward.mockResolvedValue({ extractionId: EXTRACTION_ID });

      const result = await controller.extractModule(dto, TEACHER_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        '/extract',
        TEACHER_USER,
        dto,
      );
      expect(result).toEqual({ extractionId: EXTRACTION_ID });
    });
  });

  // =========================================================================
  // GET /ai/extractions/:id/status
  // =========================================================================

  describe('getExtractionStatus()', () => {
    it('should forward GET /extractions/:id/status', async () => {
      mockProxy.forward.mockResolvedValue({ status: 'completed' });

      const result = await controller.getExtractionStatus(
        EXTRACTION_ID,
        TEACHER_USER,
      );

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'GET',
        `/extractions/${EXTRACTION_ID}/status`,
        TEACHER_USER,
      );
      expect(result).toEqual({ status: 'completed' });
    });
  });

  // =========================================================================
  // GET /ai/extractions
  // =========================================================================

  describe('listExtractions()', () => {
    it('should forward GET /extractions with classId query', async () => {
      mockProxy.forward.mockResolvedValue([{ id: EXTRACTION_ID }]);

      const result = await controller.listExtractions(CLASS_ID, TEACHER_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'GET',
        `/extractions?classId=${CLASS_ID}`,
        TEACHER_USER,
      );
      expect(result).toEqual([{ id: EXTRACTION_ID }]);
    });

    it('should return an empty-list fallback when extraction history is unavailable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await controller.listExtractions(CLASS_ID, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        degraded: true,
        message: 'AI extraction history unavailable; returning an empty list.',
        data: [],
      });
    });
  });

  // =========================================================================
  // GET /ai/extractions/:id
  // =========================================================================

  describe('getExtraction()', () => {
    it('should forward GET /extractions/:id', async () => {
      mockProxy.forward.mockResolvedValue({ id: EXTRACTION_ID });

      const result = await controller.getExtraction(EXTRACTION_ID, ADMIN_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'GET',
        `/extractions/${EXTRACTION_ID}`,
        ADMIN_USER,
      );
      expect(result).toEqual({ id: EXTRACTION_ID });
    });
  });

  // =========================================================================
  // PATCH /ai/extractions/:id
  // =========================================================================

  describe('updateExtraction()', () => {
    it('should forward PATCH /extractions/:id with dto', async () => {
      const dto = { structuredContent: { lessons: [] } };
      mockProxy.forward.mockResolvedValue({ updated: true });

      const result = await controller.updateExtraction(
        EXTRACTION_ID,
        dto as any,
        TEACHER_USER,
      );

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'PATCH',
        `/extractions/${EXTRACTION_ID}`,
        TEACHER_USER,
        dto,
      );
      expect(result).toEqual({ updated: true });
    });
  });

  // =========================================================================
  // POST /ai/extractions/:id/apply
  // =========================================================================

  describe('applyExtraction()', () => {
    it('should forward POST /extractions/:id/apply with dto', async () => {
      const dto = {};
      mockProxy.forward.mockResolvedValue({ lessonsCreated: 3 });

      const result = await controller.applyExtraction(
        EXTRACTION_ID,
        dto,
        TEACHER_USER,
      );

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        `/extractions/${EXTRACTION_ID}/apply`,
        TEACHER_USER,
        dto,
      );
      expect(result).toEqual({ lessonsCreated: 3 });
    });
  });

  // =========================================================================
  // DELETE /ai/extractions/:id
  // =========================================================================

  describe('deleteExtraction()', () => {
    it('should forward DELETE /extractions/:id', async () => {
      mockProxy.forward.mockResolvedValue({ deleted: true });

      const result = await controller.deleteExtraction(
        EXTRACTION_ID,
        TEACHER_USER,
      );

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'DELETE',
        `/extractions/${EXTRACTION_ID}`,
        TEACHER_USER,
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('queueInterventionRecommendation()', () => {
    it('should forward POST /teacher/interventions/:caseId/jobs with dto', async () => {
      const dto = { note: 'Focus on fractions' };
      mockProxy.forward.mockResolvedValue({ jobId: JOB_ID, status: 'pending' });

      const result = await controller.queueInterventionRecommendation(
        JOB_ID,
        dto,
        TEACHER_USER,
      );

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        `/teacher/interventions/${JOB_ID}/jobs`,
        TEACHER_USER,
        dto,
      );
      expect(result).toEqual({ jobId: JOB_ID, status: 'pending' });
    });
  });

  describe('queueQuizDraftJob()', () => {
    it('should forward POST /teacher/quizzes/jobs with dto', async () => {
      const dto = {
        classId: CLASS_ID,
        questionCount: 5,
        questionType: 'multiple_choice',
        assessmentType: 'quiz',
        passingScore: 60,
        feedbackLevel: 'standard',
      };
      mockProxy.forward.mockResolvedValue({ jobId: JOB_ID, status: 'pending' });

      const result = await controller.queueQuizDraftJob(dto as any, TEACHER_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        '/teacher/quizzes/jobs',
        TEACHER_USER,
        dto,
      );
      expect(result).toEqual({ jobId: JOB_ID, status: 'pending' });
    });
  });

  describe('getTeacherJobStatus()', () => {
    it('should forward GET /teacher/jobs/:jobId', async () => {
      mockProxy.forward.mockResolvedValue({ jobId: JOB_ID, status: 'processing' });

      const result = await controller.getTeacherJobStatus(JOB_ID, TEACHER_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'GET',
        `/teacher/jobs/${JOB_ID}`,
        TEACHER_USER,
      );
      expect(result).toEqual({ jobId: JOB_ID, status: 'processing' });
    });
  });

  describe('getTeacherJobResult()', () => {
    it('should forward GET /teacher/jobs/:jobId/result', async () => {
      mockProxy.forward.mockResolvedValue({ jobId: JOB_ID, result: {} });

      const result = await controller.getTeacherJobResult(JOB_ID, TEACHER_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'GET',
        `/teacher/jobs/${JOB_ID}/result`,
        TEACHER_USER,
      );
      expect(result).toEqual({ jobId: JOB_ID, result: {} });
    });
  });

  // =========================================================================
  // GET /ai/history
  // =========================================================================

  describe('history()', () => {
    it('should forward GET /history with user', async () => {
      mockProxy.forward.mockResolvedValue([{ id: 'log-1' }]);

      const result = await controller.history(STUDENT_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'GET',
        '/history',
        STUDENT_USER,
      );
      expect(result).toEqual([{ id: 'log-1' }]);
    });

    it('should return an empty history fallback when the AI service is unavailable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await controller.history(STUDENT_USER);

      expect(result).toEqual({
        success: true,
        degraded: true,
        message: 'AI history unavailable; returning an empty list.',
        data: [],
      });
    });
  });
});
