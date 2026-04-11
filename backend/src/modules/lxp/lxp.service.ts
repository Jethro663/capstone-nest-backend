import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  assessments,
  assessmentAttempts,
  classes,
  enrollments,
  interventionAssignments,
  interventionCases,
  lessons,
  lxpProgress,
  performanceSnapshots,
  systemEvaluationTargetEnum,
  systemEvaluations,
  users,
} from '../../drizzle/schema';
import { PerformanceStatusChangedEvent } from '../../common/events';
import {
  AssignInterventionDto,
  ResolveInterventionDto,
  SubmitSystemEvaluationDto,
} from './dto/lxp.dto';
import { AuditService } from '../audit/audit.service';

const INTERVENTION_THRESHOLD = 74;
const LESSON_XP = 20;
const ASSESSMENT_XP = 30;
const STAR_XP = 1000;

type UserContext = {
  userId: string;
  roles: string[];
};

type SystemEvaluationTarget = (typeof systemEvaluationTargetEnum.enumValues)[number];

@Injectable()
export class LxpService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAdmin(roles: string[]): boolean {
    return roles.includes('admin');
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private xpToStars(xp: number) {
    return Math.round((xp / STAR_XP) * 100) / 100;
  }

  private appendInterventionNote(
    existingNote: string | null | undefined,
    newNote: string | null | undefined,
  ): string | null {
    const normalizedExisting = existingNote?.trim() ?? '';
    const normalizedNew = newNote?.trim() ?? '';

    if (!normalizedNew) {
      return normalizedExisting.length > 0 ? normalizedExisting : null;
    }

    if (!normalizedExisting) {
      return normalizedNew;
    }

    return `${normalizedExisting}\n${normalizedNew}`;
  }

  private getStatusSummary(input: {
    caseStatus?: string | null;
    isAtRisk: boolean;
    progressPercent: number;
    streakDays: number;
    masteryPercent: number | null;
  }) {
    if (
      input.caseStatus === 'completed' ||
      (!input.isAtRisk &&
        input.masteryPercent !== null &&
        input.masteryPercent >= INTERVENTION_THRESHOLD)
    ) {
      return {
        code: 'on_track',
        label: 'On Track',
        message:
          'You are closing the gap well. Keep building consistency to stay above the intervention threshold.',
      };
    }

    if (input.progressPercent >= 50 || input.streakDays >= 2) {
      return {
        code: 'improving',
        label: 'Improving',
        message:
          'Your recovery work is moving in the right direction. Focus on the next checkpoint to keep momentum.',
      };
    }

    return {
      code: 'needs_attention',
      label: 'Needs Attention',
      message:
        'Start with the next guided checkpoint so you can rebuild mastery without taking on everything at once.',
    };
  }

  private async assertTeacherClassAccess(classId: string, user: UserContext) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true },
    });
    if (!cls) throw new NotFoundException(`Class "${classId}" not found`);
    if (!this.isAdmin(user.roles) && cls.teacherId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async assertStudentEnrollment(studentId: string, classId: string) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('Student is not enrolled in this class');
    }
  }

  private async getOrCreateProgress(
    studentId: string,
    classId: string,
    conn: any = this.db,
  ) {
    const existing = await conn.query.lxpProgress.findFirst({
      where: and(
        eq(lxpProgress.studentId, studentId),
        eq(lxpProgress.classId, classId),
      ),
    });

    if (existing) return existing;

    const [created] = await conn
      .insert(lxpProgress)
      .values({ studentId, classId })
      .returning();
    return created;
  }

  private async getOrCreateCaseForStudent(
    studentId: string,
    classId: string,
    triggerSource: string,
  ) {
    const existing = await this.db.query.interventionCases.findFirst({
      where: and(
        eq(interventionCases.studentId, studentId),
        eq(interventionCases.classId, classId),
        or(
          eq(interventionCases.status, 'pending'),
          eq(interventionCases.status, 'active'),
        ),
      ),
      orderBy: [desc(interventionCases.createdAt)],
    });
    if (existing) return existing;

    const snapshot = await this.db.query.performanceSnapshots.findFirst({
      where: and(
        eq(performanceSnapshots.studentId, studentId),
        eq(performanceSnapshots.classId, classId),
      ),
      columns: {
        blendedScore: true,
        thresholdApplied: true,
      },
    });

    const [created] = await this.db
      .insert(interventionCases)
      .values({
        studentId,
        classId,
        status: 'pending',
        triggerSource,
        triggerScore: snapshot?.blendedScore ?? null,
        thresholdApplied:
          snapshot?.thresholdApplied?.toString() ??
          INTERVENTION_THRESHOLD.toString(),
      })
      .returning();

    return created;
  }

  private async ensureDefaultAssignments(
    caseId: string,
    classId: string,
    studentId: string,
  ) {
    const existingAssignments =
      await this.db.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, caseId),
        columns: { id: true },
        limit: 1,
      });
    if (existingAssignments.length > 0) return;

    const latestLessons = await this.db.query.lessons.findMany({
      where: and(eq(lessons.classId, classId), eq(lessons.isDraft, false)),
      columns: { id: true, title: true, order: true },
      orderBy: [desc(lessons.order)],
      limit: 3,
    });

    const latestAssessments = await this.db.query.assessments.findMany({
      where: and(
        eq(assessments.classId, classId),
        eq(assessments.isPublished, true),
      ),
      columns: { id: true, title: true, createdAt: true },
      orderBy: [desc(assessments.createdAt)],
      limit: 2,
    });
    const weakAttempts = await this.db
      .select({
        assessmentId: assessmentAttempts.assessmentId,
        score: assessmentAttempts.score,
        submittedAt: assessmentAttempts.submittedAt,
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
          eq(assessmentAttempts.passed, false),
          eq(assessments.classId, classId),
          eq(assessments.isPublished, true),
        ),
      )
      .orderBy(asc(assessmentAttempts.score), desc(assessmentAttempts.submittedAt))
      .limit(3);

    const payload: (typeof interventionAssignments.$inferInsert)[] = [];
    let order = 1;
    latestLessons.forEach((lesson) => {
      payload.push({
        caseId,
        assignmentType: 'lesson_review',
        lessonId: lesson.id,
        checkpointLabel: `Review: ${lesson.title}`,
        orderIndex: order++,
        xpAwarded: LESSON_XP,
      });
    });

    const weakAssessmentIds = weakAttempts
      .map((attempt) => attempt.assessmentId)
      .filter((id): id is string => Boolean(id));
    const weakAssessments =
      weakAssessmentIds.length > 0
        ? await this.db.query.assessments.findMany({
            where: and(
              eq(assessments.classId, classId),
              inArray(assessments.id, weakAssessmentIds),
              eq(assessments.isPublished, true),
            ),
            columns: { id: true, title: true, createdAt: true },
            orderBy: [desc(assessments.createdAt)],
            limit: 2,
          })
        : [];
    const prioritizedAssessments =
      weakAssessments.length > 0 ? weakAssessments : latestAssessments;

    prioritizedAssessments.forEach((assessment) => {
      payload.push({
        caseId,
        assignmentType: 'assessment_retry',
        assessmentId: assessment.id,
        checkpointLabel: `Retry: ${assessment.title}`,
        orderIndex: order++,
        xpAwarded: ASSESSMENT_XP,
      });
    });

    if (payload.length > 0) {
      await this.db.insert(interventionAssignments).values(payload);
    }
  }

  private async notifyInterventionPending(studentId: string, classId: string) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { teacherId: true, subjectName: true, subjectCode: true },
    });
    if (!cls) return;

    const notifications: Array<{
      userId: string;
      type: 'grade_updated';
      title: string;
      body: string;
    }> = [];
    if (cls.teacherId) {
      notifications.push({
        userId: cls.teacherId,
        type: 'grade_updated' as const,
        title: 'Student flagged for intervention',
        body: `A student is pending intervention approval in ${cls.subjectCode}.`,
      });
    }

    if (notifications.length > 0) {
      await this.notificationsService.createBulk(notifications);
    }
  }

  private async notifyInterventionActivated(studentId: string, classId: string) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { teacherId: true, subjectName: true, subjectCode: true },
    });
    if (!cls) return;

    const notifications = [
      {
        userId: studentId,
        type: 'grade_updated' as const,
        title: 'LXP unlocked',
        body: `Your intervention plan in ${cls.subjectName} (${cls.subjectCode}) is now active.`,
      },
    ];

    await this.notificationsService.createBulk(notifications);
  }

  async handlePerformanceStatusChanged(event: PerformanceStatusChangedEvent) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, event.classId),
      columns: { id: true, teacherId: true },
    });
    const auditActorId = cls?.teacherId ?? null;

    if (event.currentIsAtRisk) {
      const interventionCase = await this.getOrCreateCaseForStudent(
        event.studentId,
        event.classId,
        'performance_status_changed',
      );

      await this.ensureDefaultAssignments(
        interventionCase.id,
        event.classId,
        event.studentId,
      );
      await this.getOrCreateProgress(event.studentId, event.classId);
      await this.notifyInterventionPending(event.studentId, event.classId);

      if (auditActorId) {
        await this.auditService.log({
          actorId: auditActorId,
          action: 'lxp.intervention.pending_created',
          targetType: 'intervention_case',
          targetId: interventionCase.id,
          metadata: {
            classId: event.classId,
            studentId: event.studentId,
            triggerSource: 'performance_status_changed',
            previousIsAtRisk: event.previousIsAtRisk,
            currentIsAtRisk: event.currentIsAtRisk,
            blendedScore: event.blendedScore,
            thresholdApplied: event.thresholdApplied,
          },
        });
      }
      return;
    }

    const openCases = await this.db.query.interventionCases.findMany({
      where: and(
        eq(interventionCases.studentId, event.studentId),
        eq(interventionCases.classId, event.classId),
        inArray(interventionCases.status, ['pending', 'active']),
      ),
      columns: { id: true, note: true, status: true },
    });

    if (openCases.length === 0) {
      return;
    }

    const autoResolveNote = 'Auto-resolved because student is no longer at-risk.';

    for (const openCase of openCases) {
      const resolvedNote = this.appendInterventionNote(
        openCase.note,
        autoResolveNote,
      );
      await this.db
        .update(interventionCases)
        .set({
          status: 'completed',
          closedAt: new Date(),
          updatedAt: new Date(),
          note: resolvedNote,
        })
        .where(eq(interventionCases.id, openCase.id));

      if (auditActorId) {
        await this.auditService.log({
          actorId: auditActorId,
          action: 'lxp.intervention.auto_resolved',
          targetType: 'intervention_case',
          targetId: openCase.id,
          metadata: {
            classId: event.classId,
            studentId: event.studentId,
            previousCaseStatus: openCase.status,
            previousIsAtRisk: event.previousIsAtRisk,
            currentIsAtRisk: event.currentIsAtRisk,
            blendedScore: event.blendedScore,
            thresholdApplied: event.thresholdApplied,
            note: resolvedNote,
          },
        });
      }
    }
  }

  async getStudentEligibility(userId: string) {
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, userId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { classId: true },
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
                id: true,
                name: true,
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    const classIds = studentEnrollments
      .map((entry) => entry.classId)
      .filter((id): id is string => !!id);

    if (classIds.length === 0) {
      return { threshold: INTERVENTION_THRESHOLD, eligibleClasses: [] };
    }

    const snapshots = await this.db.query.performanceSnapshots.findMany({
      where: and(
        eq(performanceSnapshots.studentId, userId),
        inArray(performanceSnapshots.classId, classIds),
      ),
      columns: {
        classId: true,
        isAtRisk: true,
        blendedScore: true,
        thresholdApplied: true,
      },
    });

    const activeCases = await this.db.query.interventionCases.findMany({
      where: and(
        eq(interventionCases.studentId, userId),
        inArray(interventionCases.classId, classIds),
        eq(interventionCases.status, 'active'),
      ),
      columns: { classId: true, id: true, openedAt: true },
    });

    const snapshotByClass = new Map(snapshots.map((row) => [row.classId, row]));
    const caseByClass = new Map(activeCases.map((row) => [row.classId, row]));

    const eligibleClasses = studentEnrollments
      .map((entry) => {
        if (!entry.classId || !entry.class) return null;
        const snapshot = snapshotByClass.get(entry.classId);
        const activeCase = caseByClass.get(entry.classId);
        const eligible = Boolean(activeCase);
        if (!eligible) return null;

        return {
          classId: entry.classId,
          class: entry.class,
          interventionCaseId: activeCase?.id ?? null,
          isAtRisk: snapshot?.isAtRisk ?? true,
          blendedScore: this.toNumber(snapshot?.blendedScore),
          thresholdApplied:
            this.toNumber(snapshot?.thresholdApplied) ?? INTERVENTION_THRESHOLD,
          openedAt: activeCase?.openedAt ?? null,
        };
      })
      .filter(Boolean);

    return {
      threshold: INTERVENTION_THRESHOLD,
      eligibleClasses,
    };
  }

  async getStudentPlaylist(studentId: string, classId: string) {
    await this.assertStudentEnrollment(studentId, classId);

    let interventionCase = await this.db.query.interventionCases.findFirst({
      where: and(
        eq(interventionCases.studentId, studentId),
        eq(interventionCases.classId, classId),
        eq(interventionCases.status, 'active'),
      ),
      orderBy: [desc(interventionCases.createdAt)],
    });

    if (!interventionCase) {
      const pendingCase = await this.db.query.interventionCases.findFirst({
        where: and(
          eq(interventionCases.studentId, studentId),
          eq(interventionCases.classId, classId),
          eq(interventionCases.status, 'pending'),
        ),
        columns: { id: true },
      });
      if (pendingCase) {
        throw new ForbiddenException('LXP access is pending teacher approval.');
      }
      throw new ForbiddenException(
        'LXP is only available for active intervention students.',
      );
    }

    await this.ensureDefaultAssignments(interventionCase.id, classId, studentId);
    const progress = await this.getOrCreateProgress(studentId, classId);

    const assignments = await this.db.query.interventionAssignments.findMany({
      where: eq(interventionAssignments.caseId, interventionCase.id),
      with: {
        lesson: {
          columns: { id: true, title: true, description: true, order: true },
        },
        assessment: {
          columns: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
            dueDate: true,
            type: true,
          },
        },
      },
      orderBy: [asc(interventionAssignments.orderIndex)],
    });

    const total = assignments.length;
    const completed = assignments.filter((item) => item.isCompleted).length;

    return {
      interventionCase: {
        id: interventionCase.id,
        status: interventionCase.status,
        openedAt: interventionCase.openedAt,
        thresholdApplied:
          this.toNumber(interventionCase.thresholdApplied) ??
          INTERVENTION_THRESHOLD,
        triggerScore: this.toNumber(interventionCase.triggerScore),
      },
      progress: {
        xpTotal: progress.xpTotal,
        starsTotal: this.xpToStars(progress.xpTotal),
        streakDays: progress.streakDays,
        checkpointsCompleted: progress.checkpointsCompleted,
        completionPercent:
          total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      checkpoints: assignments.map((item) => ({
        id: item.id,
        type: item.assignmentType,
        label: item.checkpointLabel,
        order: item.orderIndex,
        isCompleted: item.isCompleted,
        completedAt: item.completedAt,
        xpAwarded: item.xpAwarded,
        lesson: item.lesson,
        assessment: item.assessment,
      })),
    };
  }

  async getStudentOverview(studentId: string, classId: string) {
    await this.assertStudentEnrollment(studentId, classId);

    let interventionCase = await this.db.query.interventionCases.findFirst({
      where: and(
        eq(interventionCases.studentId, studentId),
        eq(interventionCases.classId, classId),
        eq(interventionCases.status, 'active'),
      ),
      orderBy: [desc(interventionCases.createdAt)],
    });

    const selectedSnapshot = await this.db.query.performanceSnapshots.findFirst(
      {
        where: and(
          eq(performanceSnapshots.studentId, studentId),
          eq(performanceSnapshots.classId, classId),
        ),
        columns: {
          blendedScore: true,
          thresholdApplied: true,
          isAtRisk: true,
          lastComputedAt: true,
        },
      },
    );

    if (!interventionCase) {
      const pendingCase = await this.db.query.interventionCases.findFirst({
        where: and(
          eq(interventionCases.studentId, studentId),
          eq(interventionCases.classId, classId),
          eq(interventionCases.status, 'pending'),
        ),
        columns: { id: true },
      });
      if (pendingCase) {
        throw new ForbiddenException('LXP access is pending teacher approval.');
      }
      throw new ForbiddenException(
        'LXP is only available for active intervention students.',
      );
    }

    await this.ensureDefaultAssignments(interventionCase.id, classId, studentId);
    const progress = await this.getOrCreateProgress(studentId, classId);

    const [studentEnrollments, assignments] = await Promise.all([
      this.db.query.enrollments.findMany({
        where: and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.status, 'enrolled'),
        ),
        columns: { classId: true },
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
                  id: true,
                  name: true,
                  gradeLevel: true,
                },
              },
            },
          },
        },
      }),
      this.db.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, interventionCase.id),
        with: {
          lesson: {
            columns: { id: true, title: true, description: true, order: true },
          },
          assessment: {
            columns: {
              id: true,
              title: true,
              description: true,
              passingScore: true,
              dueDate: true,
              type: true,
            },
          },
        },
        orderBy: [asc(interventionAssignments.orderIndex)],
      }),
    ]);

    const classIds = studentEnrollments
      .map((entry) => entry.classId)
      .filter((value): value is string => Boolean(value));

    const snapshots =
      classIds.length > 0
        ? await this.db.query.performanceSnapshots.findMany({
            where: and(
              eq(performanceSnapshots.studentId, studentId),
              inArray(performanceSnapshots.classId, classIds),
            ),
            columns: {
              classId: true,
              blendedScore: true,
              thresholdApplied: true,
              isAtRisk: true,
              lastComputedAt: true,
            },
          })
        : [];

    const snapshotByClass = new Map(
      snapshots.map((row) => [row.classId, row] as const),
    );

    const selectedEnrollment =
      studentEnrollments.find((entry) => entry.classId === classId) ?? null;

    const masteryRows = studentEnrollments
      .map((entry) => {
        if (!entry.classId || !entry.class) return null;

        const snapshot = snapshotByClass.get(entry.classId);
        const masteryPercent = this.toNumber(snapshot?.blendedScore);
        const thresholdApplied =
          this.toNumber(snapshot?.thresholdApplied) ?? INTERVENTION_THRESHOLD;
        const status = snapshot?.isAtRisk
          ? 'needs_attention'
          : masteryPercent !== null && masteryPercent >= thresholdApplied
            ? 'on_track'
            : 'improving';

        return {
          classId: entry.classId,
          subjectName: entry.class.subjectName,
          subjectCode: entry.class.subjectCode,
          masteryPercent,
          thresholdApplied,
          status,
          isSelected: entry.classId === classId,
          lastComputedAt: snapshot?.lastComputedAt ?? null,
        };
      })
      .filter(
        (
          row,
        ): row is {
          classId: string;
          subjectName: string;
          subjectCode: string;
          masteryPercent: number | null;
          thresholdApplied: number;
          status: 'needs_attention' | 'on_track' | 'improving';
          isSelected: boolean;
          lastComputedAt: Date | null;
        } => Boolean(row),
      )
      .sort((a, b) => {
        if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
        const aScore = a.masteryPercent ?? Number.POSITIVE_INFINITY;
        const bScore = b.masteryPercent ?? Number.POSITIVE_INFINITY;
        return aScore - bScore;
      });

    const totalCheckpoints = assignments.length;
    const completedAssignments = assignments.filter(
      (item) => item.isCompleted,
    ).length;
    const completionPercent =
      totalCheckpoints > 0
        ? Math.round((completedAssignments / totalCheckpoints) * 100)
        : 0;

    const recommendedNext =
      assignments.find(
        (item) => !item.isCompleted && item.assignmentType === 'lesson_review',
      ) ??
      assignments.find(
        (item) =>
          !item.isCompleted && item.assignmentType === 'assessment_retry',
      ) ??
      assignments.find((item) => !item.isCompleted) ??
      null;

    const recommendedAction = recommendedNext
      ? {
          assignmentId: recommendedNext.id,
          type: recommendedNext.assignmentType,
          title:
            recommendedNext.lesson?.title ??
            recommendedNext.assessment?.title ??
            recommendedNext.checkpointLabel,
          subtitle:
            recommendedNext.assignmentType === 'lesson_review'
              ? 'Review this lesson checkpoint next.'
              : 'Retry this assessment checkpoint next.',
          xpAwarded: recommendedNext.xpAwarded,
          href: recommendedNext.lesson?.id
            ? `/dashboard/student/lessons/${recommendedNext.lesson.id}`
            : recommendedNext.assessment?.id
              ? `/dashboard/student/assessments/${recommendedNext.assessment.id}`
              : null,
        }
      : null;

    const upcomingAssessments = assignments
      .filter(
        (item) =>
          !item.isCompleted &&
          item.assignmentType === 'assessment_retry' &&
          item.assessment,
      )
      .sort((a, b) => {
        const aTime = a.assessment?.dueDate
          ? new Date(a.assessment.dueDate).getTime()
          : Number.POSITIVE_INFINITY;
        const bTime = b.assessment?.dueDate
          ? new Date(b.assessment.dueDate).getTime()
          : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      })
      .slice(0, 4)
      .map((item) => ({
        assignmentId: item.id,
        assessmentId: item.assessment!.id,
        title: item.assessment!.title,
        dueDate: item.assessment!.dueDate ?? null,
        type: item.assessment!.type,
        passingScore: item.assessment!.passingScore ?? null,
        xpAwarded: item.xpAwarded,
        href: `/dashboard/student/assessments/${item.assessment!.id}`,
      }));

    const recentActivity = [
      {
        id: `opened-${interventionCase.id}`,
        type: 'intervention_opened',
        title: 'LXP support unlocked',
        description: selectedEnrollment?.class
          ? `Recovery work opened for ${selectedEnrollment.class.subjectName}.`
          : 'Your intervention support track is now active.',
        occurredAt: interventionCase.openedAt,
      },
      ...assignments
        .filter((item) => item.isCompleted && item.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? 0).getTime() -
            new Date(a.completedAt ?? 0).getTime(),
        )
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          type: item.assignmentType,
          title: item.checkpointLabel,
          description:
            item.lesson?.description ??
            item.assessment?.description ??
            'Completed one guided LXP checkpoint.',
          occurredAt: item.completedAt,
        })),
    ]
      .filter((entry) => !!entry.occurredAt)
      .sort(
        (a, b) =>
          new Date(b.occurredAt ?? 0).getTime() -
          new Date(a.occurredAt ?? 0).getTime(),
      )
      .slice(0, 5);

    const weakFocusItems = [
      ...masteryRows
        .filter(
          (row) =>
            row.masteryPercent !== null &&
            row.masteryPercent < row.thresholdApplied,
        )
        .slice(0, 3)
        .map((row) => ({
          id: `class-${row.classId}`,
          source: 'performance',
          title: `Boost ${row.subjectName}`,
          subtitle: `Current blended score: ${row.masteryPercent}%`,
          masteryPercent: row.masteryPercent,
          href: `/dashboard/student/ja`,
        })),
      ...assignments
        .filter((item) => !item.isCompleted)
        .slice(0, 3)
        .map((item) => {
          const lessonSummary =
            item.lesson?.description?.trim() ||
            `Review ${item.lesson?.title ?? item.checkpointLabel} to strengthen this weak area.`;
          const dueDate = item.assessment?.dueDate
            ? new Date(item.assessment.dueDate).toISOString().slice(0, 10)
            : null;
          const assessmentSummary = item.assessment?.description?.trim()
            ? item.assessment.description.trim()
            : `Retry this checkpoint${
                item.assessment?.passingScore
                  ? ` and target ${item.assessment.passingScore}%.`
                  : '.'
              }`;
          const assessmentSubtitle = dueDate
            ? `${assessmentSummary} Due ${dueDate}.`
            : assessmentSummary;

          return {
            id: `checkpoint-${item.id}`,
            source: 'checkpoint',
            title: item.checkpointLabel,
            subtitle:
              item.assignmentType === 'lesson_review'
                ? lessonSummary
                : assessmentSubtitle,
            masteryPercent: null,
            href: item.lesson?.id
              ? `/dashboard/student/lessons/${item.lesson.id}`
              : item.assessment?.id
                ? `/dashboard/student/assessments/${item.assessment.id}`
                : '/dashboard/student/ja',
          };
        }),
    ].slice(0, 4);

    const selectedMastery =
      masteryRows.find((row) => row.classId === classId)?.masteryPercent ??
      null;
    const statusSummary = this.getStatusSummary({
      caseStatus: interventionCase.status,
      isAtRisk: selectedSnapshot?.isAtRisk ?? true,
      progressPercent: completionPercent,
      streakDays: progress.streakDays,
      masteryPercent: selectedMastery,
    });

    return {
      selectedClass: {
        classId,
        subjectName: selectedEnrollment?.class?.subjectName ?? 'Selected class',
        subjectCode: selectedEnrollment?.class?.subjectCode ?? 'LXP',
        section: selectedEnrollment?.class?.section ?? null,
        blendedScore: this.toNumber(selectedSnapshot?.blendedScore),
        thresholdApplied:
          this.toNumber(selectedSnapshot?.thresholdApplied) ??
          INTERVENTION_THRESHOLD,
        lastComputedAt: selectedSnapshot?.lastComputedAt ?? null,
      },
      interventionStatus: {
        caseId: interventionCase.id,
        status: interventionCase.status,
        openedAt: interventionCase.openedAt,
        closedAt: interventionCase.closedAt ?? null,
        triggerScore: this.toNumber(interventionCase.triggerScore),
        thresholdApplied:
          this.toNumber(interventionCase.thresholdApplied) ??
          INTERVENTION_THRESHOLD,
        ...statusSummary,
      },
      progress: {
        xpTotal: progress.xpTotal,
        starsTotal: this.xpToStars(progress.xpTotal),
        streakDays: progress.streakDays,
        checkpointsCompleted: progress.checkpointsCompleted,
        totalCheckpoints,
        completionPercent,
        lastActivityAt: progress.lastActivityAt ?? null,
      },
      subjectMastery: masteryRows,
      recommendedAction,
      upcomingAssessments,
      recentActivity,
      weakFocusItems,
    };
  }

  async completeCheckpoint(
    studentId: string,
    classId: string,
    assignmentId: string,
  ) {
    await this.assertStudentEnrollment(studentId, classId);

    const assignment = await this.db.query.interventionAssignments.findFirst({
      where: eq(interventionAssignments.id, assignmentId),
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
            status: true,
            note: true,
          },
        },
      },
    });
    if (!assignment || !assignment.interventionCase) {
      throw new NotFoundException('Checkpoint not found');
    }
    if (assignment.interventionCase.studentId !== studentId) {
      throw new ForbiddenException(
        'Checkpoint does not belong to current student',
      );
    }
    if (assignment.interventionCase.classId !== classId) {
      throw new BadRequestException('Checkpoint does not belong to this class');
    }
    if (assignment.interventionCase.status !== 'active') {
      throw new BadRequestException('Intervention case is no longer active');
    }
    if (assignment.assignmentType === 'assessment_retry') {
      throw new BadRequestException(
        'Assessment retry checkpoints are completed only after finishing the linked JA review session.',
      );
    }

    const autoCompletedNote = this.appendInterventionNote(
      assignment.interventionCase.note,
      'Auto-completed after finishing all LXP checkpoints.',
    );
    let interventionCompletedByStudent = false;

    await this.db.transaction(async (tx) => {
      if (!assignment.isCompleted) {
        await tx
          .update(interventionAssignments)
          .set({
            isCompleted: true,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(interventionAssignments.id, assignmentId));
      }

      const progress = await this.getOrCreateProgress(studentId, classId, tx);
      const now = new Date();
      const lastDate = progress.lastActivityAt
        ? new Date(progress.lastActivityAt)
        : null;
      const dayDiff = lastDate
        ? Math.floor((now.getTime() - lastDate.getTime()) / 86_400_000)
        : null;
      const streakDays =
        dayDiff === null
          ? 1
          : dayDiff === 0
            ? progress.streakDays
            : dayDiff === 1
              ? progress.streakDays + 1
              : 1;

      await tx
        .update(lxpProgress)
        .set({
          xpTotal: progress.xpTotal + assignment.xpAwarded,
          streakDays,
          checkpointsCompleted:
            progress.checkpointsCompleted + (assignment.isCompleted ? 0 : 1),
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(lxpProgress.studentId, studentId),
            eq(lxpProgress.classId, classId),
          ),
        );

      const allAssignments = await tx.query.interventionAssignments.findMany({
        where: eq(
          interventionAssignments.caseId,
          assignment.interventionCase.id,
        ),
        columns: { id: true, isCompleted: true },
      });
      if (
        allAssignments.length > 0 &&
        allAssignments.every((row) => row.isCompleted)
      ) {
        await tx
          .update(interventionCases)
          .set({
            status: 'completed',
            closedAt: now,
            updatedAt: now,
            note: autoCompletedNote,
          })
          .where(eq(interventionCases.id, assignment.interventionCase.id));
        interventionCompletedByStudent = true;
      }
    });

    await this.auditService.log({
      actorId: studentId,
      action: 'lxp.checkpoint.completed',
      targetType: 'intervention_assignment',
      targetId: assignmentId,
      metadata: {
        caseId: assignment.interventionCase.id,
        classId,
      },
    });

    if (interventionCompletedByStudent) {
      const cls = await this.db.query.classes.findFirst({
        where: eq(classes.id, classId),
        columns: { teacherId: true, subjectCode: true },
      });

      if (cls?.teacherId) {
        await this.notificationsService.createBulk([
          {
            userId: cls.teacherId,
            type: 'grade_updated',
            title: 'Intervention cycle completed',
            body: `A student has completed all LXP checkpoints in ${cls.subjectCode ?? 'this class'}.`,
          },
        ]);
      }

      await this.auditService.log({
        actorId: studentId,
        action: 'lxp.intervention.completed_by_student',
        targetType: 'intervention_case',
        targetId: assignment.interventionCase.id,
        metadata: {
          classId,
          studentId,
          note: autoCompletedNote,
        },
      });
    }

    return this.getStudentPlaylist(studentId, classId);
  }

  async completeAssessmentRetryFromJaReview(
    studentId: string,
    classId: string,
    assessmentId: string,
    jaSessionId: string,
  ) {
    await this.assertStudentEnrollment(studentId, classId);

    const candidates =
      await this.db.query.interventionAssignments.findMany({
      where: and(
        eq(interventionAssignments.assignmentType, 'assessment_retry'),
        eq(interventionAssignments.assessmentId, assessmentId),
      ),
      orderBy: [asc(interventionAssignments.orderIndex)],
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
            status: true,
            note: true,
          },
        },
      },
    });
    const assignment = candidates.find(
      (item) =>
        item.interventionCase?.studentId === studentId &&
        item.interventionCase?.classId === classId,
    );

    if (!assignment || !assignment.interventionCase) {
      return { completed: false, reason: 'checkpoint_not_found' as const };
    }
    if (assignment.interventionCase.status !== 'active') {
      return { completed: false, reason: 'case_inactive' as const };
    }
    if (assignment.isCompleted) {
      return { completed: false, reason: 'already_completed' as const };
    }

    const autoCompletedNote = this.appendInterventionNote(
      assignment.interventionCase.note,
      'Auto-completed after finishing all LXP checkpoints.',
    );
    let interventionCompletedByStudent = false;

    await this.db.transaction(async (tx) => {
      await tx
        .update(interventionAssignments)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(interventionAssignments.id, assignment.id));

      const progress = await this.getOrCreateProgress(studentId, classId, tx);
      const now = new Date();
      const lastDate = progress.lastActivityAt
        ? new Date(progress.lastActivityAt)
        : null;
      const dayDiff = lastDate
        ? Math.floor((now.getTime() - lastDate.getTime()) / 86_400_000)
        : null;
      const streakDays =
        dayDiff === null
          ? 1
          : dayDiff === 0
            ? progress.streakDays
            : dayDiff === 1
              ? progress.streakDays + 1
              : 1;

      await tx
        .update(lxpProgress)
        .set({
          xpTotal: progress.xpTotal + assignment.xpAwarded,
          streakDays,
          checkpointsCompleted: progress.checkpointsCompleted + 1,
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(lxpProgress.studentId, studentId),
            eq(lxpProgress.classId, classId),
          ),
        );

      const allAssignments = await tx.query.interventionAssignments.findMany({
        where: eq(
          interventionAssignments.caseId,
          assignment.interventionCase.id,
        ),
        columns: { id: true, isCompleted: true },
      });
      if (
        allAssignments.length > 0 &&
        allAssignments.every((row) => row.isCompleted)
      ) {
        await tx
          .update(interventionCases)
          .set({
            status: 'completed',
            closedAt: now,
            updatedAt: now,
            note: autoCompletedNote,
          })
          .where(eq(interventionCases.id, assignment.interventionCase.id));
        interventionCompletedByStudent = true;
      }
    });

    await this.auditService.log({
      actorId: studentId,
      action: 'lxp.checkpoint.completed',
      targetType: 'intervention_assignment',
      targetId: assignment.id,
      metadata: {
        caseId: assignment.interventionCase.id,
        classId,
        source: 'ja_review',
        jaSessionId,
      },
    });

    if (interventionCompletedByStudent) {
      const cls = await this.db.query.classes.findFirst({
        where: eq(classes.id, classId),
        columns: { teacherId: true, subjectCode: true },
      });

      if (cls?.teacherId) {
        await this.notificationsService.createBulk([
          {
            userId: cls.teacherId,
            type: 'grade_updated',
            title: 'Intervention cycle completed',
            body: `A student has completed all LXP checkpoints in ${cls.subjectCode ?? 'this class'}.`,
          },
        ]);
      }

      await this.auditService.log({
        actorId: studentId,
        action: 'lxp.intervention.completed_by_student',
        targetType: 'intervention_case',
        targetId: assignment.interventionCase.id,
        metadata: {
          classId,
          studentId,
          note: autoCompletedNote,
          source: 'ja_review',
          jaSessionId,
        },
      });
    }

    return {
      completed: true,
      assignmentId: assignment.id,
      caseId: assignment.interventionCase.id,
      interventionCompletedByStudent,
    };
  }

  async getTeacherQueue(classId: string, user: UserContext) {
    await this.assertTeacherClassAccess(classId, user);

    const cases = await this.db.query.interventionCases.findMany({
      where: and(
        eq(interventionCases.classId, classId),
        inArray(interventionCases.status, ['pending', 'active']),
      ),
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
      orderBy: [desc(interventionCases.openedAt)],
    });

    const caseIds = cases.map((row) => row.id);
    const studentIds = [...new Set(cases.map((row) => row.studentId))];

    const [assignmentRows, progressRows, snapshotRows] = await Promise.all([
      caseIds.length > 0
        ? this.db.query.interventionAssignments.findMany({
            where: inArray(interventionAssignments.caseId, caseIds),
            columns: { id: true, caseId: true, isCompleted: true },
          })
        : Promise.resolve([]),
      studentIds.length > 0
        ? this.db.query.lxpProgress.findMany({
            where: and(
              eq(lxpProgress.classId, classId),
              inArray(lxpProgress.studentId, studentIds),
            ),
            columns: {
              studentId: true,
              xpTotal: true,
              streakDays: true,
              checkpointsCompleted: true,
              lastActivityAt: true,
            },
          })
        : Promise.resolve([]),
      studentIds.length > 0
        ? this.db.query.performanceSnapshots.findMany({
            where: and(
              eq(performanceSnapshots.classId, classId),
              inArray(performanceSnapshots.studentId, studentIds),
            ),
            columns: {
              studentId: true,
              isAtRisk: true,
              blendedScore: true,
              thresholdApplied: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const assignmentsByCaseId = new Map<string, typeof assignmentRows>();
    for (const row of assignmentRows) {
      const items = assignmentsByCaseId.get(row.caseId) ?? [];
      items.push(row);
      assignmentsByCaseId.set(row.caseId, items);
    }

    const progressByStudentId = new Map<string, (typeof progressRows)[number]>(
      progressRows.map((row) => [row.studentId, row] as const),
    );
    const snapshotByStudentId = new Map<
      string,
      (typeof snapshotRows)[number]
    >(snapshotRows.map((row) => [row.studentId, row] as const));

    const queue = cases.map((row) => {
      const assignments = assignmentsByCaseId.get(row.id) ?? [];
      const progress = progressByStudentId.get(row.studentId);
      const snapshot = snapshotByStudentId.get(row.studentId);
      const isCurrentlyAtRisk = Boolean(snapshot?.isAtRisk);
      const latestBlendedScore = this.toNumber(snapshot?.blendedScore);
      const latestThreshold =
        this.toNumber(snapshot?.thresholdApplied) ??
        this.toNumber(row.thresholdApplied) ??
        INTERVENTION_THRESHOLD;

      const totalCheckpoints = assignments.length;
      const completed = assignments.filter((item) => item.isCompleted).length;

      return {
        id: row.id,
        studentId: row.studentId,
        student: row.student,
        openedAt: row.openedAt,
        status: row.status,
        classId: row.classId,
        triggerScore: this.toNumber(row.triggerScore),
        thresholdApplied:
          this.toNumber(row.thresholdApplied) ?? INTERVENTION_THRESHOLD,
        isCurrentlyAtRisk,
        latestBlendedScore,
        latestThreshold,
        aiPlanEligible: isCurrentlyAtRisk,
        totalCheckpoints,
        completedCheckpoints: completed,
        completionPercent:
          totalCheckpoints > 0
            ? Math.round((completed / totalCheckpoints) * 100)
            : 0,
        progress: progress
          ? {
              ...progress,
              starsTotal: this.xpToStars(progress.xpTotal),
            }
          : {
              xpTotal: 0,
              starsTotal: 0,
              streakDays: 0,
              checkpointsCompleted: 0,
              lastActivityAt: null,
            },
      };
    });

    return {
      classId,
      threshold: INTERVENTION_THRESHOLD,
      count: queue.length,
      queue,
    };
  }

  async assignIntervention(
    caseId: string,
    dto: AssignInterventionDto,
    user: UserContext,
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
        note: true,
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);
    if (
      interventionCase.status !== 'active' &&
      interventionCase.status !== 'pending'
    ) {
      throw new BadRequestException(
        'Only pending or active intervention cases can be assigned.',
      );
    }

    const lessonAssignments: Array<{
      lessonId: string;
      xpAwarded: number;
      label?: string;
    }> =
      dto.lessonAssignments && dto.lessonAssignments.length > 0
        ? dto.lessonAssignments
        : [...new Set(dto.lessonIds ?? [])].map((lessonId) => ({
            lessonId,
            xpAwarded: LESSON_XP,
          }));
    const assessmentAssignments: Array<{
      assessmentId: string;
      xpAwarded: number;
      label?: string;
    }> =
      dto.assessmentAssignments && dto.assessmentAssignments.length > 0
        ? dto.assessmentAssignments
        : [...new Set(dto.assessmentIds ?? [])].map((assessmentId) => ({
            assessmentId,
            xpAwarded: ASSESSMENT_XP,
          }));

    const lessonIds = [
      ...new Set(lessonAssignments.map((entry) => entry.lessonId)),
    ];
    const assessmentIds = [
      ...new Set(assessmentAssignments.map((entry) => entry.assessmentId)),
    ];

    if (lessonIds.length === 0 && assessmentIds.length === 0) {
      throw new BadRequestException(
        'Provide at least one lesson or assessment.',
      );
    }

    if (lessonIds.length > 0) {
      const lessonRows = await this.db.query.lessons.findMany({
        where: and(
          eq(lessons.classId, interventionCase.classId),
          inArray(lessons.id, lessonIds),
        ),
        columns: { id: true },
      });
      if (lessonRows.length !== lessonIds.length) {
        throw new BadRequestException(
          'Some lessons do not belong to this class.',
        );
      }
    }

    if (assessmentIds.length > 0) {
      const assessmentRows = await this.db.query.assessments.findMany({
        where: and(
          eq(assessments.classId, interventionCase.classId),
          inArray(assessments.id, assessmentIds),
        ),
        columns: { id: true },
      });
      if (assessmentRows.length !== assessmentIds.length) {
        throw new BadRequestException(
          'Some assessments do not belong to this class.',
        );
      }
    }

    const existingAssignments =
      await this.db.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, interventionCase.id),
        columns: { id: true, isCompleted: true },
      });
    if (existingAssignments.some((assignment) => assignment.isCompleted)) {
      throw new BadRequestException(
        'Cannot replace intervention assignments after checkpoint progress has started.',
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(interventionAssignments)
        .where(eq(interventionAssignments.caseId, interventionCase.id));

      const assignmentPayload: (typeof interventionAssignments.$inferInsert)[] =
        [];
      let order = 1;
      lessonAssignments.forEach((lessonEntry) => {
        assignmentPayload.push({
          caseId: interventionCase.id,
          assignmentType: 'lesson_review',
          lessonId: lessonEntry.lessonId,
          checkpointLabel:
            lessonEntry.label?.trim() || 'Teacher-assigned lesson review',
          orderIndex: order++,
          xpAwarded: lessonEntry.xpAwarded,
        });
      });
      assessmentAssignments.forEach((assessmentEntry) => {
        assignmentPayload.push({
          caseId: interventionCase.id,
          assignmentType: 'assessment_retry',
          assessmentId: assessmentEntry.assessmentId,
          checkpointLabel:
            assessmentEntry.label?.trim() ||
            'Teacher-assigned assessment retry',
          orderIndex: order++,
          xpAwarded: assessmentEntry.xpAwarded,
        });
      });

      if (assignmentPayload.length > 0) {
        await tx.insert(interventionAssignments).values(assignmentPayload);
      }

      await tx
        .update(interventionCases)
        .set({
          note: this.appendInterventionNote(interventionCase.note, dto.note),
          updatedAt: new Date(),
        })
        .where(eq(interventionCases.id, interventionCase.id));
    });

    await this.notificationsService.createBulk([
      {
        userId: interventionCase.studentId,
        type: 'grade_updated',
        title: 'New intervention checklist assigned',
        body: 'Your teacher updated your LXP intervention tasks. Open LXP to continue.',
      },
    ]);

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.approved',
      targetType: 'intervention_case',
      targetId: interventionCase.id,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        approvalSource: 'teacher_assignment',
        previousAssignmentsCount: existingAssignments.length,
        hasTeacherNote: Boolean(dto.note?.trim()),
      },
    });

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.assigned',
      targetType: 'intervention_case',
      targetId: interventionCase.id,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        previousAssignmentsCount: existingAssignments.length,
        lessonAssignments,
        assessmentAssignments,
      },
    });

    return this.getTeacherQueue(interventionCase.classId, user);
  }

  async resolveIntervention(
    caseId: string,
    dto: ResolveInterventionDto,
    user: UserContext,
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
        note: true,
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);
    if (interventionCase.status !== 'active') {
      throw new BadRequestException('Intervention case is already closed.');
    }

    const resolvedNote = this.appendInterventionNote(
      interventionCase.note,
      dto.note ?? 'Resolved by teacher.',
    );
    await this.db
      .update(interventionCases)
      .set({
        status: 'completed',
        closedAt: new Date(),
        note: resolvedNote,
        updatedAt: new Date(),
      })
      .where(eq(interventionCases.id, caseId));

    await this.notificationsService.createBulk([
      {
        userId: interventionCase.studentId,
        type: 'grade_updated',
        title: 'Intervention case resolved',
        body: 'Your teacher marked your current intervention cycle as resolved.',
      },
    ]);

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.resolved',
      targetType: 'intervention_case',
      targetId: interventionCase.id,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        note: resolvedNote,
      },
    });

    return this.getTeacherQueue(interventionCase.classId, user);
  }

  async activateIntervention(caseId: string, user: UserContext) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);

    if (interventionCase.status !== 'pending') {
      throw new BadRequestException(
        'Only pending intervention cases can be activated.',
      );
    }

    await this.db
      .update(interventionCases)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(interventionCases.id, caseId));

    await this.getOrCreateProgress(
      interventionCase.studentId,
      interventionCase.classId,
    );
    await this.notifyInterventionActivated(
      interventionCase.studentId,
      interventionCase.classId,
    );

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.approved',
      targetType: 'intervention_case',
      targetId: interventionCase.id,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        previousStatus: 'pending',
        currentStatus: 'active',
      },
    });

    return this.getTeacherQueue(interventionCase.classId, user);
  }

  async getTeacherInterventionCase(caseId: string, user: UserContext) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
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
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);

    const assignmentRows = await this.db.query.interventionAssignments.findMany({
      where: eq(interventionAssignments.caseId, interventionCase.id),
      columns: { id: true, caseId: true, isCompleted: true },
    });
    const progress = await this.db.query.lxpProgress.findFirst({
      where: and(
        eq(lxpProgress.classId, interventionCase.classId),
        eq(lxpProgress.studentId, interventionCase.studentId),
      ),
      columns: {
        xpTotal: true,
        streakDays: true,
        checkpointsCompleted: true,
        lastActivityAt: true,
      },
    });
    const totalCheckpoints = assignmentRows.length;
    const completedCheckpoints = assignmentRows.filter(
      (row) => row.isCompleted,
    ).length;

    return {
      id: interventionCase.id,
      classId: interventionCase.classId,
      studentId: interventionCase.studentId,
      student: interventionCase.student,
      status: interventionCase.status,
      openedAt: interventionCase.openedAt,
      triggerScore: this.toNumber(interventionCase.triggerScore),
      thresholdApplied:
        this.toNumber(interventionCase.thresholdApplied) ??
        INTERVENTION_THRESHOLD,
      totalCheckpoints,
      completedCheckpoints,
      completionPercent:
        totalCheckpoints > 0
          ? Math.round((completedCheckpoints / totalCheckpoints) * 100)
          : 0,
      progress: progress
        ? {
            ...progress,
            starsTotal: this.xpToStars(progress.xpTotal),
          }
        : {
            xpTotal: 0,
            starsTotal: 0,
            streakDays: 0,
            checkpointsCompleted: 0,
            lastActivityAt: null,
          },
    };
  }

  async getClassReport(classId: string, user: UserContext) {
    await this.assertTeacherClassAccess(classId, user);

    const cases = await this.db.query.interventionCases.findMany({
      where: eq(interventionCases.classId, classId),
      columns: {
        id: true,
        studentId: true,
        status: true,
        triggerScore: true,
        openedAt: true,
        closedAt: true,
      },
      with: {
        student: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [desc(interventionCases.openedAt)],
    });

    const snapshots = await this.db.query.performanceSnapshots.findMany({
      where: eq(performanceSnapshots.classId, classId),
      columns: { studentId: true, blendedScore: true },
    });
    const snapshotMap = new Map(
      snapshots.map((row) => [row.studentId, this.toNumber(row.blendedScore)]),
    );
    const progressRows = await this.db.query.lxpProgress.findMany({
      where: eq(lxpProgress.classId, classId),
      columns: {
        studentId: true,
        xpTotal: true,
        streakDays: true,
        checkpointsCompleted: true,
        lastActivityAt: true,
      },
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
      orderBy: [desc(lxpProgress.xpTotal), desc(lxpProgress.updatedAt)],
    });

    const withDelta = cases.map((entry) => {
      const baseline = this.toNumber(entry.triggerScore);
      const current = snapshotMap.get(entry.studentId) ?? null;
      const delta =
        baseline !== null && current !== null
          ? Math.round((current - baseline) * 100) / 100
          : null;
      return {
        ...entry,
        triggerScore: baseline,
        currentBlendedScore: current,
        improvementDelta: delta,
      };
    });

    const distinctStudents = new Set(withDelta.map((entry) => entry.studentId))
      .size;
    const completed = withDelta.filter(
      (entry) => entry.status === 'completed',
    ).length;
    const pending = withDelta.filter((entry) => entry.status === 'pending').length;
    const active = withDelta.filter(
      (entry) => entry.status === 'active',
    ).length;
    const deltas = withDelta
      .map((entry) => entry.improvementDelta)
      .filter((value): value is number => value !== null);

    return {
      classId,
      threshold: INTERVENTION_THRESHOLD,
      summary: {
        totalCases: withDelta.length,
        pendingCases: pending,
        activeCases: active,
        completedCases: completed,
        interventionParticipation: distinctStudents,
        averageDelta:
          deltas.length > 0
            ? Math.round(
                (deltas.reduce((sum, item) => sum + item, 0) / deltas.length) *
                  100,
              ) / 100
            : null,
      },
      rows: withDelta,
      leaderboard: progressRows.map((row, index) => ({
        rank: index + 1,
        studentId: row.studentId,
        xpTotal: row.xpTotal,
        starsTotal: this.xpToStars(row.xpTotal),
        streakDays: row.streakDays,
        checkpointsCompleted: row.checkpointsCompleted,
        lastActivityAt: row.lastActivityAt,
        student: row.student,
      })),
    };
  }

  async submitSystemEvaluation(
    user: UserContext,
    dto: SubmitSystemEvaluationDto,
  ) {
    const [created] = await this.db
      .insert(systemEvaluations)
      .values({
        submittedBy: user.userId,
        targetModule: dto.targetModule,
        usabilityScore: dto.usabilityScore,
        functionalityScore: dto.functionalityScore,
        performanceScore: dto.performanceScore,
        satisfactionScore: dto.satisfactionScore,
        feedback: dto.feedback ?? null,
      })
      .returning();

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.system_evaluation.submitted',
      targetType: 'system_evaluation',
      targetId: created.id,
      metadata: {
        targetModule: dto.targetModule,
        usabilityScore: dto.usabilityScore,
        functionalityScore: dto.functionalityScore,
        performanceScore: dto.performanceScore,
        satisfactionScore: dto.satisfactionScore,
        hasFeedback: Boolean(dto.feedback?.trim()),
      },
    });

    return created;
  }

  async listSystemEvaluations(user: UserContext, targetModule?: string) {
    if (!this.isAdmin(user.roles) && !user.roles.includes('teacher')) {
      throw new ForbiddenException(
        'Only teachers and admins can view evaluation results.',
      );
    }

    let targetFilter: SystemEvaluationTarget | undefined;
    if (targetModule !== undefined) {
      if (
        !systemEvaluationTargetEnum.enumValues.includes(
          targetModule as SystemEvaluationTarget,
        )
      ) {
        throw new BadRequestException(
          `targetModule must be one of: ${systemEvaluationTargetEnum.enumValues.join(', ')}`,
        );
      }
      targetFilter = targetModule as SystemEvaluationTarget;
    }

    const rows = await this.db.query.systemEvaluations.findMany({
      where: targetFilter
        ? eq(systemEvaluations.targetModule, targetFilter)
        : undefined,
      with: {
        submitter: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [desc(systemEvaluations.createdAt)],
      limit: 200,
    });

    const roundToHundredths = (value: number) =>
      Math.round(value * 100) / 100;
    const averageFrom = (total: number, count: number) =>
      count > 0 ? roundToHundredths(total / count) : 0;

    const totals = {
      usabilityScore: 0,
      functionalityScore: 0,
      performanceScore: 0,
      satisfactionScore: 0,
      feedbackCount: 0,
    };
    const moduleBuckets = new Map<
      SystemEvaluationTarget,
      {
        count: number;
        usabilityScore: number;
        functionalityScore: number;
        performanceScore: number;
        satisfactionScore: number;
      }
    >();

    for (const row of rows) {
      const usabilityScore = this.toNumber(row.usabilityScore) ?? 0;
      const functionalityScore = this.toNumber(row.functionalityScore) ?? 0;
      const performanceScore = this.toNumber(row.performanceScore) ?? 0;
      const satisfactionScore = this.toNumber(row.satisfactionScore) ?? 0;

      totals.usabilityScore += usabilityScore;
      totals.functionalityScore += functionalityScore;
      totals.performanceScore += performanceScore;
      totals.satisfactionScore += satisfactionScore;
      if (row.feedback?.trim()) {
        totals.feedbackCount += 1;
      }

      const bucket = moduleBuckets.get(row.targetModule) ?? {
        count: 0,
        usabilityScore: 0,
        functionalityScore: 0,
        performanceScore: 0,
        satisfactionScore: 0,
      };
      bucket.count += 1;
      bucket.usabilityScore += usabilityScore;
      bucket.functionalityScore += functionalityScore;
      bucket.performanceScore += performanceScore;
      bucket.satisfactionScore += satisfactionScore;
      moduleBuckets.set(row.targetModule, bucket);
    }

    return {
      count: rows.length,
      rows,
      summary: {
        averages: {
          usabilityScore: averageFrom(totals.usabilityScore, rows.length),
          functionalityScore: averageFrom(
            totals.functionalityScore,
            rows.length,
          ),
          performanceScore: averageFrom(totals.performanceScore, rows.length),
          satisfactionScore: averageFrom(
            totals.satisfactionScore,
            rows.length,
          ),
        },
        feedbackCount: totals.feedbackCount,
        moduleBreakdown: Array.from(moduleBuckets.entries()).map(
          ([moduleName, bucket]) => ({
            targetModule: moduleName,
            count: bucket.count,
            averages: {
              usabilityScore: averageFrom(
                bucket.usabilityScore,
                bucket.count,
              ),
              functionalityScore: averageFrom(
                bucket.functionalityScore,
                bucket.count,
              ),
              performanceScore: averageFrom(
                bucket.performanceScore,
                bucket.count,
              ),
              satisfactionScore: averageFrom(
                bucket.satisfactionScore,
                bucket.count,
              ),
            },
          }),
        ),
      },
    };
  }
}
