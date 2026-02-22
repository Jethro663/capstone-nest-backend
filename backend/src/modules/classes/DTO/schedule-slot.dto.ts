import {
  IsArray,
  ArrayMinSize,
  IsIn,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export const VALID_DAYS = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'] as const;
export type DayAbbreviation = typeof VALID_DAYS[number];

/**
 * A single time-slot for a class schedule.
 * Multiple slots allowed per class (e.g. lecture + lab).
 *
 * Example payload:
 *   { days: ['M', 'W', 'F'], startTime: '10:00', endTime: '11:00' }
 */
export class ScheduleSlotDto {
  @IsArray({ message: 'days must be an array' })
  @ArrayMinSize(1, { message: 'days must contain at least one day' })
  @IsIn(VALID_DAYS, { each: true, message: 'Each day must be one of: M, T, W, Th, F, Sa, Su' })
  days: string[];

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format (24-hour), e.g. "09:00"' })
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:MM format (24-hour), e.g. "10:00"' })
  endTime: string;
}
