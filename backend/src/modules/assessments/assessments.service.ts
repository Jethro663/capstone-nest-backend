import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentSubmittedEvent } from '../../common/events';
import { eq, and, desc, inArray, isNull, sql, count } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabaseService } from '../../database/database.service';
import {
  AcademicMutation,
  AcademicCommittedResponse,
} from '../../database/academic-transaction';
import {
  AcademicPolicyService,
  AssessmentAcademicAction,
} from '../academic-state/academic-policy.service';
import { ClassRecordService } from '../class-record/class-record.service';
import { assessmentAcademicCapabilities } from '../academic-state/assessment-academic-capabilities';
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  assessmentAttempts,
  assessmentResponses,
  auditLogs,
  classRecords,
  classRecordCategories,
  classRecordItems,
  classes,
  moduleItems,
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
import { AssessmentNotificationDispatchService } from '../notifications/assessment-notification-dispatch.service';
import { sanitizeRichTextHtml } from '../../common/utils/rich-text-sanitizer';
import { AssessmentAccessService } from './assessment-access.service';
import { assessmentPublicationIssues } from './assessment-readiness';
import {
  AcademicScoreBreakdown,
  buildAcademicScoreContract,
  boundPercentage,
  calculateBoundedScore,
} from '../academic-state/academic-score';

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
  'zip',
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
  'application/zip',
  'application/x-zip-compressed',
];

type RubricCriterion = {
  id: string;
  title: string;
  description?: string;
  points: number;
};

type ReturnedRubricScore = {
  criterionId: string;
  pointsEarned: number;
  feedback?: string;
};

type SubmittedAttemptFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt?: Date | string | null;
};

type SubmissionTimelineEntry = {
  id: string;
  attemptId: string;
  action: string;
  createdAt: Date;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
};

type CurrentUserLike = {
  userId?: string | null;
  id?: string | null;
  roles?: string[] | null;
};

type AssessmentVisibilityItem = {
  isGiven?: boolean | null;
  isVisible?: boolean | null;
  section?: {
    module?: {
      classId?: string | null;
      isVisible?: boolean | null;
      isLocked?: boolean | null;
    } | null;
  } | null;
};

type DecoratedAssessmentOption = {
  id: string;
  text?: string | null;
  isCorrect?: boolean | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  imageDisplayMode?: string | null;
  imageZoom?: number | null;
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  [key: string]: unknown;
};

type DecoratedAssessmentQuestion = {
  id: string;
  assessmentId: string;
  content?: string | null;
  type: string;
  points?: number | null;
  explanation?: string | null;
  metadata?: Record<string, unknown> | null;
  options: DecoratedAssessmentOption[];
  imageDisplayMode?: string | null;
  imageZoom?: number | null;
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  [key: string]: unknown;
};

type AssessmentAttachmentSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt?: Date | string | null;
};

type AssessmentView = {
  authoringRestrictions?: {
    hasAttempts: boolean;
    canEditQuestions: boolean;
    reason: string | null;
  };
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  type: AssessmentType;
  dueDate?: Date | null;
  closeWhenDue?: boolean | null;
  randomizeQuestions: boolean;
  timedQuestionsEnabled?: boolean | null;
  questionTimeLimitSeconds?: number | null;
  strictMode?: boolean | null;
  fileUploadInstructions?: string | null;
  allowedUploadMimeTypes?: string[] | null;
  allowedUploadExtensions?: string[] | null;
  maxUploadSizeBytes?: number | null;
  totalPoints: number;
  passingScore?: number | null;
  maxAttempts: number;
  timeLimitMinutes?: number | null;
  isPublished: boolean;
  feedbackLevel?: string | null;
  feedbackDelayHours?: number | null;
  isCoreTemplateAsset?: boolean | null;
  classRecordCategory?: string | null;
  quarter?: string | null;
  rubricCriteria?: RubricCriterion[] | null;
  rubricParseStatus?: string | null;
  teacherAttachmentFileId?: string | null;
  rubricSourceFileId?: string | null;
  class?: {
    teacherId?: string | null;
    [key: string]: unknown;
  } | null;
  questions: DecoratedAssessmentQuestion[];
  teacherAttachmentFile?: AssessmentAttachmentSummary | null;
  rubricSourceFile?: AssessmentAttachmentSummary | null;
  classRecordPlacement?: unknown;
  [key: string]: unknown;
};

type GradingPeriodCode = 'Q1' | 'Q2' | 'Q3' | 'Q4';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly feedbackService: FeedbackService,
    private readonly auditService: AuditService,
    private readonly ragIndexingService: RagIndexingService,
    private readonly assessmentNotificationDispatch: AssessmentNotificationDispatchService,
    private readonly assessmentAccessService: AssessmentAccessService,
    private readonly academicPolicyService: AcademicPolicyService,
    private readonly classRecordService: ClassRecordService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private scoreContract(
    attempt: Pick<
      typeof assessmentAttempts.$inferSelect,
      | 'score'
      | 'basePointsEarned'
      | 'possiblePointsSnapshot'
      | 'bonusPoints'
      | 'bonusReason'
    >,
    visible = true,
  ) {
    return buildAcademicScoreContract(attempt, { visible });
  }

  private async assertAcademicMutation(
    assessment: { id?: string; classId: string; quarter?: string | null },
    action: AssessmentAcademicAction,
    existingAttempt = false,
  ) {
    const context = await this.academicPolicyService.assertAssessmentAction(
      assessment,
      action,
      existingAttempt,
    );
    const record = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, assessment.classId),
        eq(classRecords.gradingPeriod, context.period.key),
      ),
    });
    if (record && record.status !== 'draft')
      throw new ConflictException(
        'The period workbook is finalized or locked; reopen it before modifying assessment evidence',
      );
    return context;
  }

  private async assertNoAssessmentAttempts(assessmentId: string) {
    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.assessmentId, assessmentId),
      columns: { id: true },
    });
    if (attempt)
      throw new ConflictException(
        'This assessment already has an attempt; its grading period, placement, questions and rubric cannot be changed',
      );
  }

  private normalizeSubmittedFiles(raw: unknown): SubmittedAttemptFile[] {
    if (!Array.isArray(raw)) return [];

    const normalized: SubmittedAttemptFile[] = [];

    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const candidate = entry as Record<string, unknown>;
      const id = typeof candidate.id === 'string' ? candidate.id : null;
      const originalName =
        typeof candidate.originalName === 'string'
          ? candidate.originalName
          : null;
      const mimeType =
        typeof candidate.mimeType === 'string' ? candidate.mimeType : null;
      const sizeBytes = Number(candidate.sizeBytes);

      if (!id || !originalName || !mimeType || !Number.isFinite(sizeBytes)) {
        continue;
      }

      normalized.push({
        id,
        originalName,
        mimeType,
        sizeBytes,
        uploadedAt:
          candidate.uploadedAt instanceof Date ||
          typeof candidate.uploadedAt === 'string'
            ? candidate.uploadedAt
            : null,
      });
    }

    return normalized;
  }

  private formatAuditActorName(
    actor?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null,
  ) {
    if (!actor) return null;
    const fullName = [actor.firstName, actor.lastName]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .join(' ');
    return fullName || actor.email?.trim() || null;
  }

  private getAttemptSubmittedFiles(
    attempt: Partial<{
      submittedFiles: unknown;
      submittedFileId: string | null;
      submittedFileOriginalName: string | null;
      submittedFileMimeType: string | null;
      submittedFileSizeBytes: number | null;
      updatedAt: Date | string | null;
      createdAt: Date | string | null;
    }>,
  ): SubmittedAttemptFile[] {
    const normalized = this.normalizeSubmittedFiles(attempt.submittedFiles);
    if (normalized.length > 0) {
      return normalized;
    }

    if (!attempt.submittedFileId) {
      return [];
    }

    return [
      {
        id: attempt.submittedFileId,
        originalName: attempt.submittedFileOriginalName || 'Uploaded file',
        mimeType: attempt.submittedFileMimeType || 'application/octet-stream',
        sizeBytes: attempt.submittedFileSizeBytes || 0,
        uploadedAt: attempt.updatedAt || attempt.createdAt || null,
      },
    ];
  }

  private buildSubmittedFileSnapshot(files: SubmittedAttemptFile[]) {
    const latestFile = files[files.length - 1] ?? null;

    return {
      submittedFiles: files,
      submittedFileId: latestFile?.id ?? null,
      submittedFileOriginalName: latestFile?.originalName ?? null,
      submittedFileMimeType: latestFile?.mimeType ?? null,
      submittedFileSizeBytes: latestFile?.sizeBytes ?? null,
    };
  }

  private async runAssessmentNotificationSideEffects(
    assessmentId: string,
    action: string,
    work: () => Promise<void>,
  ) {
    try {
      await this.databaseService.afterAcademicCommit(work);
    } catch (error) {
      this.logger.error(
        `Assessment notification sync failed after ${action} for assessment ${assessmentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
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

  private normalizeRubricCriteria(
    criteria?: Array<{
      id?: string;
      title?: string;
      description?: string;
      points?: number;
    }> | null,
  ): RubricCriterion[] {
    if (!Array.isArray(criteria)) return [];

    const normalized = criteria
      .map((criterion, index) => ({
        id: criterion.id?.trim() || `criterion-${index + 1}`,
        title: criterion.title?.trim() || '',
        description: criterion.description?.trim() || undefined,
        points: Number(criterion.points ?? 0),
      }))
      .filter((criterion) => criterion.title.length > 0);

    if (normalized.some((criterion) => criterion.points < 0)) {
      throw new BadRequestException(
        'Rubric criterion points cannot be negative',
      );
    }

    const seenIds = new Set<string>();
    for (const criterion of normalized) {
      if (seenIds.has(criterion.id)) {
        throw new BadRequestException('Rubric criterion IDs must be unique');
      }
      seenIds.add(criterion.id);
    }

    return normalized;
  }

  private sanitizeOptionalRichText(value?: string | null) {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed ? sanitizeRichTextHtml(trimmed) : null;
  }

  private normalizeImageDisplayMode(value: unknown): 'default' | 'expanded' {
    return value === 'expanded' ? 'expanded' : 'default';
  }

  private normalizeImageZoom(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 100;
    return Math.min(Math.max(parsed, 50), 200);
  }

  private normalizeImagePosition(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(Math.max(parsed, 0), 100);
  }

  private buildImageMetadata(
    existing: Record<string, unknown> | null | undefined,
    imageDisplayMode?: unknown,
    imageZoom?: unknown,
    imagePositionX?: unknown,
    imagePositionY?: unknown,
  ) {
    return {
      ...(existing && typeof existing === 'object' ? existing : {}),
      imageDisplayMode: this.normalizeImageDisplayMode(imageDisplayMode),
      imageZoom: this.normalizeImageZoom(imageZoom),
      imagePositionX: this.normalizeImagePosition(imagePositionX),
      imagePositionY: this.normalizeImagePosition(imagePositionY),
    };
  }

  private decorateAssessmentOption(
    option: DecoratedAssessmentOption,
  ): DecoratedAssessmentOption {
    const metadata =
      option?.metadata && typeof option.metadata === 'object'
        ? option.metadata
        : {};

    return {
      ...option,
      imageUrl:
        typeof option?.imageUrl === 'string'
          ? option.imageUrl
          : typeof metadata.imageUrl === 'string'
            ? metadata.imageUrl
            : null,
      imageDisplayMode: this.normalizeImageDisplayMode(
        metadata.imageDisplayMode,
      ),
      imageZoom: this.normalizeImageZoom(metadata.imageZoom),
      imagePositionX: this.normalizeImagePosition(metadata.imagePositionX),
      imagePositionY: this.normalizeImagePosition(metadata.imagePositionY),
    };
  }

  private decorateAssessmentQuestion(
    question: Record<string, unknown>,
  ): DecoratedAssessmentQuestion {
    const metadata: Record<string, unknown> =
      question?.metadata && typeof question.metadata === 'object'
        ? (question.metadata as Record<string, unknown>)
        : {};

    return {
      ...(question as unknown as DecoratedAssessmentQuestion),
      imageDisplayMode: this.normalizeImageDisplayMode(
        metadata.imageDisplayMode,
      ),
      imageZoom: this.normalizeImageZoom(metadata.imageZoom),
      imagePositionX: this.normalizeImagePosition(metadata.imagePositionX),
      imagePositionY: this.normalizeImagePosition(metadata.imagePositionY),
      options: Array.isArray(question?.options)
        ? (question.options as DecoratedAssessmentOption[]).map((option) =>
            this.decorateAssessmentOption(option),
          )
        : [],
    };
  }

  private sumRubricPoints(criteria: RubricCriterion[]) {
    return criteria.reduce((total, criterion) => total + criterion.points, 0);
  }

  private getClassRecordCategoryName(category?: string | null) {
    switch (category) {
      case 'written_work':
        return 'Written Works';
      case 'performance_task':
        return 'Performance Tasks';
      case 'quarterly_assessment':
        return 'Quarterly Assessment';
      default:
        return null;
    }
  }

  private getClassRecordCategoryCode(categoryName?: string | null) {
    switch (categoryName) {
      case 'Written Works':
        return 'written_work';
      case 'Performance Tasks':
        return 'performance_task';
      case 'Quarterly Assessment':
        return 'quarterly_assessment';
      default:
        return null;
    }
  }

  private getDefaultClassRecordItemTitle(
    categoryName: string,
    itemOrder: number,
  ) {
    const prefix =
      categoryName === 'Written Works'
        ? 'WW'
        : categoryName === 'Performance Tasks'
          ? 'PT'
          : categoryName === 'Quarterly Assessment'
            ? 'QA'
            : 'ITEM';

    return `${prefix}${itemOrder}`;
  }

  private async getAssessmentPlacementSnapshot(assessment: {
    id: string;
    classId: string;
    classRecordCategory?: string | null;
    quarter?: string | null;
  }) {
    const linkedItem = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.assessmentId, assessment.id),
      with: {
        category: {
          columns: {
            id: true,
            name: true,
          },
        },
        classRecord: {
          columns: {
            id: true,
            classId: true,
            gradingPeriod: true,
          },
        },
        scores: {
          columns: {
            id: true,
          },
        },
      },
    });

    if (!linkedItem) {
      if (!assessment.classRecordCategory || !assessment.quarter) {
        return null;
      }

      return {
        placementMode: 'automatic' as const,
        classRecordId: null,
        gradingPeriod: assessment.quarter,
        itemId: null,
        category: assessment.classRecordCategory,
        order: null,
        title: null,
        maxScore: null,
        scoreCount: 0,
      };
    }

    let placementMode: 'automatic' | 'manual' = 'manual';
    const expectedCategoryName = this.getClassRecordCategoryName(
      assessment.classRecordCategory,
    );

    if (
      expectedCategoryName &&
      assessment.quarter &&
      linkedItem.classRecord.classId === assessment.classId &&
      linkedItem.classRecord.gradingPeriod === assessment.quarter &&
      linkedItem.category.name === expectedCategoryName
    ) {
      const categoryItems = await this.db.query.classRecordItems.findMany({
        where: and(
          eq(classRecordItems.classRecordId, linkedItem.classRecord.id),
          eq(classRecordItems.categoryId, linkedItem.category.id),
        ),
        with: {
          scores: {
            columns: {
              id: true,
            },
          },
        },
        orderBy: (items, { asc }) => [asc(items.itemOrder)],
      });

      const firstAutomaticSlot = categoryItems.find(
        (item) =>
          item.id === linkedItem.id ||
          (!item.assessmentId &&
            item.scores.length === 0 &&
            Number(item.maxScore) <= 0),
      );

      if (firstAutomaticSlot?.id === linkedItem.id) {
        placementMode = 'automatic';
      }
    }

    return {
      placementMode,
      classRecordId: linkedItem.classRecord.id,
      gradingPeriod: linkedItem.classRecord.gradingPeriod,
      itemId: linkedItem.id,
      category:
        this.getClassRecordCategoryCode(linkedItem.category.name) ??
        assessment.classRecordCategory,
      order: linkedItem.itemOrder,
      title: linkedItem.title,
      maxScore: Number(linkedItem.maxScore),
      scoreCount: linkedItem.scores.length,
    };
  }

  private async syncClassRecordPlacement(params: {
    assessmentId: string;
    classId: string;
    title: string;
    totalPoints: number;
    classRecordCategory?: string | null;
    quarter?: string | null;
    classRecordItemId?: string | null;
  }) {
    if (params.classRecordCategory && !params.quarter) {
      throw new BadRequestException(
        'A grading period is required for class-record placement',
      );
    }

    if (
      params.classRecordItemId &&
      (!params.classRecordCategory || !params.quarter)
    ) {
      throw new BadRequestException(
        'A specific slot can only be selected after quarter and category are set',
      );
    }

    const linkedItems = await this.db.query.classRecordItems.findMany({
      where: eq(classRecordItems.assessmentId, params.assessmentId),
      with: {
        classRecord: {
          columns: {
            id: true,
            classId: true,
            gradingPeriod: true,
            status: true,
          },
        },
        category: {
          columns: {
            id: true,
            name: true,
          },
        },
        scores: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: (items, { asc }) => [asc(items.itemOrder)],
    });

    if (linkedItems.some((item) => item.classRecord.status !== 'draft'))
      throw new ConflictException(
        'Assessment evidence in finalized or locked workbooks cannot be changed',
      );
    if (!params.classRecordCategory || !params.quarter) {
      if (linkedItems.some((item) => item.scores.length > 0)) {
        throw new BadRequestException(
          'This assessment already has recorded scores in the class record and cannot be detached',
        );
      }

      await Promise.all(
        linkedItems.map((item) =>
          this.db
            .update(classRecordItems)
            .set({
              assessmentId: null,
              title:
                item.examComponent ??
                this.getDefaultClassRecordItemTitle(
                  item.category.name,
                  item.itemOrder,
                ),
              maxScore: '0',
            })
            .where(eq(classRecordItems.id, item.id)),
        ),
      );
      return;
    }

    const categoryName = this.getClassRecordCategoryName(
      params.classRecordCategory,
    );
    if (!categoryName) {
      throw new BadRequestException('Invalid class record category');
    }

    if (!this.isGradingPeriodCode(params.quarter)) {
      throw new BadRequestException('Invalid class record quarter');
    }

    let record = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, params.classId),
        eq(classRecords.gradingPeriod, params.quarter),
      ),
    });

    if (!record) {
      const { cls } = await this.academicPolicyService.forClass(params.classId);
      if (!cls.teacherId)
        throw new BadRequestException(
          'Assign a teacher before creating the class workbook',
        );
      const created = await this.classRecordService.generateClassRecord(
        { classId: params.classId, gradingPeriod: params.quarter },
        cls.teacherId,
        ['teacher'],
      );
      record = created;
    }

    if (record.status !== 'draft') {
      throw new BadRequestException(
        'Only draft class record workbooks can accept assessment placement changes',
      );
    }

    const category = await this.db.query.classRecordCategories.findFirst({
      where: and(
        eq(classRecordCategories.classRecordId, record.id),
        eq(classRecordCategories.name, categoryName),
      ),
    });

    if (!category) {
      throw new BadRequestException(
        `Unable to find ${categoryName} slots in the selected class record.`,
      );
    }

    const categoryItems = await this.db.query.classRecordItems.findMany({
      where: and(
        eq(classRecordItems.classRecordId, record.id),
        eq(classRecordItems.categoryId, category.id),
      ),
      with: {
        scores: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: (items, { asc }) => [asc(items.itemOrder)],
    });

    const currentLinkedItem = linkedItems.find(
      (item) =>
        item.classRecord.id === record.id && item.category.id === category.id,
    );

    const targetItem =
      params.classRecordItemId != null
        ? categoryItems.find((item) => item.id === params.classRecordItemId)
        : currentLinkedItem
          ? categoryItems.find((item) => item.id === currentLinkedItem.id)
          : categoryItems.find(
              (item) =>
                !item.assessmentId &&
                item.scores.length === 0 &&
                Number(item.maxScore) <= 0,
            );

    if (params.classRecordItemId && !targetItem) {
      throw new BadRequestException(
        'The selected class record slot is not available in this category',
      );
    }

    if (!targetItem) {
      throw new BadRequestException(
        `Recording ${categoryName} is already full for ${params.quarter}.`,
      );
    }

    if (
      targetItem.assessmentId &&
      targetItem.assessmentId !== params.assessmentId
    ) {
      throw new BadRequestException(
        'The selected slot is already occupied by another assessment',
      );
    }

    if (
      !targetItem.assessmentId &&
      (targetItem.scores.length > 0 || Number(targetItem.maxScore) > 0)
    ) {
      throw new BadRequestException(
        'The selected slot already contains manual class record data',
      );
    }

    const displacedLinkedItems = linkedItems.filter(
      (item) => item.id !== targetItem?.id,
    );

    if (displacedLinkedItems.some((item) => item.scores.length > 0)) {
      throw new BadRequestException(
        'This assessment already has recorded scores in another slot and cannot be moved',
      );
    }

    if (
      !currentLinkedItem ||
      currentLinkedItem.id !== targetItem.id ||
      displacedLinkedItems.length
    )
      await this.assertNoAssessmentAttempts(params.assessmentId);
    await this.db.transaction(async (tx) => {
      for (const item of displacedLinkedItems) {
        await tx
          .update(classRecordItems)
          .set({
            assessmentId: null,
            title:
              item.examComponent ??
              this.getDefaultClassRecordItemTitle(
                item.category.name,
                item.itemOrder,
              ),
            maxScore: '0',
          })
          .where(eq(classRecordItems.id, item.id));
      }

      await tx
        .update(classRecordItems)
        .set({
          assessmentId: params.assessmentId,
          title: params.title,
          maxScore: String(params.totalPoints ?? 0),
        })
        .where(eq(classRecordItems.id, targetItem.id));
    });
  }

  private sanitizeRubricForViewer(
    criteria: unknown,
    viewerRole?: string,
    parseStatus?: string | null,
  ): RubricCriterion[] {
    if (!Array.isArray(criteria)) return [];
    if (viewerRole === 'student' && parseStatus !== 'reviewed') return [];
    return criteria as RubricCriterion[];
  }

  private isGradingPeriodCode(value: unknown): value is GradingPeriodCode {
    return value === 'Q1' || value === 'Q2' || value === 'Q3' || value === 'Q4';
  }

  private stripXmlTags(input: string) {
    return input
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async extractRubricTextFromFile(file: {
    filePath: string;
    originalName: string;
    mimeType?: string | null;
  }) {
    const absolutePath = path.resolve(file.filePath);
    const extension = this.fileExtensionFromName(file.originalName);

    if (extension === 'txt') {
      return (await fs.readFile(absolutePath, 'utf8')).trim();
    }

    if (extension === 'pdf') {
      const buffer = await fs.readFile(absolutePath);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (
        buf: Buffer,
      ) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      return parsed.text.trim();
    }

    if (extension === 'docx') {
      const buffer = await fs.readFile(absolutePath);
      const JSZipModule = await import('jszip');
      const zip = await JSZipModule.default.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')?.async('string');

      if (!documentXml) {
        throw new BadRequestException('Unable to read DOCX rubric contents');
      }

      return this.stripXmlTags(documentXml);
    }

    throw new BadRequestException(
      'Only PDF, DOCX, and TXT rubrics are supported',
    );
  }

  private draftRubricCriteriaFromText(text: string): RubricCriterion[] {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const criteria = lines
      .map((line, index) => {
        const pointsMatch = line.match(/(\d+)\s*(?:pts?|points?)\b/i);
        const title = line
          .replace(/^[-*•\d.)\s]+/, '')
          .replace(/\(?\d+\s*(?:pts?|points?)\)?/gi, '')
          .trim();

        if (!title || !pointsMatch) return null;

        return {
          id: `criterion-${index + 1}`,
          title,
          points: Number(pointsMatch[1]),
        } satisfies RubricCriterion;
      })
      .filter((criterion): criterion is RubricCriterion => Boolean(criterion));

    if (criteria.length > 0) {
      return criteria;
    }

    const paragraphChunks = text
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .slice(0, 5);

    return paragraphChunks.map((chunk, index) => ({
      id: `criterion-${index + 1}`,
      title:
        chunk.split(/[.!?]/)[0]?.trim().slice(0, 120) ||
        `Criterion ${index + 1}`,
      description: chunk.slice(0, 500),
      points: 20,
    }));
  }

  private async getAssessmentRubricSourceFile(assessment: {
    rubricSourceFileId?: string | null;
  }) {
    if (!assessment.rubricSourceFileId) return null;

    return this.db.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.id, assessment.rubricSourceFileId),
      columns: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
        filePath: true,
      },
    });
  }

  private ensureValidFileUploadSettings(input: {
    type?: string;
    fileUploadInstructions?: string;
    allowedUploadMimeTypes?: string[];
    allowedUploadExtensions?: string[];
    maxUploadSizeBytes?: number | null;
  }) {
    if (input.type !== AssessmentType.FILE_UPLOAD) return;

    // Drafts may be unfinished. Instructions and accepted file types are checked
    // by publication readiness; structural limits still apply on every save.
    const maxBytes =
      input.maxUploadSizeBytes ?? MAX_ASSESSMENT_UPLOAD_SIZE_BYTES;

    if (maxBytes < 1 || maxBytes > MAX_ASSESSMENT_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        `Max upload size must be between 1 and ${MAX_ASSESSMENT_UPLOAD_SIZE_BYTES} bytes`,
      );
    }
  }

  private getUserId(currentUser: any) {
    return this.assessmentAccessService.resolveActor(
      currentUser as CurrentUserLike | undefined,
    ).userId;
  }

  private getUserRole(currentUser: any): 'admin' | 'teacher' | 'student' {
    return this.assessmentAccessService.resolveActor(
      currentUser as CurrentUserLike | undefined,
    ).role;
  }

  private ensureAssessmentNotCoreTemplateAsset(
    assessment: { isCoreTemplateAsset?: boolean | null },
    action: string,
  ) {
    if (assessment.isCoreTemplateAsset) {
      throw new ForbiddenException(
        `Core template assessments are immutable; use release control to ${action}`,
      );
    }
  }

  private async assertCoreAssessmentReadyForPublish(assessment: {
    id: string;
    classId: string;
    classRecordCategory?: string | null;
    quarter?: string | null;
  }) {
    if (!assessment.classRecordCategory || !assessment.quarter) {
      throw new BadRequestException(
        'Core assessments must be assigned to a class record category and quarter before publishing',
      );
    }

    const expectedCategoryName = this.getClassRecordCategoryName(
      assessment.classRecordCategory,
    );
    if (!expectedCategoryName) {
      throw new BadRequestException(
        'Core assessments must be assigned to a valid class record category before publishing',
      );
    }

    const linkedItem = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.assessmentId, assessment.id),
      with: {
        classRecord: {
          columns: {
            id: true,
            classId: true,
            gradingPeriod: true,
          },
        },
        category: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (
      !linkedItem ||
      linkedItem.classRecord.classId !== assessment.classId ||
      linkedItem.classRecord.gradingPeriod !== assessment.quarter ||
      linkedItem.category.name !== expectedCategoryName
    ) {
      throw new BadRequestException(
        'Core assessments must be placed in a class record slot before publishing',
      );
    }

    await this.validateForPublish(assessment.id);
  }

  private async canStudentAccessAssessment(
    assessment: {
      id: string;
      classId: string;
      isPublished?: boolean | null;
      isCoreTemplateAsset?: boolean | null;
    },
    preloadedItems?: AssessmentVisibilityItem[],
  ) {
    if (!assessment.isPublished) return false;
    if (!assessment.isCoreTemplateAsset) return true;

    const attachedItems =
      preloadedItems ??
      ((await this.db.query.moduleItems.findMany({
        where: and(
          eq(moduleItems.assessmentId, assessment.id),
          eq(moduleItems.itemType, 'assessment'),
        ),
        with: {
          section: {
            with: {
              module: {
                columns: {
                  id: true,
                  classId: true,
                  isVisible: true,
                  isLocked: true,
                },
              },
            },
          },
        },
      })) as AssessmentVisibilityItem[]);

    if (attachedItems.length === 0) {
      return true;
    }

    return attachedItems.some((item) => {
      const parentModule = item.section?.module;
      return (
        Boolean(item.isGiven) &&
        Boolean(item.isVisible) &&
        parentModule?.classId === assessment.classId &&
        Boolean(parentModule.isVisible) &&
        !parentModule.isLocked
      );
    });
  }

  private assertTeacherClassOwnership(
    classTeacherId: string | null | undefined,
    currentUser: any,
    message: string,
  ) {
    return this.assessmentAccessService.assertTeacherClassOwnership(
      classTeacherId,
      currentUser as CurrentUserLike | undefined,
      message,
    );
  }

  private async ensureStudentEnrolled(classId: string, studentId: string) {
    await this.assessmentAccessService.ensureStudentEnrolled(
      classId,
      studentId,
    );
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

  private assertUniqueQuestionResponses(
    responses: ReadonlyArray<{ questionId: string }>,
  ): void {
    const questionIds = responses.map((response) => response.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new BadRequestException(
        'Provide at most one response per question',
      );
    }
  }

  private responseFingerprint(raw: unknown): string {
    return JSON.stringify(
      this.normalizeProgressResponses(raw)
        .map((response) => ({
          questionId: response.questionId,
          studentAnswer: response.studentAnswer ?? null,
          selectedOptionId: response.selectedOptionId ?? null,
          selectedOptionIds: [...(response.selectedOptionIds ?? [])].sort(),
        }))
        .sort((left, right) => left.questionId.localeCompare(right.questionId)),
    );
  }

  private getAssessmentPossiblePoints(assessment: {
    type: string;
    totalPoints?: number | null;
    questions?: ReadonlyArray<{ points?: number | null }>;
  }): number | null {
    if (assessment.type === AssessmentType.FILE_UPLOAD) return null;
    const evidenceTotal = (assessment.questions ?? []).reduce(
      (sum, question) => sum + Number(question.points ?? 0),
      0,
    );
    if (
      evidenceTotal <= 0 ||
      Number(assessment.totalPoints ?? 0) !== evidenceTotal
    ) {
      throw new BadRequestException(
        'Assessment total points do not match the current question evidence',
      );
    }
    return evidenceTotal;
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

  private clampQuestionIndex(
    questionCount: number,
    questionIndex?: number | null,
  ) {
    if (questionCount <= 0) return 0;
    const safeQuestionIndex = questionIndex ?? 0;
    return Math.min(Math.max(safeQuestionIndex, 0), questionCount - 1);
  }

  private computeQuestionDeadline(
    startedAt: Date | string | null,
    questionTimeLimitSeconds?: number | null,
  ) {
    if (
      !startedAt ||
      !questionTimeLimitSeconds ||
      questionTimeLimitSeconds < 1
    ) {
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

    const questionTimeLimitSeconds =
      assessment.questionTimeLimitSeconds ?? null;
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
      Math.floor(
        (now - currentQuestionDeadlineAt.getTime()) / questionDurationMs,
      ) + 1;
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
      currentQuestionDeadlineAt.getTime() +
        elapsedQuestionCount * questionDurationMs,
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
  async getAssessmentsByClass(
    classId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: 'all' | 'upcoming' | 'past_due' | 'completed';
      studentId?: string;
    },
    currentUser?: any,
  ) {
    if (currentUser) {
      const { userId, role } = this.assertTeacherClassOwnership(
        null,
        currentUser,
        'You do not have access to this class assessments list',
      );
      const cls = await this.db.query.classes.findFirst({
        where: eq(classes.id, classId),
        columns: { id: true, teacherId: true },
      });
      if (!cls) {
        throw new NotFoundException(`Class with ID "${classId}" not found`);
      }
      if (role === 'teacher' && cls.teacherId !== userId) {
        throw new ForbiddenException(
          'You can only view assessments for your own classes',
        );
      }
      if (role === 'student') {
        await this.ensureStudentEnrolled(classId, userId);
      }
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;
    const isStudent =
      Boolean(currentUser) && this.getUserRole(currentUser) === 'student';

    // Teacher/admin path: push pagination to DB for efficiency
    if (!isStudent) {
      const [assessmentList, totalResult] = await Promise.all([
        this.db.query.assessments.findMany({
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
          limit,
          offset,
        }),
        this.db
          .select({ value: count() })
          .from(assessments)
          .where(eq(assessments.classId, classId)),
      ]);

      const totalCount = Number(totalResult[0]?.value ?? 0);
      const { cls, policy } =
        await this.academicPolicyService.forClass(classId);
      const current = await this.academicPolicyService.currentState();
      const records = await this.db.query.classRecords.findMany({
        where: eq(classRecords.classId, classId),
        columns: { gradingPeriod: true, status: true },
      });
      return {
        data: assessmentList.map((assessment) => ({
          ...assessment,
          academicCapabilities: assessmentAcademicCapabilities({
            policy,
            schoolYear: cls.schoolYear,
            activeSchoolYear: current.schoolYear,
            quarter: assessment.quarter,
            activeQuarter: current.quarter,
            classActive: cls.isActive,
            published: Boolean(assessment.isPublished),
            workbookStatus: records.find(
              (r) => r.gradingPeriod === assessment.quarter,
            )?.status,
          }),
        })),
        total: totalCount,
        page,
        limit,
        totalPages: Math.max(Math.ceil(totalCount / limit), 1),
      };
    }

    // Student path: must fetch all then filter in-memory
    // (canStudentAccessAssessment requires per-row DB checks)
    let assessmentList = await this.db.query.assessments.findMany({
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
        moduleItems: {
          where: eq(moduleItems.itemType, 'assessment'),
          columns: { isGiven: true, isVisible: true },
          with: {
            section: {
              with: {
                module: {
                  columns: { classId: true, isVisible: true, isLocked: true },
                },
              },
            },
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    const { cls, policy } = await this.academicPolicyService.forClass(classId);
    const current = await this.academicPolicyService.currentState();
    const studentId = this.getUserId(currentUser)!;
    options = { ...options, studentId };
    const ownAttempts = assessmentList.length
      ? await this.db.query.assessmentAttempts.findMany({
          where: and(
            eq(assessmentAttempts.studentId, studentId),
            inArray(
              assessmentAttempts.assessmentId,
              assessmentList.map((a) => a.id),
            ),
          ),
          orderBy: [desc(assessmentAttempts.updatedAt)],
        })
      : [];
    const workbooks = await this.db.query.classRecords.findMany({
      where: eq(classRecords.classId, classId),
      columns: { gradingPeriod: true, status: true },
    });
    const capabilitiesById = new Map(
      assessmentList.map((assessment) => [
        assessment.id,
        assessmentAcademicCapabilities({
          policy,
          schoolYear: cls.schoolYear,
          activeSchoolYear: current.schoolYear,
          quarter: assessment.quarter,
          activeQuarter: current.quarter,
          classActive: cls.isActive,
          published: Boolean(assessment.isPublished),
          workbookStatus: workbooks.find(
            (r) => r.gradingPeriod === assessment.quarter,
          )?.status,
          hasAttempt: ownAttempts.some((a) => a.assessmentId === assessment.id),
          hasOngoingAttempt: ownAttempts.some(
            (a) => a.assessmentId === assessment.id && !a.isSubmitted,
          ),
        }),
      ]),
    );
    const visibleAssessments: typeof assessmentList = [];
    for (const assessment of assessmentList) {
      if (
        capabilitiesById.get(assessment.id)?.canView &&
        (await this.canStudentAccessAssessment(
          assessment,
          assessment.moduleItems,
        ))
      ) {
        visibleAssessments.push(assessment);
      }
    }
    assessmentList = visibleAssessments;

    if (options?.studentId) {
      const attempts = ownAttempts;

      const attemptMap = new Map<string, (typeof attempts)[number]>();
      const studentActivityMap = new Map<
        string,
        {
          hasSubmittedAttempt: boolean;
          submittedAttemptCount: number;
          ongoingAttemptId: string | null;
        }
      >();
      for (const attempt of attempts) {
        if (!attemptMap.has(attempt.assessmentId)) {
          attemptMap.set(attempt.assessmentId, attempt);
        }

        const activity = studentActivityMap.get(attempt.assessmentId) ?? {
          hasSubmittedAttempt: false,
          submittedAttemptCount: 0,
          ongoingAttemptId: null,
        };
        if (attempt.isSubmitted) {
          activity.hasSubmittedAttempt = true;
          activity.submittedAttemptCount += 1;
        } else if (!activity.ongoingAttemptId) {
          activity.ongoingAttemptId = attempt.id;
        }
        studentActivityMap.set(attempt.assessmentId, activity);
      }

      assessmentList = assessmentList
        .map((assessment) => ({
          ...assessment,
          academicCapabilities: capabilitiesById.get(assessment.id),
          latestAttempt: attemptMap.get(assessment.id) ?? null,
          studentActivity: studentActivityMap.get(assessment.id) ?? {
            hasSubmittedAttempt: false,
            submittedAttemptCount: 0,
            ongoingAttemptId: null,
          },
        }))
        .filter((assessment) => {
          const status = options.status ?? 'all';
          if (status === 'all') return true;
          if (status === 'completed') {
            return Boolean(assessment.latestAttempt?.isSubmitted);
          }
          if (status === 'past_due') {
            return Boolean(
              assessment.dueDate && new Date(assessment.dueDate) < new Date(),
            );
          }
          if (status === 'upcoming') {
            return (
              !assessment.dueDate || new Date(assessment.dueDate) >= new Date()
            );
          }
          return true;
        });
    }

    const total = assessmentList.length;
    const paginated = assessmentList
      .slice(offset, offset + limit)
      .map(({ moduleItems: _moduleItems, ...assessment }) => assessment);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
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
  async getAssessmentById(
    assessmentId: string,
    viewerRole?: string,
    currentUser?: CurrentUserLike,
  ): Promise<AssessmentView> {
    const assessment = (await this.db.query.assessments.findFirst({
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
    })) as AssessmentView | undefined;

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID "${assessmentId}" not found`,
      );
    }

    let historicalOwnAttempt = false;
    let academicCapabilities:
      | ReturnType<typeof assessmentAcademicCapabilities>
      | undefined;
    if (currentUser) {
      const { cls, policy } = await this.academicPolicyService.forClass(
        assessment.classId,
      );
      const current = await this.academicPolicyService.currentState();
      const records = await this.db.query.classRecords.findMany({
        where: eq(classRecords.classId, assessment.classId),
        columns: { gradingPeriod: true, status: true },
      });
      const ownAttempts =
        this.getUserRole(currentUser) === 'student'
          ? await this.db.query.assessmentAttempts.findMany({
              where: and(
                eq(assessmentAttempts.assessmentId, assessment.id),
                eq(assessmentAttempts.studentId, this.getUserId(currentUser)!),
              ),
              columns: { isSubmitted: true },
            })
          : [];
      historicalOwnAttempt =
        ownAttempts.length > 0 &&
        (cls.schoolYear < current.schoolYear ||
          !cls.isActive ||
          !policy.periods.some((p) => p.key === assessment.quarter));
      academicCapabilities = assessmentAcademicCapabilities({
        policy,
        schoolYear: cls.schoolYear,
        activeSchoolYear: current.schoolYear,
        quarter: assessment.quarter,
        activeQuarter: current.quarter,
        classActive: cls.isActive,
        published: Boolean(assessment.isPublished),
        workbookStatus: records.find(
          (r) => r.gradingPeriod === assessment.quarter,
        )?.status,
        hasAttempt: ownAttempts.length > 0,
        hasOngoingAttempt: ownAttempts.some((a) => !a.isSubmitted),
      });
    }
    if (currentUser) {
      const { userId, role } = this.assertTeacherClassOwnership(
        assessment.class?.teacherId,
        currentUser,
        'You do not have access to this assessment',
      );
      if (role === 'student') {
        if (!historicalOwnAttempt)
          await this.ensureStudentEnrolled(assessment.classId, userId);
        if (!academicCapabilities?.canView)
          throw new ForbiddenException(
            'This grading period is not available to students',
          );
        if (
          !historicalOwnAttempt &&
          !(await this.canStudentAccessAssessment(assessment))
        ) {
          throw new ForbiddenException(
            'Students cannot view unavailable assessments',
          );
        }
      }
    }

    let teacherAttachmentFile: AssessmentAttachmentSummary | null = null;
    if (assessment.teacherAttachmentFileId) {
      teacherAttachmentFile =
        (await this.db.query.uploadedFiles.findFirst({
          where: eq(uploadedFiles.id, assessment.teacherAttachmentFileId),
          columns: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            uploadedAt: true,
          },
        })) ?? null;
    }

    const rubricSourceFile =
      await this.getAssessmentRubricSourceFile(assessment);
    const rubricCriteria = this.sanitizeRubricForViewer(
      assessment.rubricCriteria,
      viewerRole,
      assessment.rubricParseStatus,
    );

    const sanitizedQuestions =
      viewerRole === 'student'
        ? assessment.questions.map((question) => {
            const decoratedQuestion = this.decorateAssessmentQuestion(question);
            return question.type === 'fill_blank'
              ? { ...decoratedQuestion, options: [] }
              : decoratedQuestion;
          })
        : assessment.questions.map((question) =>
            this.decorateAssessmentQuestion(question),
          );

    const authoringAttempt =
      currentUser && this.getUserRole(currentUser) !== 'student'
        ? await this.db.query.assessmentAttempts.findFirst({
            where: eq(assessmentAttempts.assessmentId, assessment.id),
            columns: { id: true },
          })
        : undefined;
    const authoringRestrictions =
      currentUser && this.getUserRole(currentUser) !== 'student'
        ? {
            hasAttempts: Boolean(authoringAttempt),
            canEditQuestions: Boolean(
              academicCapabilities?.canPrepare &&
              !assessment.isCoreTemplateAsset &&
              !authoringAttempt,
            ),
            reason: authoringAttempt
              ? 'Student attempts exist. Questions, answer keys, rubric and placement are protected; other permitted settings may still be edited.'
              : assessment.isCoreTemplateAsset
                ? 'Core template content cannot be changed.'
                : (academicCapabilities?.readOnlyReason ?? null),
          }
        : undefined;
    const assessmentWithAttachment = {
      ...assessment,
      academicCapabilities,
      authoringRestrictions,
      questions: sanitizedQuestions,
      teacherAttachmentFile,
      rubricSourceFile: rubricSourceFile
        ? {
            id: rubricSourceFile.id,
            originalName: rubricSourceFile.originalName,
            mimeType: rubricSourceFile.mimeType,
            sizeBytes: rubricSourceFile.sizeBytes,
            uploadedAt: rubricSourceFile.uploadedAt,
          }
        : null,
      rubricCriteria,
    };

    const classRecordPlacement = await this.getAssessmentPlacementSnapshot({
      id: assessment.id,
      classId: assessment.classId,
      classRecordCategory: assessment.classRecordCategory ?? undefined,
      quarter: assessment.quarter ?? undefined,
    });

    if (
      viewerRole === 'student' &&
      assessmentWithAttachment.randomizeQuestions &&
      assessmentWithAttachment.type !== AssessmentType.FILE_UPLOAD
    ) {
      return {
        ...this.randomizeAssessmentForStudent(assessmentWithAttachment),
        classRecordPlacement,
      };
    }

    return {
      ...assessmentWithAttachment,
      classRecordPlacement,
    };
  }

  /**
   * Create a new assessment
   */
  @AcademicMutation()
  async createAssessment(
    createAssessmentDto: CreateAssessmentDto,
    currentUser: any,
  ) {
    const { userId: actorId, role } = this.assertTeacherClassOwnership(
      null,
      currentUser,
      'You can only create assessments for your own classes',
    );

    // Verify class exists
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, createAssessmentDto.classId),
    });

    if (!classRecord) {
      throw new BadRequestException(
        `Class with ID "${createAssessmentDto.classId}" not found`,
      );
    }

    if (role === 'teacher' && classRecord.teacherId !== actorId) {
      throw new ForbiddenException(
        'You can only create assessments for your own classes',
      );
    }

    const state = await this.academicPolicyService.currentState();
    const { policy } = await this.academicPolicyService.forClass(
      createAssessmentDto.classId,
    );
    const quarter =
      createAssessmentDto.quarter ??
      (classRecord.schoolYear === state.schoolYear
        ? state.quarter
        : policy.periods[0].key);
    await this.assertAcademicMutation(
      { classId: createAssessmentDto.classId, quarter },
      'prepare',
    );
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
        description: this.sanitizeOptionalRichText(
          createAssessmentDto.description,
        ),
        classId: createAssessmentDto.classId,
        type: createAssessmentDto.type,
        dueDate: createAssessmentDto.dueDate
          ? new Date(createAssessmentDto.dueDate)
          : undefined,
        closeWhenDue: createAssessmentDto.closeWhenDue ?? true,
        randomizeQuestions: isFileUpload
          ? false
          : (createAssessmentDto.randomizeQuestions ?? false),
        timedQuestionsEnabled: isFileUpload
          ? false
          : (createAssessmentDto.timedQuestionsEnabled ?? false),
        questionTimeLimitSeconds: isFileUpload
          ? null
          : (createAssessmentDto.questionTimeLimitSeconds ?? null),
        strictMode: isFileUpload
          ? false
          : (createAssessmentDto.strictMode ?? false),
        fileUploadInstructions: isFileUpload
          ? this.sanitizeOptionalRichText(
              createAssessmentDto.fileUploadInstructions,
            )
          : null,
        teacherAttachmentFileId: isFileUpload
          ? createAssessmentDto.teacherAttachmentFileId
          : null,
        rubricSourceFileId: isFileUpload
          ? (createAssessmentDto.rubricSourceFileId ?? null)
          : null,
        rubricParseStatus: isFileUpload
          ? createAssessmentDto.rubricSourceFileId
            ? 'pending'
            : undefined
          : undefined,
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
        totalPoints: isFileUpload ? 100 : 0,
        passingScore: createAssessmentDto.passingScore,
        maxAttempts: createAssessmentDto.maxAttempts ?? 1,
        timeLimitMinutes: isFileUpload
          ? null
          : (createAssessmentDto.timeLimitMinutes ?? null),
        isPublished: false,
        feedbackLevel: createAssessmentDto.feedbackLevel,
        feedbackDelayHours: createAssessmentDto.feedbackDelayHours,
        classRecordCategory: createAssessmentDto.classRecordCategory,
        quarter,
      })
      .returning();

    await this.syncClassRecordPlacement({
      assessmentId: newAssessment.id,
      classId: newAssessment.classId,
      title: newAssessment.title,
      totalPoints: newAssessment.totalPoints ?? 0,
      classRecordCategory: newAssessment.classRecordCategory ?? undefined,
      quarter: newAssessment.quarter ?? undefined,
      classRecordItemId: createAssessmentDto.classRecordItemId,
    });

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

    await this.databaseService.afterAcademicCommit(() =>
      this.ragIndexingService.queueClassReindex(assessment.classId, {
        reason: 'assessment_created',
        actorId,
        source: 'assessments.createAssessment',
      }),
    );

    return assessment;
  }

  /**
   * Validate assessment is ready for publishing
   */
  private async validateForPublish(assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);
    const errors = assessmentPublicationIssues(assessment).map(
      (issue) => issue.message,
    );
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Assessment cannot be published',
        errors,
      });
    }
  }

  private async updateLinkedAssessmentHps(
    assessmentId: string,
    totalPoints: number,
  ) {
    await this.db
      .update(classRecordItems)
      .set({ maxScore: String(totalPoints) })
      .where(eq(classRecordItems.assessmentId, assessmentId));
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

    await this.updateLinkedAssessmentHps(assessmentId, total);
    return total;
  }

  /**
   * Update an assessment
   */
  @AcademicMutation()
  async updateAssessment(
    assessmentId: string,
    updateAssessmentDto: UpdateAssessmentDto,
    currentUser: any,
  ) {
    const { userId: actorId } = this.assertTeacherClassOwnership(
      null,
      currentUser,
      'You can only manage assessments for your own classes',
    );

    // Verify assessment exists
    const existingAssessment = await this.getAssessmentById(assessmentId);
    this.assertTeacherClassOwnership(
      existingAssessment.class?.teacherId,
      currentUser,
      'You can only manage assessments for your own classes',
    );

    await this.assertAcademicMutation(existingAssessment, 'prepare');
    const nextQuarter =
      updateAssessmentDto.quarter !== undefined
        ? updateAssessmentDto.quarter
        : existingAssessment.quarter;
    const nextCategory =
      updateAssessmentDto.classRecordCategory !== undefined
        ? updateAssessmentDto.classRecordCategory
        : existingAssessment.classRecordCategory;
    const placementChanged =
      nextQuarter !== existingAssessment.quarter ||
      nextCategory !== existingAssessment.classRecordCategory ||
      (updateAssessmentDto.classRecordItemId !== undefined &&
        updateAssessmentDto.classRecordItemId !==
          (
            existingAssessment.classRecordPlacement as {
              itemId?: string | null;
            } | null
          )?.itemId);
    const contentChanged =
      (updateAssessmentDto.type !== undefined &&
        updateAssessmentDto.type !== existingAssessment.type) ||
      (updateAssessmentDto.rubricCriteria !== undefined &&
        JSON.stringify(
          this.normalizeRubricCriteria(updateAssessmentDto.rubricCriteria),
        ) !==
          JSON.stringify(
            this.normalizeRubricCriteria(
              existingAssessment.rubricCriteria ?? [],
            ),
          )) ||
      (updateAssessmentDto.rubricSourceFileId !== undefined &&
        updateAssessmentDto.rubricSourceFileId !==
          existingAssessment.rubricSourceFileId);
    if (placementChanged || contentChanged)
      await this.assertNoAssessmentAttempts(assessmentId);
    await this.assertAcademicMutation(
      { ...existingAssessment, quarter: nextQuarter },
      updateAssessmentDto.isPublished === true ? 'release' : 'prepare',
    );
    const nextType = updateAssessmentDto.type ?? existingAssessment.type;
    const nextIsFileUpload = nextType === AssessmentType.FILE_UPLOAD;
    const wasPublished = Boolean(existingAssessment.isPublished);
    const shouldSyncClassRecordPlacement =
      !existingAssessment.isCoreTemplateAsset ||
      updateAssessmentDto.classRecordCategory !== undefined ||
      updateAssessmentDto.quarter !== undefined ||
      updateAssessmentDto.classRecordItemId !== undefined ||
      updateAssessmentDto.title !== undefined ||
      updateAssessmentDto.rubricCriteria !== undefined;
    const shouldRescheduleDueReminder =
      updateAssessmentDto.dueDate !== undefined ||
      updateAssessmentDto.isPublished !== undefined;

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
      if (existingAssessment.isCoreTemplateAsset) {
        await this.assertCoreAssessmentReadyForPublish({
          id: assessmentId,
          classId: existingAssessment.classId,
          classRecordCategory:
            updateAssessmentDto.classRecordCategory ??
            existingAssessment.classRecordCategory,
          quarter: updateAssessmentDto.quarter ?? existingAssessment.quarter,
        });
      } else {
        await this.validateForPublish(assessmentId);
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updateAssessmentDto.title !== undefined)
      updateData.title = updateAssessmentDto.title;
    if (updateAssessmentDto.description !== undefined)
      updateData.description = this.sanitizeOptionalRichText(
        updateAssessmentDto.description,
      );
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
      updateData.fileUploadInstructions = this.sanitizeOptionalRichText(
        updateAssessmentDto.fileUploadInstructions,
      );
    if (updateAssessmentDto.teacherAttachmentFileId !== undefined)
      updateData.teacherAttachmentFileId =
        updateAssessmentDto.teacherAttachmentFileId;
    if (
      updateAssessmentDto.rubricSourceFileId !== undefined &&
      updateAssessmentDto.rubricSourceFileId !==
        existingAssessment.rubricSourceFileId
    ) {
      updateData.rubricSourceFileId = updateAssessmentDto.rubricSourceFileId;
      updateData.rubricParseStatus = updateAssessmentDto.rubricSourceFileId
        ? (existingAssessment.rubricParseStatus ?? 'pending')
        : 'pending';
    }
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

    if (
      nextIsFileUpload &&
      updateAssessmentDto.rubricCriteria !== undefined &&
      JSON.stringify(
        this.normalizeRubricCriteria(updateAssessmentDto.rubricCriteria),
      ) !==
        JSON.stringify(
          this.normalizeRubricCriteria(existingAssessment.rubricCriteria ?? []),
        )
    ) {
      const rubricCriteria = this.normalizeRubricCriteria(
        updateAssessmentDto.rubricCriteria,
      );
      updateData.rubricCriteria = rubricCriteria;
      updateData.rubricParseStatus =
        rubricCriteria.length > 0 ? 'reviewed' : 'pending';
      updateData.rubricParsedAt = rubricCriteria.length > 0 ? new Date() : null;
      updateData.totalPoints =
        rubricCriteria.length > 0 ? this.sumRubricPoints(rubricCriteria) : 100;
    }

    if (!nextIsFileUpload) {
      // Full editor payloads can contain an empty rubric. Question assessments
      // always derive their score from questions, never from upload defaults.
      updateData.totalPoints = existingAssessment.questions.reduce(
        (total, question) => total + (question.points ?? 0),
        0,
      );
      updateData.fileUploadInstructions = null;
      updateData.teacherAttachmentFileId = null;
      updateData.rubricSourceFileId = null;
      updateData.rubricParseStatus = 'pending';
      updateData.rubricParsedAt = null;
      updateData.rubricRawText = null;
      updateData.rubricParseError = null;
      updateData.rubricCriteria = null;
      updateData.allowedUploadMimeTypes = null;
      updateData.allowedUploadExtensions = null;
      updateData.maxUploadSizeBytes = null;
    } else {
      updateData.randomizeQuestions = false;
      updateData.timedQuestionsEnabled = false;
      updateData.questionTimeLimitSeconds = null;
      updateData.strictMode = false;
      updateData.timeLimitMinutes = null;
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
      if (updateData.totalPoints === undefined) {
        const existingRubricCriteria = this.normalizeRubricCriteria(
          (existingAssessment.rubricCriteria as RubricCriterion[]) ?? [],
        );
        updateData.totalPoints =
          existingRubricCriteria.length > 0
            ? this.sumRubricPoints(existingRubricCriteria)
            : 100;
      }
    }

    const [updated] = await this.db
      .update(assessments)
      .set(updateData)
      .where(eq(assessments.id, assessmentId))
      .returning();

    if (shouldSyncClassRecordPlacement) {
      await this.syncClassRecordPlacement({
        assessmentId: updated.id,
        classId: updated.classId,
        title: updated.title,
        totalPoints: updated.totalPoints ?? 0,
        classRecordCategory: updated.classRecordCategory ?? undefined,
        quarter: updated.quarter ?? undefined,
        classRecordItemId: updateAssessmentDto.classRecordItemId,
      });
    }

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

    await this.databaseService.afterAcademicCommit(() =>
      this.ragIndexingService.queueClassReindex(assessment.classId, {
        reason: assessment.isPublished
          ? 'assessment_updated_published'
          : 'assessment_updated',
        actorId,
        source: 'assessments.updateAssessment',
      }),
    );

    await this.runAssessmentNotificationSideEffects(
      assessment.id,
      'updateAssessment',
      async () => {
        if (!wasPublished && assessment.isPublished) {
          await this.assessmentNotificationDispatch.enqueueAssessmentAssigned(
            assessment,
          );
        }

        if (
          assessment.isPublished &&
          (!wasPublished || shouldRescheduleDueReminder)
        ) {
          await this.assessmentNotificationDispatch.rescheduleAssessmentDueReminder(
            assessment,
          );
        }

        if (wasPublished && !assessment.isPublished) {
          await this.assessmentNotificationDispatch.removeAssessmentDueReminder(
            assessment.id,
          );
        }
      },
    );

    return assessment;
  }

  @AcademicMutation()
  async releaseCoreAssessment(
    assessmentId: string,
    dto: { isPublished: boolean },
    currentUser: any,
  ) {
    const { userId: actorId } = this.assertTeacherClassOwnership(
      null,
      currentUser,
      'You can only manage assessments for your own classes',
    );

    const assessment = await this.getAssessmentById(assessmentId);
    await this.assertAcademicMutation(
      assessment,
      dto.isPublished ? 'release' : 'prepare',
    );

    this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only manage assessments for your own classes',
    );

    if (!assessment.isCoreTemplateAsset) {
      throw new BadRequestException(
        'Only core template assessments can be released with this endpoint',
      );
    }

    if (dto.isPublished) {
      await this.assertCoreAssessmentReadyForPublish(assessment);
    }

    const [updated] = await this.db
      .update(assessments)
      .set({ isPublished: dto.isPublished, updatedAt: new Date() })
      .where(eq(assessments.id, assessmentId))
      .returning();

    await this.auditService.log({
      actorId,
      action: 'assessment.core_release_updated',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        classId: updated.classId,
        isPublished: updated.isPublished,
      },
    });

    const releasedAssessment = await this.getAssessmentById(assessmentId);

    await this.runAssessmentNotificationSideEffects(
      releasedAssessment.id,
      'releaseCoreAssessment',
      async () => {
        if (!assessment.isPublished && releasedAssessment.isPublished) {
          await this.assessmentNotificationDispatch.enqueueAssessmentAssigned(
            releasedAssessment,
          );
          await this.assessmentNotificationDispatch.rescheduleAssessmentDueReminder(
            releasedAssessment,
          );
        }

        if (assessment.isPublished && !releasedAssessment.isPublished) {
          await this.assessmentNotificationDispatch.removeAssessmentDueReminder(
            releasedAssessment.id,
          );
        }
      },
    );

    return releasedAssessment;
  }

  /**
   * Delete an assessment
   */
  @AcademicMutation()
  async deleteAssessment(assessmentId: string, currentUser: any) {
    const { userId: actorId } = this.assertTeacherClassOwnership(
      null,
      currentUser,
      'You can only manage assessments for your own classes',
    );

    const assessment = await this.getAssessmentById(assessmentId);
    await this.assertAcademicMutation(assessment, 'prepare');
    await this.assertNoAssessmentAttempts(assessment.id);

    this.ensureAssessmentNotCoreTemplateAsset(assessment, 'delete');
    this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only manage assessments for your own classes',
    );

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

    await this.databaseService.afterAcademicCommit(() =>
      this.ragIndexingService.queueClassReindex(assessment.classId, {
        reason: 'assessment_deleted',
        actorId,
        source: 'assessments.deleteAssessment',
      }),
    );

    return { success: true, message: 'Assessment deleted successfully' };
  }

  /**
   * Create a question for an assessment
   */
  @AcademicMutation()
  async createQuestion(createQuestionDto: CreateQuestionDto, currentUser: any) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    // Verify assessment exists
    const assessment = await this.getAssessmentById(
      createQuestionDto.assessmentId,
    );
    await this.assertAcademicMutation(assessment, 'prepare');
    await this.assertNoAssessmentAttempts(assessment.id);

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only manage questions for your own class assessments',
      );
    }

    const [newQuestion] = await this.db
      .insert(assessmentQuestions)
      .values({
        assessmentId: createQuestionDto.assessmentId,
        type: createQuestionDto.type,
        content:
          this.sanitizeOptionalRichText(createQuestionDto.content) || '<p></p>',
        points: createQuestionDto.points,
        order: createQuestionDto.order,
        isRequired: createQuestionDto.isRequired,
        explanation: this.sanitizeOptionalRichText(
          createQuestionDto.explanation,
        ),
        imageUrl: createQuestionDto.imageUrl,
        metadata: this.buildImageMetadata(
          undefined,
          createQuestionDto.imageDisplayMode,
          createQuestionDto.imageZoom,
          createQuestionDto.imagePositionX,
          createQuestionDto.imagePositionY,
        ),
        conceptTags: createQuestionDto.conceptTags,
      })
      .returning();

    // Add options if provided
    if (createQuestionDto.options && createQuestionDto.options.length > 0) {
      await this.db.insert(assessmentQuestionOptions).values(
        createQuestionDto.options.map((opt) => ({
          questionId: newQuestion.id,
          text: opt.text,
          imageUrl: opt.imageUrl,
          isCorrect: opt.isCorrect,
          order: opt.order,
          metadata: this.buildImageMetadata(
            undefined,
            opt.imageDisplayMode,
            opt.imageZoom,
            opt.imagePositionX,
            opt.imagePositionY,
          ),
        })),
      );
    }

    // Recalculate total points
    await this.recalculateTotalPoints(createQuestionDto.assessmentId);

    await this.databaseService.afterAcademicCommit(() =>
      this.ragIndexingService.queueClassReindex(assessment.classId, {
        reason: 'assessment_question_created',
        actorId: userId,
        source: 'assessments.createQuestion',
      }),
    );

    const createdQuestion = await this.getQuestionById(newQuestion.id);

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.question.created',
      targetType: 'assessment_question',
      targetId: newQuestion.id,
      metadata: {
        assessmentId: assessment.id,
        classId: assessment.classId,
        type: createdQuestion.type,
        points: createdQuestion.points,
      },
    });

    return createdQuestion;
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

    return this.decorateAssessmentQuestion(question);
  }

  /**
   * Update a question
   */
  @AcademicMutation()
  async updateQuestion(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
    currentUser: any,
  ) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const question = await this.getQuestionById(questionId);
    const assessment = await this.getAssessmentById(question.assessmentId);
    await this.assertAcademicMutation(assessment, 'prepare');
    await this.assertNoAssessmentAttempts(assessment.id);

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only manage questions for your own class assessments',
      );
    }

    // Update question fields
    if (
      updateQuestionDto.content !== undefined ||
      updateQuestionDto.points !== undefined ||
      updateQuestionDto.order !== undefined ||
      updateQuestionDto.isRequired !== undefined ||
      updateQuestionDto.explanation !== undefined ||
      updateQuestionDto.imageUrl !== undefined ||
      updateQuestionDto.imageDisplayMode !== undefined ||
      updateQuestionDto.imageZoom !== undefined ||
      updateQuestionDto.imagePositionX !== undefined ||
      updateQuestionDto.imagePositionY !== undefined ||
      updateQuestionDto.conceptTags !== undefined
    ) {
      const setData: Record<string, any> = { updatedAt: new Date() };
      if (updateQuestionDto.content !== undefined)
        setData.content =
          this.sanitizeOptionalRichText(updateQuestionDto.content) || '<p></p>';
      if (updateQuestionDto.points !== undefined)
        setData.points = updateQuestionDto.points;
      if (updateQuestionDto.order !== undefined)
        setData.order = updateQuestionDto.order;
      if (updateQuestionDto.isRequired !== undefined)
        setData.isRequired = updateQuestionDto.isRequired;
      if (updateQuestionDto.explanation !== undefined)
        setData.explanation = this.sanitizeOptionalRichText(
          updateQuestionDto.explanation,
        );
      if (updateQuestionDto.imageUrl !== undefined)
        setData.imageUrl = updateQuestionDto.imageUrl;
      if (
        updateQuestionDto.imageDisplayMode !== undefined ||
        updateQuestionDto.imageZoom !== undefined ||
        updateQuestionDto.imagePositionX !== undefined ||
        updateQuestionDto.imagePositionY !== undefined
      ) {
        setData.metadata = this.buildImageMetadata(
          question.metadata as Record<string, unknown> | undefined,
          updateQuestionDto.imageDisplayMode,
          updateQuestionDto.imageZoom,
          updateQuestionDto.imagePositionX,
          updateQuestionDto.imagePositionY,
        );
      }
      if (updateQuestionDto.conceptTags !== undefined)
        setData.conceptTags = updateQuestionDto.conceptTags;

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
            imageUrl: opt.imageUrl,
            isCorrect: opt.isCorrect,
            order: opt.order,
            metadata: this.buildImageMetadata(
              undefined,
              opt.imageDisplayMode,
              opt.imageZoom,
              opt.imagePositionX,
              opt.imagePositionY,
            ),
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

    await this.databaseService.afterAcademicCommit(() =>
      this.ragIndexingService.queueClassReindex(assessment.classId, {
        reason: 'assessment_question_updated',
        actorId: userId,
        source: 'assessments.updateQuestion',
      }),
    );

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.question.updated',
      targetType: 'assessment_question',
      targetId: questionId,
      metadata: {
        assessmentId: question.assessmentId,
        classId: assessment.classId,
        points: updatedQuestion.points,
        optionsReplaced: updateQuestionDto.options !== undefined,
      },
    });

    return updatedQuestion;
  }

  @AcademicMutation()
  async updateQuestionOptionImage(
    optionId: string,
    imageUrl: string | null,
    currentUser: any,
  ) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const option = await this.db.query.assessmentQuestionOptions.findFirst({
      where: eq(assessmentQuestionOptions.id, optionId),
    });

    if (!option) {
      throw new NotFoundException(
        `Question option with ID "${optionId}" not found`,
      );
    }

    const question = await this.getQuestionById(option.questionId);
    const assessment = await this.getAssessmentById(question.assessmentId);
    await this.assertAcademicMutation(assessment, 'prepare');
    await this.assertNoAssessmentAttempts(assessment.id);

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only manage questions for your own class assessments',
      );
    }

    await this.db
      .update(assessmentQuestionOptions)
      .set({
        imageUrl,
        metadata: this.buildImageMetadata(
          option.metadata as Record<string, unknown> | undefined,
          (option.metadata as Record<string, unknown> | undefined)
            ?.imageDisplayMode,
          (option.metadata as Record<string, unknown> | undefined)?.imageZoom,
          (option.metadata as Record<string, unknown> | undefined)
            ?.imagePositionX,
          (option.metadata as Record<string, unknown> | undefined)
            ?.imagePositionY,
        ),
      })
      .where(eq(assessmentQuestionOptions.id, optionId));

    await this.databaseService.afterAcademicCommit(() =>
      this.ragIndexingService.queueClassReindex(assessment.classId, {
        reason: 'assessment_question_option_updated',
        actorId: userId,
        source: 'assessments.updateQuestionOptionImage',
      }),
    );

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.question_option.updated',
      targetType: 'assessment_question_option',
      targetId: optionId,
      metadata: {
        assessmentId: question.assessmentId,
        classId: assessment.classId,
        imageUrl,
      },
    });

    return this.getQuestionById(question.id);
  }

  /**
   * Delete a question
   */
  @AcademicMutation()
  async deleteQuestion(questionId: string, currentUser: any) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const question = await this.getQuestionById(questionId);
    const assessment = await this.getAssessmentById(question.assessmentId);
    await this.assertAcademicMutation(assessment, 'prepare');
    await this.assertNoAssessmentAttempts(assessment.id);

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only manage questions for your own class assessments',
      );
    }

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

    await this.databaseService.afterAcademicCommit(() =>
      this.ragIndexingService.queueClassReindex(assessment.classId, {
        reason: 'assessment_question_deleted',
        actorId: userId,
        source: 'assessments.deleteQuestion',
      }),
    );

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.question.deleted',
      targetType: 'assessment_question',
      targetId: questionId,
      metadata: {
        assessmentId: question.assessmentId,
        classId: assessment.classId,
        type: question.type,
        order: question.order,
      },
    });

    return { success: true, message: 'Question deleted successfully' };
  }

  /**
   * Start an assessment attempt
   */
  @AcademicMutation()
  async startAttempt(studentId: string, assessmentId: string) {
    // Verify assessment exists and is published
    const assessment = await this.getAssessmentById(assessmentId, 'student', {
      userId: studentId,
      roles: ['student'],
    });

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

    let completedExistingAttempt = false;
    if (existingUnsubmitted) {
      await this.assertAcademicMutation(assessment, 'complete', true);
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
          completedExistingAttempt = true;
          // Fall through to create a new attempt
        } else {
          const syncedAttempt = await this.syncTimedAttemptState(
            assessment,
            existingUnsubmitted,
          );

          if (!syncedAttempt) {
            completedExistingAttempt = true;
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
            questionTimeLimitSeconds:
              assessment.questionTimeLimitSeconds ?? null,
          };
        }
        completedExistingAttempt = true;
      }
    }

    try {
      await this.assertAcademicMutation(assessment, 'start');
    } catch (error) {
      if (completedExistingAttempt && error instanceof ConflictException)
        throw new AcademicCommittedResponse(error);
      throw error;
    }
    // Check due date only for new attempts.
    // Existing in-progress attempts are allowed to continue/submit.
    if (
      (assessment.closeWhenDue ?? true) &&
      assessment.dueDate &&
      new Date(assessment.dueDate) < new Date()
    ) {
      const error = new ForbiddenException(
        'This assessment is closed (due date passed)',
      );
      if (completedExistingAttempt) throw new AcademicCommittedResponse(error);
      throw error;
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
    const enforceAttemptCap = assessment.type !== AssessmentType.FILE_UPLOAD;
    if (enforceAttemptCap && submittedAttempts.length >= maxAttempts) {
      const error = new ForbiddenException(
        `Maximum attempts reached (${maxAttempts}). You cannot retake this assessment.`,
      );
      if (completedExistingAttempt) throw new AcademicCommittedResponse(error);
      throw error;
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
        currentQuestionDeadlineAt:
          freshQuestionTiming.currentQuestionDeadlineAt,
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

  @AcademicMutation()
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

    await this.assertAcademicMutation(assessment, 'complete', true);

    if (
      attempt.expiresAt &&
      new Date(attempt.expiresAt).getTime() <= Date.now()
    ) {
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
            classId: true,
            quarter: true,
            timeLimitMinutes: true,
          },
          with: { class: { columns: { schoolYear: true, isActive: true } } },
        },
      },
      orderBy: (a, { desc: d }) => [d(a.updatedAt)],
    });

    const current = await this.academicPolicyService.currentState();
    const classIds = [...new Set(ongoing.map((a) => a.assessment.classId))];
    const records = classIds.length
      ? await this.db.query.classRecords.findMany({
          where: inArray(classRecords.classId, classIds),
          columns: { classId: true, gradingPeriod: true, status: true },
        })
      : [];
    const now = Date.now();
    const active = ongoing.filter(
      (attempt) =>
        attempt.assessment.class.isActive &&
        attempt.assessment.class.schoolYear === current.schoolYear &&
        current.policy.periods.some(
          (p) => p.key === attempt.assessment.quarter,
        ) &&
        !records.some(
          (r) =>
            r.classId === attempt.assessment.classId &&
            r.gradingPeriod === attempt.assessment.quarter &&
            r.status !== 'draft',
        ) &&
        (!attempt.expiresAt || new Date(attempt.expiresAt).getTime() > now),
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

  @AcademicMutation()
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
    await this.assertAcademicMutation(assessment, 'complete', true);

    if (
      attempt.expiresAt &&
      new Date(attempt.expiresAt).getTime() <= Date.now()
    ) {
      await this.autoSubmitExpiredAttempt(assessment, attempt);
      throw new AcademicCommittedResponse(
        new BadRequestException(
          'Attempt already expired and was auto-submitted',
        ),
      );
    }

    const syncedAttempt = await this.syncTimedAttemptState(assessment, attempt);
    if (!syncedAttempt) {
      throw new AcademicCommittedResponse(
        new BadRequestException(
          'Question timer expired and the attempt was auto-submitted',
        ),
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
        throw new AcademicCommittedResponse(
          new ForbiddenException(
            'Attempt auto-submitted after repeated anti-cheat violations',
          ),
        );
      }

      attempt = updatedForViolation;
    }

    const questionCount = assessment.questions?.length ?? 0;

    if (
      ((assessment.strictMode ?? false) ||
        this.isTimedQuestionMode(assessment)) &&
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
      const normalizedResponses = this.normalizeProgressResponses(
        updateAttemptProgressDto.responses,
      );
      this.assertUniqueQuestionResponses(normalizedResponses);
      progressUpdates.draftResponses = normalizedResponses;
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
  @AcademicMutation()
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
      const latestSubmittedAttempt =
        await this.db.query.assessmentAttempts.findFirst({
          where: and(
            eq(assessmentAttempts.studentId, studentId),
            eq(
              assessmentAttempts.assessmentId,
              submitAssessmentDto.assessmentId,
            ),
            eq(assessmentAttempts.isSubmitted, true),
          ),
          orderBy: (attempts, { desc: descending }) => [
            descending(attempts.submittedAt),
            descending(attempts.updatedAt),
          ],
        });
      if (
        latestSubmittedAttempt &&
        this.responseFingerprint(latestSubmittedAttempt.draftResponses) ===
          this.responseFingerprint(submitAssessmentDto.responses)
      ) {
        const responses = await this.db.query.assessmentResponses.findMany({
          where: eq(assessmentResponses.attemptId, latestSubmittedAttempt.id),
        });
        const scoreContract = this.scoreContract(latestSubmittedAttempt);
        return {
          attempt: { ...latestSubmittedAttempt, ...scoreContract },
          responses,
          totalPoints: Number(latestSubmittedAttempt.basePointsEarned ?? 0),
          ...scoreContract,
          passed: latestSubmittedAttempt.passed,
          idempotentReplay: true,
        };
      }
      throw new BadRequestException(
        'No active attempt found. Please start the assessment first.',
      );
    }

    this.assertUniqueQuestionResponses(submitAssessmentDto.responses);
    const possiblePoints = this.getAssessmentPossiblePoints(assessment);

    await this.assertAcademicMutation(assessment, 'complete', true);

    // Check time limit enforcement (with 60s grace)
    if (assessment.timeLimitMinutes) {
      const startedAt = new Date(attempt.startedAt);
      const elapsedMinutes = (Date.now() - startedAt.getTime()) / (1000 * 60);
      if (elapsedMinutes > assessment.timeLimitMinutes + 1) {
        // Still accept but mark as time-exceeded
      }
    }

    if (assessment.type === AssessmentType.FILE_UPLOAD) {
      const submittedFiles = this.getAttemptSubmittedFiles(attempt);
      if (submittedFiles.length === 0) {
        throw new BadRequestException(
          'Please upload a file before submitting this assessment',
        );
      }
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
      await this.auditService.log({
        actorId: studentId,
        action: 'assessment.submission.submitted',
        targetType: 'assessment_attempt',
        targetId: attempt.id,
        metadata: {
          assessmentId: submitAssessmentDto.assessmentId,
          classId: assessment.classId,
          studentId,
          attemptNumber: attempt.attemptNumber,
          isFileUpload: true,
          score: null,
          passed: null,
        },
      });

      return {
        attempt: { ...attempt, ...this.scoreContract(attempt, false) },
        responses: [],
        totalPoints: 0,
        score: null,
        scorePercent: null,
        scoreBreakdown: null,
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
    const assessmentTotal = possiblePoints!;
    const normalizedScore = calculateBoundedScore({
      basePoints: totalPoints,
      possiblePoints: assessmentTotal,
    });
    const score = Math.round(normalizedScore.scorePercent);
    const passed = score >= (assessment.passingScore || 60);

    // Update attempt with final score
    const [finalAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        score,
        passed,
        basePointsEarned: normalizedScore.basePoints.toString(),
        possiblePointsSnapshot: normalizedScore.possiblePoints.toString(),
        bonusPoints: '0',
        bonusReason: null,
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

    await this.auditService.log({
      actorId: studentId,
      action: 'assessment.submission.submitted',
      targetType: 'assessment_attempt',
      targetId: finalAttempt.id,
      metadata: {
        assessmentId: submitAssessmentDto.assessmentId,
        classId: assessment.classId,
        studentId,
        isFileUpload: false,
        score,
        passed,
      },
    });

    return {
      attempt: { ...finalAttempt, ...this.scoreContract(finalAttempt) },
      responses,
      totalPoints,
      ...this.scoreContract(finalAttempt),
      passed,
    };
  }

  @AcademicMutation()
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
    await this.assertAcademicMutation(assessment, 'prepare');

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
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

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.attachment.uploaded',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        classId: assessment.classId,
        fileId: record.id,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
      },
    });

    return record;
  }

  async uploadRubricSource(
    assessmentId: string,
    currentUser: any,
    file: Express.Multer.File,
  ) {
    const assessment = await this.getAssessmentById(assessmentId);
    this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only manage rubrics for your own class assessments',
    );
    let rubricRawText = '';
    let rubricCriteria: RubricCriterion[] = [];
    let rubricParseStatus: 'parsed' | 'failed' = 'parsed';
    let rubricParseError: string | null = null;

    try {
      rubricRawText = await this.extractRubricTextFromFile({
        filePath: file.path.replace(/\\/g, '/'),
        originalName: file.originalname,
        mimeType: file.mimetype,
      });
      rubricCriteria = this.draftRubricCriteriaFromText(rubricRawText);
    } catch (error) {
      rubricParseStatus = 'failed';
      rubricParseError =
        error instanceof Error ? error.message : 'Unable to parse rubric file';
    }

    // File parsing happens outside the academic lock; authorization and lifecycle
    // are checked again by the committed writer after potentially slow parsing.
    return this.saveRubricSource(assessmentId, currentUser, file, {
      rubricRawText,
      rubricCriteria,
      rubricParseStatus,
      rubricParseError,
    });
  }

  @AcademicMutation()
  private async saveRubricSource(
    assessmentId: string,
    currentUser: any,
    file: Express.Multer.File,
    parsed: {
      rubricRawText: string;
      rubricCriteria: RubricCriterion[];
      rubricParseStatus: 'parsed' | 'failed';
      rubricParseError: string | null;
    },
  ) {
    const {
      rubricRawText,
      rubricCriteria,
      rubricParseStatus,
      rubricParseError,
    } = parsed;
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const assessment = await this.getAssessmentById(assessmentId);
    await this.assertAcademicMutation(assessment, 'prepare');
    await this.assertNoAssessmentAttempts(assessment.id);

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only manage rubrics for your own class assessments',
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
        rubricSourceFileId: record.id,
        rubricParseStatus,
        rubricParsedAt: rubricParseStatus === 'parsed' ? new Date() : null,
        rubricRawText: rubricRawText || null,
        rubricParseError,
        rubricCriteria: rubricCriteria,
        totalPoints:
          rubricCriteria.length > 0
            ? this.sumRubricPoints(rubricCriteria)
            : 100,
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId));

    const updatedAssessment = await this.getAssessmentById(assessmentId);
    await this.updateLinkedAssessmentHps(
      assessmentId,
      updatedAssessment.totalPoints,
    );

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.rubric.uploaded',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        classId: assessment.classId,
        fileId: record.id,
        rubricParseStatus,
        criteriaCount: updatedAssessment.rubricCriteria?.length ?? 0,
      },
    });

    return {
      file: record,
      rubricParseStatus,
      rubricParseError,
      rubricRawText,
      rubricCriteria: updatedAssessment.rubricCriteria,
    };
  }

  @AcademicMutation()
  async reviewRubric(
    assessmentId: string,
    currentUser: any,
    rubricCriteria: RubricCriterion[],
  ) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const assessment = await this.getAssessmentById(assessmentId);
    await this.assertAcademicMutation(assessment, 'prepare');
    await this.assertNoAssessmentAttempts(assessment.id);

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only review rubrics for your own class assessments',
      );
    }

    const normalizedCriteria = this.normalizeRubricCriteria(rubricCriteria);

    await this.db
      .update(assessments)
      .set({
        rubricCriteria: normalizedCriteria,
        rubricParseStatus:
          normalizedCriteria.length > 0 ? 'reviewed' : 'parsed',
        rubricParsedAt: new Date(),
        totalPoints:
          normalizedCriteria.length > 0
            ? this.sumRubricPoints(normalizedCriteria)
            : 100,
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId));
    const updatedAssessment = await this.getAssessmentById(assessmentId);
    await this.updateLinkedAssessmentHps(
      assessmentId,
      updatedAssessment.totalPoints,
    );

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.rubric.reviewed',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        classId: assessment.classId,
        criteriaCount: normalizedCriteria.length,
        totalPoints: updatedAssessment.totalPoints,
      },
    });

    return updatedAssessment;
  }

  @AcademicMutation()
  async unsubmitFileUploadAssessment(studentId: string, assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);
    await this.assertAcademicMutation(assessment, 'start');
    if (assessment.type !== AssessmentType.FILE_UPLOAD) {
      throw new BadRequestException(
        'Only file upload assessments support unsubmit',
      );
    }

    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.isSubmitted, true),
      ),
      orderBy: (a, { desc: d }) => [d(a.submittedAt), d(a.updatedAt)],
    });

    if (!attempt) {
      throw new BadRequestException(
        'No submitted file upload attempt was found to unsubmit',
      );
    }

    if (!attempt.submittedFileId) {
      throw new BadRequestException(
        'This attempt does not have an uploaded file to restore',
      );
    }

    if (attempt.isReturned) {
      throw new BadRequestException(
        'Returned file upload attempts can no longer be unsubmitted',
      );
    }

    if (
      (assessment.closeWhenDue ?? true) &&
      assessment.dueDate &&
      new Date(assessment.dueDate) < new Date()
    ) {
      throw new BadRequestException(
        'This assessment is already closed and can no longer be unsubmitted',
      );
    }

    const [updatedAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        isSubmitted: false,
        submittedAt: null,
        score: null,
        passed: null,
        timeSpentSeconds: null,
        isReturned: false,
        returnedAt: null,
        teacherFeedback: null,
        updatedAt: new Date(),
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    await this.auditService.log({
      actorId: studentId,
      action: 'assessment.submission.unsubmitted',
      targetType: 'assessment_attempt',
      targetId: updatedAttempt.id,
      metadata: {
        assessmentId,
        classId: assessment.classId,
        studentId,
        submittedFileId: attempt.submittedFileId,
        attemptNumber: attempt.attemptNumber,
      },
    });

    return updatedAttempt;
  }

  @AcademicMutation()
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

    const submittedFiles = [
      ...this.getAttemptSubmittedFiles(attempt),
      {
        id: record.id,
        originalName: record.originalName,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        uploadedAt: record.uploadedAt,
      },
    ];

    await this.db
      .update(assessmentAttempts)
      .set({
        ...this.buildSubmittedFileSnapshot(submittedFiles),
        updatedAt: new Date(),
      })
      .where(eq(assessmentAttempts.id, attempt.id));

    await this.auditService.log({
      actorId: studentId,
      action: 'assessment.submission.file_uploaded',
      targetType: 'assessment_attempt',
      targetId: attempt.id,
      metadata: {
        assessmentId,
        classId: assessment.classId,
        studentId,
        fileId: record.id,
        originalName: record.originalName,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        attemptNumber: attempt.attemptNumber,
      },
    });

    return {
      attemptId: attempt.id,
      file: record,
      files: submittedFiles,
    };
  }

  @AcademicMutation()
  async removeStudentSubmissionFile(
    assessmentId: string,
    fileId: string,
    currentUser: any,
  ) {
    const studentId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!studentId || role !== 'student') {
      throw new ForbiddenException('Only students can remove submission files');
    }

    const assessment = await this.getAssessmentById(assessmentId);
    if (assessment.type !== AssessmentType.FILE_UPLOAD) {
      throw new BadRequestException(
        'This assessment does not accept file uploads',
      );
    }

    await this.ensureStudentEnrolled(assessment.classId, studentId);

    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.isSubmitted, false),
      ),
      orderBy: (a, { desc }) => [desc(a.updatedAt)],
    });

    if (!attempt) {
      throw new NotFoundException('No active draft submission found');
    }

    await this.assertAcademicMutation(assessment, 'complete', true);

    const submittedFiles = this.getAttemptSubmittedFiles(attempt);
    const removedFile =
      submittedFiles.find((entry) => entry.id === fileId) ?? null;
    const nextSubmittedFiles = submittedFiles.filter(
      (entry) => entry.id !== fileId,
    );

    if (nextSubmittedFiles.length === submittedFiles.length) {
      throw new NotFoundException('Submitted file not found on this attempt');
    }

    await this.db
      .update(assessmentAttempts)
      .set({
        ...this.buildSubmittedFileSnapshot(nextSubmittedFiles),
        updatedAt: new Date(),
      })
      .where(eq(assessmentAttempts.id, attempt.id));

    await this.db
      .update(uploadedFiles)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(uploadedFiles.id, fileId), isNull(uploadedFiles.deletedAt)),
      );

    await this.auditService.log({
      actorId: studentId,
      action: 'assessment.submission.file_removed',
      targetType: 'assessment_attempt',
      targetId: attempt.id,
      metadata: {
        assessmentId,
        classId: assessment.classId,
        studentId,
        fileId,
        originalName: removedFile?.originalName ?? null,
        remainingFileCount: nextSubmittedFiles.length,
        attemptNumber: attempt.attemptNumber,
      },
    });

    return {
      attemptId: attempt.id,
      files: nextSubmittedFiles,
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

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const file = await this.db.query.uploadedFiles.findFirst({
      where: eq(uploadedFiles.id, assessment.teacherAttachmentFileId),
    });

    if (!file) {
      throw new NotFoundException('Attached file not found');
    }

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.attachment.downloaded',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        classId: assessment.classId,
        fileId: file.id,
        requestedByRole: role,
      },
    });

    return file;
  }

  async getAttemptSubmissionDownload(
    attemptId: string,
    currentUser: any,
    fileId?: string,
  ) {
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

    const submittedFiles = this.getAttemptSubmittedFiles(attempt);
    if (submittedFiles.length === 0) {
      throw new NotFoundException('No submitted file found for this attempt');
    }

    if (role === 'student' && attempt.studentId !== userId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    if (role === 'teacher' && attempt.assessment?.class?.teacherId !== userId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const targetFileId =
      fileId || submittedFiles[submittedFiles.length - 1]?.id;
    const file = await this.db.query.uploadedFiles.findFirst({
      where: and(
        eq(uploadedFiles.id, targetFileId),
        isNull(uploadedFiles.deletedAt),
      ),
    });

    if (!file) {
      throw new NotFoundException('Submitted file no longer exists');
    }

    if (!submittedFiles.some((entry) => entry.id === file.id)) {
      throw new ForbiddenException(
        'You do not have access to this submitted file',
      );
    }

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.submission.file_downloaded',
      targetType: 'assessment_attempt',
      targetId: attempt.id,
      metadata: {
        assessmentId: attempt.assessmentId,
        classId: attempt.assessment?.classId ?? null,
        studentId: attempt.studentId,
        fileId: file.id,
        requestedByRole: role,
      },
    });

    return file;
  }

  /**
   * Get student's attempt results
   * For students: only show score/details if grade has been returned
   * For teachers: always show full results
   */
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
  async getAttemptResults(
    attemptId: string,
    currentUser: any,
    userRole?: string,
  ) {
    const { userId, role } = this.assertTeacherClassOwnership(
      undefined,
      currentUser,
      'You do not have access to this attempt',
    );

    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.id, attemptId),
      with: {
        assessment: {
          with: {
            class: {
              columns: {
                teacherId: true,
              },
            },
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

    if (role === 'student' && attempt.studentId !== userId) {
      throw new ForbiddenException(
        'Students may only view their own attempt results',
      );
    }
    if (role === 'teacher' && attempt.assessment?.class?.teacherId !== userId) {
      throw new ForbiddenException('You do not have access to this attempt');
    }

    const normalizedUserRole =
      userRole ?? (role === 'student' ? 'student' : undefined);

    const submittedFiles = this.getAttemptSubmittedFiles(attempt);
    const submittedFileIds = submittedFiles.map((entry) => entry.id);
    const uploadedSubmissionFiles =
      submittedFileIds.length > 0
        ? await this.db.query.uploadedFiles.findMany({
            where: inArray(uploadedFiles.id, submittedFileIds),
            columns: {
              id: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              uploadedAt: true,
            },
          })
        : [];
    const uploadedSubmissionFileMap = new Map(
      uploadedSubmissionFiles.map((file) => [file.id, file]),
    );
    const resolvedSubmittedFiles = submittedFiles
      .map((entry) => uploadedSubmissionFileMap.get(entry.id) ?? null)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const submittedFile =
      resolvedSubmittedFiles[resolvedSubmittedFiles.length - 1] ?? null;

    // If student role and grade not returned yet, hide score details
    if (normalizedUserRole === 'student' && !attempt.isReturned) {
      return {
        id: attempt.id,
        assessmentId: attempt.assessmentId,
        attemptNumber: attempt.attemptNumber,
        isSubmitted: attempt.isSubmitted,
        submittedAt: attempt.submittedAt,
        isReturned: false,
        ...this.scoreContract(attempt, false),
        passed: null,
        directScore: null,
        rubricScores: [],
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
          rubricCriteria: this.sanitizeRubricForViewer(
            attempt.assessment.rubricCriteria,
            normalizedUserRole,
            attempt.assessment.rubricParseStatus,
          ),
        },
        submittedFile,
        submittedFiles: resolvedSubmittedFiles,
      };
    }

    if (normalizedUserRole === 'student') {
      // Apply smart feedback filtering via dedicated FeedbackService
      const filtered = this.feedbackService.applyFeedbackFiltering(attempt);
      filtered.isReturned = attempt.isReturned;
      filtered.returnedAt = attempt.returnedAt;
      filtered.teacherFeedback = attempt.teacherFeedback;
      filtered.submittedFile = submittedFile;
      filtered.submittedFiles = resolvedSubmittedFiles;
      filtered.directScore = attempt.directScore;
      filtered.rubricScores = attempt.rubricScores ?? [];
      Object.assign(filtered, this.scoreContract(attempt));
      return filtered;
    }

    return {
      ...attempt,
      ...this.scoreContract(attempt),
      responses: (attempt.responses || []).map((r: any) => ({
        ...r,
        hint:
          r.hint ||
          (this.feedbackService?.generateLearningHint
            ? this.feedbackService.generateLearningHint(r.question, r.isCorrect)
            : null),
      })),
      isReturned: attempt.isReturned,
      returnedAt: attempt.returnedAt,
      teacherFeedback: attempt.teacherFeedback,
      submittedFile,
      submittedFiles: resolvedSubmittedFiles,
      directScore: attempt.directScore,
      rubricScores: attempt.rubricScores ?? [],
    };
  }
  // ─── Private helpers (extracted from submitAssessment) ──────────────

  private async autoSubmitExpiredAttempt(
    assessment: any,
    attempt: typeof assessmentAttempts.$inferSelect,
  ) {
    await this.assertAcademicMutation(assessment, 'complete', true);
    const submissionResponses = this.normalizeProgressResponses(
      attempt.draftResponses,
    );
    this.assertUniqueQuestionResponses(submissionResponses);
    const possiblePoints = this.getAssessmentPossiblePoints(assessment);

    const [updatedAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        isSubmitted: true,
        submittedAt: new Date(),
        timeSpentSeconds: this.calculateAttemptTimeSpentSeconds(
          attempt.startedAt,
        ),
        draftResponses: submissionResponses,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    if (assessment.type === AssessmentType.FILE_UPLOAD) {
      await this.auditService.log({
        actorId: attempt.studentId,
        action: 'assessment.submission.auto_submitted',
        targetType: 'assessment_attempt',
        targetId: updatedAttempt.id,
        metadata: {
          assessmentId: assessment.id,
          classId: assessment.classId,
          studentId: attempt.studentId,
          isFileUpload: true,
          score: null,
          passed: null,
        },
      });

      return updatedAttempt;
    }

    const { totalPoints } = await this.autoGradeResponses(
      submissionResponses,
      assessment.questions,
      attempt.id,
    );

    const assessmentTotal = possiblePoints!;
    const normalizedScore = calculateBoundedScore({
      basePoints: totalPoints,
      possiblePoints: assessmentTotal,
    });
    const score = Math.round(normalizedScore.scorePercent);
    const passed = score >= (assessment.passingScore || 60);

    const [finalAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        score,
        passed,
        basePointsEarned: normalizedScore.basePoints.toString(),
        possiblePointsSnapshot: normalizedScore.possiblePoints.toString(),
        bonusPoints: '0',
        bonusReason: null,
      })
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

    await this.auditService.log({
      actorId: attempt.studentId,
      action: 'assessment.submission.auto_submitted',
      targetType: 'assessment_attempt',
      targetId: finalAttempt.id,
      metadata: {
        assessmentId: assessment.id,
        classId: assessment.classId,
        studentId: attempt.studentId,
        isFileUpload: false,
        score,
        passed,
      },
    });

    return finalAttempt;
  }

  /**
   * Auto-grade objective questions and store responses.
   * Returns total points earned and the stored response records.
   */
  private getFillBlankMatchOptions(question: { conceptTags?: unknown }): {
    smartCaseInsensitive: boolean;
    experimentalSmartMatch: boolean;
  } {
    const conceptTags = Array.isArray(question.conceptTags)
      ? question.conceptTags
          .map((tag) => String(tag).trim())
          .filter((tag) => tag.length > 0)
      : [];
    return {
      smartCaseInsensitive: !conceptTags.includes(
        'fill_blank:smart_case_sensitive',
      ),
      experimentalSmartMatch: conceptTags.includes(
        'fill_blank:experimental_smart_match',
      ),
    };
  }

  private normalizeFillBlankAnswer(
    value: string,
    matchOptions: {
      smartCaseInsensitive: boolean;
      experimentalSmartMatch: boolean;
    },
  ): string {
    let normalized = value.trim();
    if (matchOptions.experimentalSmartMatch) {
      normalized = normalized.replace(/[^a-z0-9]+/gi, '');
    }
    if (matchOptions.smartCaseInsensitive) {
      normalized = normalized.toLowerCase();
    }
    return normalized;
  }

  private isFillBlankResponseCorrect(
    question: {
      options?: Array<{ text?: string; isCorrect?: boolean }>;
      conceptTags?: unknown;
    },
    response: { studentAnswer?: string },
  ): boolean {
    if (!response.studentAnswer || !Array.isArray(question.options)) {
      return false;
    }

    const matchOptions = this.getFillBlankMatchOptions(question);
    const normalizedStudentAnswer = this.normalizeFillBlankAnswer(
      response.studentAnswer,
      matchOptions,
    );

    if (!normalizedStudentAnswer) {
      return false;
    }

    const normalizedAnswerKeys = question.options
      .filter((option) => option.isCorrect)
      .map((option) =>
        this.normalizeFillBlankAnswer(option.text ?? '', matchOptions),
      )
      .filter((answer) => answer.length > 0);

    return normalizedAnswerKeys.some(
      (answerKey) => answerKey === normalizedStudentAnswer,
    );
  }

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
      } else if (question.type === QuestionType.FILL_BLANK) {
        if (this.isFillBlankResponseCorrect(question, response)) {
          isCorrect = true;
          pointsEarned = question.points;
        }
      }
      // Short answer remains ungraded by design.

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
            question.type === QuestionType.MULTIPLE_SELECT ||
            question.type === QuestionType.FILL_BLANK
              ? isCorrect
              : null,
          pointsEarned,
        })
        .onConflictDoUpdate({
          target: [
            assessmentResponses.attemptId,
            assessmentResponses.questionId,
          ],
          set: {
            studentAnswer: response.studentAnswer ?? null,
            selectedOptionId,
            selectedOptionIds,
            isCorrect:
              question.type === QuestionType.MULTIPLE_CHOICE ||
              question.type === QuestionType.TRUE_FALSE ||
              question.type === QuestionType.DROPDOWN ||
              question.type === QuestionType.MULTIPLE_SELECT ||
              question.type === QuestionType.FILL_BLANK
                ? isCorrect
                : null,
            pointsEarned,
          },
        })
        .returning();

      responses.push(storedResponse);
    }

    return { totalPoints, responses };
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

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
    void this.databaseService.afterAcademicCommit(() => {
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
    });
  }

  private randomizeAssessmentForStudent(assessment: AssessmentView) {
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
  async getStudentAttempts(
    studentId: string,
    assessmentId: string,
    currentUser: any,
  ) {
    const assessment = await this.getAssessmentById(assessmentId);
    const { userId, role } = this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only view attempts for your own class assessments',
    );

    if (role === 'student' && userId !== studentId) {
      throw new ForbiddenException('Students may only view their own attempts');
    }

    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
      ),
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    return attempts.map((attempt) => ({
      ...attempt,
      ...this.scoreContract(attempt, Boolean(attempt.isReturned)),
      passed: attempt.isReturned ? attempt.passed : null,
    }));
  }

  /**
   * Get all student attempts for an assessment (for teacher view)
   */
  async getAssessmentAttempts(assessmentId: string, currentUser: any) {
    const assessment = await this.getAssessmentById(assessmentId);
    this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only view attempts for your own class assessments',
    );

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

    return attempts.map((attempt) => ({
      ...attempt,
      ...this.scoreContract(attempt),
    }));
  }

  /**
   * Get high-level assessment stats for teacher
   */
  async getAssessmentStats(assessmentId: string, currentUser: any) {
    const assessment = await this.getAssessmentById(assessmentId);
    this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only view statistics for your own class assessments',
    );
    const attempts = await this.getAssessmentAttempts(
      assessmentId,
      currentUser,
    );
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

    const gradedAttempts = submittedAttempts.filter(
      (attempt): attempt is typeof attempt & { score: number } =>
        typeof attempt.score === 'number' && Number.isFinite(attempt.score),
    );
    const scores = gradedAttempts.map((attempt) =>
      boundPercentage(attempt.score),
    );
    const passedCount = gradedAttempts.filter((attempt) => attempt.passed)
      .length;
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
      averageScore:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
      passRate:
        gradedAttempts.length > 0
          ? Math.round((passedCount / gradedAttempts.length) * 100)
          : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
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
  async getAssessmentSubmissions(assessmentId: string, currentUser: any) {
    const assessment = await this.getAssessmentById(assessmentId);
    this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only view submissions for your own class assessments',
    );
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
        ...this.scoreContract(attempt),
        directScore: attempt.directScore,
        rubricScores: attempt.rubricScores ?? [],
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

    const submittedFileIds = attempts
      .flatMap((attempt) =>
        this.getAttemptSubmittedFiles(attempt).map((file) => file.id),
      )
      .filter(
        (fileId, index, collection) => collection.indexOf(fileId) === index,
      );
    const submittedFiles =
      submittedFileIds.length > 0
        ? await this.db.query.uploadedFiles.findMany({
            where: inArray(uploadedFiles.id, submittedFileIds),
            columns: {
              id: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              uploadedAt: true,
            },
          })
        : [];
    const submittedFileMap = new Map(
      submittedFiles.map((file) => [file.id, file]),
    );
    const relevantTimelineActions = [
      'assessment.submission.file_uploaded',
      'assessment.submission.file_removed',
      'assessment.submission.submitted',
      'assessment.submission.unsubmitted',
      'assessment.submission.auto_submitted',
      'assessment.grade.returned',
      'assessment.grade.unreturned',
    ];
    const attemptTimelineEntries =
      attempts.length > 0
        ? await this.db.query.auditLogs.findMany({
            where: and(
              inArray(
                auditLogs.targetId,
                attempts.map((attempt) => attempt.id),
              ),
              inArray(auditLogs.action, relevantTimelineActions),
            ),
            with: {
              actor: {
                columns: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: [desc(auditLogs.createdAt)],
          })
        : [];
    const attemptToStudentIdMap = new Map(
      attempts.map((attempt) => [attempt.id, attempt.studentId]),
    );
    const timelineByStudentId = new Map<string, SubmissionTimelineEntry[]>();

    for (const entry of attemptTimelineEntries) {
      const studentId = attemptToStudentIdMap.get(entry.targetId);
      if (!studentId) continue;
      const bucket = timelineByStudentId.get(studentId) ?? [];
      bucket.push({
        id: entry.id,
        attemptId: entry.targetId,
        action: entry.action,
        createdAt: entry.createdAt,
        actorName: this.formatAuditActorName(entry.actor),
        metadata:
          entry.metadata && typeof entry.metadata === 'object'
            ? (entry.metadata as Record<string, unknown>)
            : null,
      });
      timelineByStudentId.set(studentId, bucket);
    }

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
        attempt: latestAttempt
          ? {
              ...mapAttemptSummary(latestAttempt),
              submittedFiles: this.getAttemptSubmittedFiles(latestAttempt)
                .map((file) => submittedFileMap.get(file.id) ?? null)
                .filter((file): file is NonNullable<typeof file> =>
                  Boolean(file),
                ),
              submittedFile:
                this.getAttemptSubmittedFiles(latestAttempt)
                  .map((file) => submittedFileMap.get(file.id) ?? null)
                  .filter((file): file is NonNullable<typeof file> =>
                    Boolean(file),
                  )
                  .at(-1) ?? null,
            }
          : null,
        attempts: studentAttempts.map((attempt) => ({
          ...mapAttemptSummary(attempt),
          submittedFiles: this.getAttemptSubmittedFiles(attempt)
            .map((file) => submittedFileMap.get(file.id) ?? null)
            .filter((file): file is NonNullable<typeof file> => Boolean(file)),
          submittedFile:
            this.getAttemptSubmittedFiles(attempt)
              .map((file) => submittedFileMap.get(file.id) ?? null)
              .filter((file): file is NonNullable<typeof file> => Boolean(file))
              .at(-1) ?? null,
        })),
        totalAttempts: studentAttempts.length,
        timeline: timelineByStudentId.get(student.studentId) ?? [],
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
        rubricParseStatus: assessment.rubricParseStatus,
        rubricCriteria: assessment.rubricCriteria ?? [],
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
  /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
  @AcademicMutation()
  async returnGrade(attemptId: string, dto: ReturnGradeDto, currentUser: any) {
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
            class: {
              columns: {
                teacherId: true,
              },
            },
            questions: {
              columns: {
                id: true,
                points: true,
                type: true,
              },
            },
          },
        },
        responses: {
          columns: {
            id: true,
            questionId: true,
            pointsEarned: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    await this.assertAcademicMutation(attempt.assessment, 'grade');
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

    if (role === 'teacher' && attempt.assessment?.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only return grades for your own class assessments',
      );
    }

    if (attempt.assessment?.type === AssessmentType.FILE_UPLOAD) {
      const latestSubmittedAttempt =
        await this.db.query.assessmentAttempts.findFirst({
          where: and(
            eq(assessmentAttempts.assessmentId, attempt.assessmentId),
            eq(assessmentAttempts.studentId, attempt.studentId),
            eq(assessmentAttempts.isSubmitted, true),
          ),
          orderBy: (a, { desc }) => [desc(a.submittedAt), desc(a.updatedAt)],
        });

      if (latestSubmittedAttempt && latestSubmittedAttempt.id !== attempt.id) {
        throw new BadRequestException(
          'Grades can only be returned for the latest file upload submission',
        );
      }
    }

    const manualQuestions = attempt.assessment.questions.filter(
      (question) => question.type === 'short_answer',
    );
    const manualIds = new Set(
      (dto.manualResponseScores ?? []).map((score) => score.questionId),
    );
    const answeredIds = new Set(
      (attempt.responses ?? []).map((response) => response.questionId),
    );
    if (
      manualQuestions.some(
        (question) =>
          answeredIds.has(question.id) && !manualIds.has(question.id),
      )
    )
      throw new BadRequestException(
        'Enter an explicit score, including zero where appropriate, for every submitted short-answer response',
      );
    let score = attempt.score;
    let passed = attempt.passed;
    let directScore: number | null = attempt.directScore ?? null;
    let rubricScores: ReturnedRubricScore[] | null =
      (attempt.rubricScores as ReturnedRubricScore[] | null) ?? null;
    let basePointsEarned =
      attempt.basePointsEarned !== null &&
      attempt.basePointsEarned !== undefined
        ? Number(attempt.basePointsEarned)
        : null;
    let possiblePointsSnapshot =
      attempt.possiblePointsSnapshot !== null &&
      attempt.possiblePointsSnapshot !== undefined
        ? Number(attempt.possiblePointsSnapshot)
        : null;

    if (attempt.assessment?.type === AssessmentType.FILE_UPLOAD) {
      const rubricCriteria = this.normalizeRubricCriteria(
        (attempt.assessment.rubricCriteria as RubricCriterion[]) ?? [],
      );

      if (rubricCriteria.length > 0) {
        if (!dto.rubricScores || dto.rubricScores.length === 0) {
          throw new BadRequestException(
            'Rubric scores are required when a reviewed rubric is attached',
          );
        }

        const rubricMap = new Map(
          rubricCriteria.map((criterion) => [criterion.id, criterion]),
        );
        const normalizedScores = dto.rubricScores.map((rubricScore) => {
          const criterion = rubricMap.get(rubricScore.criterionId);

          if (!criterion) {
            throw new BadRequestException(
              `Unknown rubric criterion "${rubricScore.criterionId}"`,
            );
          }

          if (
            rubricScore.pointsEarned < 0 ||
            rubricScore.pointsEarned > criterion.points
          ) {
            throw new BadRequestException(
              `Rubric score for "${criterion.title}" must be between 0 and ${criterion.points}`,
            );
          }

          return {
            criterionId: rubricScore.criterionId,
            pointsEarned: rubricScore.pointsEarned,
            feedback: rubricScore.feedback?.trim() || undefined,
          } satisfies ReturnedRubricScore;
        });

        const earnedPoints = normalizedScores.reduce(
          (total, rubricScore) => total + rubricScore.pointsEarned,
          0,
        );
        const totalPoints = Math.max(this.sumRubricPoints(rubricCriteria), 1);

        basePointsEarned = earnedPoints;
        possiblePointsSnapshot = totalPoints;
        rubricScores = normalizedScores;
        directScore = null;

        this.emitSubmissionEvent(
          attempt.assessmentId,
          attempt.studentId,
          earnedPoints,
          totalPoints,
          attempt.assessment.classRecordCategory ?? undefined,
          attempt.assessment.quarter ?? undefined,
        );
      } else {
        if (dto.directScore === undefined || dto.directScore === null) {
          throw new BadRequestException(
            'A direct score from 0 to 100 is required when no rubric is attached',
          );
        }

        if (dto.directScore < 0 || dto.directScore > 100) {
          throw new BadRequestException(
            'Direct score must be between 0 and 100',
          );
        }

        basePointsEarned = dto.directScore;
        possiblePointsSnapshot = 100;
        directScore = Math.round(dto.directScore);
        rubricScores = [];

        this.emitSubmissionEvent(
          attempt.assessmentId,
          attempt.studentId,
          dto.directScore,
          100,
          attempt.assessment.classRecordCategory ?? undefined,
          attempt.assessment.quarter ?? undefined,
        );
      }
    } else if ((dto.manualResponseScores?.length ?? 0) > 0) {
      const questionMap = new Map(
        (attempt.assessment?.questions ?? []).map((question) => [
          question.id,
          question,
        ]),
      );
      const responseMap = new Map(
        (attempt.responses ?? []).map((response) => [
          response.questionId,
          response,
        ]),
      );
      const overrideMap = new Map(
        dto.manualResponseScores?.map((responseScore) => [
          responseScore.questionId,
          responseScore.pointsEarned,
        ]) ?? [],
      );

      for (const responseScore of dto.manualResponseScores ?? []) {
        const question = questionMap.get(responseScore.questionId);
        if (!question) {
          throw new BadRequestException(
            `Question "${responseScore.questionId}" does not belong to this assessment`,
          );
        }

        if (!responseMap.has(responseScore.questionId)) {
          throw new BadRequestException(
            `Question "${responseScore.questionId}" was not recorded for this attempt`,
          );
        }

        if (
          responseScore.pointsEarned < 0 ||
          responseScore.pointsEarned > question.points
        ) {
          throw new BadRequestException(
            `Manual score for question "${responseScore.questionId}" must be between 0 and ${question.points}`,
          );
        }
      }

      await Promise.all(
        (attempt.responses ?? []).map((response) => {
          const nextPointsEarned =
            overrideMap.get(response.questionId) ?? response.pointsEarned ?? 0;

          return this.db
            .update(assessmentResponses)
            .set({
              pointsEarned: nextPointsEarned,
            })
            .where(eq(assessmentResponses.id, response.id));
        }),
      );

      const earnedPoints = (attempt.responses ?? []).reduce(
        (total, response) =>
          total +
          (overrideMap.get(response.questionId) ?? response.pointsEarned ?? 0),
        0,
      );
      const totalAssessmentPoints = this.getAssessmentPossiblePoints(
        attempt.assessment,
      )!;

      basePointsEarned = earnedPoints;
      possiblePointsSnapshot = totalAssessmentPoints;
      directScore = null;
      rubricScores = [];

      this.emitSubmissionEvent(
        attempt.assessmentId,
        attempt.studentId,
        earnedPoints,
        totalAssessmentPoints,
        attempt.assessment?.classRecordCategory ?? undefined,
        attempt.assessment?.quarter ?? undefined,
      );
    }

    if (
      basePointsEarned === null &&
      typeof score === 'number' &&
      Number.isFinite(score)
    ) {
      possiblePointsSnapshot =
        possiblePointsSnapshot ??
        (attempt.assessment?.type === AssessmentType.FILE_UPLOAD
          ? 100
          : this.getAssessmentPossiblePoints(attempt.assessment));
      if (possiblePointsSnapshot) {
        basePointsEarned = (score / 100) * possiblePointsSnapshot;
      }
    }

    let scoreBreakdown: AcademicScoreBreakdown | null = null;
    if (basePointsEarned !== null && possiblePointsSnapshot !== null) {
      try {
        scoreBreakdown = calculateBoundedScore({
          basePoints: basePointsEarned,
          bonusPoints: dto.bonusPoints ?? Number(attempt.bonusPoints ?? 0),
          bonusReason: dto.bonusReason ?? attempt.bonusReason,
          possiblePoints: possiblePointsSnapshot,
        });
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Score adjustment is invalid',
        );
      }
      score = Math.round(scoreBreakdown.scorePercent);
      passed = score >= (attempt.assessment?.passingScore || 60);
    }

    const [updated] = await this.db
      .update(assessmentAttempts)
      .set({
        isReturned: true,
        returnedAt: new Date(),
        teacherFeedback: dto.teacherFeedback || null,
        score,
        passed,
        directScore,
        rubricScores,
        basePointsEarned:
          scoreBreakdown?.basePoints.toString() ??
          attempt.basePointsEarned ??
          null,
        possiblePointsSnapshot:
          scoreBreakdown?.possiblePoints.toString() ??
          attempt.possiblePointsSnapshot ??
          null,
        bonusPoints:
          scoreBreakdown?.bonusPoints.toString() ?? attempt.bonusPoints ?? '0',
        bonusReason: scoreBreakdown?.bonusReason ?? attempt.bonusReason ?? null,
      })
      .where(eq(assessmentAttempts.id, attemptId))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.grade.returned',
      targetType: 'assessment_attempt',
      targetId: attemptId,
      metadata: {
        assessmentId: attempt.assessmentId,
        classId: attempt.assessment?.classId ?? null,
        studentId: attempt.studentId,
        attemptNumber: attempt.attemptNumber,
        score: updated.score,
        passed: updated.passed,
        manualResponseScores: dto.manualResponseScores ?? [],
        previousScoreBreakdown: this.scoreContract(attempt).scoreBreakdown,
        scoreBreakdown: this.scoreContract(updated).scoreBreakdown,
      },
    });

    return { ...updated, ...this.scoreContract(updated) };
  }

  @AcademicMutation()
  async unreturnGrade(attemptId: string, currentUser: any) {
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
            class: {
              columns: {
                teacherId: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    if (!attempt.isSubmitted) {
      throw new BadRequestException(
        'Cannot undo a grade for an unsubmitted attempt',
      );
    }

    await this.assertAcademicMutation(attempt.assessment, 'grade');
    if (!attempt.isReturned) {
      throw new BadRequestException('This attempt has no posted grade to undo');
    }

    if (role === 'teacher' && attempt.assessment?.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only undo grades for your own class assessments',
      );
    }

    if (attempt.assessment?.type === AssessmentType.FILE_UPLOAD) {
      const latestSubmittedAttempt =
        await this.db.query.assessmentAttempts.findFirst({
          where: and(
            eq(assessmentAttempts.assessmentId, attempt.assessmentId),
            eq(assessmentAttempts.studentId, attempt.studentId),
            eq(assessmentAttempts.isSubmitted, true),
          ),
          orderBy: (a, { desc: d }) => [d(a.submittedAt), d(a.updatedAt)],
        });

      if (latestSubmittedAttempt && latestSubmittedAttempt.id !== attempt.id) {
        throw new BadRequestException(
          'Only the latest file upload submission can have its posted grade undone',
        );
      }
    }

    const [updated] = await this.db
      .update(assessmentAttempts)
      .set({
        isReturned: false,
        returnedAt: null,
      })
      .where(eq(assessmentAttempts.id, attemptId))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.grade.unreturned',
      targetType: 'assessment_attempt',
      targetId: attemptId,
      metadata: {
        assessmentId: attempt.assessmentId,
        classId: attempt.assessment?.classId ?? null,
        studentId: attempt.studentId,
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        passed: attempt.passed,
      },
    });

    return { ...updated, ...this.scoreContract(updated) };
  }

  /**
   * Bulk return grades for multiple attempts
   */
  @AcademicMutation()
  async bulkReturnGrades(dto: BulkReturnGradesDto, currentUser: any) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const selectedAttempts = await this.db.query.assessmentAttempts.findMany({
      where: inArray(assessmentAttempts.id, dto.attemptIds),
      with: {
        assessment: {
          with: {
            questions: { columns: { type: true } },
            class: {
              columns: { teacherId: true },
            },
          },
        },
      },
    });

    if (
      role === 'teacher' &&
      selectedAttempts.some(
        (attempt) => attempt.assessment?.class?.teacherId !== userId,
      )
    ) {
      throw new ForbiddenException(
        'You can only return grades for your own class assessments',
      );
    }

    const checked = new Set<string>();
    for (const attempt of selectedAttempts) {
      if (!attempt.isSubmitted || attempt.isReturned) continue;
      if (!checked.has(attempt.assessmentId)) {
        await this.assertAcademicMutation(attempt.assessment, 'grade');
        checked.add(attempt.assessmentId);
      }
      if (
        attempt.score == null ||
        attempt.assessment.type === 'file_upload' ||
        (attempt.assessment.questions ?? []).some(
          (q) => q.type === 'short_answer',
        )
      )
        throw new BadRequestException(
          'Manually reviewed or ungraded submissions must be returned individually with explicit grade evidence',
        );
    }
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

    if (results.length > 0) {
      const selectedAttemptMap = new Map(
        selectedAttempts.map((attempt) => [attempt.id, attempt]),
      );

      const auditEntries = results.map((result) => {
        const sourceAttempt = selectedAttemptMap.get(result.id);
        return {
          actorId: userId,
          action: 'assessment.grade.returned' as const,
          targetType: 'assessment_attempt' as const,
          targetId: result.id,
          metadata: {
            assessmentId: result.assessmentId ?? sourceAttempt?.assessmentId,
            classId: sourceAttempt?.assessment?.classId ?? null,
            studentId: result.studentId ?? sourceAttempt?.studentId,
            attemptNumber: result.attemptNumber ?? sourceAttempt?.attemptNumber,
            score: result.score ?? sourceAttempt?.score,
            passed: result.passed ?? sourceAttempt?.passed,
            bulk: true,
          },
        };
      });

      await this.auditService.logBulk(auditEntries);

      await this.auditService.log({
        actorId: userId,
        action: 'assessment.grades.bulk_returned',
        targetType: 'assessment_attempt',
        targetId: results[0].id,
        metadata: {
          returned: results.length,
          attemptIds: results.map((attempt) => attempt.id),
          assessmentIds: [
            ...new Set(selectedAttempts.map((attempt) => attempt.assessmentId)),
          ],
        },
      });
    }

    return {
      returned: results.length,
      attemptIds: results.map((r) => r.id),
    };
  }
  /* eslint-enable @typescript-eslint/no-unsafe-enum-comparison */

  /**
   * Get per-question analytics for an assessment (teacher view)
   */
  async getQuestionAnalytics(assessmentId: string, currentUser: any) {
    const assessment = await this.getAssessmentById(assessmentId);
    this.assertTeacherClassOwnership(
      assessment.class?.teacherId,
      currentUser,
      'You can only view analytics for your own class assessments',
    );

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
  @AcademicMutation()
  async returnAllGrades(
    assessmentId: string,
    teacherFeedback: string | undefined,
    currentUser: any,
  ) {
    const userId = this.getUserId(currentUser);
    const role = this.getUserRole(currentUser);

    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const assessment = await this.getAssessmentById(assessmentId);

    if (role === 'teacher' && assessment.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'You can only return grades for your own class assessments',
      );
    }

    await this.assertAcademicMutation(assessment, 'grade');
    if (
      assessment.type === AssessmentType.FILE_UPLOAD ||
      (assessment.questions ?? []).some((q) => q.type === 'short_answer')
    )
      throw new BadRequestException(
        'Manually reviewed submissions must be returned individually with explicit grade evidence',
      );
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
          sql`${assessmentAttempts.score} IS NOT NULL`,
        ),
      )
      .returning();

    for (const result of results) {
      await this.auditService.log({
        actorId: userId,
        action: 'assessment.grade.returned',
        targetType: 'assessment_attempt',
        targetId: result.id,
        metadata: {
          assessmentId: result.assessmentId,
          classId: assessment.classId,
          studentId: result.studentId,
          attemptNumber: result.attemptNumber,
          score: result.score,
          passed: result.passed,
          bulk: true,
        },
      });
    }

    await this.auditService.log({
      actorId: userId,
      action: 'assessment.grades.returned_all',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        classId: assessment.classId,
        returned: results.length,
      },
    });

    return {
      returned: results.length,
      attemptIds: results.map((r) => r.id),
    };
  }
}
