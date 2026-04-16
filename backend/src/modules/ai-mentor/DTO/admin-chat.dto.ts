import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdminAnalyticsChartSeriesDto {
  @ApiProperty({ example: 'At-risk students' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [Number], example: [2, 1, 0] })
  @IsArray()
  data: number[];
}

export class AdminAnalyticsChartDto {
  @ApiProperty({ enum: ['bar', 'line', 'pie', 'donut'], example: 'bar' })
  @IsString()
  @IsIn(['bar', 'line', 'pie', 'donut'])
  type: 'bar' | 'line' | 'pie' | 'donut';

  @ApiProperty({ example: 'At-risk students by class' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ type: [String], example: ['MATH-7', 'SCI-7'] })
  @IsArray()
  labels: string[];

  @ApiProperty({ type: [AdminAnalyticsChartSeriesDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminAnalyticsChartSeriesDto)
  series: AdminAnalyticsChartSeriesDto[];

  @ApiPropertyOptional({ example: 'Students' })
  @IsOptional()
  @IsString()
  yAxisLabel?: string;

  @ApiPropertyOptional({ example: 'Classes' })
  @IsOptional()
  @IsString()
  xAxisLabel?: string;
}

export class AdminAnalyticsSourceDto {
  @ApiProperty({ example: 'student-performance-report' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ example: { window: 'latest', classId: null } })
  @IsObject()
  filters: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'latest snapshot' })
  @IsOptional()
  @IsString()
  window?: string;
}

export class AdminAnalyticsChatRequestDto {
  @ApiProperty({
    description: 'The analytics question to ask the admin assistant.',
    example: 'Show me current at-risk trends across the platform.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Message must be 2000 characters or fewer' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Session ID from a previous admin analytics response. Omit to start a new conversation.',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class AdminAnalyticsChatMessageDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111-assistant-0' })
  @IsString()
  id: string;

  @ApiProperty({ enum: ['user', 'assistant'], example: 'assistant' })
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ example: '2 students are currently flagged as at risk.' })
  @IsString()
  content: string;

  @ApiProperty({ example: '2026-04-13T00:00:00.000Z' })
  @IsString()
  createdAt: string;

  @ApiPropertyOptional({ type: () => AdminAnalyticsChartDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAnalyticsChartDto)
  chart?: AdminAnalyticsChartDto | null;

  @ApiPropertyOptional({ type: [AdminAnalyticsSourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminAnalyticsSourceDto)
  sources?: AdminAnalyticsSourceDto[];
}

export class AdminAnalyticsSessionSummaryDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'admin_analytics_chat' })
  @IsString()
  sessionType: string;

  @ApiProperty({ example: 'At-risk trends across classes' })
  @IsString()
  title: string;

  @ApiProperty({ example: '2 students are currently flagged as at risk.' })
  @IsString()
  preview: string;

  @ApiProperty({ example: '2026-04-13T00:00:00.000Z' })
  @IsString()
  updatedAt: string;
}

export class AdminAnalyticsSessionDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'At-risk trends across classes' })
  @IsString()
  title: string;

  @ApiProperty({ example: '2026-04-13T00:00:00.000Z' })
  @IsString()
  updatedAt: string;

  @ApiProperty({ type: [AdminAnalyticsChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminAnalyticsChatMessageDto)
  messages: AdminAnalyticsChatMessageDto[];
}

export class AdminAnalyticsChatResponseDto {
  @ApiProperty({ example: '2 students are currently flagged as at risk.' })
  @IsString()
  reply: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ type: () => AdminAnalyticsChartDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAnalyticsChartDto)
  chart?: AdminAnalyticsChartDto | null;

  @ApiProperty({ type: [AdminAnalyticsSourceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminAnalyticsSourceDto)
  sources: AdminAnalyticsSourceDto[];
}
