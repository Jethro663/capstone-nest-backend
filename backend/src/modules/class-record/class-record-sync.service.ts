import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { and, eq, isNull, asc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classRecords,
  classRecordCategories,
  classRecordItems,
  classRecordScores,
  assessments,
  assessmentAttempts,
} from '../../drizzle/schema';

export interface AssessmentSubmittedEvent {
  assessmentId: string;
  studentId: string;
  rawScore: number;
  totalPoints: number;
  classRecordCategory?: string;
  quarter?: string;
}

@Injectable()
export class ClassRecordSyncService {
  private readonly logger = new Logger(ClassRecordSyncService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Manually sync scores from assessment_attempts into class_record_scores
   * for a specific class record item that has an assessmentId linked.
   */
  async syncFromAssessment(
    classRecordItemId: string,
    userId: string,
  ): Promise<{ synced: number }> {
    const item = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.id, classRecordItemId),
      with: {
        classRecord: { columns: { teacherId: true, status: true } },
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Class record item "${classRecordItemId}" not found`,
      );
    }

    if (!item.assessmentId) {
      throw new BadRequestException(
        'This class record item is not linked to an assessment',
      );
    }

    if (item.classRecord.status === 'locked') {
      throw new BadRequestException(
        'Cannot sync scores: class record is locked',
      );
    }

    return this._syncItemFromAssessment(classRecordItemId, item.assessmentId);
  }

  /**
   * Internal: sync all submitted attempt scores for an assessment → item.
   * Stores raw score (not percentage).
   */
  private async _syncItemFromAssessment(
    classRecordItemId: string,
    assessmentId: string,
  ): Promise<{ synced: number }> {
    const item = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.id, classRecordItemId),
      columns: { id: true, maxScore: true },
    });

    if (!item) return { synced: 0 };

    // Get latest submitted attempt per student
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.isSubmitted, true),
      ),
      columns: {
        studentId: true,
        score: true,
        submittedAt: true,
      },
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    if (attempts.length === 0) return { synced: 0 };

    // Deduplicate: keep latest per student
    const latestPerStudent = new Map<string, { score: number }>();
    for (const attempt of attempts) {
      if (!latestPerStudent.has(attempt.studentId)) {
        // Assessment score is 0-100 percentage; scale to item maxScore for raw score
        const maxScore = parseFloat(item.maxScore);
        const rawScore = ((attempt.score ?? 0) / 100) * maxScore;
        latestPerStudent.set(attempt.studentId, {
          score: Math.round(rawScore * 100) / 100,
        });
      }
    }

    let synced = 0;
    for (const [studentId, { score }] of latestPerStudent) {
      await this.db
        .insert(classRecordScores)
        .values({
          classRecordItemId,
          studentId,
          score: score.toString(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            classRecordScores.classRecordItemId,
            classRecordScores.studentId,
          ],
          set: {
            score: score.toString(),
            updatedAt: new Date(),
          },
        });
      synced++;
    }

    return { synced };
  }

  /**
   * Auto-sync listener: fires when a student submits an assessment.
   * Matches assessment's classRecordCategory + quarter to find the correct
   * class record + category, then auto-links and syncs the score.
   */
  @OnEvent('assessment.submitted')
  async handleAssessmentSubmitted(
    event: AssessmentSubmittedEvent,
  ): Promise<void> {
    try {
      // If no category/quarter tagged, fall back to legacy behavior
      if (!event.classRecordCategory || !event.quarter) {
        await this._legacySyncByLink(event);
        return;
      }

      // 1. Get the assessment to find classId
      const assessment = await this.db.query.assessments.findFirst({
        where: eq(assessments.id, event.assessmentId),
        columns: { id: true, classId: true, title: true, totalPoints: true },
      });

      if (!assessment) return;

      // 2. Find the class record for this class + quarter
      const record = await this.db.query.classRecords.findFirst({
        where: and(
          eq(classRecords.classId, assessment.classId),
          eq(classRecords.gradingPeriod, event.quarter as any),
        ),
      });

      if (!record || record.status === 'locked') return;

      // 3. Map category name
      const categoryNameMap: Record<string, string> = {
        written_work: 'Written Works',
        performance_task: 'Performance Tasks',
        quarterly_assessment: 'Quarterly Assessment',
      };

      const categoryName =
        categoryNameMap[event.classRecordCategory] ??
        event.classRecordCategory;

      // 4. Find the matching category in this class record
      const category = await this.db.query.classRecordCategories.findFirst({
        where: and(
          eq(classRecordCategories.classRecordId, record.id),
          eq(classRecordCategories.name, categoryName),
        ),
      });

      if (!category) return;

      // 5. Check if there's already an item linked to this assessment
      let item = await this.db.query.classRecordItems.findFirst({
        where: and(
          eq(classRecordItems.classRecordId, record.id),
          eq(classRecordItems.categoryId, category.id),
          eq(classRecordItems.assessmentId, event.assessmentId),
        ),
      });

      if (!item) {
        // Find the first empty (unlinked) item slot in this category
        item = await this.db.query.classRecordItems.findFirst({
          where: and(
            eq(classRecordItems.classRecordId, record.id),
            eq(classRecordItems.categoryId, category.id),
            isNull(classRecordItems.assessmentId),
          ),
          orderBy: [asc(classRecordItems.itemOrder)],
        });

        if (item) {
          // Link this item to the assessment
          await this.db
            .update(classRecordItems)
            .set({
              assessmentId: event.assessmentId,
              title: assessment.title,
              maxScore: (assessment.totalPoints || 0).toString(),
            })
            .where(eq(classRecordItems.id, item.id));
        }
      }

      if (!item) {
        this.logger.warn(
          `No empty item slot in category "${categoryName}" for class record "${record.id}". ` +
            `Assessment "${event.assessmentId}" was not auto-linked.`,
        );
        return;
      }

      // 6. Upsert the student's score (raw score, not percentage)
      await this.db
        .insert(classRecordScores)
        .values({
          classRecordItemId: item.id,
          studentId: event.studentId,
          score: event.rawScore.toString(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            classRecordScores.classRecordItemId,
            classRecordScores.studentId,
          ],
          set: {
            score: event.rawScore.toString(),
            updatedAt: new Date(),
          },
        });

      this.logger.log(
        `Auto-synced score for student "${event.studentId}" → ` +
          `item "${item.id}" (${categoryName}, ${event.quarter})`,
      );
    } catch (err) {
      this.logger.error(
        `handleAssessmentSubmitted error: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Legacy sync: find items already linked to this assessment and sync.
   * Used when assessment doesn't have classRecordCategory/quarter tags.
   */
  private async _legacySyncByLink(
    event: AssessmentSubmittedEvent,
  ): Promise<void> {
    const linkedItems = await this.db.query.classRecordItems.findMany({
      where: eq(classRecordItems.assessmentId, event.assessmentId),
      with: {
        classRecord: { columns: { status: true, id: true } },
      },
    });

    const draftItems = linkedItems.filter(
      (i) => i.classRecord.status === 'draft',
    );

    for (const item of draftItems) {
      try {
        const result = await this._syncItemFromAssessment(
          item.id,
          event.assessmentId,
        );
        this.logger.log(
          `Legacy sync: ${result.synced} scores for item "${item.id}"`,
        );
      } catch (err) {
        this.logger.error(
          `Legacy sync failed for item "${item.id}": ${(err as Error).message}`,
        );
      }
    }
  }
}
