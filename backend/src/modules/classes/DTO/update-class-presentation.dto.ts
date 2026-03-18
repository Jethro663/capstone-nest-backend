import { IsOptional, IsString } from 'class-validator';

export class UpdateClassPresentationDto {
  @IsOptional()
  @IsString({ message: 'cardPreset must be a string' })
  cardPreset?: string;

  @IsOptional()
  @IsString({ message: 'cardBannerUrl must be a string' })
  cardBannerUrl?: string | null;
}
