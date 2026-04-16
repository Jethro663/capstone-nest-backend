import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { TeacherProfilesController } from './teacher-profiles.controller';
import { TeacherProfilesService } from './teacher-profiles.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [TeacherProfilesController],
  providers: [TeacherProfilesService],
  exports: [TeacherProfilesService],
})
export class TeacherProfilesModule {}
