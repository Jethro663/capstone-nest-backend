import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AiMentorController } from './ai-mentor.controller';
import { AiProxyService } from './ai-proxy.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

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
const mockAudit = { log: jest.fn() };
const mockDb = {
  query: {
    enrollments: { findMany: jest.fn() },
    classModules: { findMany: jest.fn() },
    classes: { findFirst: jest.fn() },
    aiGenerationJobs: { findFirst: jest.fn() },
    aiGenerationOutputs: { findFirst: jest.fn() },
    assessments: { findFirst: jest.fn() },
    interventionCases: { findFirst: jest.fn() },
    performanceSnapshots: { findFirst: jest.fn() },
    extractedModules: { findFirst: jest.fn(), findMany: jest.fn() },
    uploadedFiles: { findFirst: jest.fn() },
  },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AiMentorController', () => {
  let controller: AiMentorController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAudit.log.mockReset();
    mockAudit.log.mockResolvedValue(undefined);
    mockDb.query.enrollments.findMany.mockReset();
    mockDb.query.classModules.findMany.mockReset();
    mockDb.query.classes.findFirst.mockReset();
    mockDb.query.aiGenerationJobs.findFirst.mockReset();
    mockDb.query.aiGenerationOutputs.findFirst.mockReset();
    mockDb.query.assessments.findFirst.mockReset();
    mockDb.query.interventionCases.findFirst.mockReset();
    mockDb.query.performanceSnapshots.findFirst.mockReset();
    mockDb.query.extractedModules.findFirst.mockReset();
    mockDb.query.extractedModules.findMany.mockReset();
    mockDb.query.uploadedFiles.findFirst.mockReset();
    mockDb.query.enrollments.findMany.mockResolvedValue([]);
    mockDb.query.classModules.findMany.mockResolvedValue([]);
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: CLASS_ID,
      teacherId: TEACHER_USER.id,
    });
    mockDb.query.aiGenerationJobs.findFirst.mockResolvedValue({
      id: JOB_ID,
      teacherId: TEACHER_USER.id,
      jobType: 'quiz_generation',
      status: 'processing',
      errorMessage: null,
      sourceFilters: null,
      updatedAt: '2026-04-04T00:00:00.000Z',
    });
    mockDb.query.aiGenerationOutputs.findFirst.mockResolvedValue(null);
    mockDb.query.assessments.findFirst.mockResolvedValue(null);
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: JOB_ID,
      classId: CLASS_ID,
      studentId: 'student-1',
      status: 'active',
    });
    mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
      isAtRisk: true,
    });
    mockDb.query.extractedModules.findFirst.mockResolvedValue({
      id: EXTRACTION_ID,
      fileId: 'file-uuid-1',
      classId: CLASS_ID,
      teacherId: TEACHER_USER.id,
      extractionStatus: 'processing',
      modelUsed: null,
      errorMessage: null,
      structuredContent: null,
      isApplied: false,
      progressPercent: 0,
      totalChunks: null,
      processedChunks: 0,
      createdAt: '2026-04-04T00:00:00.000Z',
      updatedAt: '2026-04-04T00:00:00.000Z',
      file: {
        originalName: 'module.pdf',
      },
    });
    mockDb.query.extractedModules.findMany.mockResolvedValue([]);
    mockDb.query.uploadedFiles.findFirst.mockResolvedValue({
      id: 'file-uuid-1',
      classId: CLASS_ID,
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiMentorController],
      providers: [
        { provide: AiProxyService, useValue: mockProxy },
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: AuditService, useValue: mockAudit },
      ],
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

  describe('generateDemoInterventionPlan()', () => {
    it('returns a live plan payload when ai-service succeeds', async () => {
      mockProxy.forward.mockResolvedValue({
        success: true,
        data: {
          source: 'live',
          weakConcepts: ['Cell structures and functions'],
          recommendedModules: ['Module 3: Cells and Organisms'],
          teacherSummary: 'Live summary',
          lxpQuestions: [
            {
              id: 'live-1',
              prompt: 'Live question',
              options: ['A', 'B', 'C', 'D'],
              correctIndex: 0,
              explanation: 'Because evidence',
            },
          ],
        },
      });

      const result = await controller.generateDemoInterventionPlan({
        subjectId: 'science',
        quarterExamScore: 68,
        weakConcepts: ['Cell structures and functions'],
        moduleScores: [62, 71, 75],
      });

      expect(result).toMatchObject({
        success: true,
        message: 'Demo AI intervention plan generated.',
        data: {
          source: 'live',
          weakConcepts: ['Cell structures and functions'],
          teacherSummary: 'Live summary',
        },
      });
      expect(result.data.recommendedModules.length).toBeGreaterThan(0);
      expect(result.data.lxpQuestions.length).toBeGreaterThan(0);
      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        '/demo/intervention-plan',
        { id: '', email: '', roles: [] },
        {
          subjectId: 'science',
          quarterExamScore: 68,
          weakConcepts: ['Cell structures and functions'],
          moduleScores: [62, 71, 75],
        },
      );
      expect(mockAudit.log).not.toHaveBeenCalled();
    });

    it('falls back when live ai-service fails after retry', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await controller.generateDemoInterventionPlan({
        subjectId: 'english',
        quarterExamScore: 80,
      });

      expect(result.success).toBe(true);
      expect(result.degraded).toBe(true);
      expect(result.data.source).toBe('fallback');
      expect(result.data.weakConcepts.length).toBeGreaterThan(0);
      expect(result.data.lxpQuestions.length).toBeGreaterThan(0);
      expect(mockProxy.forward).toHaveBeenCalledTimes(2);
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.extraction.queued',
          targetType: 'uploaded_file',
          targetId: dto.fileId,
          metadata: expect.objectContaining({
            extractionId: EXTRACTION_ID,
          }),
        }),
      );
      expect(result).toEqual({ extractionId: EXTRACTION_ID });
    });

    it('should block teacher extraction for files outside owned classes', async () => {
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue({
        id: 'file-uuid-1',
        classId: CLASS_ID,
      });
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.extractModule({ fileId: 'file-uuid-1' } as any, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });

    it('should return service unavailable when extraction queue endpoint is unreachable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(
        controller.extractModule({ fileId: 'file-uuid-1' } as any, TEACHER_USER),
      ).rejects.toThrow(
        'AI extraction queue is temporarily unavailable. Please retry shortly.',
      );
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

    it('should propagate HttpException for extraction status endpoint', async () => {
      const statusError = new HttpException(
        { message: 'Extraction status is unavailable for this request' },
        403,
      );
      mockProxy.forward.mockRejectedValue(statusError);

      await expect(
        controller.getExtractionStatus(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow(HttpException);
    });

    it('should return degraded fallback payload when extraction status endpoint is unreachable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.extractedModules.findFirst
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          classId: CLASS_ID,
        })
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          extractionStatus: 'failed',
          progressPercent: 90,
          totalChunks: 10,
          processedChunks: 9,
          modelUsed: 'llama3.1',
          errorMessage: 'cached extraction error',
        });

      const result = await controller.getExtractionStatus(
        EXTRACTION_ID,
        TEACHER_USER,
      );

      expect(result).toMatchObject({
        success: true,
        degraded: true,
        message:
          'AI extraction status temporarily unavailable; returning last known extraction status.',
        data: {
          id: EXTRACTION_ID,
          status: 'failed',
          progressPercent: 90,
          totalChunks: 10,
          processedChunks: 9,
          modelUsed: 'llama3.1',
          errorMessage: 'cached extraction error',
        },
      });
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

    it('should return cached extraction fallback list when extraction history is unavailable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.extractedModules.findMany.mockResolvedValue([
        {
          id: EXTRACTION_ID,
          fileId: 'file-uuid-1',
          classId: CLASS_ID,
          teacherId: TEACHER_USER.id,
          extractionStatus: 'completed',
          modelUsed: 'llama3.1',
          errorMessage: null,
          structuredContent: { lessons: [] },
          isApplied: false,
          progressPercent: 100,
          totalChunks: 12,
          processedChunks: 12,
          createdAt: '2026-04-04T00:00:00.000Z',
          updatedAt: '2026-04-04T00:05:00.000Z',
          file: { originalName: 'module.pdf' },
        },
      ]);

      const result = await controller.listExtractions(CLASS_ID, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        degraded: true,
        message:
          'AI extraction history unavailable; returning cached extraction list.',
        data: [
          {
            id: EXTRACTION_ID,
            fileId: 'file-uuid-1',
            classId: CLASS_ID,
            teacherId: TEACHER_USER.id,
            extractionStatus: 'completed',
            modelUsed: 'llama3.1',
            errorMessage: null,
            structuredContent: { lessons: [] },
            isApplied: false,
            progressPercent: 100,
            totalChunks: 12,
            processedChunks: 12,
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T00:05:00.000Z',
            originalName: 'module.pdf',
          },
        ],
      });
    });

    it('should reject teacher class access when listing extraction history outside ownership', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.listExtractions(CLASS_ID, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
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

    it('should return cached extraction detail fallback when extraction endpoint is unreachable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.extractedModules.findFirst
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          classId: CLASS_ID,
        })
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          fileId: 'file-uuid-1',
          classId: CLASS_ID,
          teacherId: TEACHER_USER.id,
          extractionStatus: 'completed',
          modelUsed: 'llama3.1',
          errorMessage: null,
          structuredContent: { lessons: [] },
          isApplied: false,
          progressPercent: 100,
          totalChunks: 10,
          processedChunks: 10,
          createdAt: '2026-04-04T00:00:00.000Z',
          updatedAt: '2026-04-04T00:02:00.000Z',
          file: { originalName: 'module.pdf' },
        });

      const result = await controller.getExtraction(EXTRACTION_ID, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        degraded: true,
        message:
          'AI extraction detail temporarily unavailable; returning cached extraction record.',
        data: {
          id: EXTRACTION_ID,
          fileId: 'file-uuid-1',
          classId: CLASS_ID,
          teacherId: TEACHER_USER.id,
          extractionStatus: 'completed',
          modelUsed: 'llama3.1',
          errorMessage: null,
          structuredContent: { lessons: [] },
          isApplied: false,
          progressPercent: 100,
          totalChunks: 10,
          processedChunks: 10,
          createdAt: '2026-04-04T00:00:00.000Z',
          updatedAt: '2026-04-04T00:02:00.000Z',
          originalName: 'module.pdf',
        },
      });
    });

    it('should reject teacher access to extraction outside owned class', async () => {
      mockDb.query.extractedModules.findFirst.mockResolvedValue({
        id: EXTRACTION_ID,
        classId: CLASS_ID,
      });
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.getExtraction(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.extraction.updated',
          targetType: 'extraction',
          targetId: EXTRACTION_ID,
        }),
      );
      expect(result).toEqual({ updated: true });
    });

    it('should return service unavailable when extraction update endpoint is unreachable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(
        controller.updateExtraction(EXTRACTION_ID, { lessons: [] } as any, TEACHER_USER),
      ).rejects.toThrow(
        'AI extraction update is temporarily unavailable. Please retry shortly.',
      );
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.extraction.applied',
          targetType: 'extraction',
          targetId: EXTRACTION_ID,
          metadata: expect.objectContaining({
            lessonsCreated: 3,
          }),
        }),
      );
      expect(result).toEqual({ lessonsCreated: 3 });
    });

    it('should return cached applied fallback when apply endpoint is unreachable but extraction is already applied', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.extractedModules.findFirst
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          classId: CLASS_ID,
        })
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          isApplied: true,
        });

      const result = await controller.applyExtraction(
        EXTRACTION_ID,
        {},
        TEACHER_USER,
      );

      expect(result).toEqual({
        success: true,
        degraded: true,
        message:
          'Extraction was already applied earlier; returning cached completion state.',
        data: {
          sectionsCreated: 0,
          lessonsCreated: 0,
          assessmentsCreated: 0,
          sections: [],
          lessons: [],
          assessments: [],
        },
      });
    });

    it('should return service unavailable when apply endpoint is unreachable and extraction is not yet applied', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.extractedModules.findFirst
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          classId: CLASS_ID,
        })
        .mockResolvedValueOnce({
          id: EXTRACTION_ID,
          isApplied: false,
        });

      await expect(
        controller.applyExtraction(EXTRACTION_ID, {}, TEACHER_USER),
      ).rejects.toThrow(
        'AI extraction apply is temporarily unavailable. Please retry shortly.',
      );
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.extraction.deleted',
          targetType: 'extraction',
          targetId: EXTRACTION_ID,
        }),
      );
      expect(result).toEqual({ deleted: true });
    });

    it('should return service unavailable when extraction delete endpoint is unreachable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(
        controller.deleteExtraction(EXTRACTION_ID, TEACHER_USER),
      ).rejects.toThrow(
        'AI extraction delete is temporarily unavailable. Please retry shortly.',
      );
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.intervention_recommendation.queued',
          targetType: 'intervention_case',
          targetId: JOB_ID,
          metadata: expect.objectContaining({
            jobId: JOB_ID,
          }),
        }),
      );
      expect(result).toEqual({ jobId: JOB_ID, status: 'pending' });
    });

    it('should propagate proxy HttpException for queue authorization failures', async () => {
      const dto = { note: 'Focus on fractions' };
      const queueError = new HttpException({ message: 'You do not have access to this intervention case' }, 403);
      mockProxy.forward.mockRejectedValue(queueError);

      await expect(
        controller.queueInterventionRecommendation(JOB_ID, dto, TEACHER_USER),
      ).rejects.toThrow(HttpException);
    });

    it('should block queue when teacher does not own intervention case class', async () => {
      const dto = { note: 'Focus on fractions' };
      mockDb.query.interventionCases.findFirst.mockResolvedValue({
        id: JOB_ID,
        classId: CLASS_ID,
      });
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.queueInterventionRecommendation(JOB_ID, dto, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });

    it('should block queue for closed intervention cases', async () => {
      const dto = { note: 'Focus on fractions' };
      mockDb.query.interventionCases.findFirst.mockResolvedValue({
        id: JOB_ID,
        classId: CLASS_ID,
        studentId: 'student-1',
        status: 'completed',
      });

      await expect(
        controller.queueInterventionRecommendation(JOB_ID, dto, TEACHER_USER),
      ).rejects.toThrow(
        'AI recommendations are only available for pending or active intervention cases.',
      );
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });

    it('should block queue when student is no longer at risk', async () => {
      const dto = { note: 'Focus on fractions' };
      mockDb.query.interventionCases.findFirst.mockResolvedValue({
        id: JOB_ID,
        classId: CLASS_ID,
        studentId: 'student-1',
        status: 'active',
      });
      mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
        isAtRisk: false,
      });

      await expect(
        controller.queueInterventionRecommendation(JOB_ID, dto, TEACHER_USER),
      ).rejects.toThrow(
        'AI recommendations are only available when the student is currently at risk.',
      );
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });
  });

  describe('recommendIntervention()', () => {
    it('should forward POST /teacher/interventions/:caseId/recommend with dto and write audit log', async () => {
      const dto = { note: 'Focus on algebra fundamentals' };
      mockProxy.forward.mockResolvedValue({
        success: true,
        data: { recommendations: [] },
      });

      const result = await controller.recommendIntervention(
        JOB_ID,
        dto,
        TEACHER_USER,
      );

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        `/teacher/interventions/${JOB_ID}/recommend`,
        TEACHER_USER,
        dto,
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.intervention_recommendation.generated',
          targetType: 'intervention_case',
          targetId: JOB_ID,
          metadata: expect.objectContaining({
            noteProvided: true,
          }),
        }),
      );
      expect(result).toEqual({
        success: true,
        data: { recommendations: [] },
      });
    });

    it('should block recommendation generation when teacher does not own intervention case class', async () => {
      const dto = { note: 'Focus on algebra fundamentals' };
      mockDb.query.interventionCases.findFirst.mockResolvedValue({
        id: JOB_ID,
        classId: CLASS_ID,
      });
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.recommendIntervention(JOB_ID, dto, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });

    it('should block recommendation generation for closed intervention cases', async () => {
      const dto = { note: 'Focus on algebra fundamentals' };
      mockDb.query.interventionCases.findFirst.mockResolvedValue({
        id: JOB_ID,
        classId: CLASS_ID,
        studentId: 'student-1',
        status: 'completed',
      });

      await expect(
        controller.recommendIntervention(JOB_ID, dto, TEACHER_USER),
      ).rejects.toThrow(
        'AI recommendations are only available for pending or active intervention cases.',
      );
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });
  });

  describe('student tutor visibility filtering', () => {
    it('filters hidden recommendations from bootstrap payload', async () => {
      mockDb.query.enrollments.findMany.mockResolvedValue([{ classId: CLASS_ID }]);
      mockDb.query.classModules.findMany.mockResolvedValue([
        {
          id: 'module-1',
          classId: CLASS_ID,
          isVisible: true,
          isLocked: false,
          sections: [
            {
              items: [
                {
                  itemType: 'lesson',
                  isVisible: true,
                  isGiven: true,
                  lessonId: '11111111-1111-1111-1111-111111111112',
                  assessmentId: null,
                  fileId: null,
                  lesson: { id: '11111111-1111-1111-1111-111111111112', isDraft: false },
                  assessment: null,
                },
              ],
            },
          ],
        },
      ]);
      mockProxy.forward.mockResolvedValue({
        success: true,
        data: {
          recommendations: [
            {
              id: 'allowed',
              title: 'Allowed',
              reason: 'ok',
              focusText: 'focus',
              lessonId: '11111111-1111-1111-1111-111111111112',
            },
            {
              id: 'hidden',
              title: 'Hidden',
              reason: 'nope',
              focusText: 'focus',
              lessonId: '11111111-1111-1111-1111-111111111113',
            },
          ],
          recentLessons: [],
          recentAttempts: [],
          history: [],
          classes: [],
        },
      });

      const result = await controller.studentTutorBootstrap(
        { classId: CLASS_ID } as any,
        STUDENT_USER,
      );

      expect((result as any).data.recommendations).toHaveLength(1);
      expect((result as any).data.recommendations[0].id).toBe('allowed');
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.quiz_draft.queued',
          targetType: 'class',
          targetId: CLASS_ID,
          metadata: expect.objectContaining({
            jobId: JOB_ID,
            questionCount: 5,
          }),
        }),
      );
      expect(result).toEqual({ jobId: JOB_ID, status: 'pending' });
    });

    it('should block quiz draft queue when teacher does not own class', async () => {
      const dto = {
        classId: CLASS_ID,
        questionCount: 5,
        questionType: 'multiple_choice',
        assessmentType: 'quiz',
        passingScore: 60,
        feedbackLevel: 'standard',
      };
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.queueQuizDraftJob(dto as any, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });
  });

  describe('generateQuizDraft()', () => {
    it('should forward POST /teacher/quizzes/generate-draft with dto and write audit log', async () => {
      const dto = {
        classId: CLASS_ID,
        questionCount: 8,
        questionType: 'multiple_choice',
        assessmentType: 'quiz',
        passingScore: 70,
        feedbackLevel: 'standard',
      };
      mockProxy.forward.mockResolvedValue({
        success: true,
        data: { draftId: 'draft-1' },
      });

      const result = await controller.generateQuizDraft(dto as any, TEACHER_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        '/teacher/quizzes/generate-draft',
        TEACHER_USER,
        dto,
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.quiz_draft.generated',
          targetType: 'class',
          targetId: CLASS_ID,
          metadata: expect.objectContaining({
            questionCount: 8,
            questionType: 'multiple_choice',
            assessmentType: 'quiz',
          }),
        }),
      );
      expect(result).toEqual({
        success: true,
        data: { draftId: 'draft-1' },
      });
    });

    it('should block quiz draft generation when teacher does not own class', async () => {
      const dto = {
        classId: CLASS_ID,
        questionCount: 8,
        questionType: 'multiple_choice',
        assessmentType: 'quiz',
        passingScore: 70,
        feedbackLevel: 'standard',
      };
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.generateQuizDraft(dto as any, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
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

    it('should return degraded fallback payload when AI status endpoint is unreachable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.aiGenerationJobs.findFirst.mockResolvedValue({
        id: JOB_ID,
        teacherId: TEACHER_USER.id,
        jobType: 'quiz_generation',
        status: 'completed',
        errorMessage: null,
        sourceFilters: {
          runtime: {
            progressPercent: 88,
            statusMessage: 'Draft ready for teacher review',
          },
        },
        updatedAt: '2026-04-04T00:10:00.000Z',
      });
      mockDb.query.aiGenerationOutputs.findFirst.mockResolvedValue({
        id: 'output-1',
      });
      mockDb.query.assessments.findFirst.mockResolvedValue({
        id: 'assessment-1',
      });

      const result = await controller.getTeacherJobStatus(JOB_ID, TEACHER_USER);

      expect(result).toMatchObject({
        success: true,
        degraded: true,
        message:
          'AI job status temporarily unavailable; returning cached job status.',
        data: {
          jobId: JOB_ID,
          jobType: 'quiz_generation',
          status: 'completed',
          progressPercent: 88,
          statusMessage: 'Draft ready for teacher review',
          errorMessage: 'connect ECONNREFUSED',
          outputId: 'output-1',
          assessmentId: 'assessment-1',
        },
      });
    });

    it('should block status polling when teacher does not own AI generation job', async () => {
      mockDb.query.aiGenerationJobs.findFirst.mockResolvedValue({
        id: JOB_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.getTeacherJobStatus(JOB_ID, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this AI generation job.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
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

    it('should propagate proxy HttpException when result is not ready', async () => {
      const resultPendingError = new HttpException(
        { message: 'AI generation result is not ready yet' },
        409,
      );
      mockProxy.forward.mockRejectedValue(resultPendingError);

      await expect(
        controller.getTeacherJobResult(JOB_ID, TEACHER_USER),
      ).rejects.toThrow(HttpException);
    });

    it('should return degraded fallback when result endpoint is unreachable', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.aiGenerationJobs.findFirst.mockResolvedValue({
        id: JOB_ID,
        teacherId: TEACHER_USER.id,
        jobType: 'remedial_plan_generation',
        status: 'completed',
        errorMessage: null,
        sourceFilters: {
          runtime: {
            retryState: { attempt: 2, maxAttempts: 3 },
            resultSummary: { caseId: 'case-1' },
          },
        },
        updatedAt: '2026-04-04T00:12:00.000Z',
      });
      mockDb.query.aiGenerationOutputs.findFirst.mockResolvedValue({
        id: 'output-2',
        outputType: 'intervention_recommendation',
        structuredOutput: { caseId: 'case-1', weakConcepts: ['Fractions'] },
      });

      const result = await controller.getTeacherJobResult(
        JOB_ID,
        TEACHER_USER,
      );

      expect(result).toMatchObject({
        success: true,
        degraded: true,
        message:
          'AI job result temporarily unavailable; returning cached generated result.',
        data: {
          job: {
            jobId: JOB_ID,
            jobType: 'remedial_plan_generation',
            status: 'completed',
            outputId: 'output-2',
          },
          result: {
            outputId: 'output-2',
            outputType: 'intervention_recommendation',
            structuredOutput: {
              caseId: 'case-1',
              weakConcepts: ['Fractions'],
              runtime: { caseId: 'case-1' },
            },
          },
          errorMessage: 'connect ECONNREFUSED',
        },
      });
    });

    it('should return cached job state when AI result endpoint is unreachable and output is not ready', async () => {
      mockProxy.forward.mockRejectedValue(new Error('connect ECONNREFUSED'));
      mockDb.query.aiGenerationJobs.findFirst.mockResolvedValue({
        id: JOB_ID,
        teacherId: TEACHER_USER.id,
        jobType: 'quiz_generation',
        status: 'processing',
        errorMessage: null,
        sourceFilters: null,
        updatedAt: '2026-04-04T00:15:00.000Z',
      });
      mockDb.query.aiGenerationOutputs.findFirst.mockResolvedValue(null);

      const result = await controller.getTeacherJobResult(
        JOB_ID,
        TEACHER_USER,
      );

      expect(result).toMatchObject({
        success: true,
        degraded: true,
        message:
          'AI job result temporarily unavailable; returning cached job state.',
        data: {
          jobId: JOB_ID,
          status: 'processing',
          result: null,
          errorMessage: 'connect ECONNREFUSED',
        },
      });
    });

    it('should block result retrieval when teacher does not own AI generation job', async () => {
      mockDb.query.aiGenerationJobs.findFirst.mockResolvedValue({
        id: JOB_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.getTeacherJobResult(JOB_ID, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this AI generation job.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
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

  describe('reindexClass()', () => {
    it('should forward POST /index/classes/:classId for owned teacher class', async () => {
      mockProxy.forward.mockResolvedValue({ success: true, message: 'queued' });

      const result = await controller.reindexClass(CLASS_ID, TEACHER_USER);

      expect(mockProxy.forward).toHaveBeenCalledWith(
        'POST',
        `/index/classes/${CLASS_ID}`,
        TEACHER_USER,
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_USER.id,
          action: 'ai.class_content.reindex_queued',
          targetType: 'class',
          targetId: CLASS_ID,
        }),
      );
      expect(result).toEqual({ success: true, message: 'queued' });
    });

    it('should block reindex for teacher class outside ownership', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'other-teacher',
      });

      await expect(
        controller.reindexClass(CLASS_ID, TEACHER_USER),
      ).rejects.toThrow('You do not have access to this class.');
      expect(mockProxy.forward).not.toHaveBeenCalled();
    });
  });
});
