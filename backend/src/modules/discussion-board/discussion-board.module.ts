import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DiscussionBoardController } from './discussion-board.controller';
import { DiscussionBoardService } from './discussion-board.service';
import { DiscussionBoardProcessor } from './discussion-board.processor';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuditModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'discussion-board',
    }),
  ],
  controllers: [DiscussionBoardController],
  providers: [DiscussionBoardService, DiscussionBoardProcessor],
  exports: [DiscussionBoardService],
})
export class DiscussionBoardModule {}
