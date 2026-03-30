import { IsOptional, IsString } from 'class-validator';

export class UpdateSectionPresentationDto {
  @IsOptional()
  @IsString({ message: 'cardBannerUrl must be a string' })
  cardBannerUrl?: string | null;
}
