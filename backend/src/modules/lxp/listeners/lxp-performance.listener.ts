import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PerformanceStatusChangedEvent } from '../../../common/events';
import { LxpService } from '../lxp.service';

@Injectable()
export class LxpPerformanceListener {
  private readonly logger = new Logger(LxpPerformanceListener.name);

  constructor(private readonly lxpService: LxpService) {}

  @OnEvent(PerformanceStatusChangedEvent.eventName)
  async handlePerformanceStatusChanged(event: PerformanceStatusChangedEvent) {
    try {
      await this.lxpService.handlePerformanceStatusChanged(event);
    } catch (error) {
      this.logger.error(
        `Failed to sync LXP intervention case for class ${event.classId}, student ${event.studentId}: ${(error as Error).message}`,
      );
    }
  }
}
