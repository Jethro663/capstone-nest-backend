import { Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessmentAttempts,
  classRecordCategories,
  classRecordParticipants,
  classRecords,
} from '../../drizzle/schema';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import { getSubjectWeights } from '../academic-state/academic-policy';
import { calculateStudentRecord } from './class-record-calculation';
import type { GradeBlocker } from './class-record-calculation';

@Injectable()
export class ClassRecordReadinessService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly academicPolicyService: AcademicPolicyService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }

  async getReadiness(classRecordId: string) {
    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, classRecordId),
      with: { class: true },
    });
    if (!record) throw new NotFoundException('Class record not found');
    const { policy, cls } = await this.academicPolicyService.forClass(
      record.classId,
    );
    const current = await this.academicPolicyService.currentState();
    const participants = await this.db.query.classRecordParticipants.findMany({
      where: eq(classRecordParticipants.classRecordId, classRecordId),
    });
    const categories = await this.db.query.classRecordCategories.findMany({
      where: eq(classRecordCategories.classRecordId, classRecordId),
      with: { items: { with: { scores: true } } },
    });
    const eligibleStudentIds = participants
      .filter((p) => p.eligibility === 'eligible')
      .map((p) => p.studentId);
    const items = categories.flatMap((category) => category.items);
    const blockers: GradeBlocker[] = [];
    if (!record.rosterConfirmedAt)
      blockers.push({
        code: 'unconfirmed_roster',
        message: 'Confirm period eligibility before finalization',
      });
    const periodIndex = policy.periods.findIndex(
      (period) => period.key === record.gradingPeriod,
    );
    if (periodIndex < 0)
      blockers.push({
        code: 'invalid_period',
        message: 'Record period is not part of this school year policy',
      });
    if (cls.schoolYear !== current.schoolYear || !cls.isActive)
      blockers.push({
        code: 'closed_school_year',
        message: 'Record school year is not active',
      });
    if (
      periodIndex >
      policy.periods.findIndex((period) => period.key === current.quarter)
    )
      blockers.push({
        code: 'future_period',
        message: 'Future periods cannot be finalized or scored',
      });
    const weights = getSubjectWeights(
      policy,
      cls.subjectCode,
      cls.subjectName,
      cls.academicWeightProfile,
    );
    if (policy.gradeMethod !== 'legacy_transmutation') {
      if (!weights)
        blockers.push({
          code: 'unknown_subject_profile',
          message: 'Admin must classify the subject grading profile',
        });
      else {
        const expected: Record<string, number> = {
          'Written Works': weights.writtenWork,
          'Performance Tasks': weights.performanceTask,
          'Quarterly Assessment': weights.examination,
        };
        if (
          categories.length !== 3 ||
          categories.some(
            (category) =>
              expected[category.name] !== Number(category.weightPercentage),
          )
        )
          blockers.push({
            code: 'policy_weight_mismatch',
            message:
              'Category weights do not match this school year and subject policy',
          });
      }
    }
    // Even an empty roster must have valid weights/items, but needs no student scores.
    const totalWeight = categories.reduce(
      (sum, category) => sum + Number(category.weightPercentage),
      0,
    );
    if (!categories.length || Math.abs(totalWeight - 100) > 0.001)
      blockers.push({
        code: 'invalid_weights',
        message: 'Category weights must total 100%',
      });
    if (!eligibleStudentIds.length) {
      // Validate configuration independently of a learner's scores for confirmed empty registers.
      const configuration = calculateStudentRecord(
        '',
        policy,
        categories,
        items.map((item) => ({ ...item, scores: [] })),
      );
      blockers.push(
        ...configuration.blockers
          .filter((blocker) => blocker.code !== 'missing_score')
          .map(({ studentId: _studentId, ...blocker }) => blocker),
      );
    }
    for (const studentId of eligibleStudentIds)
      blockers.push(
        ...calculateStudentRecord(studentId, policy, categories, items)
          .blockers,
      );
    const assessmentIds = [
      ...new Set(
        items.flatMap((item) => (item.assessmentId ? [item.assessmentId] : [])),
      ),
    ];
    if (assessmentIds.length && eligibleStudentIds.length) {
      const attempts = await this.db.query.assessmentAttempts.findMany({
        where: inArray(assessmentAttempts.assessmentId, assessmentIds),
        with: { assessment: { with: { questions: true } } },
        orderBy: [
          desc(assessmentAttempts.attemptNumber),
          desc(assessmentAttempts.id),
        ],
      });
      const eligible = new Set(eligibleStudentIds);
      const seen = new Set<string>();
      for (const attempt of attempts) {
        if (!eligible.has(attempt.studentId)) continue;
        const key = `${attempt.assessmentId}:${attempt.studentId}`;
        if (!attempt.isSubmitted) {
          blockers.push({
            code: 'ongoing_attempt',
            message: 'An assessment attempt is still open',
            studentId: attempt.studentId,
          });
          continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        const manual =
          attempt.assessment.type === 'file_upload' ||
          attempt.assessment.questions.some(
            (question) => question.type === 'short_answer',
          );
        if (attempt.score == null || (manual && !attempt.isReturned)) {
          blockers.push({
            code: 'pending_manual_grade',
            message: 'Latest submitted attempt requires completed grading',
            studentId: attempt.studentId,
          });
          continue;
        }
        for (const item of items.filter(
          (item) => item.assessmentId === attempt.assessmentId,
        )) {
          const score = item.scores.find(
            (score) => score.studentId === attempt.studentId,
          );
          if (score?.status === 'excused') continue;
          const expectedScore =
            Math.round((attempt.score / 100) * Number(item.maxScore) * 100) /
            100;
          if (
            !score ||
            score.sourceAttemptId !== attempt.id ||
            score.score == null ||
            Math.abs(Number(score.score) - expectedScore) > 0.001
          )
            blockers.push({
              code: 'pending_score_sync',
              message: 'Latest assessment result has not been synchronized',
              studentId: attempt.studentId,
              itemId: item.id,
            });
        }
      }
    }
    const scoped = blockers.map((blocker) => ({
      ...blocker,
      classId: record.classId,
      classRecordId,
      period: record.gradingPeriod,
    }));
    return {
      ready: scoped.length === 0,
      classRecordId,
      classId: record.classId,
      period: record.gradingPeriod,
      eligibleStudentIds,
      blockers: scoped,
      counts: scoped.reduce<Record<string, number>>((counts, blocker) => {
        counts[blocker.code] = (counts[blocker.code] ?? 0) + 1;
        return counts;
      }, {}),
    };
  }
}
