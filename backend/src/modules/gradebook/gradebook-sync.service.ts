import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  gradebookItems,
  gradebookScores,
  gradebooks,
  assessmentAttempts,
} from '../../drizzle/schema';

export interface AssessmentSubmittedEvent {
  assessmentId: string;
  studentId: string;
  /** Raw score (0–totalPoints) */
  rawScore: number;
  /** Total possible points for the assessment */
  totalPoints: number;
}

@Injectable()
export class GradebookSyncService {
  private readonly logger = new Logger(GradebookSyncService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Manually sync scores from assessment_attempts into gradebook_scores
   * for a specific gradebook item that has an assessmentId linked.
   *
   * Takes the latest submitted attempt per student.
   */
  async syncFromAssessment(
    gradebookItemId: string,
    userId: string,
  ): Promise<{ synced: number }> {
    const item = await this.db.query.gradebookItems.findFirst({
      where: eq(gradebookItems.id, gradebookItemId),
      with: {
        gradebook: { columns: { teacherId: true, status: true } },
      },
    });

    if (!item) {
      throw new NotFoundException(`Gradebook item "${gradebookItemId}" not found`);
    }

    if (!item.assessmentId) {
      throw new BadRequestException(
        'This gradebook item is not linked to an assessment',
      );
    }

    if (item.gradebook.status === 'locked') {
      throw new BadRequestException(
        'Cannot sync scores: gradebook is locked',
      );
    }

    return this._syncItemFromAssessment(gradebookItemId, item.assessmentId);
  }

  /**
   * Internal: sync all submitted attempt scores for an assessment → item.
   * Uses upsert to handle re-sync idempotently.
   */
  private async _syncItemFromAssessment(
    gradebookItemId: string,
    assessmentId: string,
  ): Promise<{ synced: number }> {
    // Load the item for maxScore
    const item = await this.db.query.gradebookItems.findFirst({
      where: eq(gradebookItems.id, gradebookItemId),
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
        score: true,  // 0–100 percentage from assessment module
        submittedAt: true,
      },
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    if (attempts.length === 0) return { synced: 0 };

    // Deduplicate: keep latest per student
    const latestPerStudent = new Map<string, { score: number }>();
    for (const attempt of attempts) {
      if (!latestPerStudent.has(attempt.studentId)) {
        // assessment score is 0-100 (percentage); scale to item maxScore
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
        .insert(gradebookScores)
        .values({
          gradebookItemId,
          studentId,
          score: score.toString(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [gradebookScores.gradebookItemId, gradebookScores.studentId],
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
   * Finds all draft gradebook items linked to that assessment and syncs scores.
   */
  @OnEvent('assessment.submitted')
  async handleAssessmentSubmitted(event: AssessmentSubmittedEvent): Promise<void> {
    try {
      // Find gradebook items linked to this assessment in draft gradebooks
      const linkedItems = await this.db.query.gradebookItems.findMany({
        where: eq(gradebookItems.assessmentId, event.assessmentId),
        with: {
          gradebook: { columns: { status: true, id: true } },
        },
      });

      const draftItems = linkedItems.filter(
        (i) => i.gradebook.status === 'draft',
      );

      if (draftItems.length === 0) return;

      for (const item of draftItems) {
        try {
          const result = await this._syncItemFromAssessment(
            item.id,
            event.assessmentId,
          );
          this.logger.log(
            `Auto-synced ${result.synced} scores for item "${item.id}" ` +
              `(assessment: ${event.assessmentId})`,
          );
        } catch (err) {
          this.logger.error(
            `Auto-sync failed for item "${item.id}": ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `handleAssessmentSubmitted error: ${(err as Error).message}`,
      );
    }
  }
}
