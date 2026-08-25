import { IsString, ValidateIf, Allow } from 'class-validator';

export class UpdateClassPresentationDto {
  @Allow()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString({ message: 'cardPreset must be a string' })
  cardPreset?: string | null;

  @Allow()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString({ message: 'cardBannerUrl must be a string' })
  cardBannerUrl?: string | null;
}
