import {
  BadRequestException,
  Controller,
  ForbiddenException,
  HttpException,
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
  NotFoundException,
  ServiceUnavailableException,
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
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../../database/database.service';
import {
  aiGenerationJobs,
  aiGenerationOutputs,
  assessments,
  classes,
  classModules,
  enrollments,
  extractedModules,
  interventionCases,
  uploadedFiles,
} from '../../drizzle/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

@ApiTags('AI Mentor')
@ApiBearerAuth('token')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiMentorController {
  private readonly logger = new Logger(AiMentorController.name);

  constructor(
    private readonly proxy: AiProxyService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private toIsoDate(value: unknown) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return new Date().toISOString();
  }

  private toExtractionFallbackPayload(
    extraction: {
      id: string;
      fileId: string;
      classId: string;
      teacherId: string;
      extractionStatus: string;
      modelUsed: string | null;
      errorMessage: string | null;
      structuredContent: unknown;
      isApplied: boolean;
      progressPercent: number;
      totalChunks: number | null;
      processedChunks: number;
      createdAt: Date | string;
      updatedAt: Date | string;
      file?: { originalName: string } | null;
    },
  ) {
    return {
      id: extraction.id,
      fileId: extraction.fileId,
      classId: extraction.classId,
      teacherId: extraction.teacherId,
      extractionStatus: extraction.extractionStatus,
      modelUsed: extraction.modelUsed ?? null,
      errorMessage: extraction.errorMessage ?? null,
      structuredContent: extraction.structuredContent ?? null,
      isApplied: extraction.isApplied,
      progressPercent: extraction.progressPercent ?? 0,
      totalChunks: extraction.totalChunks ?? null,
      processedChunks: extraction.processedChunks ?? 0,
      createdAt: this.toIsoDate(extraction.createdAt),
      updatedAt: this.toIsoDate(extraction.updatedAt),
      originalName: extraction.file?.originalName ?? undefined,
    };
  }

  private hasRole(userRoles: string[] | undefined, role: RoleName) {
    return Array.isArray(userRoles) && userRoles.includes(role);
  }

  private async assertTeacherClassAccess(
    classId: string,
    user: { id: string; email: string; roles: string[] },
  ) {
    if (this.hasRole(user.roles, RoleName.Admin)) {
      return;
    }
    if (!this.hasRole(user.roles, RoleName.Teacher)) {
      throw new ForbiddenException('Only teachers and admins can access this class.');
    }

    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: {
        id: true,
        teacherId: true,
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }

    if (classRecord.teacherId !== user.id) {
      throw new ForbiddenException('You do not have access to this class.');
    }
  }

  private async assertTeacherExtractionAccess(
    extractionId: string,
    user: { id: string; email: string; roles: string[] },
  ) {
    if (this.hasRole(user.roles, RoleName.Admin)) {
      return;
    }
    if (!this.hasRole(user.roles, RoleName.Teacher)) {
      throw new ForbiddenException('Only teachers and admins can access this extraction.');
    }

    const extraction = await this.db.query.extractedModules.findFirst({
      where: eq(extractedModules.id, extractionId),
      columns: {
        id: true,
        classId: true,
      },
    });

    if (!extraction) {
      throw new NotFoundException(`Extraction with ID "${extractionId}" not found`);
    }

    await this.assertTeacherClassAccess(extraction.classId, user);
  }

  private async assertTeacherFileAccess(
    fileId: string,
    user: { id: string; email: string; roles: string[] },
  ) {
    if (this.hasRole(user.roles, RoleName.Admin)) {
      return;
    }
    if (!this.hasRole(user.roles, RoleName.Teacher)) {
      throw new ForbiddenException('Only teachers and admins can start module extraction.');
    }

    const file = await this.db.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.id, fileId),
      columns: {
        id: true,
        classId: true,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID "${fileId}" not found`);
    }
    if (!file.classId) {
      throw new BadRequestException(
        'Extraction requires a class-scoped uploaded file.',
      );
    }

    await this.assertTeacherClassAccess(file.classId, user);
  }

  private async assertTeacherInterventionCaseAccess(
    caseId: string,
    user: { id: string; email: string; roles: string[] },
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        status: true,
      },
    });

    if (!interventionCase) {
      throw new NotFoundException(`Intervention case with ID "${caseId}" not found`);
    }

    await this.assertTeacherClassAccess(interventionCase.classId, user);

    if (interventionCase.status !== 'active') {
      throw new BadRequestException(
        'AI recommendations are only available for active intervention cases.',
      );
    }
  }

  private async assertTeacherJobAccess(
    jobId: string,
    user: { id: string; email: string; roles: string[] },
  ) {
    const job = await this.db.query.aiGenerationJobs.findFirst({
      where: eq(aiGenerationJobs.id, jobId),
      columns: {
        id: true,
        teacherId: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`AI generation job with ID "${jobId}" not found`);
    }

    if (this.hasRole(user.roles, RoleName.Admin)) {
      return;
    }
    if (!this.hasRole(user.roles, RoleName.Teacher)) {
      throw new ForbiddenException(
        'Only teachers and admins can access AI generation jobs.',
      );
    }
    if (!job.teacherId || job.teacherId !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this AI generation job.',
      );
    }
  }

  private extractRuntimeFromSourceFilters(
    sourceFilters: unknown,
  ): Record<string, unknown> | null {
    if (!sourceFilters || typeof sourceFilters !== 'object') {
      return null;
    }
    const runtime = (sourceFilters as Record<string, unknown>).runtime;
    if (!runtime || typeof runtime !== 'object') {
      return null;
    }
    return runtime as Record<string, unknown>;
  }

  private runtimeProgressForStatus(
    status: string,
    runtime: Record<string, unknown> | null,
  ): number {
    const rawPercent = runtime?.progressPercent;
    if (typeof rawPercent === 'number' && Number.isFinite(rawPercent)) {
      return Math.max(0, Math.min(100, Math.round(rawPercent)));
    }
    if (typeof rawPercent === 'string') {
      const parsed = Number(rawPercent);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return {
      pending: 5,
      processing: 60,
      completed: 100,
      approved: 100,
      rejected: 100,
      failed: 100,
    }[status] ?? 0;
  }

  private async resolveAssessmentIdForOutput(outputId: string | null) {
    if (!outputId) return null;
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.aiGenerationOutputId, outputId),
      columns: {
        id: true,
      },
    });
    return assessment?.id ?? null;
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

  private readStringField(payload: unknown, key: string): string | null {
    if (
      payload &&
      typeof payload === 'object' &&
      key in payload &&
      typeof (payload as Record<string, unknown>)[key] === 'string'
    ) {
      return (payload as Record<string, string>)[key];
    }
    return null;
  }

  private readNumberField(payload: unknown, key: string): number | null {
    if (
      payload &&
      typeof payload === 'object' &&
      key in payload &&
      typeof (payload as Record<string, unknown>)[key] === 'number'
    ) {
      return (payload as Record<string, number>)[key];
    }
    return null;
  }

  private extractStringField(payload: unknown, key: string): string | null {
    const unwrapped = this.unwrapEnvelope(payload);
    return (
      this.readStringField(unwrapped.data, key) ?? this.readStringField(payload, key)
    );
  }

  private extractNumberField(payload: unknown, key: string): number | null {
    const unwrapped = this.unwrapEnvelope(payload);
    return (
      this.readNumberField(unwrapped.data, key) ?? this.readNumberField(payload, key)
    );
  }

  private async logAuditSafe(params: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.auditService.log(params);
    } catch (error) {
      this.logger.warn(
        `Audit logging failed for ${params.action} (${params.targetType}:${params.targetId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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

  // â”€â”€â”€ JAKIPIR Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * POST /api/ai/chat
   * Multi-turn AI Mentor chat with JAKIPIR ("Ja").
   * Students only â€” Ja is a personalized learning detective.
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

  // â”€â”€â”€ Health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€â”€ Module Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * POST /api/ai/extract-module
   * Queues a PDF â†’ structured lesson extraction job.
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
    description: 'Extraction queued â€” poll for status',
  })
  async extractModule(
    @Body() dto: ExtractModuleDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.assertTeacherFileAccess(dto.fileId, user);
    try {
      const result = await this.proxy.forward('POST', '/extract', user, dto);
      await this.logAuditSafe({
        actorId: user.id,
        action: 'ai.extraction.queued',
        targetType: 'uploaded_file',
        targetId: dto.fileId,
        metadata: {
          extractionId: this.extractStringField(result, 'extractionId'),
        },
      });
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown extraction queue error';
      this.logger.warn(
        `AI extraction queue unavailable for file ${dto.fileId}: ${message}`,
      );
      throw new ServiceUnavailableException(
        'AI extraction queue is temporarily unavailable. Please retry shortly.',
      );
    }
  }

  // â”€â”€â”€ Extraction status (polling) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    await this.assertTeacherExtractionAccess(id, user);
    try {
      return await this.proxy.forward('GET', `/extractions/${id}/status`, user);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown extraction status error';
      this.logger.warn(
        `AI extraction status degraded fallback for ${id}: ${message}`,
      );

      const cachedExtraction = await this.db.query.extractedModules.findFirst({
        where: eq(extractedModules.id, id),
        columns: {
          id: true,
          extractionStatus: true,
          progressPercent: true,
          totalChunks: true,
          processedChunks: true,
          modelUsed: true,
          errorMessage: true,
        },
      });

      if (!cachedExtraction) {
        throw new NotFoundException(`Extraction with ID "${id}" not found`);
      }

      return {
        success: true,
        degraded: true,
        message:
          'AI extraction status temporarily unavailable; returning last known extraction status.',
        data: {
          id,
          status: cachedExtraction.extractionStatus,
          progressPercent: cachedExtraction.progressPercent ?? 0,
          totalChunks: cachedExtraction.totalChunks ?? null,
          processedChunks: cachedExtraction.processedChunks ?? 0,
          modelUsed: cachedExtraction.modelUsed ?? null,
          errorMessage: cachedExtraction.errorMessage ?? message,
        },
      };
    }
  }

  // â”€â”€â”€ List extractions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    await this.assertTeacherClassAccess(classId, user);
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

      const cachedExtractions = await this.db.query.extractedModules.findMany({
        where: eq(extractedModules.classId, classId),
        columns: {
          id: true,
          fileId: true,
          classId: true,
          teacherId: true,
          extractionStatus: true,
          modelUsed: true,
          errorMessage: true,
          structuredContent: true,
          isApplied: true,
          progressPercent: true,
          totalChunks: true,
          processedChunks: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          file: {
            columns: {
              originalName: true,
            },
          },
        },
        orderBy: [desc(extractedModules.createdAt)],
      });

      return {
        success: true,
        degraded: true,
        message:
          'AI extraction history unavailable; returning cached extraction list.',
        data: cachedExtractions.map((entry) =>
          this.toExtractionFallbackPayload(entry),
        ),
      };
    }
  }

  // â”€â”€â”€ Get single extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    await this.assertTeacherExtractionAccess(id, user);
    try {
      return await this.proxy.forward('GET', `/extractions/${id}`, user);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown extraction detail error';
      this.logger.warn(
        `AI extraction detail degraded fallback for ${id}: ${message}`,
      );

      const cachedExtraction = await this.db.query.extractedModules.findFirst({
        where: eq(extractedModules.id, id),
        columns: {
          id: true,
          fileId: true,
          classId: true,
          teacherId: true,
          extractionStatus: true,
          modelUsed: true,
          errorMessage: true,
          structuredContent: true,
          isApplied: true,
          progressPercent: true,
          totalChunks: true,
          processedChunks: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          file: {
            columns: {
              originalName: true,
            },
          },
        },
      });

      if (!cachedExtraction) {
        throw new NotFoundException(`Extraction with ID "${id}" not found`);
      }

      return {
        success: true,
        degraded: true,
        message:
          'AI extraction detail temporarily unavailable; returning cached extraction record.',
        data: this.toExtractionFallbackPayload(cachedExtraction),
      };
    }
  }

  // â”€â”€â”€ Update extraction (edit before applying) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * PATCH /api/ai/extractions/:id
   * Updates the structured content of a completed extraction.
   * Teacher can edit section titles, lesson blocks, and draft assessments before applying.
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
    await this.assertTeacherExtractionAccess(id, user);
    try {
      const result = await this.proxy.forward(
        'PATCH',
        `/extractions/${id}`,
        user,
        dto,
      );
      await this.logAuditSafe({
        actorId: user.id,
        action: 'ai.extraction.updated',
        targetType: 'extraction',
        targetId: id,
        metadata: {
          sectionCount: Array.isArray(dto.sections)
            ? dto.sections.length
            : Array.isArray(dto.lessons)
              ? dto.lessons.length
              : 0,
        },
      });
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown extraction update error';
      this.logger.warn(
        `AI extraction update unavailable for ${id}: ${message}`,
      );
      throw new ServiceUnavailableException(
        'AI extraction update is temporarily unavailable. Please retry shortly.',
      );
    }
  }

  // â”€â”€â”€ Apply extraction â†’ create lessons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * POST /api/ai/extractions/:id/apply
   * Takes a completed extraction and creates hidden module sections
   * with draft lessons and optional draft assessments.
   */
  @Post('extractions/:id/apply')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apply extraction -> create module sections with draft content',
  })
  @ApiResponse({
    status: 201,
    description: 'Module sections with draft lessons/assessments created from extraction',
  })
  async applyExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyExtractionDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.assertTeacherExtractionAccess(id, user);
    try {
      const result = await this.proxy.forward(
        'POST',
        `/extractions/${id}/apply`,
        user,
        dto,
      );
      await this.logAuditSafe({
        actorId: user.id,
        action: 'ai.extraction.applied',
        targetType: 'extraction',
        targetId: id,
        metadata: {
          sectionIndicesRequested: Array.isArray(dto.sectionIndices)
            ? dto.sectionIndices.length
            : null,
          lessonIndicesRequested: Array.isArray(dto.lessonIndices)
            ? dto.lessonIndices.length
            : null,
          sectionsCreated: this.extractNumberField(result, 'sectionsCreated'),
          lessonsCreated: this.extractNumberField(result, 'lessonsCreated'),
          assessmentsCreated: this.extractNumberField(
            result,
            'assessmentsCreated',
          ),
          moduleId: this.readStringField(result, 'moduleId'),
        },
      });
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown extraction apply error';
      this.logger.warn(
        `AI extraction apply unavailable for ${id}: ${message}`,
      );

      const cachedExtraction = await this.db.query.extractedModules.findFirst({
        where: eq(extractedModules.id, id),
        columns: {
          id: true,
          isApplied: true,
        },
      });

      if (!cachedExtraction) {
        throw new NotFoundException(`Extraction with ID "${id}" not found`);
      }

      if (cachedExtraction.isApplied) {
        return {
          success: true,
          degraded: true,
          message:
            'Extraction was already applied earlier; returning cached completion state.',
          data: {
            sectionsCreated: 0,
            lessonsCreated: 0,
            assessmentsCreated: 0,
            lessons: [],
            sections: [],
            assessments: [],
          },
        };
      }

      throw new ServiceUnavailableException(
        'AI extraction apply is temporarily unavailable. Please retry shortly.',
      );
    }
  }

  // â”€â”€â”€ Delete extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    await this.assertTeacherExtractionAccess(id, user);
    try {
      const result = await this.proxy.forward('DELETE', `/extractions/${id}`, user);
      await this.logAuditSafe({
        actorId: user.id,
        action: 'ai.extraction.deleted',
        targetType: 'extraction',
        targetId: id,
      });
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown extraction delete error';
      this.logger.warn(
        `AI extraction delete unavailable for ${id}: ${message}`,
      );
      throw new ServiceUnavailableException(
        'AI extraction delete is temporarily unavailable. Please retry shortly.',
      );
    }
  }

  // â”€â”€â”€ AI interaction history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    await this.assertTeacherInterventionCaseAccess(caseId, user);
    const result = await this.proxy.forward(
      'POST',
      `/teacher/interventions/${caseId}/recommend`,
      user,
      dto,
    );
    await this.logAuditSafe({
      actorId: user.id,
      action: 'ai.intervention_recommendation.generated',
      targetType: 'intervention_case',
      targetId: caseId,
      metadata: {
        noteProvided: Boolean(dto.note?.trim()),
      },
    });
    return result;
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
    await this.assertTeacherInterventionCaseAccess(caseId, user);
    const result = await this.proxy.forward(
      'POST',
      `/teacher/interventions/${caseId}/jobs`,
      user,
      dto,
    );
    await this.logAuditSafe({
      actorId: user.id,
      action: 'ai.intervention_recommendation.queued',
      targetType: 'intervention_case',
      targetId: caseId,
      metadata: {
        jobId: this.extractStringField(result, 'jobId'),
        noteProvided: Boolean(dto.note?.trim()),
      },
    });
    return result;
  }

  @Post('teacher/quizzes/generate-draft')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a grounded draft assessment from lesson/module sources' })
  async generateQuizDraft(
    @Body() dto: GenerateQuizDraftDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.assertTeacherClassAccess(dto.classId, user);
    const result = await this.proxy.forward(
      'POST',
      '/teacher/quizzes/generate-draft',
      user,
      dto,
    );
    await this.logAuditSafe({
      actorId: user.id,
      action: 'ai.quiz_draft.generated',
      targetType: 'class',
      targetId: dto.classId,
      metadata: {
        questionCount: dto.questionCount,
        questionType: dto.questionType,
        assessmentType: dto.assessmentType,
      },
    });
    return result;
  }

  @Post('teacher/quizzes/jobs')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue grounded AI draft assessment generation from lesson/module sources' })
  async queueQuizDraftJob(
    @Body() dto: GenerateQuizDraftDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.assertTeacherClassAccess(dto.classId, user);
    const result = await this.proxy.forward('POST', '/teacher/quizzes/jobs', user, dto);
    await this.logAuditSafe({
      actorId: user.id,
      action: 'ai.quiz_draft.queued',
      targetType: 'class',
      targetId: dto.classId,
      metadata: {
        jobId: this.extractStringField(result, 'jobId'),
        questionCount: dto.questionCount,
        questionType: dto.questionType,
        assessmentType: dto.assessmentType,
      },
    });
    return result;
  }

  @Get('teacher/jobs/:jobId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Poll the status of a teacher AI generation job' })
  async getTeacherJobStatus(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.assertTeacherJobAccess(jobId, user);
    try {
      return await this.proxy.forward('GET', `/teacher/jobs/${jobId}`, user);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown AI status error';
      this.logger.warn(
        `AI job status degraded fallback for ${jobId}: ${message}`,
      );

      const cachedJob = await this.db.query.aiGenerationJobs.findFirst({
        where: eq(aiGenerationJobs.id, jobId),
        columns: {
          id: true,
          jobType: true,
          status: true,
          errorMessage: true,
          sourceFilters: true,
          updatedAt: true,
        },
      });
      if (!cachedJob) {
        throw new NotFoundException(
          `AI generation job with ID "${jobId}" not found`,
        );
      }

      const cachedOutput = await this.db.query.aiGenerationOutputs.findFirst({
        where: eq(aiGenerationOutputs.jobId, jobId),
        columns: {
          id: true,
        },
        orderBy: [desc(aiGenerationOutputs.createdAt)],
      });
      const outputId = cachedOutput?.id ?? null;
      const assessmentId = await this.resolveAssessmentIdForOutput(outputId);
      const runtime = this.extractRuntimeFromSourceFilters(
        cachedJob.sourceFilters,
      );

      return {
        success: true,
        degraded: true,
        message:
          'AI job status temporarily unavailable; returning cached job status.',
        data: {
          jobId: cachedJob.id,
          jobType: cachedJob.jobType,
          status: cachedJob.status,
          progressPercent: this.runtimeProgressForStatus(
            cachedJob.status,
            runtime,
          ),
          statusMessage:
            (typeof runtime?.statusMessage === 'string' &&
              runtime.statusMessage) ||
            'AI service temporarily unavailable.',
          errorMessage:
            cachedJob.errorMessage ??
            (typeof runtime?.errorMessage === 'string'
              ? runtime.errorMessage
              : message),
          outputId,
          assessmentId,
          updatedAt: this.toIsoDate(cachedJob.updatedAt),
        },
      };
    }
  }

  @Get('teacher/jobs/:jobId/result')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Get the completed result of a teacher AI generation job' })
  async getTeacherJobResult(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.assertTeacherJobAccess(jobId, user);
    try {
      return await this.proxy.forward(
        'GET',
        `/teacher/jobs/${jobId}/result`,
        user,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown AI result error';
      this.logger.warn(
        `AI job result degraded fallback for ${jobId}: ${message}`,
      );

      const cachedJob = await this.db.query.aiGenerationJobs.findFirst({
        where: eq(aiGenerationJobs.id, jobId),
        columns: {
          id: true,
          jobType: true,
          status: true,
          errorMessage: true,
          sourceFilters: true,
          updatedAt: true,
        },
      });
      if (!cachedJob) {
        throw new NotFoundException(
          `AI generation job with ID "${jobId}" not found`,
        );
      }

      const runtime = this.extractRuntimeFromSourceFilters(
        cachedJob.sourceFilters,
      );
      const cachedOutput = await this.db.query.aiGenerationOutputs.findFirst({
        where: eq(aiGenerationOutputs.jobId, jobId),
        columns: {
          id: true,
          outputType: true,
          structuredOutput: true,
        },
        orderBy: [desc(aiGenerationOutputs.createdAt)],
      });
      const outputId = cachedOutput?.id ?? null;
      const assessmentId = await this.resolveAssessmentIdForOutput(outputId);

      if (
        !['completed', 'approved'].includes(cachedJob.status) ||
        !cachedOutput
      ) {
        return {
          success: true,
          degraded: true,
          message:
            'AI job result temporarily unavailable; returning cached job state.',
          data: {
            jobId: cachedJob.id,
            status: cachedJob.status,
            result: null,
            errorMessage:
              cachedJob.errorMessage ??
              (typeof runtime?.errorMessage === 'string'
                ? runtime.errorMessage
                : message),
            updatedAt: this.toIsoDate(cachedJob.updatedAt),
          },
        };
      }

      return {
        success: true,
        degraded: true,
        message:
          'AI job result temporarily unavailable; returning cached generated result.',
        data: {
          job: {
            jobId: cachedJob.id,
            jobType: cachedJob.jobType,
            status: cachedJob.status,
            outputId: cachedOutput.id,
            assessmentId,
            updatedAt: this.toIsoDate(cachedJob.updatedAt),
            retryState:
              runtime &&
              typeof runtime.retryState === 'object' &&
              runtime.retryState !== null
                ? runtime.retryState
                : null,
          },
          result: {
            outputId: cachedOutput.id,
            outputType: cachedOutput.outputType,
            structuredOutput: {
              ...((cachedOutput.structuredOutput as Record<string, unknown>) ??
                {}),
              ...(assessmentId ? { assessmentId } : {}),
              ...(runtime &&
              runtime.resultSummary &&
              typeof runtime.resultSummary === 'object'
                ? { runtime: runtime.resultSummary }
                : {}),
            },
          },
          errorMessage:
            cachedJob.errorMessage ??
            (typeof runtime?.errorMessage === 'string'
              ? runtime.errorMessage
              : message),
          updatedAt: this.toIsoDate(cachedJob.updatedAt),
        },
      };
    }
  }

  @Post('index/classes/:classId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Reindex class lesson and assessment content for semantic retrieval' })
  async reindexClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.assertTeacherClassAccess(classId, user);
    const result = await this.proxy.forward('POST', `/index/classes/${classId}`, user);
    await this.logAuditSafe({
      actorId: user.id,
      action: 'ai.class_content.reindex_queued',
      targetType: 'class',
      targetId: classId,
    });
    return result;
  }
}
