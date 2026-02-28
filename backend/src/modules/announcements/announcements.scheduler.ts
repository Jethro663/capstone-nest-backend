import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnnouncementsService } from './announcements.service';

@Injectable()
export class AnnouncementsScheduler {
  private readonly logger = new Logger(AnnouncementsScheduler.name);

  constructor(private readonly announcementsService: AnnouncementsService) {}

  /**
   * Every minute: check for announcements whose scheduledAt <= NOW()
   * that haven't been published yet, publish them, and enqueue fan-out.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledAnnouncements(): Promise<void> {
    this.logger.debug('Checking for due scheduled announcements...');
    try {
      await this.announcementsService.publishDueAnnouncements();
    } catch (err) {
      this.logger.error('Failed to publish scheduled announcements', err);
    }
  }
}
