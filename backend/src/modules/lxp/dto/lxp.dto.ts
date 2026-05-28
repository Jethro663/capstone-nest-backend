import {
  IsBoolean,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  gradingPeriodEnum,
  systemEvaluationAudienceRoleEnum,
  systemEvaluationCampaignStatusEnum,
  systemEvaluationFormTypeEnum,
  systemEvaluationTargetEnum,
  teacherEvaluationTypeEnum,
} from '../../../drizzle/schema';

const systemTargets = systemEvaluationTargetEnum.enumValues;
export type SystemEvaluationTarget = (typeof systemTargets)[number];
const systemEvaluationFormTypes = systemEvaluationFormTypeEnum.enumValues;
export type SystemEvaluationFormType =
  (typeof systemEvaluationFormTypes)[number];
const systemEvaluationAudienceRoles =
  systemEvaluationAudienceRoleEnum.enumValues;
export type SystemEvaluationAudienceRole =
  (typeof systemEvaluationAudienceRoles)[number];
const systemEvaluationCampaignStatuses =
  systemEvaluationCampaignStatusEnum.enumValues;
export type SystemEvaluationCampaignStatus =
  (typeof systemEvaluationCampaignStatuses)[number];
const teacherEvaluationTypes = teacherEvaluationTypeEnum.enumValues;
export type TeacherEvaluationType = (typeof teacherEvaluationTypes)[number];
const gradingPeriods = gradingPeriodEnum.enumValues;
export type TeacherEvaluationGradingPeriod = (typeof gradingPeriods)[number];
const aiSessionTypes = [
  'mentor_chat',
  'mistake_explanation',
  'student_tutor',
] as const;
export type AiSessionType = (typeof aiSessionTypes)[number];

export class LessonAssignmentDto {
  @IsUUID('4')
  lessonId: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  xpAwarded: number;
}

export class AssessmentAssignmentDto {
  @IsUUID('4')
  assessmentId: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  xpAwarded: number;
}

export class AssignInterventionDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  lessonIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assessmentIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonAssignmentDto)
  lessonAssignments?: LessonAssignmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentAssignmentDto)
  assessmentAssignments?: AssessmentAssignmentDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class ResolveInterventionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class GeneratedLessonDraftDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsString()
  lessonBody: string;

  @IsArray()
  @IsString({ each: true })
  weakConcepts: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  sourceLessonIds: string[];

  @IsArray()
  sourceReferences: Record<string, unknown>[];
}

export class GuidedQuestionOptionDto {
  @IsString()
  id: string;

  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class GeneratedGuidedQuestionDto {
  @IsString()
  id: string;

  @IsIn(['multiple_choice', 'multiple_select', 'true_false', 'dropdown'])
  type: string;

  @IsString()
  stem: string;

  @IsString()
  explanation: string;

  @IsOptional()
  @IsString()
  hint?: string | null;

  @IsOptional()
  @IsString()
  reviewHint?: string | null;

  @IsOptional()
  @IsString()
  weakConceptTag?: string | null;

  @IsOptional()
  @IsString()
  sourceQuestionId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedQuestionOptionDto)
  options: GuidedQuestionOptionDto[];
}

export class GeneratedGuidedAssessmentDraftDto {
  @IsOptional()
  @IsUUID('4')
  sourceAssessmentId?: string | null;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsArray()
  @IsString({ each: true })
  weakConcepts: string[];

  @IsOptional()
  @IsString()
  formativeSummary?: string | null;

  @IsArray()
  sourceReferences: Record<string, unknown>[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedGuidedQuestionDto)
  questions: GeneratedGuidedQuestionDto[];
}

export class ApproveGeneratedArtifactsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneratedLessonDraftDto)
  generatedLessonDraft?: GeneratedLessonDraftDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeneratedGuidedAssessmentDraftDto)
  generatedGuidedAssessmentDraft?: GeneratedGuidedAssessmentDraftDto | null;
}

export class GuidedAssessmentProgressResponseDto {
  @IsString()
  questionId: string;

  @IsOptional()
  answer?: string | string[];

  @IsOptional()
  isCorrect?: boolean;

  @IsOptional()
  explanationShown?: boolean;
}

export class UpdateGuidedAssessmentProgressDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  currentQuestionIndex?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedAssessmentProgressResponseDto)
  responses?: GuidedAssessmentProgressResponseDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hintedQuestionIds?: string[];
}

export class SubmitGuidedAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedAssessmentProgressResponseDto)
  responses: GuidedAssessmentProgressResponseDto[];

  @IsArray()
  @IsString({ each: true })
  hintedQuestionIds: string[];
}

export class AiEvaluationContextDto {
  @IsOptional()
  @IsIn(aiSessionTypes)
  sessionType?: AiSessionType;

  @IsOptional()
  @IsUUID('4')
  attemptId?: string;

  @IsOptional()
  @IsUUID('4')
  questionId?: string;

  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceFlow?: string;
}

export class SubmitSystemEvaluationDto {
  @IsIn(systemTargets)
  targetModule: SystemEvaluationTarget;

  @IsInt()
  @Min(0)
  @Max(5)
  usabilityScore: number;

  @IsInt()
  @Min(0)
  @Max(5)
  functionalityScore: number;

  @IsInt()
  @Min(0)
  @Max(5)
  performanceScore: number;

  @IsInt()
  @Min(0)
  @Max(5)
  satisfactionScore: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiEvaluationContextDto)
  aiContextMetadata?: AiEvaluationContextDto;
}

export class ListSystemEvaluationsQueryDto {
  @IsOptional()
  @IsIn(systemTargets)
  targetModule?: SystemEvaluationTarget;

  @IsOptional()
  @IsUUID('4')
  aiClassId?: string;

  @IsOptional()
  @IsIn(aiSessionTypes)
  aiSessionType?: AiSessionType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  aiSourceFlow?: string;

  @IsOptional()
  @IsUUID('4')
  campaignId?: string;

  @IsOptional()
  @IsIn(systemEvaluationAudienceRoles)
  audienceRole?: SystemEvaluationAudienceRole;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class SubmitAssignedSystemEvaluationDto {
  @IsObject()
  questionRatings: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

export class CreateSystemEvaluationCampaignDto {
  @IsIn(systemEvaluationFormTypes)
  formType: SystemEvaluationFormType;

  @IsIn(systemEvaluationAudienceRoles)
  audienceRole: SystemEvaluationAudienceRole;

  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @IsString()
  @MaxLength(160)
  title: string;

  @IsISO8601()
  startsAt: string;

  @IsISO8601()
  endsAt: string;

  @IsOptional()
  @IsIn(systemEvaluationCampaignStatuses)
  status?: SystemEvaluationCampaignStatus;
}

export class ListSystemEvaluationCampaignsQueryDto {
  @IsOptional()
  @IsIn(systemEvaluationFormTypes)
  formType?: SystemEvaluationFormType;

  @IsOptional()
  @IsIn(systemEvaluationAudienceRoles)
  audienceRole?: SystemEvaluationAudienceRole;

  @IsOptional()
  @IsIn(systemEvaluationCampaignStatuses)
  status?: SystemEvaluationCampaignStatus;

  @IsOptional()
  @IsUUID('4')
  classId?: string;
}

export class UpdateSystemEvaluationCampaignStatusDto {
  @IsIn(systemEvaluationCampaignStatuses)
  status: SystemEvaluationCampaignStatus;
}

export class SubmitTeacherEvaluationDto {
  @IsUUID('4')
  classId: string;

  @IsIn(gradingPeriods)
  gradingPeriod: TeacherEvaluationGradingPeriod;

  @IsIn(teacherEvaluationTypes)
  evaluationType: TeacherEvaluationType;

  @IsObject()
  ratings: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ListTeacherEvaluationSummaryQueryDto {
  @IsIn(teacherEvaluationTypes)
  evaluationType: TeacherEvaluationType;

  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @IsOptional()
  @IsIn(gradingPeriods)
  gradingPeriod?: TeacherEvaluationGradingPeriod;
}
