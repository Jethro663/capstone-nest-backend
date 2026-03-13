import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  assessments,
  classes,
  enrollments,
  interventionAssignments,
  interventionCases,
  lessons,
  lxpProgress,
  performanceSnapshots,
  systemEvaluations,
  users,
} from '../../drizzle/schema';
import { PerformanceStatusChangedEvent } from '../../common/events';
import {
  AssignInterventionDto,
  ResolveInterventionDto,
  SubmitSystemEvaluationDto,
} from './dto/lxp.dto';

const INTERVENTION_THRESHOLD = 74;
const LESSON_XP = 20;
const ASSESSMENT_XP = 30;

type UserContext = {
  userId: string;
  roles: string[];
};

@Injectable()
export class LxpService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
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

  private async getOrCreateProgress(studentId: string, classId: string) {
    const existing = await this.db.query.lxpProgress.findFirst({
      where: and(
        eq(lxpProgress.studentId, studentId),
        eq(lxpProgress.classId, classId),
      ),
    });

    if (existing) return existing;

    const [created] = await this.db
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
        eq(interventionCases.status, 'active'),
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
        status: 'active',
        triggerSource,
        triggerScore: snapshot?.blendedScore ?? null,
        thresholdApplied:
          snapshot?.thresholdApplied?.toString() ??
          INTERVENTION_THRESHOLD.toString(),
      })
      .returning();

    return created;
  }

  private async ensureDefaultAssignments(caseId: string, classId: string) {
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

    latestAssessments.forEach((assessment) => {
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

  private async notifyInterventionOpened(studentId: string, classId: string) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { teacherId: true, subjectName: true, subjectCode: true },
    });
    if (!cls) return;

    await this.notificationsService.createBulk([
      {
        userId: studentId,
        type: 'grade_updated',
        title: 'LXP unlocked',
        body: `You are now enrolled in intervention for ${cls.subjectName} (${cls.subjectCode}).`,
      },
      {
        userId: cls.teacherId,
        type: 'grade_updated',
        title: 'Student flagged for intervention',
        body: `A student has been auto-flagged for LXP support in ${cls.subjectCode}.`,
      },
    ]);
  }

  async handlePerformanceStatusChanged(event: PerformanceStatusChangedEvent) {
    if (event.currentIsAtRisk) {
      const interventionCase = await this.getOrCreateCaseForStudent(
        event.studentId,
        event.classId,
        'performance_status_changed',
      );

      await this.ensureDefaultAssignments(interventionCase.id, event.classId);
      await this.getOrCreateProgress(event.studentId, event.classId);
      await this.notifyInterventionOpened(event.studentId, event.classId);
      return;
    }

    await this.db
      .update(interventionCases)
      .set({
        status: 'completed',
        closedAt: new Date(),
        updatedAt: new Date(),
        note: 'Auto-resolved because student is no longer at-risk.',
      })
      .where(
        and(
          eq(interventionCases.studentId, event.studentId),
          eq(interventionCases.classId, event.classId),
          eq(interventionCases.status, 'active'),
        ),
      );
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
        const eligible = !!(snapshot?.isAtRisk || activeCase);
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
      const snapshot = await this.db.query.performanceSnapshots.findFirst({
        where: and(
          eq(performanceSnapshots.studentId, studentId),
          eq(performanceSnapshots.classId, classId),
        ),
        columns: { isAtRisk: true },
      });
      if (!snapshot?.isAtRisk) {
        throw new ForbiddenException(
          'LXP is only available for active intervention students.',
        );
      }

      interventionCase = await this.getOrCreateCaseForStudent(
        studentId,
        classId,
        'student_lxp_open',
      );
    }

    await this.ensureDefaultAssignments(interventionCase.id, classId);
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
          columns: { id: true, studentId: true, classId: true, status: true },
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

    if (!assignment.isCompleted) {
      await this.db
        .update(interventionAssignments)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(interventionAssignments.id, assignmentId));
    }

    const progress = await this.getOrCreateProgress(studentId, classId);
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

    await this.db
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

    const allAssignments = await this.db.query.interventionAssignments.findMany(
      {
        where: eq(
          interventionAssignments.caseId,
          assignment.interventionCase.id,
        ),
        columns: { id: true, isCompleted: true },
      },
    );
    if (
      allAssignments.length > 0 &&
      allAssignments.every((row) => row.isCompleted)
    ) {
      await this.db
        .update(interventionCases)
        .set({
          status: 'completed',
          closedAt: now,
          updatedAt: now,
          note: 'Auto-completed after finishing all LXP checkpoints.',
        })
        .where(eq(interventionCases.id, assignment.interventionCase.id));
    }

    return this.getStudentPlaylist(studentId, classId);
  }

  async getTeacherQueue(classId: string, user: UserContext) {
    await this.assertTeacherClassAccess(classId, user);

    const cases = await this.db.query.interventionCases.findMany({
      where: and(
        eq(interventionCases.classId, classId),
        eq(interventionCases.status, 'active'),
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

    const queue = await Promise.all(
      cases.map(async (row) => {
        const assignments =
          await this.db.query.interventionAssignments.findMany({
            where: eq(interventionAssignments.caseId, row.id),
            columns: { id: true, isCompleted: true },
          });

        const progress = await this.db.query.lxpProgress.findFirst({
          where: and(
            eq(lxpProgress.studentId, row.studentId),
            eq(lxpProgress.classId, row.classId),
          ),
          columns: {
            xpTotal: true,
            streakDays: true,
            checkpointsCompleted: true,
            lastActivityAt: true,
          },
        });

        const totalCheckpoints = assignments.length;
        const completed = assignments.filter((item) => item.isCompleted).length;

        return {
          id: row.id,
          studentId: row.studentId,
          student: row.student,
          openedAt: row.openedAt,
          triggerScore: this.toNumber(row.triggerScore),
          thresholdApplied:
            this.toNumber(row.thresholdApplied) ?? INTERVENTION_THRESHOLD,
          totalCheckpoints,
          completedCheckpoints: completed,
          completionPercent:
            totalCheckpoints > 0
              ? Math.round((completed / totalCheckpoints) * 100)
              : 0,
          progress: progress ?? {
            xpTotal: 0,
            streakDays: 0,
            checkpointsCompleted: 0,
            lastActivityAt: null,
          },
        };
      }),
    );

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
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);
    if (interventionCase.status !== 'active') {
      throw new BadRequestException(
        'Only active intervention cases can be assigned.',
      );
    }

    const lessonIds = [...new Set(dto.lessonIds ?? [])];
    const assessmentIds = [...new Set(dto.assessmentIds ?? [])];

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

    await this.db
      .delete(interventionAssignments)
      .where(eq(interventionAssignments.caseId, interventionCase.id));

    const assignmentPayload: (typeof interventionAssignments.$inferInsert)[] =
      [];
    let order = 1;
    lessonIds.forEach((lessonId) => {
      assignmentPayload.push({
        caseId: interventionCase.id,
        assignmentType: 'lesson_review',
        lessonId,
        checkpointLabel: 'Teacher-assigned lesson review',
        orderIndex: order++,
        xpAwarded: LESSON_XP,
      });
    });
    assessmentIds.forEach((assessmentId) => {
      assignmentPayload.push({
        caseId: interventionCase.id,
        assignmentType: 'assessment_retry',
        assessmentId,
        checkpointLabel: 'Teacher-assigned assessment retry',
        orderIndex: order++,
        xpAwarded: ASSESSMENT_XP,
      });
    });

    if (assignmentPayload.length > 0) {
      await this.db.insert(interventionAssignments).values(assignmentPayload);
    }

    await this.db
      .update(interventionCases)
      .set({ note: dto.note ?? null, updatedAt: new Date() })
      .where(eq(interventionCases.id, interventionCase.id));

    await this.notificationsService.createBulk([
      {
        userId: interventionCase.studentId,
        type: 'grade_updated',
        title: 'New intervention checklist assigned',
        body: 'Your teacher updated your LXP intervention tasks. Open LXP to continue.',
      },
    ]);

    return this.getTeacherQueue(interventionCase.classId, user);
  }

  async resolveIntervention(
    caseId: string,
    dto: ResolveInterventionDto,
    user: UserContext,
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: { id: true, classId: true, studentId: true, status: true },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);
    if (interventionCase.status !== 'active') {
      throw new BadRequestException('Intervention case is already closed.');
    }

    await this.db
      .update(interventionCases)
      .set({
        status: 'completed',
        closedAt: new Date(),
        note: dto.note ?? 'Resolved by teacher.',
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

    return this.getTeacherQueue(interventionCase.classId, user);
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

    return created;
  }

  async listSystemEvaluations(user: UserContext, targetModule?: string) {
    if (!this.isAdmin(user.roles) && !user.roles.includes('teacher')) {
      throw new ForbiddenException(
        'Only teachers and admins can view evaluation results.',
      );
    }

    const rows = await this.db.query.systemEvaluations.findMany({
      where: targetModule
        ? eq(systemEvaluations.targetModule, targetModule as any)
        : undefined,
      with: {
        submitter: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [desc(systemEvaluations.createdAt)],
      limit: 200,
    });

    return {
      count: rows.length,
      rows,
    };
  }
}
