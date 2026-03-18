import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InterventionRecommendationDto {
  @ApiPropertyOptional({
    description: 'Optional teacher instruction to bias the recommendation',
    example: 'Focus on foundational remediation before retrying assessments.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
