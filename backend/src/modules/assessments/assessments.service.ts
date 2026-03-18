import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentSubmittedEvent } from '../../common/events';
import { eq, and, desc, inArray, sql, sum } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  assessmentAttempts,
  assessmentResponses,
  classes,
  users,
  enrollments,
  uploadedFiles,
} from '../../drizzle/schema';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAssessmentDto,
  UpdateAttemptProgressDto,
  AssessmentType,
  QuestionType,
  ReturnGradeDto,
  BulkReturnGradesDto,
} from './DTO/assessment.dto';
import { FeedbackService } from './feedback.service';
import { AuditService } from '../audit/audit.service';
import { RagIndexingService } from '../rag/rag-indexing.service';

const MAX_ASSESSMENT_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
const DEFAULT_FILE_UPLOAD_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'txt',
  'rtf',
  'odt',
  'ppt',
  'pptx',
  'odp',
  'xls',
  'xlsx',
  'csv',
  'ods',
  'png',
  'jpg',
  'jpeg',
  'webp',
];
const DEFAULT_FILE_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.oasis.opendocument.spreadsheet',
  'image/png',
  'image/jpeg',
  'image/webp',
];

@Injectable()
export class AssessmentsService {
  constructor(
    private databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly feedbackService: FeedbackService,
    private readonly auditService: AuditService,
    private readonly ragIndexingService: RagIndexingService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private normalizeExtensions(extensions?: string[]) {
    const source =
      Array.isArray(extensions) && extensions.length > 0
        ? extensions
        : DEFAULT_FILE_UPLOAD_EXTENSIONS;

    return Array.from(
      new Set(
        source
          .map((item) => item.trim().toLowerCase().replace(/^\./, ''))
          .filter(Boolean),
      ),
    );
  }

  private normalizeMimeTypes(mimeTypes?: string[]) {
    const source =
      Array.isArray(mimeTypes) && mimeTypes.length > 0
        ? mimeTypes
        : DEFAULT_FILE_UPLOAD_MIME_TYPES;

    return Array.from(
      new Set(source.map((item) => item.trim().toLowerCase()).filter(Boolean)),
    );
  }

  private ensureValidFileUploadSettings(input: {
    type?: string;
    fileUploadInstructions?: string;
    allowedUploadMimeTypes?: string[];
    allowedUploadExtensions?: string[];
    maxUploadSizeBytes?: number | null;
  }) {
    if (input.type !== AssessmentType.FILE_UPLOAD) return;

    if (!input.fileUploadInstructions?.trim()) {
      throw new BadRequestException(
        'File upload instructions are required for file upload assessments',
      );
    }

    const extensions = this.normalizeExtensions(input.allowedUploadExtensions);
    const mimeTypes = this.normalizeMimeTypes(input.allowedUploadMimeTypes);

    if (extensions.length === 0 || mimeTypes.length === 0) {
      throw new BadRequestException(
        'At least one allowed file extension and mime type is required',
      );
    }

    const maxBytes =
      input.maxUploadSizeBytes ?? MAX_ASSESSMENT_UPLOAD_SIZE_BYTES;

    if (maxBytes < 1 || maxBytes > MAX_ASSESSMENT_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        `Max upload size must be between 1 and ${MAX_ASSESSMENT_UPLOAD_SIZE_BYTES} bytes`,
      );
    }
  }

  private getUserId(currentUser: any) {
    return currentUser?.userId ?? currentUser?.id;
  }

  private getUserRole(currentUser: any): 'admin' | 'teacher' | 'student' {
    const roles: string[] = Array.isArray(currentUser?.roles)
      ? currentUser.roles
      : [];

    if (roles.includes('admin')) return 'admin';
    if (roles.includes('teacher')) return 'teacher';
    return 'student';
  }

  private async ensureStudentEnrolled(classId: string, studentId: string) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
      ),
      columns: { classId: true, studentId: true },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this class for this assessment',
      );
    }
  }

  private fileExtensionFromName(fileName: string) {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex < 0) return '';
    return fileName.slice(dotIndex + 1).toLowerCase();
  }

  private normalizeProgressResponses(raw: unknown): Array<{
    questionId: string;
    studentAnswer?: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }> {
    if (!Array.isArray(raw)) return [];

    return raw
      .filter(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as { questionId?: unknown }).questionId === 'string',
      )
      .map((entry) => {
        const typed = entry as {
          questionId: string;
          studentAnswer?: string;
          selectedOptionId?: string;
          selectedOptionIds?: string[];
        };

        return {
          questionId: typed.questionId,
          studentAnswer: typed.studentAnswer,
          selectedOptionId: typed.selectedOptionId,
          selectedOptionIds: Array.isArray(typed.selectedOptionIds)
            ? typed.selectedOptionIds
            : undefined,
        };
      });
  }

  private calculateAttemptTimeSpentSeconds(startedAt: Date | string | null) {
    if (!startedAt) return 0;
    const started = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((Date.now() - started) / 1000));
  }

  private computeExpiry(timeLimitMinutes?: number | null) {
    if (!timeLimitMinutes || timeLimitMinutes < 1) return null;
    return new Date(Date.now() + timeLimitMinutes * 60 * 1000);
  }

  private isTimedQuestionMode(assessment: {
    timedQuestionsEnabled?: boolean | null;
    questionTimeLimitSeconds?: number | null;
    type?: AssessmentType | string | null;
    questions?: Array<{ id: string }> | null;
  }) {
    return Boolean(
      assessment.timedQuestionsEnabled &&
        assessment.type !== AssessmentType.FILE_UPLOAD &&
        (assessment.questionTimeLimitSeconds ?? 0) > 0 &&
        Array.isArray(assessment.questions) &&
        assessment.questions.length > 0,
    );
  }

  private clampQuestionIndex(questionCount: number, questionIndex?: number | null) {
    if (questionCount <= 0) return 0;
    const safeQuestionIndex = questionIndex ?? 0;
    return Math.min(Math.max(safeQuestionIndex, 0), questionCount - 1);
  }

  private computeQuestionDeadline(
    startedAt: Date | string | null,
    questionTimeLimitSeconds?: number | null,
  ) {
    if (!startedAt || !questionTimeLimitSeconds || questionTimeLimitSeconds < 1) {
      return null;
    }

    return new Date(
      new Date(startedAt).getTime() + questionTimeLimitSeconds * 1000,
    );
  }

  private getFreshQuestionTiming(questionTimeLimitSeconds?: number | null) {
    const currentQuestionStartedAt = new Date();
    return {
      currentQuestionStartedAt,
      currentQuestionDeadlineAt: this.computeQuestionDeadline(
        currentQuestionStartedAt,
        questionTimeLimitSeconds,
      ),
    };
  }

  private async syncTimedAttemptState(
    assessment: {
      id: string;
      type?: AssessmentType | string | null;
      totalPoints?: number | null;
      passingScore?: number | null;
      classRecordCategory?: string | null;
      quarter?: string | null;
      timedQuestionsEnabled?: boolean | null;
      questionTimeLimitSeconds?: number | null;
      questions?: Array<{ id: string }> | null;
    },
    attempt: typeof assessmentAttempts.$inferSelect,
  ) {
    if (!this.isTimedQuestionMode(assessment)) {
      return attempt;
    }

    const questionCount = assessment.questions?.length ?? 0;
    if (questionCount < 1) {
      return attempt;
    }

    const questionTimeLimitSeconds = assessment.questionTimeLimitSeconds ?? null;
    const questionDurationMs = (questionTimeLimitSeconds ?? 0) * 1000;
    const normalizedQuestionIndex = this.clampQuestionIndex(
      questionCount,
      attempt.lastQuestionIndex,
    );
    const currentQuestionStartedAt = attempt.currentQuestionStartedAt
      ? new Date(attempt.currentQuestionStartedAt)
      : new Date(attempt.startedAt);
    const currentQuestionDeadlineAt = attempt.currentQuestionDeadlineAt
      ? new Date(attempt.currentQuestionDeadlineAt)
      : this.computeQuestionDeadline(
          currentQuestionStartedAt,
          questionTimeLimitSeconds,
        );

    if (!currentQuestionDeadlineAt || questionDurationMs < 1) {
      return attempt;
    }

    const now = Date.now();

    if (currentQuestionDeadlineAt.getTime() > now) {
      if (
        !attempt.currentQuestionStartedAt ||
        !attempt.currentQuestionDeadlineAt ||
        normalizedQuestionIndex !== attempt.lastQuestionIndex
      ) {
        const [updatedAttempt] = await this.db
          .update(assessmentAttempts)
          .set({
            lastQuestionIndex: normalizedQuestionIndex,
            currentQuestionStartedAt,
            currentQuestionDeadlineAt,
            updatedAt: new Date(),
          })
          .where(eq(assessmentAttempts.id, attempt.id))
          .returning();

        return updatedAttempt;
      }

      return {
        ...attempt,
        lastQuestionIndex: normalizedQuestionIndex,
        currentQuestionStartedAt,
        currentQuestionDeadlineAt,
      };
    }

    const elapsedQuestionCount =
      Math.floor((now - currentQuestionDeadlineAt.getTime()) / questionDurationMs) + 1;
    const nextQuestionIndex = normalizedQuestionIndex + elapsedQuestionCount;

    if (nextQuestionIndex >= questionCount) {
      await this.autoSubmitExpiredAttempt(assessment, attempt);
      return null;
    }

    const nextQuestionStartedAt = new Date(
      currentQuestionDeadlineAt.getTime() +
        Math.max(0, elapsedQuestionCount - 1) * questionDurationMs,
    );
    const nextQuestionDeadlineAt = new Date(
      currentQuestionDeadlineAt.getTime() + elapsedQuestionCount * questionDurationMs,
    );

    const [updatedAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        lastQuestionIndex: nextQuestionIndex,
        currentQuestionStartedAt: nextQuestionStartedAt,
        currentQuestionDeadlineAt: nextQuestionDeadlineAt,
        updatedAt: new Date(),
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    return updatedAttempt;
  }

  /**
   * Get all assessments for a class
   */
  async getAssessmentsByClass(classId: string) {
    const assessmentList = await this.db.query.assessments.findMany({
      where: eq(assessments.classId, classId),
      with: {
        questions: {
          orderBy: (q, { asc }) => [asc(q.order)],
          with: {
            options: {
              orderBy: (o, { asc }) => [asc(o.order)],
            },
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return assessmentList;
  }

  /**
   * Get all assessments for a teacher (across all their classes)
   */
  async getAssessmentsByTeacher(teacherId: string) {
    // Get all classes for this teacher
    const teacherClasses = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      columns: { id: true },
    });

    const classIds = teacherClasses.map((c) => c.id);

    // If teacher has no classes, return empty array
    if (classIds.length === 0) {
      return [];
    }

    // Get all assessments for those classes
    const assessmentList = await this.db
      .select()
      .from(assessments)
      .where(inArray(assessments.classId, classIds));

    return assessmentList;
  }

  /**
   * Get a single assessment by ID with all questions
   */
  async getAssessmentById(assessmentId: string, viewerRole?: string) {
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      with: {
        class: true,
        questions: {
          orderBy: (q, { asc }) => [asc(q.order)],
          with: {
            options: {
              orderBy: (o, { asc }) => [asc(o.order)],
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID "${assessmentId}" not found`,
      );
    }

    let teacherAttachmentFile: any = null;
    if (assessment.teacherAttachmentFileId) {
      teacherAttachmentFile = await this.db.query.uploadedFiles.findFirst({
        where: eq(uploadedFiles.id, assessment.teacherAttachmentFileId),
        columns: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      });
    }

    const assessmentWithAttachment = {
      ...assessment,
      teacherAttachmentFile,
    };

    if (
      viewerRole === 'student' &&
      assessmentWithAttachment.randomizeQuestions &&
      assessmentWithAttachment.type !== AssessmentType.FILE_UPLOAD
    ) {
      return this.randomizeAssessmentForStudent(assessmentWithAttachment);
    }

    return assessmentWithAttachment;
  }

  /**
   * Create a new assessment
   */
  async createAssessment(createAssessmentDto: CreateAssessmentDto, actorId: string) {
    // Verify class exists
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, createAssessmentDto.classId),
    });

    if (!classRecord) {
      throw new BadRequestException(
        `Class with ID "${createAssessmentDto.classId}" not found`,
      );
    }

    this.ensureValidFileUploadSettings({
      type: createAssessmentDto.type,
      fileUploadInstructions: createAssessmentDto.fileUploadInstructions,
      allowedUploadMimeTypes: createAssessmentDto.allowedUploadMimeTypes,
      allowedUploadExtensions: createAssessmentDto.allowedUploadExtensions,
      maxUploadSizeBytes: createAssessmentDto.maxUploadSizeBytes,
    });

    const isFileUpload =
      createAssessmentDto.type === AssessmentType.FILE_UPLOAD;

    const [newAssessment] = await this.db
      .insert(assessments)
      .values({
        title: createAssessmentDto.title,
        description: createAssessmentDto.description,
        classId: createAssessmentDto.classId,
        type: createAssessmentDto.type,
        dueDate: createAssessmentDto.dueDate
          ? new Date(createAssessmentDto.dueDate)
          : undefined,
        closeWhenDue: createAssessmentDto.closeWhenDue ?? true,
        randomizeQuestions: createAssessmentDto.randomizeQuestions ?? false,
        timedQuestionsEnabled: createAssessmentDto.timedQuestionsEnabled ?? false,
        questionTimeLimitSeconds:
          createAssessmentDto.questionTimeLimitSeconds ?? null,
        strictMode: createAssessmentDto.strictMode ?? false,
        fileUploadInstructions: isFileUpload
          ? createAssessmentDto.fileUploadInstructions?.trim()
          : null,
        teacherAttachmentFileId: isFileUpload
          ? createAssessmentDto.teacherAttachmentFileId
          : null,
        allowedUploadMimeTypes: isFileUpload
          ? this.normalizeMimeTypes(createAssessmentDto.allowedUploadMimeTypes)
          : null,
        allowedUploadExtensions: isFileUpload
          ? this.normalizeExtensions(
              createAssessmentDto.allowedUploadExtensions,
            )
          : null,
        maxUploadSizeBytes: isFileUpload
          ? (createAssessmentDto.maxUploadSizeBytes ??
            MAX_ASSESSMENT_UPLOAD_SIZE_BYTES)
          : null,
        totalPoints: 0,
        passingScore: createAssessmentDto.passingScore,
        maxAttempts: createAssessmentDto.maxAttempts ?? 1,
        timeLimitMinutes: createAssessmentDto.timeLimitMinutes ?? null,
        isPublished: false,
        feedbackLevel: createAssessmentDto.feedbackLevel,
        feedbackDelayHours: createAssessmentDto.feedbackDelayHours,
        classRecordCategory: createAssessmentDto.classRecordCategory,
        quarter: createAssessmentDto.quarter,
      })
      .returning();

    const assessment = await this.getAssessmentById(newAssessment.id);

    await this.auditService.log({
      actorId,
      action: 'assessment.created',
      targetType: 'assessment',
      targetId: assessment.id,
      metadata: {
        classId: assessment.classId,
        type: assessment.type,
        isPublished: assessment.isPublished,
      },
    });

    await this.ragIndexingService.queueClassReindex(assessment.classId, {
      reason: 'assessment_created',
      actorId,
      source: 'assessments.createAssessment',
    });

    return assessment;
  }

  /**
   * Validate assessment is ready for publishing
   */
  private async validateForPublish(assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);
    const errors: string[] = [];
    const isFileUpload = assessment.type === AssessmentType.FILE_UPLOAD;

    if (!assessment.title || !assessment.title.trim()) {
      errors.push('Title is required');
    }
    if (!assessment.type) {
      errors.push('Assessment type is required');
    }

    if (
      !isFileUpload &&
      (!assessment.questions || assessment.questions.length === 0)
    ) {
      errors.push('At least one question is required');
    }

    if (
      assessment.passingScore === null ||
      assessment.passingScore === undefined
    ) {
      errors.push('Passing score is required');
    }

    if (isFileUpload) {
      if (!assessment.fileUploadInstructions?.trim()) {
        errors.push('File upload instructions are required');
      }

      if (
        !Array.isArray(assessment.allowedUploadExtensions) ||
        assessment.allowedUploadExtensions.length === 0
      ) {
        errors.push('At least one allowed file extension is required');
      }

      if (
        !Array.isArray(assessment.allowedUploadMimeTypes) ||
        assessment.allowedUploadMimeTypes.length === 0
      ) {
        errors.push('At least one allowed mime type is required');
      }

      if (
        !assessment.maxUploadSizeBytes ||
        assessment.maxUploadSizeBytes < 1 ||
        assessment.maxUploadSizeBytes > MAX_ASSESSMENT_UPLOAD_SIZE_BYTES
      ) {
        errors.push(
          `Max upload size must be between 1 and ${MAX_ASSESSMENT_UPLOAD_SIZE_BYTES} bytes`,
        );
      }
    }

    // Validate each question
    const optionTypes = [
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.MULTIPLE_SELECT,
      QuestionType.TRUE_FALSE,
      QuestionType.DROPDOWN,
    ];

    if (!isFileUpload && assessment.questions) {
      for (let i = 0; i < assessment.questions.length; i++) {
        const q = assessment.questions[i];
        if (!q.content || !q.content.trim()) {
          errors.push(`Question ${i + 1}: Content is required`);
        }
        if (optionTypes.includes(q.type as QuestionType)) {
          if (!q.options || q.options.length < 2) {
            errors.push(
              `Question ${i + 1}: Choice questions need at least 2 options`,
            );
          } else {
            const hasCorrect = q.options.some((o) => o.isCorrect);
            if (!hasCorrect) {
              errors.push(
                `Question ${i + 1}: At least one option must be marked correct`,
              );
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Assessment cannot be published',
        errors,
      });
    }
  }

  /**
   * Recalculate totalPoints from sum of question points
   */
  private async recalculateTotalPoints(assessmentId: string) {
    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${assessmentQuestions.points}), 0)`,
      })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, assessmentId));

    const total = Number(result[0]?.total) || 0;

    await this.db
      .update(assessments)
      .set({ totalPoints: total, updatedAt: new Date() })
      .where(eq(assessments.id, assessmentId));

    return total;
  }

  /**
   * Update an assessment
   */
  async updateAssessment(
    assessmentId: string,
    updateAssessmentDto: UpdateAssessmentDto,
    actorId: string,
  ) {
    // Verify assessment exists
    const existingAssessment = await this.getAssessmentById(assessmentId);

    const nextType = updateAssessmentDto.type ?? existingAssessment.type;
    const nextIsFileUpload = nextType === AssessmentType.FILE_UPLOAD;

    this.ensureValidFileUploadSettings({
      type: nextType,
      fileUploadInstructions:
        updateAssessmentDto.fileUploadInstructions ??
        existingAssessment.fileUploadInstructions ??
        undefined,
      allowedUploadMimeTypes:
        updateAssessmentDto.allowedUploadMimeTypes ??
        existingAssessment.allowedUploadMimeTypes ??
        undefined,
      allowedUploadExtensions:
        updateAssessmentDto.allowedUploadExtensions ??
        existingAssessment.allowedUploadExtensions ??
        undefined,
      maxUploadSizeBytes:
        updateAssessmentDto.maxUploadSizeBytes ??
        existingAssessment.maxUploadSizeBytes ??
        undefined,
    });

    // Validate before publishing
    if (updateAssessmentDto.isPublished === true) {
      await this.validateForPublish(assessmentId);
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updateAssessmentDto.title !== undefined)
      updateData.title = updateAssessmentDto.title;
    if (updateAssessmentDto.description !== undefined)
      updateData.description = updateAssessmentDto.description;
    if (updateAssessmentDto.type !== undefined)
      updateData.type = updateAssessmentDto.type;
    if (updateAssessmentDto.dueDate !== undefined)
      updateData.dueDate = updateAssessmentDto.dueDate
        ? new Date(updateAssessmentDto.dueDate)
        : null;
    if (updateAssessmentDto.closeWhenDue !== undefined)
      updateData.closeWhenDue = updateAssessmentDto.closeWhenDue;
    if (updateAssessmentDto.randomizeQuestions !== undefined)
      updateData.randomizeQuestions = updateAssessmentDto.randomizeQuestions;
    if (updateAssessmentDto.timedQuestionsEnabled !== undefined)
      updateData.timedQuestionsEnabled =
        updateAssessmentDto.timedQuestionsEnabled;
    if (updateAssessmentDto.questionTimeLimitSeconds !== undefined)
      updateData.questionTimeLimitSeconds =
        updateAssessmentDto.questionTimeLimitSeconds;
    if (updateAssessmentDto.strictMode !== undefined)
      updateData.strictMode = updateAssessmentDto.strictMode;
    if (updateAssessmentDto.fileUploadInstructions !== undefined)
      updateData.fileUploadInstructions =
        updateAssessmentDto.fileUploadInstructions?.trim() || null;
    if (updateAssessmentDto.teacherAttachmentFileId !== undefined)
      updateData.teacherAttachmentFileId =
        updateAssessmentDto.teacherAttachmentFileId;
    if (updateAssessmentDto.allowedUploadMimeTypes !== undefined)
      updateData.allowedUploadMimeTypes = this.normalizeMimeTypes(
        updateAssessmentDto.allowedUploadMimeTypes,
      );
    if (updateAssessmentDto.allowedUploadExtensions !== undefined)
      updateData.allowedUploadExtensions = this.normalizeExtensions(
        updateAssessmentDto.allowedUploadExtensions,
      );
    if (updateAssessmentDto.maxUploadSizeBytes !== undefined)
      updateData.maxUploadSizeBytes = updateAssessmentDto.maxUploadSizeBytes;
    if (updateAssessmentDto.passingScore !== undefined)
      updateData.passingScore = updateAssessmentDto.passingScore;
    if (updateAssessmentDto.maxAttempts !== undefined)
      updateData.maxAttempts = updateAssessmentDto.maxAttempts;
    if (updateAssessmentDto.timeLimitMinutes !== undefined)
      updateData.timeLimitMinutes = updateAssessmentDto.timeLimitMinutes;
    if (updateAssessmentDto.isPublished !== undefined)
      updateData.isPublished = updateAssessmentDto.isPublished;
    if (updateAssessmentDto.feedbackLevel !== undefined)
      updateData.feedbackLevel = updateAssessmentDto.feedbackLevel;
    if (updateAssessmentDto.feedbackDelayHours !== undefined)
      updateData.feedbackDelayHours = updateAssessmentDto.feedbackDelayHours;
    if (updateAssessmentDto.classRecordCategory !== undefined)
      updateData.classRecordCategory = updateAssessmentDto.classRecordCategory;
    if (updateAssessmentDto.quarter !== undefined)
      updateData.quarter = updateAssessmentDto.quarter;

    if (!nextIsFileUpload) {
      updateData.fileUploadInstructions = null;
      updateData.teacherAttachmentFileId = null;
      updateData.allowedUploadMimeTypes = null;
      updateData.allowedUploadExtensions = null;
      updateData.maxUploadSizeBytes = null;
    } else {
      if (updateData.allowedUploadMimeTypes === undefined) {
        updateData.allowedUploadMimeTypes = this.normalizeMimeTypes(
          existingAssessment.allowedUploadMimeTypes ?? undefined,
        );
      }
      if (updateData.allowedUploadExtensions === undefined) {
        updateData.allowedUploadExtensions = this.normalizeExtensions(
          existingAssessment.allowedUploadExtensions ?? undefined,
        );
      }
      if (updateData.maxUploadSizeBytes === undefined) {
        updateData.maxUploadSizeBytes =
          existingAssessment.maxUploadSizeBytes ??
          MAX_ASSESSMENT_UPLOAD_SIZE_BYTES;
      }
    }

    const [updated] = await this.db
      .update(assessments)
      .set(updateData)
      .where(eq(assessments.id, assessmentId))
      .returning();

    const assessment = await this.getAssessmentById(updated.id);

    await this.auditService.log({
      actorId,
      action: 'assessment.updated',
      targetType: 'assessment',
      targetId: assessment.id,
      metadata: {
        classId: assessment.classId,
        type: assessment.type,
        isPublished: assessment.isPublished,
      },
    });

    await this.ragIndexingService.queueClassReindex(assessment.classId, {
      reason: assessment.isPublished
        ? 'assessment_updated_published'
        : 'assessment_updated',
      actorId,
      source: 'assessments.updateAssessment',
    });

    return assessment;
  }

  /**
   * Delete an assessment
   */
  async deleteAssessment(assessmentId: string, actorId: string) {
    const assessment = await this.getAssessmentById(assessmentId);

    await this.db.delete(assessments).where(eq(assessments.id, assessmentId));

    await this.auditService.log({
      actorId,
      action: 'assessment.deleted',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        classId: assessment.classId,
        title: assessment.title,
      },
    });

    await this.ragIndexingService.queueClassReindex(assessment.classId, {
      reason: 'assessment_deleted',
      actorId,
      source: 'assessments.deleteAssessment',
    });

    return { success: true, message: 'Assessment deleted successfully' };
  }

  /**
   * Create a question for an assessment
   */
  async createQuestion(createQuestionDto: CreateQuestionDto) {
    // Verify assessment exists
    const assessment = await this.getAssessmentById(createQuestionDto.assessmentId);

    const [newQuestion] = await this.db
      .insert(assessmentQuestions)
      .values({
        assessmentId: createQuestionDto.assessmentId,
        type: createQuestionDto.type,
        content: createQuestionDto.content,
        points: createQuestionDto.points,
        order: createQuestionDto.order,
        isRequired: createQuestionDto.isRequired,
        explanation: createQuestionDto.explanation,
        imageUrl: createQuestionDto.imageUrl,
      })
      .returning();

    // Add options if provided
    if (createQuestionDto.options && createQuestionDto.options.length > 0) {
      await this.db.insert(assessmentQuestionOptions).values(
        createQuestionDto.options.map((opt) => ({
          questionId: newQuestion.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order,
        })),
      );
    }

    // Recalculate total points
    await this.recalculateTotalPoints(createQuestionDto.assessmentId);

    await this.ragIndexingService.queueClassReindex(assessment.classId, {
      reason: 'assessment_question_created',
      source: 'assessments.createQuestion',
    });

    return this.getQuestionById(newQuestion.id);
  }

  /**
   * Get question by ID (helper method)
   */
  private async getQuestionById(questionId: string) {
    const question = await this.db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, questionId),
      with: {
        options: {
          orderBy: (o, { asc }) => [asc(o.order)],
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID "${questionId}" not found`);
    }

    return question;
  }

  /**
   * Update a question
   */
  async updateQuestion(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.getQuestionById(questionId);

    // Update question fields
    if (
      updateQuestionDto.content !== undefined ||
      updateQuestionDto.points !== undefined ||
      updateQuestionDto.order !== undefined ||
      updateQuestionDto.isRequired !== undefined ||
      updateQuestionDto.explanation !== undefined ||
      updateQuestionDto.imageUrl !== undefined
    ) {
      const setData: Record<string, any> = { updatedAt: new Date() };
      if (updateQuestionDto.content !== undefined)
        setData.content = updateQuestionDto.content;
      if (updateQuestionDto.points !== undefined)
        setData.points = updateQuestionDto.points;
      if (updateQuestionDto.order !== undefined)
        setData.order = updateQuestionDto.order;
      if (updateQuestionDto.isRequired !== undefined)
        setData.isRequired = updateQuestionDto.isRequired;
      if (updateQuestionDto.explanation !== undefined)
        setData.explanation = updateQuestionDto.explanation;
      if (updateQuestionDto.imageUrl !== undefined)
        setData.imageUrl = updateQuestionDto.imageUrl;

      await this.db
        .update(assessmentQuestions)
        .set(setData)
        .where(eq(assessmentQuestions.id, questionId));
    }

    // Update options if provided (replace all)
    if (updateQuestionDto.options) {
      // Delete old options
      await this.db
        .delete(assessmentQuestionOptions)
        .where(eq(assessmentQuestionOptions.questionId, questionId));

      // Insert new options
      if (updateQuestionDto.options.length > 0) {
        await this.db.insert(assessmentQuestionOptions).values(
          updateQuestionDto.options.map((opt) => ({
            questionId,
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: opt.order,
          })),
        );
      }
    }

    // Recalculate total points if points changed
    const updatedQuestion = await this.getQuestionById(questionId);
    // Look up the assessmentId from the question
    const qRecord = await this.db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, questionId),
      columns: { assessmentId: true },
    });
    if (qRecord) {
      await this.recalculateTotalPoints(qRecord.assessmentId);
    }

    const assessment = await this.getAssessmentById(question.assessmentId);
    await this.ragIndexingService.queueClassReindex(assessment.classId, {
      reason: 'assessment_question_updated',
      source: 'assessments.updateQuestion',
    });

    return updatedQuestion;
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string) {
    const question = await this.getQuestionById(questionId);
    const assessment = await this.getAssessmentById(question.assessmentId);

    // Look up assessmentId before deletion
    const qRecord = await this.db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, questionId),
      columns: { assessmentId: true },
    });

    await this.db
      .delete(assessmentQuestions)
      .where(eq(assessmentQuestions.id, questionId));

    // Recalculate total points
    if (qRecord) {
      await this.recalculateTotalPoints(qRecord.assessmentId);
    }

    await this.ragIndexingService.queueClassReindex(assessment.classId, {
      reason: 'assessment_question_deleted',
      source: 'assessments.deleteQuestion',
    });

    return { success: true, message: 'Question deleted successfully' };
  }

  /**
   * Start an assessment attempt
   */
  async startAttempt(studentId: string, assessmentId: string) {
    // Verify assessment exists and is published
    const assessment = await this.getAssessmentById(assessmentId);

    if (!assessment.isPublished) {
      throw new ForbiddenException('This assessment is not published yet');
    }

    // Check for existing unsubmitted attempt (resume)
    const existingUnsubmitted =
      await this.db.query.assessmentAttempts.findFirst({
        where: and(
          eq(assessmentAttempts.studentId, studentId),
          eq(assessmentAttempts.assessmentId, assessmentId),
          eq(assessmentAttempts.isSubmitted, false),
        ),
      });

    if (existingUnsubmitted) {
      // Check if time limit exceeded for existing attempt
      if (assessment.timeLimitMinutes) {
        const expiresAt = existingUnsubmitted.expiresAt
          ? new Date(existingUnsubmitted.expiresAt)
          : null;
        const startedAt = new Date(existingUnsubmitted.startedAt);
        const elapsed = (Date.now() - startedAt.getTime()) / (1000 * 60);
        const isExpiredByTimeLimit = elapsed > assessment.timeLimitMinutes + 1;
        const isExpiredByExpiryAt = Boolean(
          expiresAt && expiresAt.getTime() <= Date.now(),
        );

        if (isExpiredByTimeLimit || isExpiredByExpiryAt) {
          await this.autoSubmitExpiredAttempt(assessment, existingUnsubmitted);
          // Fall through to create a new attempt
        } else {
          const syncedAttempt = await this.syncTimedAttemptState(
            assessment,
            existingUnsubmitted,
          );

          if (!syncedAttempt) {
            // Timed question state exhausted the attempt and auto-submitted it.
          } else {
          return {
            attempt: syncedAttempt,
            timeLimitMinutes: assessment.timeLimitMinutes,
            expiresAt: syncedAttempt.expiresAt,
            strictMode: assessment.strictMode ?? false,
            timedQuestionsEnabled: assessment.timedQuestionsEnabled ?? false,
            questionTimeLimitSeconds:
              assessment.questionTimeLimitSeconds ?? null,
          };
          }
        }
      } else {
        const syncedAttempt = await this.syncTimedAttemptState(
          assessment,
          existingUnsubmitted,
        );

        if (syncedAttempt) {
        return {
          attempt: syncedAttempt,
          timeLimitMinutes: null,
          expiresAt: syncedAttempt.expiresAt,
          strictMode: assessment.strictMode ?? false,
          timedQuestionsEnabled: assessment.timedQuestionsEnabled ?? false,
          questionTimeLimitSeconds: assessment.questionTimeLimitSeconds ?? null,
        };
        }
      }
    }

    // Check due date only for new attempts.
    // Existing in-progress attempts are allowed to continue/submit.
    if (
      (assessment.closeWhenDue ?? true) &&
      assessment.dueDate &&
      new Date(assessment.dueDate) < new Date()
    ) {
      throw new ForbiddenException(
        'This assessment is closed (due date passed)',
      );
    }

    // Count submitted attempts
    const submittedAttempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.isSubmitted, true),
      ),
    });

    const maxAttempts = assessment.maxAttempts ?? 1;
    if (submittedAttempts.length >= maxAttempts) {
      throw new ForbiddenException(
        `Maximum attempts reached (${maxAttempts}). You cannot retake this assessment.`,
      );
    }

    // Create new attempt
    const attemptNumber = submittedAttempts.length + 1;
    const questionOrder: string[] | null =
      assessment.randomizeQuestions &&
      assessment.type !== AssessmentType.FILE_UPLOAD &&
      Array.isArray(assessment.questions)
        ? this.shuffle(
            assessment.questions.map((question: { id: string }) => question.id),
          )
        : null;

    const expiresAt = this.computeExpiry(assessment.timeLimitMinutes);
    const freshQuestionTiming = this.isTimedQuestionMode(assessment)
      ? this.getFreshQuestionTiming(assessment.questionTimeLimitSeconds)
      : {
          currentQuestionStartedAt: null,
          currentQuestionDeadlineAt: null,
        };

    const [newAttempt] = await this.db
      .insert(assessmentAttempts)
      .values({
        studentId,
        assessmentId,
        attemptNumber,
        isSubmitted: false,
        expiresAt,
        lastQuestionIndex: 0,
        currentQuestionStartedAt: freshQuestionTiming.currentQuestionStartedAt,
        currentQuestionDeadlineAt: freshQuestionTiming.currentQuestionDeadlineAt,
        violationCount: 0,
        questionOrder,
        draftResponses: [],
      })
      .returning();

    return {
      attempt: newAttempt,
      timeLimitMinutes: assessment.timeLimitMinutes ?? null,
      expiresAt,
      strictMode: assessment.strictMode ?? false,
      timedQuestionsEnabled: assessment.timedQuestionsEnabled ?? false,
      questionTimeLimitSeconds: assessment.questionTimeLimitSeconds ?? null,
    };
  }

  async getOngoingAttempt(studentId: string, assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);

    let attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.isSubmitted, false),
      ),
      orderBy: (a, { desc: d }) => [d(a.startedAt)],
    });

    if (!attempt) {
      return null;
    }

    if (attempt.expiresAt && new Date(attempt.expiresAt).getTime() <= Date.now()) {
      await this.autoSubmitExpiredAttempt(assessment, attempt);
      return null;
    }

    const syncedAttempt = await this.syncTimedAttemptState(assessment, attempt);
    if (!syncedAttempt) {
      return null;
    }

    attempt = syncedAttempt;

    return {
      attempt,
      timeLimitMinutes: assessment.timeLimitMinutes ?? null,
      expiresAt: attempt.expiresAt,
      strictMode: assessment.strictMode ?? false,
      timedQuestionsEnabled: assessment.timedQuestionsEnabled ?? false,
      questionTimeLimitSeconds: assessment.questionTimeLimitSeconds ?? null,
    };
  }

  async getOngoingAttempts(studentId: string) {
    const ongoing = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.isSubmitted, false),
      ),
      with: {
        assessment: {
          columns: {
            id: true,
            title: true,
            timeLimitMinutes: true,
          },
        },
      },
      orderBy: (a, { desc: d }) => [d(a.updatedAt)],
    });

    const now = Date.now();
    const active = ongoing.filter(
      (attempt) => !attempt.expiresAt || new Date(attempt.expiresAt).getTime() > now,
    );

    return active.map((attempt) => ({
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      assessmentTitle: attempt.assessment?.title,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      lastQuestionIndex: attempt.lastQuestionIndex,
      timeLimitMinutes: attempt.assessment?.timeLimitMinutes ?? null,
    }));
  }

  async updateAttemptProgress(
    studentId: string,
    attemptId: string,
    updateAttemptProgressDto: UpdateAttemptProgressDto,
  ) {
    let attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.id, attemptId),
        eq(assessmentAttempts.studentId, studentId),
      ),
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    if (attempt.isSubmitted) {
      throw new BadRequestException('Attempt is already submitted');
    }

    const assessment = await this.getAssessmentById(attempt.assessmentId);

    if (attempt.expiresAt && new Date(attempt.expiresAt).getTime() <= Date.now()) {
      await this.autoSubmitExpiredAttempt(assessment, attempt);
      throw new BadRequestException('Attempt already expired and was auto-submitted');
    }

    const syncedAttempt = await this.syncTimedAttemptState(assessment, attempt);
    if (!syncedAttempt) {
      throw new BadRequestException(
        'Question timer expired and the attempt was auto-submitted',
      );
    }

    attempt = syncedAttempt;

    if (updateAttemptProgressDto.registerViolation) {
      const nextViolationCount = (attempt.violationCount ?? 0) + 1;
      const [updatedForViolation] = await this.db
        .update(assessmentAttempts)
        .set({
          violationCount: nextViolationCount,
          updatedAt: new Date(),
        })
        .where(eq(assessmentAttempts.id, attempt.id))
        .returning();

      if (nextViolationCount >= 3) {
        await this.autoSubmitExpiredAttempt(assessment, updatedForViolation);
        throw new ForbiddenException(
          'Attempt auto-submitted after repeated anti-cheat violations',
        );
      }

      attempt = updatedForViolation;
    }

    const questionCount = assessment.questions?.length ?? 0;

    if (
      ((assessment.strictMode ?? false) || this.isTimedQuestionMode(assessment)) &&
      typeof updateAttemptProgressDto.currentQuestionIndex === 'number' &&
      updateAttemptProgressDto.currentQuestionIndex < attempt.lastQuestionIndex
    ) {
      throw new BadRequestException(
        'This attempt does not allow moving to a previous question',
      );
    }

    const progressUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof updateAttemptProgressDto.currentQuestionIndex === 'number') {
      const nextQuestionIndex = this.clampQuestionIndex(
        questionCount,
        updateAttemptProgressDto.currentQuestionIndex,
      );

      progressUpdates.lastQuestionIndex = nextQuestionIndex;

      if (
        this.isTimedQuestionMode(assessment) &&
        nextQuestionIndex > attempt.lastQuestionIndex
      ) {
        const freshQuestionTiming = this.getFreshQuestionTiming(
          assessment.questionTimeLimitSeconds,
        );
        progressUpdates.currentQuestionStartedAt =
          freshQuestionTiming.currentQuestionStartedAt;
        progressUpdates.currentQuestionDeadlineAt =
          freshQuestionTiming.currentQuestionDeadlineAt;
      }
    }

    if (updateAttemptProgressDto.responses !== undefined) {
      progressUpdates.draftResponses = this.normalizeProgressResponses(
        updateAttemptProgressDto.responses,
      );
    }

    const [updatedAttempt] = await this.db
      .update(assessmentAttempts)
      .set(progressUpdates)
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    return updatedAttempt;
  }

  /**
   * Submit assessment with auto-grading for objective questions
   */
  async submitAssessment(
    studentId: string,
    submitAssessmentDto: SubmitAssessmentDto,
  ) {
    // Get the assessment with questions and options
    const assessment = await this.getAssessmentById(
      submitAssessmentDto.assessmentId,
    );

    // Get existing unsubmitted attempt
    let attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, submitAssessmentDto.assessmentId),
        eq(assessmentAttempts.isSubmitted, false),
      ),
    });

    if (!attempt) {
      throw new BadRequestException(
        'No active attempt found. Please start the assessment first.',
      );
    }

    // Check time limit enforcement (with 60s grace)
    if (assessment.timeLimitMinutes) {
      const startedAt = new Date(attempt.startedAt);
      const elapsedMinutes = (Date.now() - startedAt.getTime()) / (1000 * 60);
      if (elapsedMinutes > assessment.timeLimitMinutes + 1) {
        // Still accept but mark as time-exceeded
      }
    }

    if (
      assessment.type === AssessmentType.FILE_UPLOAD &&
      !attempt.submittedFileId
    ) {
      throw new BadRequestException(
        'Please upload a file before submitting this assessment',
      );
    }

    const submissionResponses =
      Array.isArray(submitAssessmentDto.responses) &&
      submitAssessmentDto.responses.length > 0
        ? submitAssessmentDto.responses
        : this.normalizeProgressResponses(attempt.draftResponses);

    const computedTimeSpent = this.calculateAttemptTimeSpentSeconds(
      attempt.startedAt,
    );

    // Mark attempt as submitted
    const [updatedAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        isSubmitted: true,
        submittedAt: new Date(),
        timeSpentSeconds:
          submitAssessmentDto.timeSpentSeconds > 0
            ? submitAssessmentDto.timeSpentSeconds
            : computedTimeSpent,
        draftResponses: submissionResponses,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();
    attempt = updatedAttempt;

    if (assessment.type === AssessmentType.FILE_UPLOAD) {
      return {
        attempt,
        responses: [],
        totalPoints: 0,
        score: null,
        passed: null,
      };
    }

    // Process responses and auto-grade
    const { totalPoints, responses } = await this.autoGradeResponses(
      submissionResponses,
      assessment.questions,
      attempt.id,
    );

    // Calculate score as percentage using actual totalPoints from questions
    const assessmentTotal = assessment.totalPoints || 1;
    const score = Math.round((totalPoints / assessmentTotal) * 100);
    const passed = score >= (assessment.passingScore || 60);

    // Update attempt with final score
    const [finalAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        score,
        passed,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    // Emit event for class record score auto-sync
    this.emitSubmissionEvent(
      submitAssessmentDto.assessmentId,
      studentId,
      totalPoints,
      assessmentTotal,
      assessment.classRecordCategory ?? undefined,
      assessment.quarter ?? undefined,
    );

    return {
      attempt: finalAttempt,
      responses,
      totalPoints,
      score,
      passed,
    };
  }

  async uploadTeacherAttachment(
    assessmentId: string,
    currentUser: any,
    file: Express.Multer.File,
  ) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const assessment = await this.getAssessmentById(assessmentId);

    if (
      role === 'teacher' &&
      assessment.class?.teacherId &&
      assessment.class.teacherId !== userId
    ) {
      throw new ForbiddenException(
        'You can only manage attachments for your own class assessments',
      );
    }

    const [record] = await this.db
      .insert(uploadedFiles)
      .values({
        teacherId: userId,
        classId: assessment.classId,
        scope: 'private',
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath: file.path.replace(/\\/g, '/'),
      })
      .returning();

    await this.db
      .update(assessments)
      .set({
        teacherAttachmentFileId: record.id,
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId));

    return record;
  }

  async uploadStudentSubmissionFile(
    assessmentId: string,
    currentUser: any,
    file: Express.Multer.File,
  ) {
    const studentId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!studentId || role !== 'student') {
      throw new ForbiddenException('Only students can upload submission files');
    }

    const assessment = await this.getAssessmentById(assessmentId);
    if (assessment.type !== AssessmentType.FILE_UPLOAD) {
      throw new BadRequestException(
        'This assessment does not accept file uploads',
      );
    }

    await this.ensureStudentEnrolled(assessment.classId, studentId);

    const allowedExtensions = this.normalizeExtensions(
      assessment.allowedUploadExtensions ?? undefined,
    );
    const allowedMimeTypes = this.normalizeMimeTypes(
      assessment.allowedUploadMimeTypes ?? undefined,
    );
    const maxUploadSizeBytes =
      assessment.maxUploadSizeBytes ?? MAX_ASSESSMENT_UPLOAD_SIZE_BYTES;

    const extension = this.fileExtensionFromName(file.originalname);
    const mimeType = file.mimetype.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `.${extension || 'unknown'} is not an allowed file type`,
      );
    }

    if (
      mimeType !== 'application/octet-stream' &&
      !allowedMimeTypes.includes(mimeType)
    ) {
      throw new BadRequestException('This file format is not allowed');
    }

    if (file.size > maxUploadSizeBytes) {
      throw new BadRequestException(
        `File size exceeds the allowed limit of ${maxUploadSizeBytes} bytes`,
      );
    }

    const { attempt } = await this.startAttempt(studentId, assessmentId);

    const teacherId = assessment.class?.teacherId;
    if (!teacherId) {
      throw new BadRequestException('Class teacher not found for assessment');
    }

    const [record] = await this.db
      .insert(uploadedFiles)
      .values({
        teacherId,
        classId: assessment.classId,
        scope: 'private',
        originalName: file.originalname,
        storedName: file.filename,
        mimeType,
        sizeBytes: file.size,
        filePath: file.path.replace(/\\/g, '/'),
      })
      .returning();

    await this.db
      .update(assessmentAttempts)
      .set({
        submittedFileId: record.id,
        submittedFileOriginalName: record.originalName,
        submittedFileMimeType: record.mimeType,
        submittedFileSizeBytes: record.sizeBytes,
        updatedAt: new Date(),
      })
      .where(eq(assessmentAttempts.id, attempt.id));

    return {
      attemptId: attempt.id,
      file: record,
    };
  }

  async getTeacherAttachmentDownload(assessmentId: string, currentUser: any) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const assessment = await this.getAssessmentById(assessmentId);

    if (!assessment.teacherAttachmentFileId) {
      throw new NotFoundException('No teacher attachment found for assessment');
    }

    if (role === 'student') {
      await this.ensureStudentEnrolled(assessment.classId, userId);
    }

    if (
      role === 'teacher' &&
      assessment.class?.teacherId &&
      assessment.class.teacherId !== userId
    ) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const file = await this.db.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.id, assessment.teacherAttachmentFileId),
    });

    if (!file) {
      throw new NotFoundException('Attached file not found');
    }

    return file;
  }

  async getAttemptSubmissionDownload(attemptId: string, currentUser: any) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.id, attemptId),
      with: {
        assessment: {
          with: {
            class: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (!attempt.submittedFileId) {
      throw new NotFoundException('No submitted file found for this attempt');
    }

    if (role === 'student' && attempt.studentId !== userId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    if (
      role === 'teacher' &&
      attempt.assessment?.class?.teacherId &&
      attempt.assessment.class.teacherId !== userId
    ) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const file = await this.db.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.id, attempt.submittedFileId),
    });

    if (!file) {
      throw new NotFoundException('Submitted file no longer exists');
    }

    return file;
  }

  /**
   * Get student's attempt results
   * For students: only show score/details if grade has been returned
   * For teachers: always show full results
   */
  async getAttemptResults(attemptId: string, userRole?: string) {
    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.id, attemptId),
      with: {
        assessment: {
          with: {
            questions: {
              with: {
                options: true,
              },
            },
          },
        },
        responses: {
          with: {
            question: {
              with: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
        student: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    let submittedFile: any = null;
    if (attempt.submittedFileId) {
      submittedFile = await this.db.query.uploadedFiles.findFirst({
        where: eq(uploadedFiles.id, attempt.submittedFileId),
        columns: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      });
    }

    // If student role and grade not returned yet, hide score details
    if (userRole === 'student' && !attempt.isReturned) {
      return {
        id: attempt.id,
        assessmentId: attempt.assessmentId,
        attemptNumber: attempt.attemptNumber,
        isSubmitted: attempt.isSubmitted,
        submittedAt: attempt.submittedAt,
        isReturned: false,
        // Hide score and detailed results
        score: null,
        passed: null,
        responses: [],
        feedbackStatus: {
          level: 'awaiting_return',
          unlocked: false,
          message:
            "Your teacher hasn't returned your grade yet. Please wait for your teacher to review and return your work.",
        },
        assessment: {
          id: attempt.assessment.id,
          title: attempt.assessment.title,
          type: attempt.assessment.type,
          totalPoints: attempt.assessment.totalPoints,
        },
        submittedFile,
      };
    }

    // Apply smart feedback filtering via dedicated FeedbackService
    const filtered = this.feedbackService.applyFeedbackFiltering(attempt);
    // Add return status info
    filtered.isReturned = attempt.isReturned;
    filtered.returnedAt = attempt.returnedAt;
    filtered.teacherFeedback = attempt.teacherFeedback;
    filtered.submittedFile = submittedFile;
    return filtered;
  }

  // ─── Private helpers (extracted from submitAssessment) ──────────────

  private async autoSubmitExpiredAttempt(
    assessment: any,
    attempt: typeof assessmentAttempts.$inferSelect,
  ) {
    const submissionResponses = this.normalizeProgressResponses(
      attempt.draftResponses,
    );

    const [updatedAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        isSubmitted: true,
        submittedAt: new Date(),
        timeSpentSeconds: this.calculateAttemptTimeSpentSeconds(attempt.startedAt),
        draftResponses: submissionResponses,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    if (assessment.type === AssessmentType.FILE_UPLOAD) {
      return updatedAttempt;
    }

    const { totalPoints } = await this.autoGradeResponses(
      submissionResponses,
      assessment.questions,
      attempt.id,
    );

    const assessmentTotal = assessment.totalPoints || 1;
    const score = Math.round((totalPoints / assessmentTotal) * 100);
    const passed = score >= (assessment.passingScore || 60);

    const [finalAttempt] = await this.db
      .update(assessmentAttempts)
      .set({ score, passed })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    this.emitSubmissionEvent(
      assessment.id,
      attempt.studentId,
      totalPoints,
      assessmentTotal,
      assessment.classRecordCategory ?? undefined,
      assessment.quarter ?? undefined,
    );

    return finalAttempt;
  }

  /**
   * Auto-grade objective questions and store responses.
   * Returns total points earned and the stored response records.
   */
  private async autoGradeResponses(
    submittedResponses: any[],
    questions: any[],
    attemptId: string,
  ): Promise<{ totalPoints: number; responses: any[] }> {
    let totalPoints = 0;
    const responses: any[] = [];

    for (const response of submittedResponses) {
      const question = questions.find((q) => q.id === response.questionId);

      if (!question) {
        throw new BadRequestException(
          `Question ${response.questionId} not found in assessment`,
        );
      }

      let isCorrect = false;
      let pointsEarned = 0;
      let selectedOptionId: string | null = null;
      let selectedOptionIds: string[] | null = null;

      if (
        question.type === QuestionType.MULTIPLE_CHOICE ||
        question.type === QuestionType.TRUE_FALSE ||
        question.type === QuestionType.DROPDOWN
      ) {
        if (response.selectedOptionId) {
          const option = question.options.find(
            (o) => o.id === response.selectedOptionId,
          );
          if (option && option.isCorrect) {
            isCorrect = true;
            pointsEarned = question.points;
          }
          selectedOptionId = response.selectedOptionId;
        }
      } else if (question.type === QuestionType.MULTIPLE_SELECT) {
        if (
          response.selectedOptionIds &&
          response.selectedOptionIds.length > 0
        ) {
          selectedOptionIds = response.selectedOptionIds;
          const correctOptions = question.options.filter((o) => o.isCorrect);
          const selectedCorrectly =
            response.selectedOptionIds.length === correctOptions.length &&
            response.selectedOptionIds.every((id) =>
              correctOptions.some((o) => o.id === id),
            );

          if (selectedCorrectly) {
            isCorrect = true;
            pointsEarned = question.points;
          }
        }
      }
      // Short answer and fill blank are not auto-graded

      totalPoints += pointsEarned;

      const [storedResponse] = await this.db
        .insert(assessmentResponses)
        .values({
          attemptId,
          questionId: response.questionId,
          studentAnswer: response.studentAnswer,
          selectedOptionId,
          selectedOptionIds,
          isCorrect:
            question.type === QuestionType.MULTIPLE_CHOICE ||
            question.type === QuestionType.TRUE_FALSE ||
            question.type === QuestionType.DROPDOWN ||
            question.type === QuestionType.MULTIPLE_SELECT
              ? isCorrect
              : null,
          pointsEarned,
        })
        .returning();

      responses.push(storedResponse);
    }

    return { totalPoints, responses };
  }

  /**
   * Emit typed assessment.submitted event for class record auto-sync.
   */
  private emitSubmissionEvent(
    assessmentId: string,
    studentId: string,
    rawScore: number,
    totalPoints: number,
    classRecordCategory?: string,
    quarter?: string,
  ): void {
    this.eventEmitter.emit(
      AssessmentSubmittedEvent.eventName,
      new AssessmentSubmittedEvent({
        assessmentId,
        studentId,
        rawScore,
        totalPoints,
        classRecordCategory,
        quarter,
      }),
    );
  }

  private randomizeAssessmentForStudent(assessment: any) {
    const shuffledQuestions = this.shuffle([...assessment.questions]).map(
      (question) => ({
        ...question,
        options: question.options ? this.shuffle([...question.options]) : [],
      }),
    );

    return {
      ...assessment,
      questions: shuffledQuestions,
    };
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /**
   * Get all attempts for a student in an assessment
   * Hides score if grade hasn't been returned
   */
  async getStudentAttempts(studentId: string, assessmentId: string) {
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
      ),
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    return attempts.map((attempt) => ({
      ...attempt,
      // Hide score if not returned yet
      score: attempt.isReturned ? attempt.score : null,
      passed: attempt.isReturned ? attempt.passed : null,
    }));
  }

  /**
   * Get all student attempts for an assessment (for teacher view)
   */
  async getAssessmentAttempts(assessmentId: string) {
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: eq(assessmentAttempts.assessmentId, assessmentId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    return attempts;
  }

  /**
   * Get high-level assessment stats for teacher
   */
  async getAssessmentStats(assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);
    const attempts = await this.getAssessmentAttempts(assessmentId);
    const submittedAttempts = attempts.filter((a) => a.isSubmitted);

    // Count enrolled students for completion rate
    const enrolledStudents = await this.db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, assessment.classId),
          eq(enrollments.status, 'enrolled'),
        ),
      );
    const totalEnrolled = enrolledStudents.length;

    if (submittedAttempts.length === 0) {
      return {
        totalAttempts: 0,
        submittedAttempts: 0,
        averageScore: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: 0,
        averageTimeSeconds: 0,
        completionRate: 0,
        totalEnrolled,
      };
    }

    const scores = submittedAttempts.map((a) => a.score || 0);
    const passedCount = submittedAttempts.filter((a) => a.passed).length;
    const timesWithValues = submittedAttempts
      .map((a) => a.timeSpentSeconds)
      .filter((t): t is number => t != null && t > 0);
    const averageTimeSeconds =
      timesWithValues.length > 0
        ? Math.round(
            timesWithValues.reduce((a, b) => a + b, 0) / timesWithValues.length,
          )
        : 0;

    // Unique students who submitted
    const uniqueSubmitters = new Set(submittedAttempts.map((a) => a.studentId))
      .size;
    const completionRate =
      totalEnrolled > 0
        ? Math.round((uniqueSubmitters / totalEnrolled) * 100)
        : 0;

    return {
      totalAttempts: attempts.length,
      submittedAttempts: submittedAttempts.length,
      averageScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      ),
      passRate: Math.round((passedCount / submittedAttempts.length) * 100),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      averageTimeSeconds,
      completionRate,
      totalEnrolled,
    };
  }

  // ==========================================
  // MS Teams-like Grade Return Methods
  // ==========================================

  /**
   * Get all student submissions for an assessment (teacher view)
   * Shows ALL enrolled students with their submission status
   */
  async getAssessmentSubmissions(assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);
    const dueDate = assessment.dueDate ? new Date(assessment.dueDate) : null;

    const mapAttemptSummary = (
      attempt: typeof assessmentAttempts.$inferSelect,
    ) => {
      const submittedAt = attempt.submittedAt
        ? new Date(attempt.submittedAt)
        : null;
      const isLate = Boolean(
        dueDate &&
        submittedAt &&
        attempt.isSubmitted &&
        submittedAt.getTime() > dueDate.getTime(),
      );
      const lateByMinutes =
        isLate && submittedAt && dueDate
          ? Math.ceil((submittedAt.getTime() - dueDate.getTime()) / (1000 * 60))
          : 0;

      return {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        passed: attempt.passed,
        isSubmitted: attempt.isSubmitted,
        isReturned: attempt.isReturned,
        submittedAt: attempt.submittedAt,
        returnedAt: attempt.returnedAt,
        teacherFeedback: attempt.teacherFeedback,
        timeSpentSeconds: attempt.timeSpentSeconds,
        isLate,
        lateByMinutes,
      };
    };

    // Get all enrolled students in this class
    const enrolledStudents = await this.db
      .select({
        studentId: enrollments.studentId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.classId, assessment.classId),
          eq(enrollments.status, 'enrolled'),
        ),
      )
      .orderBy(users.lastName, users.firstName);

    // Get all attempts for this assessment
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: eq(assessmentAttempts.assessmentId, assessmentId),
      orderBy: (a, { desc: d }) => [d(a.submittedAt)],
    });

    // Map students to their submission status
    const submissions = enrolledStudents.map((student) => {
      const studentAttempts = attempts.filter(
        (a) => a.studentId === student.studentId,
      );

      // Determine status
      let status: 'not_started' | 'in_progress' | 'turned_in' | 'returned' =
        'not_started';
      let latestAttempt: (typeof attempts)[number] | null = null;

      if (studentAttempts.length > 0) {
        // Get the latest attempt
        latestAttempt = studentAttempts[0];

        if (latestAttempt.isReturned) {
          status = 'returned';
        } else if (latestAttempt.isSubmitted) {
          status = 'turned_in';
        } else {
          status = 'in_progress';
        }
      }

      return {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        status,
        attempt: latestAttempt ? mapAttemptSummary(latestAttempt) : null,
        attempts: studentAttempts.map(mapAttemptSummary),
        totalAttempts: studentAttempts.length,
      };
    });

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        type: assessment.type,
        classRecordCategory: assessment.classRecordCategory,
        quarter: assessment.quarter,
        totalPoints: assessment.totalPoints,
        dueDate: assessment.dueDate,
        isPublished: assessment.isPublished,
      },
      submissions,
      summary: {
        total: submissions.length,
        notStarted: submissions.filter((s) => s.status === 'not_started')
          .length,
        inProgress: submissions.filter((s) => s.status === 'in_progress')
          .length,
        turnedIn: submissions.filter((s) => s.status === 'turned_in').length,
        returned: submissions.filter((s) => s.status === 'returned').length,
      },
    };
  }

  /**
   * Return a grade to a student (make score visible)
   */
  async returnGrade(attemptId: string, dto: ReturnGradeDto) {
    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.id, attemptId),
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    if (!attempt.isSubmitted) {
      throw new BadRequestException(
        'Cannot return grade for an unsubmitted attempt',
      );
    }

    if (attempt.isReturned) {
      throw new BadRequestException(
        'Grade has already been returned for this attempt',
      );
    }

    const [updated] = await this.db
      .update(assessmentAttempts)
      .set({
        isReturned: true,
        returnedAt: new Date(),
        teacherFeedback: dto.teacherFeedback || null,
      })
      .where(eq(assessmentAttempts.id, attemptId))
      .returning();

    return updated;
  }

  /**
   * Bulk return grades for multiple attempts
   */
  async bulkReturnGrades(dto: BulkReturnGradesDto) {
    const results = await this.db
      .update(assessmentAttempts)
      .set({
        isReturned: true,
        returnedAt: new Date(),
        teacherFeedback: dto.teacherFeedback || null,
      })
      .where(
        and(
          inArray(assessmentAttempts.id, dto.attemptIds),
          eq(assessmentAttempts.isSubmitted, true),
          eq(assessmentAttempts.isReturned, false),
        ),
      )
      .returning();

    return {
      returned: results.length,
      attemptIds: results.map((r) => r.id),
    };
  }

  /**
   * Get per-question analytics for an assessment (teacher view)
   */
  async getQuestionAnalytics(assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);

    // Get all submitted attempts
    const submittedAttemptsList =
      await this.db.query.assessmentAttempts.findMany({
        where: and(
          eq(assessmentAttempts.assessmentId, assessmentId),
          eq(assessmentAttempts.isSubmitted, true),
        ),
      });

    const attemptIds = submittedAttemptsList.map((a) => a.id);

    if (attemptIds.length === 0) {
      return {
        totalResponses: 0,
        questions: (assessment.questions || []).map((q) => ({
          questionId: q.id,
          content: q.content,
          type: q.type,
          points: q.points,
          totalResponses: 0,
          correctCount: 0,
          correctPercent: 0,
          averagePoints: 0,
          options: (q.options || []).map((o) => ({
            optionId: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
            selectionCount: 0,
            selectionPercent: 0,
          })),
          textAnswers: [],
        })),
      };
    }

    // Get all responses for these attempts
    const allResponses = await this.db.query.assessmentResponses.findMany({
      where: inArray(assessmentResponses.attemptId, attemptIds),
    });

    // Build per-question analytics
    const questionAnalytics = (assessment.questions || []).map((q) => {
      const qResponses = allResponses.filter((r) => r.questionId === q.id);
      const totalResponses = qResponses.length;
      const correctCount = qResponses.filter(
        (r) => r.isCorrect === true,
      ).length;
      const totalPointsEarned = qResponses.reduce(
        (sum, r) => sum + (r.pointsEarned || 0),
        0,
      );

      // Per-option stats
      const optionStats = (q.options || []).map((o) => {
        // Count single-select
        const singleSelections = qResponses.filter(
          (r) => r.selectedOptionId === o.id,
        ).length;
        // Count multi-select
        const multiSelections = qResponses.filter(
          (r) => r.selectedOptionIds && r.selectedOptionIds.includes(o.id),
        ).length;
        const selectionCount = singleSelections + multiSelections;
        return {
          optionId: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          selectionCount,
          selectionPercent:
            totalResponses > 0
              ? Math.round((selectionCount / totalResponses) * 100)
              : 0,
        };
      });

      // Text answers (for short_answer / fill_blank)
      const textAnswers = qResponses
        .filter((r) => r.studentAnswer)
        .map((r) => r.studentAnswer as string);

      return {
        questionId: q.id,
        content: q.content,
        type: q.type,
        points: q.points,
        totalResponses,
        correctCount,
        correctPercent:
          totalResponses > 0
            ? Math.round((correctCount / totalResponses) * 100)
            : 0,
        averagePoints:
          totalResponses > 0
            ? Math.round((totalPointsEarned / totalResponses) * 100) / 100
            : 0,
        options: optionStats,
        textAnswers,
      };
    });

    const uniqueSubmitterCount = new Set(
      submittedAttemptsList.map((attempt) => attempt.studentId),
    ).size;

    return {
      totalResponses: submittedAttemptsList.length,
      totalAttempts: submittedAttemptsList.length,
      uniqueSubmitterCount,
      questions: questionAnalytics,
    };
  }

  /**
   * Return all submitted (unreturned) grades for an assessment
   */
  async returnAllGrades(assessmentId: string, teacherFeedback?: string) {
    await this.getAssessmentById(assessmentId);

    const results = await this.db
      .update(assessmentAttempts)
      .set({
        isReturned: true,
        returnedAt: new Date(),
        teacherFeedback: teacherFeedback || null,
      })
      .where(
        and(
          eq(assessmentAttempts.assessmentId, assessmentId),
          eq(assessmentAttempts.isSubmitted, true),
          eq(assessmentAttempts.isReturned, false),
        ),
      )
      .returning();

    return {
      returned: results.length,
      attemptIds: results.map((r) => r.id),
    };
  }
}
