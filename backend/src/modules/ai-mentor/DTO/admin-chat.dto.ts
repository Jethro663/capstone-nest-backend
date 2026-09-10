import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
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

  @ApiPropertyOptional({ example: 'Student performance report' })
  @IsOptional()
  @IsString()
  label?: string | null;

  @ApiProperty({ example: { window: 'latest', classId: null } })
  @IsObject()
  filters: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'latest snapshot' })
  @IsOptional()
  @IsString()
  window?: string;

  @ApiPropertyOptional({ example: '2026-09-11T03:15:00.000Z' })
  @IsOptional()
  @IsString()
  fetchedAt?: string | null;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  recordCount?: number | null;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  total?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  truncated?: boolean;

  @ApiPropertyOptional({ example: '/dashboard/admin/reports' })
  @IsOptional()
  @IsString()
  href?: string | null;
}

export class AdminAssistantDataViewDto {
  @ApiProperty({ example: 'At-risk learners' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ type: [String], example: ['Class', 'Learners'] })
  @IsArray()
  columns: string[];

  @ApiProperty({
    type: 'array',
    items: { type: 'array', items: { type: 'string' } },
    example: [['MATH-7', '2']],
  })
  @IsArray()
  rows: string[][];

  @ApiPropertyOptional({ example: 8, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  total?: number | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  truncated: boolean;
}

export class AdminAssistantDraftDto {
  @ApiProperty({ example: 'Schedule reminder' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Please complete the pending requirements.' })
  @IsString()
  body: string;

  @ApiProperty({ enum: ['all', 'students', 'teachers', 'admins'] })
  @IsString()
  @IsIn(['all', 'students', 'teachers', 'admins'])
  audience: 'all' | 'students' | 'teachers' | 'admins';
}

export class AdminAssistantActionDto {
  @ApiProperty({ enum: ['navigate', 'draft'] })
  @IsString()
  @IsIn(['navigate', 'draft'])
  kind: 'navigate' | 'draft';

  @ApiProperty({
    enum: [
      'reports',
      'evaluations',
      'audit',
      'diagnostics',
      'announcements',
      'users',
      'sections',
      'classes',
      'system_settings',
      'roster_import',
    ],
  })
  @IsString()
  @IsIn([
    'reports',
    'evaluations',
    'audit',
    'diagnostics',
    'announcements',
    'users',
    'sections',
    'classes',
    'system_settings',
    'roster_import',
  ])
  target: string;

  @ApiProperty({ example: 'Open reports' })
  @IsString()
  label: string;

  @ApiProperty({ example: 'Review the matching records.' })
  @IsString()
  description: string;

  @ApiProperty({ example: '/dashboard/admin/reports' })
  @IsString()
  href: string;

  @ApiPropertyOptional({ type: () => AdminAssistantDraftDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantDraftDto)
  draft?: AdminAssistantDraftDto | null;
}

export class AdminAssistantScopeDto {
  @ApiPropertyOptional({
    enum: ['current_period', 'last_7_days', 'last_30_days', 'all_available'],
    default: 'current_period',
  })
  @IsOptional()
  @IsString()
  @IsIn(['current_period', 'last_7_days', 'last_30_days', 'all_available'])
  timeRange?:
    | 'current_period'
    | 'last_7_days'
    | 'last_30_days'
    | 'all_available';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}

export class AdminAssistantResolvedScopeDto extends AdminAssistantScopeDto {
  @ApiPropertyOptional({ example: '2026-2027' })
  @IsOptional()
  @IsString()
  schoolYear?: string | null;

  @ApiPropertyOptional({ enum: ['Q1', 'Q2', 'Q3', 'Q4'], example: 'Q3' })
  @IsOptional()
  @IsString()
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'])
  gradingPeriod?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;

  @ApiPropertyOptional({ example: 'Quarter 3' })
  @IsOptional()
  @IsString()
  periodLabel?: string | null;
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

  @ApiPropertyOptional({ type: () => AdminAssistantScopeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantScopeDto)
  scope?: AdminAssistantScopeDto;
}

export class AdminAnalyticsSessionUpdateDto {
  @ApiProperty({ example: 'Weekly operations' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80, { message: 'Title must be 80 characters or fewer' })
  title: string;
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

  @ApiPropertyOptional({
    type: () => AdminAssistantDataViewDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantDataViewDto)
  dataView?: AdminAssistantDataViewDto | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  suggestedPrompts?: string[];

  @ApiPropertyOptional({ type: () => AdminAssistantActionDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantActionDto)
  action?: AdminAssistantActionDto | null;

  @ApiPropertyOptional({
    type: () => AdminAssistantResolvedScopeDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantResolvedScopeDto)
  scope?: AdminAssistantResolvedScopeDto | null;
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

  @ApiPropertyOptional({
    type: () => AdminAssistantDataViewDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantDataViewDto)
  dataView?: AdminAssistantDataViewDto | null;

  @ApiProperty({ type: [String] })
  @IsArray()
  suggestedPrompts: string[];

  @ApiPropertyOptional({ type: () => AdminAssistantActionDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantActionDto)
  action?: AdminAssistantActionDto | null;

  @ApiPropertyOptional({
    type: () => AdminAssistantResolvedScopeDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAssistantResolvedScopeDto)
  scope?: AdminAssistantResolvedScopeDto | null;
}
