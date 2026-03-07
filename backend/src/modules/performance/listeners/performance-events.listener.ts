import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AssessmentSubmittedEvent,
  ClassRecordScoresUpdatedEvent,
} from '../../../common/events';
import { PerformanceService } from '../performance.service';

@Injectable()
export class PerformanceEventsListener {
  private readonly logger = new Logger(PerformanceEventsListener.name);

  constructor(private readonly performanceService: PerformanceService) {}

  @OnEvent(AssessmentSubmittedEvent.eventName)
  async handleAssessmentSubmitted(event: AssessmentSubmittedEvent) {
    try {
      await this.performanceService.recomputeFromAssessmentSubmission(
        event.assessmentId,
        event.studentId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to recompute performance for assessment ${event.assessmentId}: ${(error as Error).message}`,
      );
    }
  }

  @OnEvent(ClassRecordScoresUpdatedEvent.eventName)
  async handleClassRecordScoresUpdated(event: ClassRecordScoresUpdatedEvent) {
    try {
      await this.performanceService.recomputeStudentsForClass(
        event.classId,
        event.studentIds,
        event.triggerSource,
      );
    } catch (error) {
      this.logger.error(
        `Failed to recompute class-record projection for class ${event.classId}: ${(error as Error).message}`,
      );
    }
  }
}
