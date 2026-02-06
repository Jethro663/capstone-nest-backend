import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator for school year format (YYYY-YYYY+1)
 * e.g., "2026-2027", "2027-2028"
 * 
 * Requirements:
 * - Format must be YYYY-YYYY+1
 * - Start year must be 2026 or later
 * - End year must be exactly startYear + 1
 */
@ValidatorConstraint({ name: 'isValidSchoolYear', async: false })
export class IsValidSchoolYearConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string): boolean {
    // Check format: YYYY-YYYY
    const regex = /^\d{4}-\d{4}$/;
    if (!regex.test(value)) return false;

    const [startYear, endYear] = value.split('-').map(Number);

    // End year must be exactly startYear + 1
    if (endYear !== startYear + 1) return false;

    // Start year must be 2026 or later
    if (startYear < 2026) return false;

    return true;
  }

  defaultMessage(): string {
    return 'schoolYear must be in format YYYY-YYYY+1 (e.g., 2026-2027) with start year >= 2026';
  }
}

/**
 * Custom validator for schedule format
 * Expected format: days time_range, e.g., "M,W,F 10:00 - 11:00"
 * 
 * Requirements:
 * - Days: comma-separated single or double letters (M, T, W, Th, F, Sa, Su)
 * - Times: HH:MM format in 24-hour time
 * - Separator: dash with optional spaces
 */
@ValidatorConstraint({ name: 'isValidSchedule', async: false })
export class IsValidScheduleConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string | undefined): boolean {
    if (!value) return true; // Schedule is optional

    // Format: "M,W,F 10:00 - 11:00" or "M,T,W 14:30 - 15:30"
    // Days can be M, T, W, Th, F, Sa, Su (comma-separated)
    // Times in HH:MM format
    const regex = /^[A-Za-z,]+\s+\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/;
    if (!regex.test(value)) return false;

    // Additional validation: validate time ranges
    const match = value.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
    if (!match) return false;

    const startHour = parseInt(match[1], 10);
    const startMin = parseInt(match[2], 10);
    const endHour = parseInt(match[3], 10);
    const endMin = parseInt(match[4], 10);

    // Validate hours and minutes
    if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59)
      return false;
    if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59)
      return false;

    // End time must be after start time
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    if (endMinutes <= startMinutes) return false;

    return true;
  }

  defaultMessage(): string {
    return 'schedule must be in format "DAYS TIME_START - TIME_END" (e.g., "M,W,F 10:00 - 11:00") with valid times';
  }
}
