import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AssessmentSubmittedEvent,
  ClassRecordScoresUpdatedEvent,
} from '../../../common/events';
import { PerformanceRecomputeQueueService } from '../performance-recompute-queue.service';

@Injectable()
export class PerformanceEventsListener {
  private readonly logger = new Logger(PerformanceEventsListener.name);

  constructor(
    private readonly recomputeQueue: PerformanceRecomputeQueueService,
  ) {}

  @OnEvent(AssessmentSubmittedEvent.eventName, { async: true, promisify: false })
  async handleAssessmentSubmitted(event: AssessmentSubmittedEvent) {
    try {
      await this.recomputeQueue.enqueueAssessmentSubmission(
        event.assessmentId,
        event.studentId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue performance recompute for assessment ${event.assessmentId}: ${(error as Error).message}`,
      );
    }
  }

  @OnEvent(ClassRecordScoresUpdatedEvent.eventName, { async: true, promisify: false })
  async handleClassRecordScoresUpdated(event: ClassRecordScoresUpdatedEvent) {
    try {
      await this.recomputeQueue.enqueueClassRecordScores(
        event.classId,
        event.studentIds,
        event.triggerSource,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue class-record projection for class ${event.classId}: ${(error as Error).message}`,
      );
    }
  }
}
