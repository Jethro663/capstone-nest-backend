import {
  IsString,
  IsNumber,
  Min,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId: string;

  @IsOptional()
  @IsUUID('4', { message: 'assessmentId must be a valid UUID' })
  assessmentId?: string;

  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title must not be empty' })
  title: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'maxScore must be a number' })
  @Min(0.01, { message: 'maxScore must be greater than 0' })
  maxScore: number;

  @IsOptional()
  @IsISO8601({}, { message: 'dateGiven must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  dateGiven?: string;
}
