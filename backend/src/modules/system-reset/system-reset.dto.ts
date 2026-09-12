import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { PeriodKey } from '../academic-state/academic-policy';
import { RESET_ACKNOWLEDGEMENTS } from './system-reset.catalog';

export class ResetPolicyDto {
  @IsString()
  @Matches(/^\d{4}-\d{4}$/)
  schoolYear!: string;
}

export class ResetPreviewDto extends ResetPolicyDto {
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4', 'T1', 'T2', 'T3'])
  period!: PeriodKey;
}

export class ResetExecuteDto {
  @IsString()
  @Length(10, 64000)
  previewToken!: string;

  @IsUUID('4')
  idempotencyKey!: string;

  @IsString()
  @Length(10, 500)
  reason!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  currentPassword!: string;

  @IsString()
  @Length(1, 150)
  confirmation!: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(RESET_ACKNOWLEDGEMENTS, { each: true })
  acknowledgements!: string[];
}
