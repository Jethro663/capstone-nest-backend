import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class LessonPlanHeaderDto {
  @ApiPropertyOptional({
    description: 'Instructional format label shown in the PDF header',
    example: 'Detailed Lesson Plan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  instructionalFormat?: string;

  @ApiPropertyOptional({
    description: 'School name shown in the PDF header',
    example: 'Gat Andres Bonifacio High School',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  schoolName?: string;

  @ApiPropertyOptional({ example: 'Q1' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  quarter?: string;

  @ApiPropertyOptional({ example: '2026-05-03' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  date?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  startTime?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  endTime?: string;
}

export class GenerateLessonPlanDto {
  @ApiProperty({
    description: 'Class where the lesson plan belongs',
    example: '7c6b6047-f8ef-483b-8d51-c4bac7ed13d2',
  })
  @IsUUID()
  classId: string;

  @ApiProperty({
    description: 'Whether the teacher selected a module or lesson as the anchor',
    enum: ['module', 'lesson'],
  })
  @IsString()
  @IsIn(['module', 'lesson'])
  anchorType: 'module' | 'lesson';

  @ApiProperty({
    description: 'Selected module or lesson id',
  })
  @IsUUID()
  anchorId: string;

  @ApiPropertyOptional({
    description: 'Optional teacher note to guide the generated plan',
    example: 'Focus on mixed-readiness support around decimal operations.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  teacherNote?: string;

  @ApiPropertyOptional({
    description: 'Optional header overrides for the generated DLP',
    type: LessonPlanHeaderDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LessonPlanHeaderDto)
  header?: LessonPlanHeaderDto;
}

export class UpdateLessonPlanDraftDto {
  @ApiProperty({
    description: 'Reviewed structured lesson plan payload to persist',
    type: Object,
  })
  @IsObject()
  structuredOutput: Record<string, unknown>;
}
