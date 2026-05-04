import {
  sanitizeAddressInput,
  sanitizeEmailInput,
  sanitizeEmployeeIdInput,
  sanitizeLabelTextInput,
  sanitizePasswordInput,
  sanitizePersonNameInput,
  sanitizePhoneLocalInput,
  sanitizeRoomLabelInput,
  sanitizeSectionNameInput,
  sanitizeSubjectCodeInput,
} from './input-policy';

describe('input-policy', () => {
  it('normalizes email input to lowercase trimmed text without spaces or emoji', () => {
    expect(sanitizeEmailInput('  Alex.User+1 @Example.COM🙂  ')).toBe(
      'alex.user+1@example.com',
    );
  });

  it('preserves password spaces while removing control characters and line breaks', () => {
    expect(sanitizePasswordInput('  Test@123 \n\t')).toBe('  Test@123 ');
  });

  it('keeps only supported characters in person names and collapses spacing', () => {
    expect(sanitizePersonNameInput("  Ana@@  Marie-- O'Neil 123🙂 ")).toBe(
      "Ana Marie-- O'Neil",
    );
  });

  it('sanitizes local PH phone input to 11 digits', () => {
    expect(sanitizePhoneLocalInput('+63917-123-4567abc')).toBe('09171234567');
  });

  it('allows limited punctuation in addresses while removing script-like characters', () => {
    expect(
      sanitizeAddressInput("  Blk. 4, Lot #2 <North> / Phase🙂 1  "),
    ).toBe('Blk. 4, Lot #2 North / Phase 1');
  });

  it('uppercases employee IDs and strips unsupported characters', () => {
    expect(sanitizeEmployeeIdInput(' emp_2026-01🙂 ')).toBe('EMP2026-01');
  });

  it('sanitizes section, subject, room, and label text inputs by field policy', () => {
    expect(sanitizeSectionNameInput(" Kamia @ Section🙂 ")).toBe('Kamia Section');
    expect(sanitizeSubjectCodeInput(' math-7 / rm🙂 ')).toBe('MATH-7RM');
    expect(sanitizeRoomLabelInput(' Room #201/B 🙂 ')).toBe('Room #201/B');
    expect(sanitizeLabelTextInput('Sci./Math & Research🙂')).toBe('Sci./Math Research');
  });
});
