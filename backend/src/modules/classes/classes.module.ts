import { Module } from '@nestjs/common';
import {
  ClassesController,
  ClassesPublicController,
} from './classes.controller';
import { ClassesService } from './classes.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { ClassRecordModule } from '../class-record/class-record.module';
import { AcademicStateModule } from '../academic-state/academic-state.module';

@Module({
  imports: [DatabaseModule, AuditModule, ClassRecordModule, AcademicStateModule],
  controllers: [ClassesController, ClassesPublicController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
