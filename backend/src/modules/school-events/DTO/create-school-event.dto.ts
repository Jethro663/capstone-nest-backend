import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidSchoolYearConstraint } from '../../classes/DTO/validators';

export class CreateSchoolEventDto {
  @ApiProperty({ enum: ['school_event', 'holiday_break'] })
  @IsIn(['school_event', 'holiday_break'], {
    message: 'eventType must be school_event or holiday_break',
  })
  eventType: 'school_event' | 'holiday_break';

  @ApiProperty({ example: '2026-2027' })
  @IsString()
  @Validate(IsValidSchoolYearConstraint)
  schoolYear: string;

  @ApiProperty({ example: 'Foundation Day Program' })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title: string;

  @ApiPropertyOptional({ example: 'School-wide activity at the quadrangle.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Main Campus Quadrangle' })
  @ValidateIf(
    (payload: CreateSchoolEventDto) =>
      payload.eventType === 'school_event' || payload.location !== undefined,
  )
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  @MinLength(1, { message: 'Location is required for school events' })
  @MaxLength(180)
  location?: string;

  @ApiProperty({ example: '2026-10-15T00:00:00.000Z' })
  @IsISO8601()
  startsAt: string;

  @ApiProperty({ example: '2026-10-15T23:59:59.999Z' })
  @IsISO8601()
  endsAt: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;
}
