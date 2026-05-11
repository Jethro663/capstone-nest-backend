import { IsString, Matches } from 'class-validator';

export class ImpactPreviewQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'schoolYear must be in YYYY-YYYY format',
  })
  schoolYear: string;
}
