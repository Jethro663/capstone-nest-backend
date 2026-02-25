import { IsString, IsNumber, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name must not be empty' })
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'weightPercentage must be a number' })
  @Min(0.01, { message: 'weightPercentage must be greater than 0' })
  @Max(100, { message: 'weightPercentage must not exceed 100' })
  weightPercentage?: number;
}
