import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PeriodParticipantDto {
  @IsUUID('4')
  studentId: string;

  @IsIn(['eligible', 'not_enrolled', 'transferred', 'withdrawn'])
  eligibility: 'eligible' | 'not_enrolled' | 'transferred' | 'withdrawn';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class ConfirmPeriodRosterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;

  @IsArray()
  @ArrayUnique((entry: PeriodParticipantDto) => entry.studentId)
  @ValidateNested({ each: true })
  @Type(() => PeriodParticipantDto)
  participants: PeriodParticipantDto[];
}

export class AcademicCorrectionReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
