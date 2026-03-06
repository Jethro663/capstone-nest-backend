import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { LessonsModule } from '../lessons/lessons.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [LessonsModule, AssessmentsModule, ClassesModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
