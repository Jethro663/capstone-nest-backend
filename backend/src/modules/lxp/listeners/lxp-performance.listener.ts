import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { runSystemResetWork } from '../../system-reset/system-reset.work';
import { OnEvent } from '@nestjs/event-emitter';
import { PerformanceStatusChangedEvent } from '../../../common/events';
import { LxpService } from '../lxp.service';

@Injectable()
export class LxpPerformanceListener {
  private readonly logger = new Logger(LxpPerformanceListener.name);

  constructor(
    private readonly lxpService: LxpService,
    @Optional() private readonly modules?: ModuleRef,
  ) {}

  @OnEvent(PerformanceStatusChangedEvent.eventName)
  async handlePerformanceStatusChanged(event: PerformanceStatusChangedEvent) {
    try {
      await runSystemResetWork(this.modules, () =>
        this.lxpService.handlePerformanceStatusChanged(event),
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync LXP intervention case for class ${event.classId}, student ${event.studentId}: ${(error as Error).message}`,
      );
    }
  }
}
