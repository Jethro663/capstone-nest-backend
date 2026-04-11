import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { aiPolicySourceScopeEnum } from '../../../drizzle/schema';

export type AiPolicySourceScope =
  (typeof aiPolicySourceScopeEnum.enumValues)[number];

export class UpdateClassAiPolicyDto {
  @ApiPropertyOptional({
    description: 'Enable/disable AI mistake explanations and tutor interactions for this class.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mentorExplainEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum allowed follow-up turns for AI assistance per context.',
    example: 3,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxFollowUpTurns?: number;

  @ApiPropertyOptional({
    description: 'How broad the AI source retrieval scope should be.',
    enum: aiPolicySourceScopeEnum.enumValues,
    example: 'class_materials',
  })
  @IsOptional()
  @IsIn(aiPolicySourceScopeEnum.enumValues)
  sourceScope?: AiPolicySourceScope;

  @ApiPropertyOptional({
    description: 'When true, AI should return guarded fallback if grounding is weak.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  strictGrounding?: boolean;
}
