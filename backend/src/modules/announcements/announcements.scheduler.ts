import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SystemResetParticipant } from '../system-reset/system-reset.participant';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnnouncementsService } from './announcements.service';

@Injectable()
export class AnnouncementsScheduler {
  private readonly logger = new Logger(AnnouncementsScheduler.name);

  constructor(
    private readonly announcementsService: AnnouncementsService,
    @Optional() private readonly modules?: ModuleRef,
  ) {}

  /**
   * Every minute: check for announcements whose scheduledAt <= NOW()
   * that haven't been published yet, publish them, and enqueue fan-out.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledAnnouncements(): Promise<void> {
    this.logger.debug('Checking for due scheduled announcements...');
    try {
      const work = () => this.announcementsService.publishDueAnnouncements();
      if (this.modules)
        await this.modules
          .get(SystemResetParticipant, { strict: false })
          .run(work);
      else await work();
    } catch (err) {
      this.logger.error('Failed to publish scheduled announcements', err);
    }
  }
}
