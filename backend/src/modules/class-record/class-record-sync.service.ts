import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { and, desc, eq } from 'drizzle-orm';
import { AcademicMutation } from '../../database/academic-transaction';
import { DatabaseService } from '../../database/database.service';
import {
  classRecordParticipants,
  classRecordItems,
  classRecordScores,
  assessments,
  assessmentAttempts,
  classes,
} from '../../drizzle/schema';
import {
  AssessmentSubmittedEvent,
  ClassRecordScoresUpdatedEvent,
} from '../../common/events';
import { AuditService } from '../audit/audit.service';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import { buildAcademicScoreContract } from '../academic-state/academic-score';

@Injectable()
export class ClassRecordSyncService {
  private readonly logger = new Logger(ClassRecordSyncService.name);
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly policyService: AcademicPolicyService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }

  @AcademicMutation()
  async syncFromAssessment(
    classRecordItemId: string,
    userId: string,
    roles: string[] = [],
    triggerSource: 'manual_sync' | 'assessment_sync' = 'manual_sync',
  ): Promise<{ synced: number }> {
    const item = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.id, classRecordItemId),
      with: { classRecord: true },
    });
    if (!item) throw new NotFoundException('Class record item not found');
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, item.classRecord.classId),
      columns: { teacherId: true },
    });
    if (!roles.includes('admin') && cls?.teacherId !== userId)
      throw new ForbiddenException('Access denied');
    if (item.classRecord.status !== 'draft')
      throw new BadRequestException(
        'Scores can only be synchronized into a draft class record',
      );
    if (!item.assessmentId)
      throw new BadRequestException('This item is not linked to an assessment');
    await this.policyService.assertAssessmentAction(
      {
        classId: item.classRecord.classId,
        quarter: item.classRecord.gradingPeriod,
      },
      'grade',
    );
    const studentIds = await this.syncItem(item);
    if (studentIds.length) {
      await this.auditService.log({
        actorId: userId,
        action: 'class_record.scores.synced_assessment',
        targetType: 'class_record_item',
        targetId: item.id,
        metadata: {
          classRecordId: item.classRecord.id,
          assessmentId: item.assessmentId,
          studentIds,
        },
      });
      await this.databaseService.afterAcademicCommit(() => {
        this.eventEmitter.emit(
          ClassRecordScoresUpdatedEvent.eventName,
          new ClassRecordScoresUpdatedEvent({
            classId: item.classRecord.classId,
            studentIds,
            triggerSource,
          }),
        );
      });
    }
    return { synced: studentIds.length };
  }

  private async syncItem(item: {
    id: string;
    assessmentId: string | null;
    maxScore: string;
    classRecordId: string;
  }) {
    if (!item.assessmentId || Number(item.maxScore) <= 0) return [];
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, item.assessmentId),
      with: { questions: true },
    });
    if (!assessment) return [];
    const manual =
      assessment.type === 'file_upload' ||
      assessment.questions.some((q) => q.type === 'short_answer');
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.assessmentId, item.assessmentId),
        eq(assessmentAttempts.isSubmitted, true),
      ),
      orderBy: [
        desc(assessmentAttempts.attemptNumber),
        desc(assessmentAttempts.id),
      ],
    });
    const participants = await this.db.query.classRecordParticipants.findMany({
      where: and(
        eq(classRecordParticipants.classRecordId, item.classRecordId),
        eq(classRecordParticipants.eligibility, 'eligible'),
      ),
    });
    const scores = await this.db.query.classRecordScores.findMany({
      where: eq(classRecordScores.classRecordItemId, item.id),
    });
    const eligible = new Set(participants.map((p) => p.studentId));
    const excused = new Set(
      scores.filter((s) => s.status === 'excused').map((s) => s.studentId),
    );
    const seen = new Set<string>();
    const synchronized: string[] = [];
    for (const attempt of attempts) {
      if (seen.has(attempt.studentId)) continue;
      seen.add(attempt.studentId); // Never fall back to an older grade when the latest is pending.
      if (
        !eligible.has(attempt.studentId) ||
        excused.has(attempt.studentId) ||
        attempt.score == null ||
        (manual && !attempt.isReturned)
      )
        continue;
      if (
        !Number.isFinite(attempt.score) ||
        attempt.score < 0 ||
        attempt.score > 100
      )
        throw new BadRequestException(
          'Assessment result is outside its valid percentage range',
        );
      const contract = buildAcademicScoreContract(attempt);
      const itemMaximum = Number(item.maxScore);
      const scale = contract.scoreBreakdown
        ? itemMaximum / contract.scoreBreakdown.possiblePoints
        : 1;
      const baseScore = contract.scoreBreakdown
        ? contract.scoreBreakdown.basePoints * scale
        : ((contract.scorePercent ?? 0) / 100) * itemMaximum;
      const bonusPoints = contract.scoreBreakdown
        ? contract.scoreBreakdown.bonusPoints * scale
        : 0;
      const score = String(Math.round(baseScore * 100) / 100);
      const bonus = String(Math.round(bonusPoints * 100) / 100);
      const previous = scores.find((s) => s.studentId === attempt.studentId);
      if (
        previous?.sourceAttemptId === attempt.id &&
        previous.score !== null &&
        Number(previous.score) === Number(score) &&
        Number(previous.bonusPoints ?? 0) === Number(bonus) &&
        (previous.bonusReason ?? null) ===
          (contract.scoreBreakdown?.bonusReason ?? null)
      )
        continue;
      const values = {
        classRecordItemId: item.id,
        studentId: attempt.studentId,
        score,
        bonusPoints: bonus,
        bonusReason: contract.scoreBreakdown?.bonusReason ?? null,
        status: 'recorded' as const,
        reason: null,
        sourceAttemptId: attempt.id,
        updatedAt: new Date(),
      };
      await this.db
        .insert(classRecordScores)
        .values(values)
        .onConflictDoUpdate({
          target: [
            classRecordScores.classRecordItemId,
            classRecordScores.studentId,
          ],
          set: values,
        });
      synchronized.push(attempt.studentId);
    }
    return synchronized;
  }

  /** Delivery can be repeated or late. Reload persisted evidence; never trust a score in an event payload. */
  @OnEvent(AssessmentSubmittedEvent.eventName, {
    async: true,
    promisify: false,
  })
  async handleAssessmentSubmitted(
    event: AssessmentSubmittedEvent,
  ): Promise<void> {
    try {
      await this.databaseService.academicTransaction(async () => {
        const items = await this.db.query.classRecordItems.findMany({
          where: eq(classRecordItems.assessmentId, event.assessmentId),
          with: { classRecord: { with: { class: true } } },
        });
        for (const item of items) {
          const owner = item.classRecord.class.teacherId;
          if (item.classRecord.status !== 'draft' || !owner) continue;
          await this.syncFromAssessment(item.id, owner, [], 'assessment_sync');
        }
      });
    } catch (error) {
      // Readiness reports unsynchronized evidence; teachers can retry using the explicit sync endpoint.
      this.logger.error(
        `Assessment score sync failed: ${(error as Error).message}`,
      );
    }
  }
}
