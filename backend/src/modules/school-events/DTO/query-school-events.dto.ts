import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Validate } from 'class-validator';
import { IsValidSchoolYearConstraint } from '../../classes/DTO/validators';

export class QuerySchoolEventsDto {
  @ApiPropertyOptional({ example: '2026-2027' })
  @IsOptional()
  @IsString()
  @Validate(IsValidSchoolYearConstraint)
  schoolYear?: string;

  @ApiPropertyOptional({
    description: 'Inclusive lower bound by event range',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound by event range',
    example: '2027-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
