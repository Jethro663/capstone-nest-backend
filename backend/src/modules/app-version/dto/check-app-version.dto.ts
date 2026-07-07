import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CheckAppVersionDto {
  @ApiPropertyOptional({ example: 'android', enum: ['android', 'ios'] })
  @IsOptional()
  @IsString()
  @IsIn(['android', 'ios'])
  platform?: string = 'android';

  @ApiPropertyOptional({ example: '0.1.0' })
  @IsOptional()
  @IsString()
  currentNativeVersion?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  currentOtaVersion?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currentVersionCode?: number;
}
