import { IsDateString } from 'class-validator';

export class MobileCalendarQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
