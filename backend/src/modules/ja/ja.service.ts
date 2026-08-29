import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { AiProxyService } from '../ai-mentor/ai-proxy.service';
import { LxpService } from '../lxp/lxp.service';
import {
  assessmentAttempts,
  assessments,
  classModules,
  enrollments,
  jaGuardrailEvents,
  jaProgress,
  jaSessionEvents,
  jaSessionItems,
  jaSessionResponses,
  jaSessions,
  jaThreadMessages,
  jaThreads,
  jaXpLedger,
  lessons,
} from '../../drizzle/schema';
import {
  CreateJaAskThreadDto,
  CreateJaPracticeSessionDto,
  CreateJaReviewSessionDto,
  LogJaPracticeEventDto,
  SendJaAskMessageDto,
  SubmitJaPracticeResponseDto,
} from './dto/ja-practice.dto';

type UserContext = {
  id: string;
  userId?: string;
  email: string;
  roles: string[];
};

type JaMode = 'practice' | 'review';

type JaGeneratedItem = {
  id: string;
  itemType: string;
  prompt: string;
  options?: unknown[];
  answerKey?: Record<string, unknown>;
  hint?: string;
  explanation?: string;
  citations?: unknown[];
  validation?: Record<string, unknown>;
};

type JaGeneratedPacket = {
  classLabel?: string;
  groundingStatus?: string;
  sourceSnapshot?: Record<string, unknown>;
  items: JaGeneratedItem[];
};

type JaAskLessonContext = {
  lessonId: string;
  title: string;
  moduleTitle?: string | null;
  sectionTitle?: string | null;
};

type JaAccessibleAskSources = {
  allowedLessonIds: Set<string>;
  allowedAssessmentIds: Set<string>;
  lessonContexts: JaAskLessonContext[];
};

type JaActivityHistoryMode = 'all' | 'ask' | 'review';

type JaActivityHistoryItem = {
  id: string;
  mode: 'ask' | 'review';
  classId: string;
  title: string;
  subtitle: string;
  status: string;
  activityAt: string;
};

type JaAskMessageCursor = {
  createdAt: string;
  id: string;
};

const JA_QUESTION_COUNT = 10;
const JA_REVIEW_MAX_ATTEMPTS = 3;
const JA_SESSION_XP_BASE = 40;
const JA_SESSION_XP_PER_CORRECT = 6;
const JA_ASK_MAX_HISTORY = 8;
const JA_ASK_GUIDELINES = [
  'Pick a visible lesson first when you want a summary, study plan, or focused explanation.',
  'Ask for help with the current class only. JA blocks unrelated subject jumps and exact-answer requests.',
  'Useful prompts: summarize this lesson, explain the main idea, quiz me, what should I review next?',
];
const JA_THREAD_CONTEXT_PREFIX = 'LESSON_CONTEXT::';

@Injectable()
export class JaService {
  private readonly logger = new Logger(JaService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly aiProxyService: AiProxyService,
    private readonly auditService: AuditService,
    private readonly lxpService: LxpService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private resolveUserId(user: UserContext): string {
    return user.userId ?? user.id;
  }

  private unwrapEnvelope<T>(payload: unknown): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private buildAskThreadContextMessage(context: JaAskLessonContext) {
    return `${JA_THREAD_CONTEXT_PREFIX}${JSON.stringify(context)}`;
  }

  private parseAskThreadContextMessage(
    content: string | null | undefined,
  ): JaAskLessonContext | null {
    if (!content?.startsWith(JA_THREAD_CONTEXT_PREFIX)) return null;
    try {
      const parsed = JSON.parse(
        content.slice(JA_THREAD_CONTEXT_PREFIX.length),
      ) as Partial<JaAskLessonContext>;
      if (
        !parsed ||
        typeof parsed.lessonId !== 'string' ||
        typeof parsed.title !== 'string'
      ) {
        return null;
      }
      return {
        lessonId: parsed.lessonId,
        title: parsed.title,
        moduleTitle:
          typeof parsed.moduleTitle === 'string' ? parsed.moduleTitle : null,
        sectionTitle:
          typeof parsed.sectionTitle === 'string' ? parsed.sectionTitle : null,
      };
    } catch {
      return null;
    }
  }

  private encodeAskMessageCursor(cursor: JaAskMessageCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeAskMessageCursor(cursor: string): JaAskMessageCursor {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Partial<JaAskMessageCursor>;
      if (
        typeof parsed.createdAt !== 'string' ||
        Number.isNaN(new Date(parsed.createdAt).getTime()) ||
        typeof parsed.id !== 'string' ||
        parsed.id.length === 0
      ) {
        throw new Error('Invalid cursor payload');
      }
      return { createdAt: parsed.createdAt, id: parsed.id };
    } catch {
      throw new BadRequestException('Invalid JA message cursor.');
    }
  }

  private toActivityIso(value: Date | string | null | undefined): string {
    if (!value) return new Date(0).toISOString();
    return (value instanceof Date ? value : new Date(value)).toISOString();
  }

  private sortActivityItems(
    left: JaActivityHistoryItem,
    right: JaActivityHistoryItem,
  ): number {
    const timestampDifference =
      new Date(right.activityAt).getTime() - new Date(left.activityAt).getTime();
    if (timestampDifference !== 0) return timestampDifference;
    const modeDifference = left.mode.localeCompare(right.mode);
    if (modeDifference !== 0) return modeDifference;
    return left.id.localeCompare(right.id);
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
      return Boolean(
        item.assessment && item.assessment.isPublished && item.isGiven,
      );
    }
    return Boolean(item.fileId);
  }

  private sanitizeCitations(
    citations: unknown,
    allowedLessonIds: Set<string>,
    allowedAssessmentIds: Set<string>,
  ) {
    if (!Array.isArray(citations)) return [];
    return citations.filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const lessonId =
        typeof (entry as { lessonId?: unknown }).lessonId === 'string'
          ? ((entry as { lessonId?: string }).lessonId ?? null)
          : null;
      const assessmentId =
        typeof (entry as { assessmentId?: unknown }).assessmentId === 'string'
          ? ((entry as { assessmentId?: string }).assessmentId ?? null)
          : null;
      if (lessonId && !allowedLessonIds.has(lessonId)) return false;
      if (assessmentId && !allowedAssessmentIds.has(assessmentId)) return false;
      return true;
    });
  }

  private normalizeGeneratedItem(item: JaGeneratedItem, index: number) {
    if (!item || typeof item !== 'object') {
      throw new BadRequestException('AI packet contains an invalid item.');
    }
    if (!item.prompt || !String(item.prompt).trim()) {
      throw new BadRequestException(
        'AI packet contains an item without prompt.',
      );
    }
    if (!item.itemType || !String(item.itemType).trim()) {
      throw new BadRequestException('AI packet contains an item without type.');
    }

    const normalizedType = String(item.itemType).trim();
    const answerKey = item.answerKey ?? {};
    const options = Array.isArray(item.options) ? item.options : [];
    const normalizedId = item.id?.trim() || `ja-item-${index + 1}`;

    if (
      (normalizedType === 'multiple_choice' || normalizedType === 'dropdown') &&
      typeof answerKey.correctOptionId !== 'string'
    ) {
      throw new BadRequestException(
        'AI packet failed deterministic answer-key validation.',
      );
    }

    if (
      normalizedType === 'multiple_select' &&
      !Array.isArray(answerKey.correctOptionIds)
    ) {
      throw new BadRequestException(
        'AI packet failed deterministic answer-key validation.',
      );
    }

    if (
      normalizedType === 'true_false' &&
      typeof answerKey.correctValue !== 'boolean' &&
      typeof answerKey.correctOptionId !== 'string'
    ) {
      throw new BadRequestException(
        'AI packet failed deterministic answer-key validation.',
      );
    }

    if (
      (normalizedType === 'multiple_choice' ||
        normalizedType === 'multiple_select' ||
        normalizedType === 'true_false' ||
        normalizedType === 'dropdown') &&
      options.length === 0
    ) {
      throw new BadRequestException(
        'AI packet contains objective items without options.',
      );
    }

    return {
      id: normalizedId,
      itemType: normalizedType,
      prompt: String(item.prompt).trim(),
      options,
      answerKey,
      hint: item.hint ? String(item.hint) : null,
      explanation: item.explanation ? String(item.explanation) : null,
      citations: Array.isArray(item.citations) ? item.citations : [],
      validation:
        item.validation && typeof item.validation === 'object'
          ? item.validation
          : {},
    };
  }

  private evaluateObjectiveItem(
    itemType: string,
    answerKey: Record<string, unknown>,
    answer: Record<string, unknown>,
  ) {
    if (itemType === 'multiple_choice' || itemType === 'dropdown') {
      const selectedOptionId =
        typeof answer.selectedOptionId === 'string'
          ? answer.selectedOptionId
          : '';
      const expectedOptionId =
        typeof answerKey.correctOptionId === 'string'
          ? answerKey.correctOptionId
          : '';
      const isCorrect = Boolean(
        selectedOptionId &&
        expectedOptionId &&
        selectedOptionId === expectedOptionId,
      );
      return { isCorrect, scoreDelta: isCorrect ? 1 : 0 };
    }

    if (itemType === 'multiple_select') {
      const selected = Array.isArray(answer.selectedOptionIds)
        ? answer.selectedOptionIds
            .filter((entry): entry is string => typeof entry === 'string')
            .sort()
        : [];
      const expected = Array.isArray(answerKey.correctOptionIds)
        ? answerKey.correctOptionIds
            .filter((entry): entry is string => typeof entry === 'string')
            .sort()
        : [];
      const isCorrect =
        selected.length > 0 &&
        selected.length === expected.length &&
        selected.every((value, idx) => value === expected[idx]);
      return { isCorrect, scoreDelta: isCorrect ? 1 : 0 };
    }

    if (itemType === 'true_false') {
      const expectedBoolean =
        typeof answerKey.correctValue === 'boolean'
          ? answerKey.correctValue
          : null;
      const selectedBoolean =
        typeof answer.value === 'boolean'
          ? answer.value
          : typeof answer.value === 'string'
            ? answer.value.toLowerCase() === 'true'
            : null;
      if (expectedBoolean !== null && selectedBoolean !== null) {
        const isCorrect = expectedBoolean === selectedBoolean;
        return { isCorrect, scoreDelta: isCorrect ? 1 : 0 };
      }

      const selectedOptionId =
        typeof answer.selectedOptionId === 'string'
          ? answer.selectedOptionId
          : '';
      const expectedOptionId =
        typeof answerKey.correctOptionId === 'string'
          ? answerKey.correctOptionId
          : '';
      const isCorrect = Boolean(
        selectedOptionId &&
        expectedOptionId &&
        selectedOptionId === expectedOptionId,
      );
      return { isCorrect, scoreDelta: isCorrect ? 1 : 0 };
    }

    return { isCorrect: false, scoreDelta: 0 };
  }

  private getCorrectOptionIdsForItem(
    itemType: string,
    answerKey: Record<string, unknown>,
    options?: unknown[] | null,
  ) {
    const uniqueStrings = (values: unknown[]) =>
      Array.from(
        new Set(
          values.filter(
            (value): value is string =>
              typeof value === 'string' && value.trim().length > 0,
          ),
        ),
      );

    if (itemType === 'multiple_choice' || itemType === 'dropdown') {
      return uniqueStrings([answerKey.correctOptionId]);
    }

    if (itemType === 'multiple_select') {
      return uniqueStrings(
        Array.isArray(answerKey.correctOptionIds)
          ? answerKey.correctOptionIds
          : [],
      );
    }

    if (itemType === 'true_false') {
      const directOptionIds = uniqueStrings([answerKey.correctOptionId]);
      if (directOptionIds.length > 0) return directOptionIds;
      if (
        typeof answerKey.correctValue !== 'boolean' ||
        !Array.isArray(options)
      ) {
        return [];
      }

      const expectedText = String(answerKey.correctValue).toLowerCase();
      const matchingOption = options.find((option) => {
        if (!option || typeof option !== 'object') return false;
        const optionRecord = option as { id?: unknown; text?: unknown };
        return (
          typeof optionRecord.id === 'string' &&
          typeof optionRecord.text === 'string' &&
          optionRecord.text.trim().toLowerCase() === expectedText
        );
      }) as { id?: unknown } | undefined;

      return typeof matchingOption?.id === 'string' ? [matchingOption.id] : [];
    }

    return [];
  }

  private async getAccessibleAskSources(
    studentId: string,
    classId: string,
  ): Promise<JaAccessibleAskSources> {
    const enrollmentRows = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
      ),
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
      return {
        allowedLessonIds: new Set<string>(),
        allowedAssessmentIds: new Set<string>(),
        lessonContexts: [],
      };
    }

    const modules = await this.db.query.classModules.findMany({
      where: and(
        inArray(classModules.classId, classIds),
        eq(classModules.isVisible, true),
      ),
      orderBy: [asc(classModules.order), asc(classModules.title)],
      with: {
        sections: {
          orderBy: [asc(sql`"order"`), asc(sql`"title"`)],
          columns: {
            title: true,
          },
          with: {
            items: {
              orderBy: [asc(sql`"order"`), asc(sql`"id"`)],
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
                    title: true,
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
    const lessonContexts = new Map<string, JaAskLessonContext>();

    modules.forEach((module) => {
      if (module.isLocked) return;
      module.sections.forEach((section) => {
        section.items.forEach((item) => {
          if (
            !this.isTutorItemVisible(
              item as typeof item & { fileId?: string | null },
            )
          ) {
            return;
          }
          if (item.itemType === 'lesson' && item.lessonId) {
            allowedLessonIds.add(item.lessonId);
            if (item.lesson?.title && !lessonContexts.has(item.lessonId)) {
              lessonContexts.set(item.lessonId, {
                lessonId: item.lessonId,
                title: item.lesson.title,
                moduleTitle: module.title,
                sectionTitle: section.title,
              });
            }
          }
          if (item.itemType === 'assessment' && item.assessmentId) {
            allowedAssessmentIds.add(item.assessmentId);
          }
        });
      });
    });

    return {
      allowedLessonIds,
      allowedAssessmentIds,
      lessonContexts: Array.from(lessonContexts.values()),
    };
  }

  private async assertStudentClassAccess(studentId: string, classId: string) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: {
        classId: true,
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('You do not have access to this class.');
    }
  }

  private async loadStudentJaClasses(studentId: string) {
    const enrollmentRows = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: {
        classId: true,
      },
      with: {
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
          },
          with: {
            section: {
              columns: {
                name: true,
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    const deduped = new Map<
      string,
      {
        id: string;
        subjectName: string;
        subjectCode: string;
        sectionName?: string | null;
        gradeLevel?: string | null;
      }
    >();

    enrollmentRows.forEach((row) => {
      const cls = row.class;
      if (!cls?.id || deduped.has(cls.id)) {
        return;
      }

      deduped.set(cls.id, {
        id: cls.id,
        subjectName: cls.subjectName,
        subjectCode: cls.subjectCode,
        sectionName: cls.section?.name ?? null,
        gradeLevel: cls.section?.gradeLevel ?? null,
      });
    });

    return Array.from(deduped.values());
  }

  private async loadPracticeBootstrap(user: UserContext, classId?: string) {
    const studentId = this.resolveUserId(user);
    const querySuffix = classId ? `?classId=${classId}` : '';
    let data: {
      classes: Array<{
        id: string;
        subjectName?: string;
        subjectCode?: string;
        sectionName?: string | null;
        gradeLevel?: string | null;
      }>;
      selectedClassId?: string | null;
      recommendations?: unknown[];
      recentLessons?: unknown[];
      recentAttempts?: unknown[];
    };

    try {
      const payload = await this.aiProxyService.forward(
        'GET',
        `/student/ja/practice/bootstrap${querySuffix}`,
        {
          id: studentId,
          email: user.email,
          roles: user.roles,
        },
      );
      data = this.unwrapEnvelope<{
        classes: Array<{
          id: string;
          subjectName?: string;
          subjectCode?: string;
          sectionName?: string | null;
          gradeLevel?: string | null;
        }>;
        selectedClassId?: string | null;
        recommendations?: unknown[];
        recentLessons?: unknown[];
        recentAttempts?: unknown[];
      }>(payload);
    } catch (error) {
      const fallbackClasses = await this.loadStudentJaClasses(studentId);
      this.logger.warn(
        `JA practice bootstrap fallback engaged for student ${studentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      data = {
        classes: fallbackClasses,
        selectedClassId:
          fallbackClasses.find((entry) => entry.id === classId)?.id ??
          fallbackClasses[0]?.id ??
          null,
        recommendations: [],
        recentLessons: [],
        recentAttempts: [],
      };
    }

    const selectedClassId =
      classId ?? data.selectedClassId ?? data.classes?.[0]?.id ?? null;

    if (!selectedClassId) {
      return {
        classes: data.classes ?? [],
        selectedClassId: null,
        recommendations: [],
        recentLessons: [],
        recentAttempts: [],
        sessions: [],
        progress: null,
      };
    }

    await this.assertStudentClassAccess(studentId, selectedClassId);
    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAccessibleAskSources(studentId, selectedClassId);

    const sanitizedRecommendations = Array.isArray(data.recommendations)
      ? (data.recommendations as Array<Record<string, unknown>>).filter(
          (entry) => {
            const lessonId =
              typeof entry.lessonId === 'string' ? entry.lessonId : null;
            const assessmentId =
              typeof entry.assessmentId === 'string'
                ? entry.assessmentId
                : null;
            if (lessonId && !allowedLessonIds.has(lessonId)) return false;
            if (assessmentId && !allowedAssessmentIds.has(assessmentId))
              return false;
            return true;
          },
        )
      : [];

    const sessions = await this.db.query.jaSessions.findMany({
      where: and(
        eq(jaSessions.studentId, studentId),
        eq(jaSessions.classId, selectedClassId),
        eq(jaSessions.mode, 'practice'),
        inArray(jaSessions.status, ['active', 'completed']),
      ),
      columns: {
        id: true,
        status: true,
        currentIndex: true,
        questionCount: true,
        strikeCount: true,
        rewardState: true,
        groundingStatus: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: [desc(jaSessions.updatedAt)],
    });

    const progress = await this.db.query.jaProgress.findFirst({
      where: and(
        eq(jaProgress.studentId, studentId),
        eq(jaProgress.classId, selectedClassId),
      ),
      columns: {
        xpTotal: true,
        streakDays: true,
        sessionsCompleted: true,
        lastActivityAt: true,
      },
    });

    return {
      classes: data.classes ?? [],
      selectedClassId,
      recommendations: sanitizedRecommendations,
      recentLessons: Array.isArray(data.recentLessons)
        ? data.recentLessons
        : [],
      recentAttempts: Array.isArray(data.recentAttempts)
        ? data.recentAttempts
        : [],
      sessions,
      progress: progress
        ? {
            xpTotal: progress.xpTotal,
            streakDays: progress.streakDays,
            sessionsCompleted: progress.sessionsCompleted,
            lastActivityAt: progress.lastActivityAt,
          }
        : null,
    };
  }

  private async getSessionForStudent(
    studentId: string,
    sessionId: string,
    expectedMode?: JaMode,
  ) {
    const session = await this.db.query.jaSessions.findFirst({
      where: and(
        eq(jaSessions.id, sessionId),
        eq(jaSessions.studentId, studentId),
      ),
      with: {
        items: {
          with: {
            responses: true,
          },
          orderBy: (table, { asc }) => [asc(table.orderIndex)],
        },
      },
    });

    if (!session || session.status === 'deleted') {
      throw new NotFoundException('JA session not found.');
    }

    if (expectedMode && session.mode !== expectedMode) {
      throw new BadRequestException(
        `JA session mode mismatch. Expected ${expectedMode}.`,
      );
    }

    return session;
  }

  async bootstrap(user: UserContext, classId?: string) {
    return this.loadPracticeBootstrap(user, classId);
  }

  async getActivityHistory(
    user: UserContext,
    query: {
      classId: string;
      mode?: JaActivityHistoryMode;
      page?: number;
      limit?: number;
    },
  ) {
    const studentId = this.resolveUserId(user);
    const mode = query.mode ?? 'all';
    const page = query.page ?? 1;
    const limit = query.limit ?? 8;
    const offset = (page - 1) * limit;
    await this.assertStudentClassAccess(studentId, query.classId);

    const askWhere = and(
      eq(jaThreads.studentId, studentId),
      eq(jaThreads.classId, query.classId),
      eq(jaThreads.status, 'active'),
    );
    const reviewWhere = and(
      eq(jaSessions.studentId, studentId),
      eq(jaSessions.classId, query.classId),
      eq(jaSessions.mode, 'review'),
      inArray(jaSessions.status, ['active', 'completed']),
    );

    const [askCountRows, reviewCountRows] = await Promise.all([
      this.db.select({ total: count() }).from(jaThreads).where(askWhere),
      this.db.select({ total: count() }).from(jaSessions).where(reviewWhere),
    ]);
    const askTotal = Number(askCountRows[0]?.total ?? 0);
    const reviewTotal = Number(reviewCountRows[0]?.total ?? 0);
    const counts = {
      all: askTotal + reviewTotal,
      ask: askTotal,
      review: reviewTotal,
    };
    const requestedTotal = counts[mode];
    const combinedFetchLimit = offset + limit;

    const [threadRows, sessionRows] = await Promise.all([
      mode === 'review'
        ? Promise.resolve([])
        : this.db.query.jaThreads.findMany({
            where: askWhere,
            columns: {
              id: true,
              classId: true,
              title: true,
              status: true,
              lastMessageAt: true,
              updatedAt: true,
            },
            orderBy: [
              desc(
                sql`coalesce(${jaThreads.lastMessageAt}, ${jaThreads.updatedAt})`,
              ),
              asc(jaThreads.id),
            ],
            limit: mode === 'all' ? combinedFetchLimit : limit,
            offset: mode === 'all' ? 0 : offset,
          }),
      mode === 'ask'
        ? Promise.resolve([])
        : this.db.query.jaSessions.findMany({
            where: reviewWhere,
            columns: {
              id: true,
              classId: true,
              status: true,
              currentIndex: true,
              questionCount: true,
              startedAt: true,
              completedAt: true,
              updatedAt: true,
            },
            orderBy: [
              desc(
                sql`coalesce(${jaSessions.completedAt}, ${jaSessions.updatedAt}, ${jaSessions.startedAt})`,
              ),
              asc(jaSessions.id),
            ],
            limit: mode === 'all' ? combinedFetchLimit : limit,
            offset: mode === 'all' ? 0 : offset,
          }),
    ]);

    const askItems: JaActivityHistoryItem[] = threadRows.map((thread) => ({
      id: thread.id,
      mode: 'ask' as const,
      classId: thread.classId,
      title: thread.title || 'Ask thread',
      subtitle: 'Ask thread',
      status: thread.status.toUpperCase(),
      activityAt: this.toActivityIso(thread.lastMessageAt ?? thread.updatedAt),
    }));
    const reviewItems: JaActivityHistoryItem[] = sessionRows.map((session) => ({
      id: session.id,
      mode: 'review' as const,
      classId: session.classId,
      title: 'Assessment Replay',
      subtitle: `${session.status.toUpperCase()} - ${Math.min(session.currentIndex, session.questionCount)}/${session.questionCount}`,
      status: session.status.toUpperCase(),
      activityAt: this.toActivityIso(
        session.completedAt ?? session.updatedAt ?? session.startedAt,
      ),
    }));
    const sortedItems = [...askItems, ...reviewItems].sort((left, right) =>
      this.sortActivityItems(left, right),
    );
    const items =
      mode === 'all'
        ? sortedItems.slice(offset, offset + limit)
        : sortedItems;
    const totalPages =
      requestedTotal > 0 ? Math.ceil(requestedTotal / limit) : 0;

    return {
      items,
      counts,
      pagination: {
        page,
        limit,
        total: requestedTotal,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1 && totalPages > 0,
      },
    };
  }

  async hub(user: UserContext, classId?: string) {
    const studentId = this.resolveUserId(user);
    const practice = await this.loadPracticeBootstrap(user, classId);
    const selectedClassId = practice.selectedClassId;

    if (!selectedClassId) {
      return {
        classes: practice.classes,
        selectedClassId: null,
        progress: null,
        mastery: null,
        badges: [],
        practice,
        ask: { threads: [], lessonContexts: [], guidelines: JA_ASK_GUIDELINES },
        review: { eligibleAttempts: [] },
      };
    }

    const { lessonContexts } = await this.getAccessibleAskSources(
      studentId,
      selectedClassId,
    );

    const [threads, eligibleAttempts, reviewSessions, masteryRows] =
      await Promise.all([
        this.db.query.jaThreads.findMany({
          where: and(
            eq(jaThreads.studentId, studentId),
            eq(jaThreads.classId, selectedClassId),
            eq(jaThreads.status, 'active'),
          ),
          columns: {
            id: true,
            title: true,
            status: true,
            lastMessageAt: true,
            updatedAt: true,
          },
          orderBy: [desc(jaThreads.updatedAt)],
          limit: 12,
        }),
        this.db
          .select({
            attemptId: assessmentAttempts.id,
            assessmentId: assessments.id,
            assessmentTitle: assessments.title,
            submittedAt: assessmentAttempts.submittedAt,
            score: assessmentAttempts.score,
            passed: assessmentAttempts.passed,
          })
          .from(assessmentAttempts)
          .innerJoin(
            assessments,
            eq(assessments.id, assessmentAttempts.assessmentId),
          )
          .where(
            and(
              eq(assessmentAttempts.studentId, studentId),
              eq(assessmentAttempts.isSubmitted, true),
              eq(assessments.classId, selectedClassId),
              eq(assessments.isPublished, true),
            ),
          )
          .orderBy(desc(assessmentAttempts.submittedAt))
          .limit(15),
        this.db.query.jaSessions.findMany({
          where: and(
            eq(jaSessions.studentId, studentId),
            eq(jaSessions.classId, selectedClassId),
            eq(jaSessions.mode, 'review'),
            inArray(jaSessions.status, ['active', 'completed']),
          ),
          columns: {
            id: true,
            status: true,
            currentIndex: true,
            questionCount: true,
            strikeCount: true,
            rewardState: true,
            groundingStatus: true,
            sourceSnapshotJson: true,
            startedAt: true,
            completedAt: true,
          },
          orderBy: [desc(jaSessions.updatedAt)],
          limit: 60,
        }),
        this.db
          .select({
            avgScore: sql<number>`coalesce(avg(${assessmentAttempts.score}), 0)`,
          })
          .from(assessmentAttempts)
          .innerJoin(
            assessments,
            eq(assessments.id, assessmentAttempts.assessmentId),
          )
          .where(
            and(
              eq(assessmentAttempts.studentId, studentId),
              eq(assessmentAttempts.isSubmitted, true),
              eq(assessments.classId, selectedClassId),
              eq(assessments.isPublished, true),
            ),
          ),
      ]);

    const avgScore = Number(masteryRows[0]?.avgScore ?? 0);
    const masteryPercent = Math.max(0, Math.min(100, Math.round(avgScore)));
    const progress = practice.progress;
    const reviewAttemptStats = new Map<
      string,
      { count: number; activeReviewSessionId: string | null }
    >();

    reviewSessions.forEach((session) => {
      const sourceSnapshot = (session.sourceSnapshotJson ?? {}) as Record<
        string,
        unknown
      >;
      const attemptId =
        typeof sourceSnapshot.attemptId === 'string'
          ? sourceSnapshot.attemptId
          : null;
      if (!attemptId) return;

      const current = reviewAttemptStats.get(attemptId) ?? {
        count: 0,
        activeReviewSessionId: null,
      };
      current.count += 1;
      if (session.status === 'active') {
        current.activeReviewSessionId = session.id;
      }
      reviewAttemptStats.set(attemptId, current);
    });

    const eligibleAttemptsWithReviewState = eligibleAttempts.map((attempt) => {
      const stats = reviewAttemptStats.get(attempt.attemptId);
      const reviewSessionCount = stats?.count ?? 0;
      const activeReviewSessionId = stats?.activeReviewSessionId ?? null;

      return {
        ...attempt,
        reviewSessionCount,
        maxReviewSessions: JA_REVIEW_MAX_ATTEMPTS,
        remainingReviewSessions: Math.max(
          0,
          JA_REVIEW_MAX_ATTEMPTS - reviewSessionCount,
        ),
        locked:
          !activeReviewSessionId &&
          reviewSessionCount >= JA_REVIEW_MAX_ATTEMPTS,
        activeReviewSessionId,
      };
    });

    const badges = [
      {
        id: 'math-whiz',
        label: 'Math Whiz',
        level: 3,
        unlocked: (progress?.streakDays ?? 0) >= 3,
      },
      {
        id: 'quiz-master',
        label: 'Quiz Master',
        level: 2,
        unlocked: (progress?.sessionsCompleted ?? 0) >= 2,
      },
      {
        id: 'problem-solver',
        label: 'Problem Solver',
        level: 1,
        unlocked: (progress?.xpTotal ?? 0) >= 500,
      },
    ];

    return {
      classes: practice.classes,
      selectedClassId,
      progress,
      mastery: {
        classId: selectedClassId,
        percent: masteryPercent,
        label: `${masteryPercent}% mastery`,
      },
      badges,
      practice,
      ask: {
        threads,
        lessonContexts,
        guidelines: JA_ASK_GUIDELINES,
      },
      review: {
        eligibleAttempts: eligibleAttemptsWithReviewState,
        sessions: reviewSessions.map(({ sourceSnapshotJson, ...session }) => ({
          ...session,
          sourceSnapshot: sourceSnapshotJson ?? null,
        })),
      },
    };
  }

  async askBootstrap(user: UserContext, classId?: string) {
    const base = await this.loadPracticeBootstrap(user, classId);
    const studentId = this.resolveUserId(user);

    if (!base.selectedClassId) {
      return {
        ...base,
        threads: [],
        quickActions: [],
        lessonContexts: [],
        guidelines: JA_ASK_GUIDELINES,
      };
    }

    const { lessonContexts } = await this.getAccessibleAskSources(
      studentId,
      base.selectedClassId,
    );

    const threads = await this.db.query.jaThreads.findMany({
      where: and(
        eq(jaThreads.studentId, studentId),
        eq(jaThreads.classId, base.selectedClassId),
        eq(jaThreads.status, 'active'),
      ),
      columns: {
        id: true,
        title: true,
        status: true,
        lastMessageAt: true,
        updatedAt: true,
      },
      orderBy: [desc(jaThreads.updatedAt)],
      limit: 20,
    });

    return {
      ...base,
      threads,
      lessonContexts,
      guidelines: JA_ASK_GUIDELINES,
      quickActions: [
        'Explain this lesson',
        'Give me a hint',
        'Make 3 drills',
        'Summarize before quiz',
      ],
    };
  }

  async createAskThread(user: UserContext, dto: CreateJaAskThreadDto) {
    const studentId = this.resolveUserId(user);
    await this.assertStudentClassAccess(studentId, dto.classId);
    const { lessonContexts } = await this.getAccessibleAskSources(
      studentId,
      dto.classId,
    );
    const selectedLessonContext = dto.lessonId
      ? (lessonContexts.find((entry) => entry.lessonId === dto.lessonId) ??
        null)
      : null;

    if (dto.lessonId && !selectedLessonContext) {
      throw new BadRequestException(
        'Selected lesson is not available for JA Ask.',
      );
    }

    const [thread] = await this.db
      .insert(jaThreads)
      .values({
        studentId,
        classId: dto.classId,
        title:
          dto.title?.trim() ||
          (selectedLessonContext
            ? `Ask: ${selectedLessonContext.title}`
            : 'JA Ask Thread'),
        status: 'active',
      })
      .returning({
        id: jaThreads.id,
        classId: jaThreads.classId,
        title: jaThreads.title,
        status: jaThreads.status,
        updatedAt: jaThreads.updatedAt,
      });

    if (selectedLessonContext) {
      await this.db.insert(jaThreadMessages).values({
        threadId: thread.id,
        role: 'system',
        content: this.buildAskThreadContextMessage(selectedLessonContext),
      });
    }

    return {
      thread: {
        ...thread,
        contextLessonId: selectedLessonContext?.lessonId ?? null,
        contextLessonTitle: selectedLessonContext?.title ?? null,
        contextModuleTitle: selectedLessonContext?.moduleTitle ?? null,
        contextSectionTitle: selectedLessonContext?.sectionTitle ?? null,
      },
      messages: [],
    };
  }

  async getAskThread(
    user: UserContext,
    threadId: string,
    query?: { limit?: number; before?: string },
  ) {
    const studentId = this.resolveUserId(user);
    const thread = await this.db.query.jaThreads.findFirst({
      where: and(
        eq(jaThreads.id, threadId),
        eq(jaThreads.studentId, studentId),
      ),
      columns: {
        id: true,
        classId: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!thread) {
      throw new NotFoundException('JA Ask thread not found.');
    }

    const limit = query?.limit ?? 40;
    const cursor = query?.before
      ? this.decodeAskMessageCursor(query.before)
      : null;
    const cursorCreatedAt = cursor ? new Date(cursor.createdAt) : null;
    const messageWhere = and(
      eq(jaThreadMessages.threadId, threadId),
      ne(jaThreadMessages.role, 'system'),
      cursor && cursorCreatedAt
        ? or(
            lt(jaThreadMessages.createdAt, cursorCreatedAt),
            and(
              eq(jaThreadMessages.createdAt, cursorCreatedAt),
              lt(jaThreadMessages.id, cursor.id),
            ),
          )
        : undefined,
    );
    const [messageRows, contextMessage] = await Promise.all([
      this.db.query.jaThreadMessages.findMany({
        where: messageWhere,
        columns: {
          id: true,
          role: true,
          content: true,
          citationsJson: true,
          quickAction: true,
          blocked: true,
          createdAt: true,
        },
        orderBy: [
          desc(jaThreadMessages.createdAt),
          desc(jaThreadMessages.id),
        ],
        limit: limit + 1,
      }),
      this.db.query.jaThreadMessages.findFirst({
        where: and(
          eq(jaThreadMessages.threadId, threadId),
          eq(jaThreadMessages.role, 'system'),
        ),
        columns: { content: true },
        orderBy: [desc(jaThreadMessages.createdAt)],
      }),
    ]);

    const hasMore = messageRows.length > limit;
    const pageRows = messageRows.slice(0, limit);
    const oldestMessage = pageRows.at(-1);
    const selectedLessonContext = contextMessage
      ? this.parseAskThreadContextMessage(contextMessage.content)
      : null;
    const visibleMessages = [...pageRows].reverse();

    return {
      thread: {
        ...thread,
        contextLessonId: selectedLessonContext?.lessonId ?? null,
        contextLessonTitle: selectedLessonContext?.title ?? null,
        contextModuleTitle: selectedLessonContext?.moduleTitle ?? null,
        contextSectionTitle: selectedLessonContext?.sectionTitle ?? null,
      },
      messages: visibleMessages,
      pageInfo: {
        hasMore,
        nextCursor:
          hasMore && oldestMessage
            ? this.encodeAskMessageCursor({
                createdAt: this.toActivityIso(oldestMessage.createdAt),
                id: oldestMessage.id,
              })
            : null,
      },
    };
  }
  async sendAskMessage(
    user: UserContext,
    threadId: string,
    dto: SendJaAskMessageDto,
  ) {
    const studentId = this.resolveUserId(user);
    const thread = await this.db.query.jaThreads.findFirst({
      where: and(
        eq(jaThreads.id, threadId),
        eq(jaThreads.studentId, studentId),
      ),
      columns: {
        id: true,
        classId: true,
        title: true,
      },
    });

    if (!thread) {
      throw new NotFoundException('JA Ask thread not found.');
    }

    await this.assertStudentClassAccess(studentId, thread.classId);
    const { allowedLessonIds, allowedAssessmentIds, lessonContexts } =
      await this.getAccessibleAskSources(studentId, thread.classId);

    if (allowedLessonIds.size === 0 && allowedAssessmentIds.size === 0) {
      throw new BadRequestException(
        'You need completed visible class material before using JA Ask.',
      );
    }

    const latestContextMessage = await this.db.query.jaThreadMessages.findFirst(
      {
        where: and(
          eq(jaThreadMessages.threadId, threadId),
          eq(jaThreadMessages.role, 'system'),
        ),
        columns: {
          content: true,
        },
        orderBy: [desc(jaThreadMessages.createdAt)],
      },
    );
    const persistedLessonContext = this.parseAskThreadContextMessage(
      latestContextMessage?.content,
    );
    const requestedLessonContext = dto.lessonId
      ? (lessonContexts.find((entry) => entry.lessonId === dto.lessonId) ??
        null)
      : null;

    if (dto.lessonId && !requestedLessonContext) {
      throw new BadRequestException(
        'Selected lesson is not available for JA Ask.',
      );
    }

    let selectedLessonContext =
      requestedLessonContext ??
      (persistedLessonContext &&
      allowedLessonIds.has(persistedLessonContext.lessonId)
        ? persistedLessonContext
        : null);
    let threadTitle = thread.title;

    if (
      requestedLessonContext &&
      requestedLessonContext.lessonId !== persistedLessonContext?.lessonId
    ) {
      threadTitle = `Ask: ${requestedLessonContext.title}`;
      await this.db.insert(jaThreadMessages).values({
        threadId,
        role: 'system',
        content: this.buildAskThreadContextMessage(requestedLessonContext),
      });
      await this.db
        .update(jaThreads)
        .set({
          title: threadTitle,
          updatedAt: new Date(),
        })
        .where(eq(jaThreads.id, threadId));
      selectedLessonContext = requestedLessonContext;
    }

    const effectiveAllowedLessonIds = selectedLessonContext
      ? new Set([selectedLessonContext.lessonId])
      : allowedLessonIds;
    const effectiveAllowedAssessmentIds = selectedLessonContext
      ? new Set<string>()
      : allowedAssessmentIds;

    const [studentMessage] = await this.db
      .insert(jaThreadMessages)
      .values({
        threadId,
        role: 'student',
        content: dto.message.trim(),
        quickAction: dto.quickAction ?? null,
      })
      .returning({
        id: jaThreadMessages.id,
      });

    const history = await this.db.query.jaThreadMessages.findMany({
      where: eq(jaThreadMessages.threadId, threadId),
      columns: {
        role: true,
        content: true,
      },
      orderBy: [desc(jaThreadMessages.createdAt)],
      limit: JA_ASK_MAX_HISTORY,
    });

    const payload = await this.aiProxyService.forward(
      'POST',
      '/student/ja/ask/respond',
      {
        id: studentId,
        email: user.email,
        roles: user.roles,
      },
      {
        classId: thread.classId,
        threadId,
        message: dto.message.trim(),
        quickAction: dto.quickAction ?? null,
        lessonId: selectedLessonContext?.lessonId ?? null,
        lessonTitle: selectedLessonContext?.title ?? null,
        history: [...history]
          .reverse()
          .filter((entry) => entry.role !== 'system')
          .map((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
        allowedLessonIds: Array.from(effectiveAllowedLessonIds),
        allowedAssessmentIds: Array.from(effectiveAllowedAssessmentIds),
      },
    );

    const data = this.unwrapEnvelope<{
      blocked: boolean;
      reason?: string | null;
      reply: string;
      citations?: unknown[];
      insufficientEvidence?: boolean;
    }>(payload);

    const citations = this.sanitizeCitations(
      data.citations,
      effectiveAllowedLessonIds,
      effectiveAllowedAssessmentIds,
    );

    const [assistantMessage] = await this.db
      .insert(jaThreadMessages)
      .values({
        threadId,
        role: 'assistant',
        content: data.reply,
        citationsJson: citations,
        blocked: Boolean(data.blocked),
      })
      .returning({
        id: jaThreadMessages.id,
        content: jaThreadMessages.content,
        blocked: jaThreadMessages.blocked,
      });

    await this.db
      .update(jaThreads)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jaThreads.id, threadId));

    if (data.blocked) {
      await this.db.insert(jaGuardrailEvents).values({
        studentId,
        classId: thread.classId,
        threadId,
        messageId: studentMessage.id,
        eventType: 'blocked_prompt',
        payloadJson: {
          reason: data.reason ?? 'policy_guardrail',
          prompt: dto.message.trim(),
          quickAction: dto.quickAction ?? null,
        },
      });

      await this.auditService.log({
        actorId: studentId,
        action: 'ja.ask.guardrail_triggered',
        targetType: 'ja_thread',
        targetId: threadId,
        metadata: {
          classId: thread.classId,
          reason: data.reason ?? 'policy_guardrail',
        },
      });
    }

    return {
      thread: {
        id: thread.id,
        classId: thread.classId,
        title: threadTitle,
        contextLessonId: selectedLessonContext?.lessonId ?? null,
        contextLessonTitle: selectedLessonContext?.title ?? null,
        contextModuleTitle: selectedLessonContext?.moduleTitle ?? null,
        contextSectionTitle: selectedLessonContext?.sectionTitle ?? null,
      },
      message: {
        id: assistantMessage.id,
        role: 'assistant',
        content: assistantMessage.content,
        blocked: assistantMessage.blocked,
        citations,
      },
      blocked: Boolean(data.blocked),
      reason: data.reason ?? null,
      insufficientEvidence: Boolean(data.insufficientEvidence),
    };
  }

  async reviewBootstrap(user: UserContext, classId?: string) {
    const base = await this.loadPracticeBootstrap(user, classId);
    const studentId = this.resolveUserId(user);

    if (!base.selectedClassId) {
      return {
        ...base,
        eligibleAttempts: [],
        sessions: [],
      };
    }

    const eligibleAttemptsRaw = await this.db
      .select({
        attemptId: assessmentAttempts.id,
        assessmentId: assessments.id,
        assessmentTitle: assessments.title,
        submittedAt: assessmentAttempts.submittedAt,
        score: assessmentAttempts.score,
        passed: assessmentAttempts.passed,
        isSubmitted: sql<boolean>`CASE WHEN ${assessmentAttempts.id} IS NOT NULL AND ${assessmentAttempts.isSubmitted} = true THEN true ELSE false END`,
      })
      .from(assessments)
      .leftJoin(
        assessmentAttempts,
        and(
          eq(assessmentAttempts.assessmentId, assessments.id),
          eq(assessmentAttempts.studentId, studentId),
          eq(assessmentAttempts.isSubmitted, true),
        ),
      )
      .where(
        and(
          eq(assessments.classId, base.selectedClassId),
          eq(assessments.isPublished, true),
        ),
      )
      .orderBy(
        desc(assessmentAttempts.submittedAt),
        desc(assessments.createdAt),
      )
      .limit(30);

    const sessions = await this.db.query.jaSessions.findMany({
      where: and(
        eq(jaSessions.studentId, studentId),
        eq(jaSessions.classId, base.selectedClassId),
        eq(jaSessions.mode, 'review'),
        inArray(jaSessions.status, ['active', 'completed']),
      ),
      columns: {
        id: true,
        status: true,
        currentIndex: true,
        questionCount: true,
        strikeCount: true,
        rewardState: true,
        groundingStatus: true,
        sourceSnapshotJson: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: [desc(jaSessions.updatedAt)],
      limit: 30,
    });

    const completedSessionIds = sessions
      .filter((s) => s.status === 'completed')
      .map((s) => s.id);

    const completedScoresMap = new Map<string, number>();
    if (completedSessionIds.length > 0) {
      const scoreRows = await this.db
        .select({
          sessionId: jaSessionItems.sessionId,
          total: count(jaSessionItems.id),
          correct: count(
            sql`CASE WHEN ${jaSessionResponses.isCorrect} = true THEN 1 END`,
          ),
        })
        .from(jaSessionItems)
        .leftJoin(
          jaSessionResponses,
          eq(jaSessionResponses.sessionItemId, jaSessionItems.id),
        )
        .where(inArray(jaSessionItems.sessionId, completedSessionIds))
        .groupBy(jaSessionItems.sessionId);

      for (const row of scoreRows) {
        const total = Number(row.total || 0);
        const correct = Number(row.correct || 0);
        const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
        completedScoresMap.set(row.sessionId, percent);
      }
    }

    const eligibleAttempts = eligibleAttemptsRaw.map((row) => {
      const matchingSessions = sessions.filter((s) => {
        const snapshot = s.sourceSnapshotJson as any;
        return (
          snapshot?.assessmentId === row.assessmentId ||
          snapshot?.attemptId === row.attemptId ||
          snapshot?.attemptId === row.assessmentId
        );
      });

      const completedSession = matchingSessions.find(
        (s) => s.status === 'completed',
      );
      const activeSession = matchingSessions.find((s) => s.status === 'active');
      const latestSession =
        activeSession || completedSession || matchingSessions[0];

      const isReplayCompleted = Boolean(completedSession);
      const replayScore = completedSession
        ? (completedScoresMap.get(completedSession.id) ?? null)
        : null;

      return {
        attemptId: row.attemptId ?? row.assessmentId,
        assessmentId: row.assessmentId,
        assessmentTitle: row.assessmentTitle,
        submittedAt: row.submittedAt,
        score: row.score,
        passed: row.passed,
        isSubmitted: row.isSubmitted,
        isReplayCompleted,
        replayScore,
        replaySessionId: latestSession?.id ?? null,
        replayCount: matchingSessions.length,
      };
    });

    return {
      ...base,
      eligibleAttempts,
      sessions,
    };
  }

  async createSession(user: UserContext, dto: CreateJaPracticeSessionDto) {
    const studentId = this.resolveUserId(user);
    await this.assertStudentClassAccess(studentId, dto.classId);

    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAccessibleAskSources(studentId, dto.classId);
    if (allowedLessonIds.size === 0 && allowedAssessmentIds.size === 0) {
      throw new BadRequestException(
        'You have not completed enough class material to generate JA practice yet.',
      );
    }

    const payload = await this.aiProxyService.forward(
      'POST',
      '/student/ja/practice/sessions/generate',
      {
        id: studentId,
        email: user.email,
        roles: user.roles,
      },
      {
        classId: dto.classId,
        questionCount: JA_QUESTION_COUNT,
        recommendation: dto.recommendation ?? null,
        allowedLessonIds: Array.from(allowedLessonIds),
        allowedAssessmentIds: Array.from(allowedAssessmentIds),
      },
    );
    const data = this.unwrapEnvelope<JaGeneratedPacket>(payload);
    if (!Array.isArray(data.items) || data.items.length !== JA_QUESTION_COUNT) {
      throw new BadRequestException(
        `JA practice requires exactly ${JA_QUESTION_COUNT} validated items.`,
      );
    }

    const normalizedItems = data.items.map((item, idx) =>
      this.normalizeGeneratedItem(item, idx),
    );
    const sanitizedItems = normalizedItems.map((item) => ({
      ...item,
      citations: this.sanitizeCitations(
        item.citations,
        allowedLessonIds,
        allowedAssessmentIds,
      ),
    }));

    const [createdSession] = await this.db
      .insert(jaSessions)
      .values({
        studentId,
        classId: dto.classId,
        mode: 'practice',
        status: 'active',
        questionCount: JA_QUESTION_COUNT,
        currentIndex: 0,
        strikeCount: 0,
        rewardState: 'pending',
        sourceSnapshotJson: data.sourceSnapshot ?? null,
        groundingStatus: data.groundingStatus ?? 'grounded',
      })
      .returning();

    await this.db.insert(jaSessionItems).values(
      sanitizedItems.map((item, idx) => ({
        sessionId: createdSession.id,
        orderIndex: idx,
        itemType: item.itemType,
        prompt: item.prompt,
        optionsJson: item.options,
        answerKeyJson: item.answerKey,
        hint: item.hint,
        explanation: item.explanation,
        citationsJson: item.citations,
        validationJson: item.validation,
      })),
    );

    await this.auditService.log({
      actorId: studentId,
      action: 'ja.session.created',
      targetType: 'ja_session',
      targetId: createdSession.id,
      metadata: {
        classId: dto.classId,
        mode: 'practice',
      },
    });

    return this.getSession(user, createdSession.id, 'practice');
  }

  async createReviewSession(user: UserContext, dto: CreateJaReviewSessionDto) {
    const studentId = this.resolveUserId(user);
    await this.assertStudentClassAccess(studentId, dto.classId);

    const attempt = await this.db
      .select({
        attemptId: assessmentAttempts.id,
        assessmentId: assessments.id,
      })
      .from(assessmentAttempts)
      .innerJoin(
        assessments,
        eq(assessments.id, assessmentAttempts.assessmentId),
      )
      .where(
        and(
          eq(assessmentAttempts.id, dto.attemptId),
          eq(assessmentAttempts.studentId, studentId),
          eq(assessmentAttempts.isSubmitted, true),
          eq(assessments.classId, dto.classId),
          eq(assessments.isPublished, true),
        ),
      )
      .limit(1);

    if (!attempt[0]) {
      throw new BadRequestException(
        'Review session requires one of your submitted assessments in this class.',
      );
    }

    const existingReviewSessions = await this.db
      .select({
        id: jaSessions.id,
        status: jaSessions.status,
      })
      .from(jaSessions)
      .where(
        and(
          eq(jaSessions.studentId, studentId),
          eq(jaSessions.classId, dto.classId),
          eq(jaSessions.mode, 'review'),
          sql`(${jaSessions.sourceSnapshotJson}->>'attemptId' = ${dto.attemptId} OR ${jaSessions.sourceSnapshotJson}->>'assessmentId' = ${attempt[0].assessmentId})`,
        ),
      )
      .orderBy(desc(jaSessions.updatedAt));

    const activeReviewSession = existingReviewSessions.find(
      (session) => session.status === 'active',
    );
    if (activeReviewSession) {
      return this.getSession(user, activeReviewSession.id, 'review');
    }

    const completedReviewSession = existingReviewSessions.find(
      (session) => session.status === 'completed',
    );
    if (
      completedReviewSession &&
      existingReviewSessions.length >= JA_REVIEW_MAX_ATTEMPTS
    ) {
      return this.getSession(user, completedReviewSession.id, 'review');
    }

    const { allowedLessonIds, allowedAssessmentIds } =
      await this.getAccessibleAskSources(studentId, dto.classId);

    const payload = await this.aiProxyService.forward(
      'POST',
      '/student/ja/review/sessions/generate',
      {
        id: studentId,
        email: user.email,
        roles: user.roles,
      },
      {
        classId: dto.classId,
        attemptId: dto.attemptId,
        questionCount: dto.questionCount ?? JA_QUESTION_COUNT,
        allowedLessonIds: Array.from(allowedLessonIds),
        allowedAssessmentIds: Array.from(allowedAssessmentIds),
      },
    );

    const data = this.unwrapEnvelope<JaGeneratedPacket>(payload);
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new BadRequestException('JA review generation returned no items.');
    }

    const normalizedItems = data.items.map((item, idx) =>
      this.normalizeGeneratedItem(item, idx),
    );
    const sanitizedItems = normalizedItems.map((item) => ({
      ...item,
      citations: this.sanitizeCitations(
        item.citations,
        allowedLessonIds,
        allowedAssessmentIds,
      ),
    }));

    const [createdSession] = await this.db
      .insert(jaSessions)
      .values({
        studentId,
        classId: dto.classId,
        mode: 'review',
        status: 'active',
        questionCount: sanitizedItems.length,
        currentIndex: 0,
        strikeCount: 0,
        rewardState: 'pending',
        sourceSnapshotJson: {
          ...(data.sourceSnapshot ?? {}),
          attemptId: dto.attemptId,
          assessmentId: attempt[0].assessmentId,
        },
        groundingStatus: data.groundingStatus ?? 'grounded',
      })
      .returning();

    await this.db.insert(jaSessionItems).values(
      sanitizedItems.map((item, idx) => ({
        sessionId: createdSession.id,
        orderIndex: idx,
        itemType: item.itemType,
        prompt: item.prompt,
        optionsJson: item.options,
        answerKeyJson: item.answerKey,
        hint: item.hint,
        explanation: item.explanation,
        citationsJson: item.citations,
        validationJson: item.validation,
      })),
    );

    await this.auditService.log({
      actorId: studentId,
      action: 'ja.session.created',
      targetType: 'ja_session',
      targetId: createdSession.id,
      metadata: {
        classId: dto.classId,
        mode: 'review',
        attemptId: dto.attemptId,
      },
    });

    return this.getSession(user, createdSession.id, 'review');
  }
  async getSession(
    user: UserContext,
    sessionId: string,
    expectedMode?: JaMode,
  ) {
    const studentId = this.resolveUserId(user);
    const session = await this.getSessionForStudent(
      studentId,
      sessionId,
      expectedMode,
    );

    return {
      session: {
        id: session.id,
        classId: session.classId,
        mode: session.mode,
        status: session.status,
        questionCount: session.questionCount,
        currentIndex: session.currentIndex,
        strikeCount: session.strikeCount,
        rewardState: session.rewardState,
        groundingStatus: session.groundingStatus,
        sourceSnapshot: session.sourceSnapshotJson,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
      items: session.items.map((item) => {
        const response = item.responses[0]
          ? {
              id: item.responses[0].id,
              studentAnswer: item.responses[0].studentAnswerJson,
              isCorrect: item.responses[0].isCorrect,
              scoreDelta: item.responses[0].scoreDelta,
              feedback: item.responses[0].feedback,
              answeredAt: item.responses[0].answeredAt,
            }
          : null;
        const answerKey =
          item.answerKeyJson && typeof item.answerKeyJson === 'object'
            ? (item.answerKeyJson as Record<string, unknown>)
            : {};

        return {
          id: item.id,
          orderIndex: item.orderIndex,
          itemType: item.itemType,
          prompt: item.prompt,
          options: item.optionsJson,
          correctOptionIds: response
            ? this.getCorrectOptionIdsForItem(
                item.itemType,
                answerKey,
                Array.isArray(item.optionsJson) ? item.optionsJson : [],
              )
            : null,
          hint: item.hint,
          explanation: item.explanation,
          citations: item.citationsJson,
          validation: item.validationJson,
          response,
        };
      }),
    };
  }

  async submitResponse(
    user: UserContext,
    sessionId: string,
    dto: SubmitJaPracticeResponseDto,
    expectedMode?: JaMode,
  ) {
    const studentId = this.resolveUserId(user);
    const session = await this.getSessionForStudent(
      studentId,
      sessionId,
      expectedMode,
    );

    if (session.status !== 'active') {
      throw new BadRequestException(
        'Session is no longer accepting responses.',
      );
    }

    const item = await this.db.query.jaSessionItems.findFirst({
      where: and(
        eq(jaSessionItems.id, dto.itemId),
        eq(jaSessionItems.sessionId, sessionId),
      ),
      columns: {
        id: true,
        itemType: true,
        answerKeyJson: true,
        hint: true,
      },
    });
    if (!item) {
      throw new NotFoundException('JA session item not found.');
    }

    const result = this.evaluateObjectiveItem(
      item.itemType,
      (item.answerKeyJson as Record<string, unknown>) ?? {},
      dto.answer ?? {},
    );
    const feedback = result.isCorrect
      ? 'Correct. Keep your momentum.'
      : item.hint || 'Not quite yet. Check the source card and try again.';

    const existing = await this.db.query.jaSessionResponses.findFirst({
      where: eq(jaSessionResponses.sessionItemId, item.id),
      columns: { id: true },
    });

    if (existing) {
      await this.db
        .update(jaSessionResponses)
        .set({
          studentAnswerJson: dto.answer,
          isCorrect: result.isCorrect,
          scoreDelta: result.scoreDelta,
          feedback,
          answeredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jaSessionResponses.id, existing.id));
    } else {
      await this.db.insert(jaSessionResponses).values({
        sessionItemId: item.id,
        studentAnswerJson: dto.answer,
        isCorrect: result.isCorrect,
        scoreDelta: result.scoreDelta,
        feedback,
      });
    }

    const answeredCountRow = await this.db
      .select({ total: count() })
      .from(jaSessionResponses)
      .innerJoin(
        jaSessionItems,
        eq(jaSessionItems.id, jaSessionResponses.sessionItemId),
      )
      .where(eq(jaSessionItems.sessionId, sessionId));
    const answeredCount = Number(answeredCountRow[0]?.total ?? 0);

    await this.db
      .update(jaSessions)
      .set({
        currentIndex: Math.min(answeredCount, session.questionCount),
        updatedAt: new Date(),
      })
      .where(eq(jaSessions.id, sessionId));

    return {
      sessionId,
      itemId: item.id,
      isCorrect: result.isCorrect,
      feedback,
      currentIndex: Math.min(answeredCount, session.questionCount),
      answeredCount,
      questionCount: session.questionCount,
    };
  }

  async addEvent(
    user: UserContext,
    sessionId: string,
    dto: LogJaPracticeEventDto,
    expectedMode?: JaMode,
  ) {
    const studentId = this.resolveUserId(user);
    const session = await this.getSessionForStudent(
      studentId,
      sessionId,
      expectedMode,
    );

    await this.db.insert(jaSessionEvents).values({
      sessionId,
      eventType: dto.eventType,
      payloadJson: dto.payload ?? null,
    });

    let strikeCount = session.strikeCount;
    if (dto.eventType === 'focus_strike') {
      strikeCount += 1;
      await this.db
        .update(jaSessions)
        .set({
          strikeCount,
          updatedAt: new Date(),
        })
        .where(eq(jaSessions.id, sessionId));

      await this.auditService.log({
        actorId: studentId,
        action: 'ja.focus.strike',
        targetType: 'ja_session',
        targetId: sessionId,
        metadata: {
          strikeCount,
          mode: session.mode,
        },
      });
    }

    return {
      sessionId,
      eventType: dto.eventType,
      strikeCount,
    };
  }

  async completeSession(
    sessionId: string,
    user: UserContext,
    expectedMode?: JaMode,
  ) {
    const studentId = this.resolveUserId(user);
    const session = await this.getSessionForStudent(
      studentId,
      sessionId,
      expectedMode,
    );

    const scoreRows = await this.db
      .select({
        score: sql<number>`coalesce(sum(${jaSessionResponses.scoreDelta}), 0)`,
        answered: count(),
      })
      .from(jaSessionResponses)
      .innerJoin(
        jaSessionItems,
        eq(jaSessionItems.id, jaSessionResponses.sessionItemId),
      )
      .where(eq(jaSessionItems.sessionId, sessionId));
    const answeredCount = Number(scoreRows[0]?.answered ?? 0);
    const totalScore = Number(scoreRows[0]?.score ?? 0);

    if (answeredCount < session.questionCount) {
      throw new BadRequestException(
        'Finish all questions before completing this JA session.',
      );
    }

    let awardedNow = false;
    let xpAwarded = 0;
    if (session.rewardState !== 'awarded') {
      const existingLedger = await this.db.query.jaXpLedger.findFirst({
        where: and(
          eq(jaXpLedger.sessionId, sessionId),
          eq(jaXpLedger.eventType, 'session_completion'),
        ),
        columns: { id: true },
      });

      if (!existingLedger) {
        xpAwarded = JA_SESSION_XP_BASE + totalScore * JA_SESSION_XP_PER_CORRECT;
        awardedNow = true;

        await this.db.insert(jaXpLedger).values({
          studentId,
          classId: session.classId,
          sessionId,
          eventType: 'session_completion',
          xpDelta: xpAwarded,
          metadataJson: {
            totalScore,
            questionCount: session.questionCount,
            mode: session.mode,
          },
        });

        const progressRow = await this.db.query.jaProgress.findFirst({
          where: and(
            eq(jaProgress.studentId, studentId),
            eq(jaProgress.classId, session.classId),
          ),
        });
        const now = new Date();
        if (!progressRow) {
          await this.db.insert(jaProgress).values({
            studentId,
            classId: session.classId,
            xpTotal: xpAwarded,
            streakDays: 1,
            sessionsCompleted: 1,
            lastActivityAt: now,
          });
        } else {
          const dayDiff = progressRow.lastActivityAt
            ? Math.floor(
                (now.getTime() -
                  new Date(progressRow.lastActivityAt).getTime()) /
                  86_400_000,
              )
            : null;
          const streakDays =
            dayDiff === null
              ? 1
              : dayDiff === 0
                ? progressRow.streakDays
                : dayDiff === 1
                  ? progressRow.streakDays + 1
                  : 1;
          await this.db
            .update(jaProgress)
            .set({
              xpTotal: progressRow.xpTotal + xpAwarded,
              streakDays,
              sessionsCompleted: progressRow.sessionsCompleted + 1,
              lastActivityAt: now,
              updatedAt: now,
            })
            .where(
              and(
                eq(jaProgress.studentId, studentId),
                eq(jaProgress.classId, session.classId),
              ),
            );
        }
      }
    }

    await this.db
      .update(jaSessions)
      .set({
        status: 'completed',
        rewardState: 'awarded',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jaSessions.id, sessionId));

    await this.db.insert(jaSessionEvents).values({
      sessionId,
      eventType: 'completed',
      payloadJson: {
        totalScore,
        questionCount: session.questionCount,
        awardedNow,
        xpAwarded,
      },
    });

    let lxpCheckpointCompletion: {
      completed: boolean;
      reason?: string;
      assignmentId?: string;
      caseId?: string;
      interventionCompletedByStudent?: boolean;
    } | null = null;
    if (session.mode === 'review') {
      const sourceSnapshot = (session.sourceSnapshotJson ?? {}) as Record<
        string,
        unknown
      >;
      const linkedAssessmentId =
        typeof sourceSnapshot.assessmentId === 'string'
          ? sourceSnapshot.assessmentId
          : null;
      if (linkedAssessmentId) {
        lxpCheckpointCompletion =
          await this.lxpService.completeAssessmentRetryFromJaReview(
            studentId,
            session.classId,
            linkedAssessmentId,
            sessionId,
          );
      }
    }

    await this.auditService.log({
      actorId: studentId,
      action: 'ja.session.completed',
      targetType: 'ja_session',
      targetId: sessionId,
      metadata: {
        classId: session.classId,
        mode: session.mode,
        totalScore,
        questionCount: session.questionCount,
        awardedNow,
        xpAwarded,
        lxpCheckpointCompletion,
      },
    });

    return {
      sessionId,
      totalScore,
      questionCount: session.questionCount,
      awardedNow,
      xpAwarded,
      lxpCheckpointCompletion,
    };
  }

  async deleteSession(sessionId: string, user: UserContext) {
    const studentId = this.resolveUserId(user);
    const session = await this.db.query.jaSessions.findFirst({
      where: and(
        eq(jaSessions.id, sessionId),
        eq(jaSessions.studentId, studentId),
      ),
      columns: {
        id: true,
        classId: true,
        mode: true,
      },
    });

    if (!session) {
      throw new NotFoundException('JA session not found.');
    }

    await this.db.delete(jaSessions).where(eq(jaSessions.id, sessionId));

    await this.auditService.log({
      actorId: studentId,
      action: 'ja.session.deleted',
      targetType: 'ja_session',
      targetId: sessionId,
      metadata: {
        classId: session.classId,
        mode: session.mode,
      },
    });

    return {
      deleted: true,
      sessionId,
    };
  }
}
