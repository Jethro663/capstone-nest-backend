import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { AiProxyService } from './ai-proxy.service';
import { ChatRequestDto } from './DTO/chat.dto';
import { MentorExplainDto } from './DTO/mentor-explain.dto';
import {
  ExtractModuleDto,
  ApplyExtractionDto,
  UpdateExtractionDto,
} from './DTO/extract-module.dto';
import { GenerateQuizDraftDto } from './DTO/quiz-generation.dto';
import { InterventionRecommendationDto } from './DTO/intervention-recommendation.dto';
import {
  StudentTutorAnswersDto,
  StudentTutorBootstrapQueryDto,
  StudentTutorMessageDto,
  StudentTutorStartDto,
} from './DTO/student-tutor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { DatabaseService } from '../../database/database.service';
import {
  classModules,
  enrollments,
} from '../../drizzle/schema';
import { and, eq, inArray } from 'drizzle-orm';

@ApiTags('AI Mentor')
@ApiBearerAuth('token')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiMentorController {
  private readonly logger = new Logger(AiMentorController.name);

  constructor(
    private readonly proxy: AiProxyService,
    private readonly databaseService: DatabaseService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isTutorItemVisible(item: {
    itemType: 'lesson' | 'assessment' | 'file';
    isVisible: boolean;
    isGiven: boolean;
    lesson?: { isDraft: boolean } | null;
    assessment?: { isPublished: boolean | null } | null;
    fileId?: string | null;
  }) {
    if (!item.isVisible) return false;
    if (item.itemType === 'lesson') {
      return Boolean(item.lesson && !item.lesson.isDraft);
    }
    if (item.itemType === 'assessment') {
      return Boolean(item.assessment && item.assessment.isPublished && item.isGiven);
    }
    return Boolean(item.fileId);
  }

  private unwrapEnvelope(payload: unknown) {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return {
        isEnvelope: true,
        envelope: payload as Record<string, unknown>,
        data: (payload as { data: unknown }).data,
      };
    }
    return { isEnvelope: false, envelope: null, data: payload };
  }

  private isAllowedRecommendation(
    recommendation: { lessonId?: string | null; assessmentId?: string | null } | null | undefined,
    allowedLessonIds: Set<string>,
    allowedAssessmentIds: Set<string>,
  ) {
    if (!recommendation) return false;
    if (
      recommendation.lessonId &&
      !allowedLessonIds.has(recommendation.lessonId)
    ) {
      return false;
    }
    if (
      recommendation.assessmentId &&
      !allowedAssessmentIds.has(recommendation.assessmentId)
    ) {
      return false;
    }
    return true;
  }

  private sanitizeTutorCitations(
    citations: unknown,
    allowedLessonIds: Set<string>,
    allowedAssessmentIds: Set<string>,
  ) {
    if (!Array.isArray(citations)) return [];
    return citations.filter((entry) =>
      this.isAllowedRecommendation(
        entry as { lessonId?: string | null; assessmentId?: string | null },
        allowedLessonIds,
        allowedAssessmentIds,
      ),
    );
  }

  private async getAllowedTutorSourceIds(studentId: string, classId?: string) {
    const enrollmentRows = await this.db.query.enrollments.findMany({
      where: classId
        ? and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.classId, classId),
          )
        : eq(enrollments.studentId, studentId),
      columns: {
        classId: true,
      },
    });

    const classIds = Array.from(
      new Set(
        enrollmentRows
          .map((row) => row.classId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (classIds.length === 0) {
      return { allowedLessonIds: new Set<string>(), allowedAssessmentIds: new Set<string>() };
    }

    const modules = await this.db.query.classModules.findMany({
      where: and(
        inArray(classModules.classId, classIds),
        eq(classModules.isVisible, true),
      ),
      with: {
        sections: {
          with: {
            items: {
              columns: {
                itemType: true,
                isVisible: true,
                isGiven: true,
                lessonId: true,
                assessmentId: true,
                fileId: true,
              },
              with: {
                lesson: {
                  columns: {
                    id: true,
                    isDraft: true,
                  },
                },
                assessment: {
                  columns: {
                    id: true,
                    isPublished: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const allowedLessonIds = new Set<string>();
    const allowedAssessmentIds = new Set<string>();

    modules.forEach((module) => {
      if (module.isLocked) return;
      module.sections.forEach((section) => {
        section.items.forEach((item) => {
          if (!this.isTutorItemVisible(item as typeof item & { fileId?: string | null })) {
            return;
          }
          if (item.itemType === 'lesson' && item.lessonId) {
            allowedLessonIds.add(item.lessonId);
          }
          if (item.itemType === 'assessment' && item.assessmentId) {
            allowedAssessmentIds.add(item.assessmentId);
          }
        });
      });
    });

    return { allowedLessonIds, allowedAssessmentIds };
  }

  private async resolveTutorSessionClassId(
    sessionId: string,
    user: { id: string; email: string; roles: string[] },
  ) {
    const sessionPayload = await this.proxy.forward(
      'GET',
      `/student/tutor/session/${sessionId}`,
      user,
    );
    const unwrapped = this.unwrapEnvelope(sessionPayload);
    if (!unwrapped.data || typeof unwrapped.data !== 'object') return undefined;
    const rawData = unwrapped.data as Record<string, unknown>;
    if (!rawData.state || typeof rawData.state !== 'object') return undefined;
    const state = rawData.state as Record<string, unknown>;
    return typeof state.classId === 'string' ? state.classId : undefined;
  }

  // ─── JAKIPIR Chat ──────────────────────────────────────────────────────

  /**
   * POST /api/ai/chat
   * Multi-turn AI Mentor chat with JAKIPIR ("Ja").
   * Students only — Ja is a personalized learning detective.
   *
   * First message:   { "message": "Hi Ja!" }
   * Follow-up:       { "message": "Tell me more", "sessionId": "<from-prev>" }
   */
  @Post('chat')
  @Roles(RoleName.Student, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with Ja (JAKIPIR AI Mentor)' })
  @ApiResponse({ status: 200, description: "Ja's reply + session ID" })
  async chat(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', '/chat', user, dto);
  }

  @Post('mentor/explain')
  @Roles(RoleName.Student, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get grounded mentoring help for a returned assessment question' })
  async explainMistake(
    @Body() dto: MentorExplainDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', '/mentor/explain', user, dto);
  }

  @Get('student/tutor/bootstrap')
  @Roles(RoleName.Student)
  @ApiOperation({ summary: 'Get student tutor classes, recommendations, and saved sessions' })
  async studentTutorBootstrap(
    @Query() query: StudentTutorBootstrapQueryDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const suffix = query.classId ? `?classId=${query.classId}` : '';
    const payload = await this.proxy.forward(
      'GET',
      `/student/tutor/bootstrap${suffix}`,
      user,
    );
    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAllowedTutorSourceIds(user.id, query.classId);
    const unwrapped = this.unwrapEnvelope(payload);
    const rawData =
      (unwrapped.data && typeof unwrapped.data === 'object'
        ? (unwrapped.data as Record<string, unknown>)
        : {}) ?? {};

    const sanitizedData = {
      ...rawData,
      recentLessons: Array.isArray(rawData.recentLessons)
        ? rawData.recentLessons.filter((entry) =>
            this.isAllowedRecommendation(
              entry as { lessonId?: string | null; assessmentId?: string | null },
              allowedLessonIds,
              allowedAssessmentIds,
            ),
          )
        : [],
      recentAttempts: Array.isArray(rawData.recentAttempts)
        ? rawData.recentAttempts.filter((entry) =>
            this.isAllowedRecommendation(
              entry as { lessonId?: string | null; assessmentId?: string | null },
              allowedLessonIds,
              allowedAssessmentIds,
            ),
          )
        : [],
      recommendations: Array.isArray(rawData.recommendations)
        ? rawData.recommendations.filter((entry) =>
            this.isAllowedRecommendation(
              entry as { lessonId?: string | null; assessmentId?: string | null },
              allowedLessonIds,
              allowedAssessmentIds,
            ),
          )
        : [],
    };

    if (!unwrapped.isEnvelope || !unwrapped.envelope) {
      return sanitizedData;
    }
    return {
      ...unwrapped.envelope,
      data: sanitizedData,
    };
  }

  @Post('student/tutor/session')
  @Roles(RoleName.Student)
  @ApiOperation({ summary: 'Start a student tutor session from a recommended topic' })
  async startStudentTutorSession(
    @Body() dto: StudentTutorStartDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAllowedTutorSourceIds(user.id, dto.classId);

    if (
      !this.isAllowedRecommendation(
        dto.recommendation,
        allowedLessonIds,
        allowedAssessmentIds,
      )
    ) {
      throw new ForbiddenException(
        'Selected tutor recommendation is no longer available to the student.',
      );
    }

    const payload = await this.proxy.forward(
      'POST',
      '/student/tutor/session',
      user,
      dto,
    );
    const unwrapped = this.unwrapEnvelope(payload);
    const rawData =
      (unwrapped.data && typeof unwrapped.data === 'object'
        ? (unwrapped.data as Record<string, unknown>)
        : {}) ?? {};

    const sanitizedData = {
      ...rawData,
      recommendation:
        this.isAllowedRecommendation(
          rawData.recommendation as {
            lessonId?: string | null;
            assessmentId?: string | null;
          },
          allowedLessonIds,
          allowedAssessmentIds,
        ) || !rawData.recommendation
          ? rawData.recommendation
          : null,
      citations: this.sanitizeTutorCitations(
        rawData.citations,
        allowedLessonIds,
        allowedAssessmentIds,
      ),
    };

    if (!unwrapped.isEnvelope || !unwrapped.envelope) {
      return sanitizedData;
    }
    return {
      ...unwrapped.envelope,
      data: sanitizedData,
    };
  }

  @Get('student/tutor/session/:sessionId')
  @Roles(RoleName.Student)
  @ApiOperation({ summary: 'Load a saved student tutor session' })
  async getStudentTutorSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const payload = await this.proxy.forward(
      'GET',
      `/student/tutor/session/${sessionId}`,
      user,
    );
    const unwrapped = this.unwrapEnvelope(payload);
    const rawData =
      (unwrapped.data && typeof unwrapped.data === 'object'
        ? (unwrapped.data as Record<string, unknown>)
        : {}) ?? {};

    const sessionState =
      rawData.state && typeof rawData.state === 'object'
        ? (rawData.state as Record<string, unknown>)
        : null;
    const classId =
      typeof sessionState?.classId === 'string' ? sessionState.classId : undefined;
    if (!classId) return payload;

    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAllowedTutorSourceIds(user.id, classId);

    const sanitizedState = sessionState
      ? {
          ...sessionState,
          recommendation:
            this.isAllowedRecommendation(
              sessionState.recommendation as {
                lessonId?: string | null;
                assessmentId?: string | null;
              },
              allowedLessonIds,
              allowedAssessmentIds,
            ) || !sessionState.recommendation
              ? sessionState.recommendation
              : null,
          citations: this.sanitizeTutorCitations(
            sessionState.citations,
            allowedLessonIds,
            allowedAssessmentIds,
          ),
        }
      : null;

    const sanitizedData = {
      ...rawData,
      state: sanitizedState,
    };

    if (!unwrapped.isEnvelope || !unwrapped.envelope) {
      return sanitizedData;
    }
    return {
      ...unwrapped.envelope,
      data: sanitizedData,
    };
  }

  @Post('student/tutor/session/:sessionId/message')
  @Roles(RoleName.Student)
  @ApiOperation({ summary: 'Send a follow-up message to a student tutor session' })
  async messageStudentTutorSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: StudentTutorMessageDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const payload = await this.proxy.forward(
      'POST',
      `/student/tutor/session/${sessionId}/message`,
      user,
      dto,
    );
    const unwrapped = this.unwrapEnvelope(payload);
    const rawData =
      (unwrapped.data && typeof unwrapped.data === 'object'
        ? (unwrapped.data as Record<string, unknown>)
        : {}) ?? {};
    const classId = await this.resolveTutorSessionClassId(sessionId, user);
    if (!classId) return payload;

    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAllowedTutorSourceIds(user.id, classId);

    const sanitizedData = {
      ...rawData,
      citations: this.sanitizeTutorCitations(
        rawData.citations,
        allowedLessonIds,
        allowedAssessmentIds,
      ),
    };

    if (!unwrapped.isEnvelope || !unwrapped.envelope) {
      return sanitizedData;
    }
    return {
      ...unwrapped.envelope,
      data: sanitizedData,
    };
  }

  @Post('student/tutor/session/:sessionId/answers')
  @Roles(RoleName.Student)
  @ApiOperation({ summary: 'Evaluate the current practice round for a student tutor session' })
  async answerStudentTutorSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: StudentTutorAnswersDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const payload = await this.proxy.forward(
      'POST',
      `/student/tutor/session/${sessionId}/answers`,
      user,
      dto,
    );
    const unwrapped = this.unwrapEnvelope(payload);
    const rawData =
      (unwrapped.data && typeof unwrapped.data === 'object'
        ? (unwrapped.data as Record<string, unknown>)
        : {}) ?? {};
    const classId = await this.resolveTutorSessionClassId(sessionId, user);
    if (!classId) return payload;

    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAllowedTutorSourceIds(user.id, classId);

    const sanitizedData = {
      ...rawData,
      citations: this.sanitizeTutorCitations(
        rawData.citations,
        allowedLessonIds,
        allowedAssessmentIds,
      ),
    };

    if (!unwrapped.isEnvelope || !unwrapped.envelope) {
      return sanitizedData;
    }
    return {
      ...unwrapped.envelope,
      data: sanitizedData,
    };
  }

  // ─── Health check ─────────────────────────────────────────────────────

  /**
   * GET /api/ai/health
   * Returns Ollama availability + configured model.
   * Public so the frontend can show a status indicator.
   */
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Check Ollama availability' })
  async health() {
    try {
      return await this.proxy.forward('GET', '/health', {
        id: '',
        email: '',
        roles: [],
      });
    } catch (error) {
      this.logger.warn(
        `AI health degraded fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: true,
        degraded: true,
        message: 'AI service unavailable; reporting offline status.',
        data: {
          ollamaAvailable: false,
          configuredModel: 'offline',
        },
      };
    }
  }

  // ─── Module Extraction ─────────────────────────────────────────────────

  /**
   * POST /api/ai/extract-module
   * Queues a PDF → structured lesson extraction job.
   * Returns immediately with extractionId for polling.
   */
  @Post('extract-module')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue extraction of structured lessons from an uploaded PDF',
  })
  @ApiResponse({
    status: 202,
    description: 'Extraction queued — poll for status',
  })
  async extractModule(
    @Body() dto: ExtractModuleDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', '/extract', user, dto);
  }

  // ─── Extraction status (polling) ──────────────────────────────────────

  /**
   * GET /api/ai/extractions/:id/status
   * Returns extraction progress for polling.
   */
  @Get('extractions/:id/status')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Poll extraction status and progress' })
  async getExtractionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', `/extractions/${id}/status`, user);
  }

  // ─── List extractions ─────────────────────────────────────────────────

  /**
   * GET /api/ai/extractions?classId=...
   * Lists past extraction attempts for a class.
   */
  @Get('extractions')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'List module extractions for a class' })
  @ApiQuery({ name: 'classId', type: String, required: true })
  async listExtractions(
    @Query('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    try {
      return await this.proxy.forward(
        'GET',
        `/extractions?classId=${classId}`,
        user,
      );
    } catch (error) {
      this.logger.warn(
        `AI extraction list degraded fallback for class ${classId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        success: true,
        degraded: true,
        message: 'AI extraction history unavailable; returning an empty list.',
        data: [],
      };
    }
  }

  // ─── Get single extraction ─────────────────────────────────────────────

  /**
   * GET /api/ai/extractions/:id
   * Retrieves a single extraction with full structured content.
   */
  @Get('extractions/:id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Get extraction details' })
  async getExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', `/extractions/${id}`, user);
  }

  // ─── Update extraction (edit before applying) ─────────────────────────

  /**
   * PATCH /api/ai/extractions/:id
   * Updates the structured content of a completed extraction.
   * Teacher can edit lesson titles, block content, reorder, etc. before applying.
   */
  @Patch('extractions/:id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({
    summary: 'Edit extraction structured content before applying',
  })
  @ApiResponse({ status: 200, description: 'Extraction updated' })
  async updateExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExtractionDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('PATCH', `/extractions/${id}`, user, dto);
  }

  // ─── Apply extraction → create lessons ─────────────────────────────────

  /**
   * POST /api/ai/extractions/:id/apply
   * Takes a completed extraction and creates actual lesson + content block
   * records in the database. Supports selective lesson application.
   */
  @Post('extractions/:id/apply')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apply extraction → create lessons (optionally selective)',
  })
  @ApiResponse({ status: 201, description: 'Lessons created from extraction' })
  async applyExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyExtractionDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', `/extractions/${id}/apply`, user, dto);
  }

  // ─── Delete extraction ─────────────────────────────────────────────────

  /**
   * DELETE /api/ai/extractions/:id
   * Deletes an extraction that hasn't been applied yet.
   */
  @Delete('extractions/:id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Delete an unapplied extraction' })
  async deleteExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('DELETE', `/extractions/${id}`, user);
  }

  // ─── AI interaction history ────────────────────────────────────────────

  /**
   * GET /api/ai/history
   * Returns the current user's AI interaction log (latest 20).
   */
  @Get('history')
  @Roles(RoleName.Student, RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Get AI interaction history' })
  async history(
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    try {
      return await this.proxy.forward('GET', '/history', user);
    } catch (error) {
      this.logger.warn(
        `AI history degraded fallback for ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: true,
        degraded: true,
        message: 'AI history unavailable; returning an empty list.',
        data: [],
      };
    }
  }

  @Post('teacher/interventions/:caseId/recommend')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Generate AI intervention recommendations for an active LXP case' })
  async recommendIntervention(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: InterventionRecommendationDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward(
      'POST',
      `/teacher/interventions/${caseId}/recommend`,
      user,
      dto,
    );
  }

  @Post('teacher/interventions/:caseId/jobs')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue AI intervention recommendation generation for an active LXP case' })
  async queueInterventionRecommendation(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: InterventionRecommendationDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward(
      'POST',
      `/teacher/interventions/${caseId}/jobs`,
      user,
      dto,
    );
  }

  @Post('teacher/quizzes/generate-draft')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a grounded draft assessment from lesson/module sources' })
  async generateQuizDraft(
    @Body() dto: GenerateQuizDraftDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', '/teacher/quizzes/generate-draft', user, dto);
  }

  @Post('teacher/quizzes/jobs')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue grounded AI draft assessment generation from lesson/module sources' })
  async queueQuizDraftJob(
    @Body() dto: GenerateQuizDraftDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', '/teacher/quizzes/jobs', user, dto);
  }

  @Get('teacher/jobs/:jobId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Poll the status of a teacher AI generation job' })
  async getTeacherJobStatus(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', `/teacher/jobs/${jobId}`, user);
  }

  @Get('teacher/jobs/:jobId/result')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Get the completed result of a teacher AI generation job' })
  async getTeacherJobResult(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', `/teacher/jobs/${jobId}/result`, user);
  }

  @Post('index/classes/:classId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Reindex class lesson and assessment content for semantic retrieval' })
  async reindexClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', `/index/classes/${classId}`, user);
  }
}
