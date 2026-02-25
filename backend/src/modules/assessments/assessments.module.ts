import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, EventEmitterModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
