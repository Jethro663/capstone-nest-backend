import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator for school year format (YYYY-YYYY+1)
 * e.g., "2024-2025", "2026-2027"
 *
 * Requirements:
 * - Format must be YYYY-YYYY+1
 * - Start year must be 2020 or later (allows historical data & testing)
 * - End year must be exactly startYear + 1
 */
@ValidatorConstraint({ name: 'isValidSchoolYear', async: false })
export class IsValidSchoolYearConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    // Check format: YYYY-YYYY
    const regex = /^\d{4}-\d{4}$/;
    if (!regex.test(value)) return false;

    const [startYear, endYear] = value.split('-').map(Number);

    // End year must be exactly startYear + 1
    if (endYear !== startYear + 1) return false;

    // Start year must be 2020 or later
    if (startYear < 2020) return false;

    return true;
  }

  defaultMessage(): string {
    return 'schoolYear must be in format YYYY-YYYY+1 (e.g., 2026-2027) with start year >= 2020';
  }
}
