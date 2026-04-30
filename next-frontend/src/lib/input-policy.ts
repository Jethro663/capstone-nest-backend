const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const EMAIL_ALLOWED_CHARS_REGEX = /[^a-z0-9@._+-]/g;
const PERSON_NAME_ALLOWED_CHARS_REGEX = /[^A-Za-z\s'-]/g;
const ADDRESS_ALLOWED_CHARS_REGEX = /[^A-Za-z0-9\s.,#'/-]/g;
const EMPLOYEE_ID_ALLOWED_CHARS_REGEX = /[^A-Za-z0-9-]/g;
const SECTION_NAME_ALLOWED_CHARS_REGEX = /[^A-Za-z0-9\s'-]/g;
const SUBJECT_CODE_ALLOWED_CHARS_REGEX = /[^A-Za-z0-9-]/g;
const ROOM_LABEL_ALLOWED_CHARS_REGEX = /[^A-Za-z0-9\s#/-]/g;
const LABEL_TEXT_ALLOWED_CHARS_REGEX = /[^A-Za-z0-9\s.'/-]/g;

function stripControlChars(value: string) {
  return value.replace(CONTROL_CHARS_REGEX, '');
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeWithAllowedChars(
  value: string,
  pattern: RegExp,
  maxLength: number,
) {
  const normalized = collapseWhitespace(stripControlChars(value).replace(pattern, ''));
  return normalized.slice(0, maxLength);
}

export function sanitizeEmailInput(value: string, maxLength = 100) {
  const normalized = stripControlChars(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(EMAIL_ALLOWED_CHARS_REGEX, '');

  return normalized.slice(0, maxLength);
}

export function sanitizePasswordInput(value: string, maxLength = 128) {
  return stripControlChars(value).slice(0, maxLength);
}

export function hasEdgeWhitespace(value: string) {
  return value.trim() !== value;
}

export function sanitizePersonNameInput(value: string, maxLength = 80) {
  return sanitizeWithAllowedChars(value, PERSON_NAME_ALLOWED_CHARS_REGEX, maxLength);
}

export function sanitizePhoneLocalInput(value: string, maxLength = 11) {
  const digits = stripControlChars(value).replace(/\D/g, '');
  if (!digits) return '';

  let normalized = digits;
  if (normalized.startsWith('63')) {
    normalized = `0${normalized.slice(2)}`;
  } else if (normalized.startsWith('9')) {
    normalized = `0${normalized}`;
  }

  return normalized.slice(0, maxLength);
}

export function sanitizeLrnInput(value: string, maxLength = 12) {
  return stripControlChars(value).replace(/\D/g, '').slice(0, maxLength);
}

export function sanitizeAddressInput(value: string, maxLength = 180) {
  return sanitizeWithAllowedChars(value, ADDRESS_ALLOWED_CHARS_REGEX, maxLength);
}

export function sanitizeEmployeeIdInput(value: string, maxLength = 20) {
  return stripControlChars(value)
    .toUpperCase()
    .replace(EMPLOYEE_ID_ALLOWED_CHARS_REGEX, '')
    .slice(0, maxLength);
}

export function sanitizeSectionNameInput(value: string, maxLength = 100) {
  return sanitizeWithAllowedChars(value, SECTION_NAME_ALLOWED_CHARS_REGEX, maxLength);
}

export function sanitizeSubjectCodeInput(value: string, maxLength = 20) {
  return stripControlChars(value)
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(SUBJECT_CODE_ALLOWED_CHARS_REGEX, '')
    .slice(0, maxLength);
}

export function sanitizeRoomLabelInput(value: string, maxLength = 50) {
  return sanitizeWithAllowedChars(value, ROOM_LABEL_ALLOWED_CHARS_REGEX, maxLength);
}

export function sanitizeLabelTextInput(value: string, maxLength = 80) {
  return sanitizeWithAllowedChars(value, LABEL_TEXT_ALLOWED_CHARS_REGEX, maxLength);
}

export function isPasswordInputSafe(value: string) {
  return !CONTROL_CHARS_REGEX.test(value);
}
