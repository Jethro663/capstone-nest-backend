import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class DemoInterventionPlanDto {
  @ApiProperty({
    description: 'Selected demo subject track',
    enum: ['english', 'science'],
    example: 'science',
  })
  @IsString()
  @IsIn(['english', 'science'])
  subjectId!: 'english' | 'science';

  @ApiProperty({
    description: 'Quarter exam score from demo run',
    example: 68,
  })
  @IsNumber()
  @Min(0)
  quarterExamScore!: number;

  @ApiPropertyOptional({
    description: 'Weak concepts detected during demo progression',
    type: [String],
    example: ['Cell structures and functions', 'Scientific method and variable control'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(180, { each: true })
  weakConcepts?: string[];

  @ApiPropertyOptional({
    description: 'Per-module score signals from demo assessments',
    type: [Number],
    example: [62, 70, 65],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(6)
  @IsNumber({}, { each: true })
  moduleScores?: number[];
}

