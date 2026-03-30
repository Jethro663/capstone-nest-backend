import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidSchoolYearConstraint } from '../../classes/DTO/validators';

export class UpdateSchoolEventDto {
  @ApiPropertyOptional({ enum: ['school_event', 'holiday_break'] })
  @IsOptional()
  @IsIn(['school_event', 'holiday_break'], {
    message: 'eventType must be school_event or holiday_break',
  })
  eventType?: 'school_event' | 'holiday_break';

  @ApiPropertyOptional({ example: '2026-2027' })
  @IsOptional()
  @IsString()
  @Validate(IsValidSchoolYearConstraint)
  schoolYear?: string;

  @ApiPropertyOptional({ example: 'Foundation Day Program' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({ example: 'School-wide activity at the quadrangle.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Main Campus Quadrangle' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  location?: string;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-10-15T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;
}
