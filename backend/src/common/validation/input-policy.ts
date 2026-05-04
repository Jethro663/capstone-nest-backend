export const PASSWORD_SAFE_REGEX = /^[^\u0000-\u001F\u007F]*$/;
export const PH_MOBILE_REGEX = /^(?:\+63|0)9\d{9}$/;
export const PERSON_NAME_REGEX = /^[A-Za-z][A-Za-z' -]*$/;
export const ADDRESS_REGEX = /^[A-Za-z0-9\s.,#'/-]+$/;
export const LABEL_TEXT_REGEX = /^[A-Za-z0-9\s.'/-]+$/;
export const EMPLOYEE_ID_REGEX = /^[A-Z0-9-]{1,20}$/;
export const SECTION_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s'-]*$/;
export const SUBJECT_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s'-]*$/;
export const SUBJECT_CODE_REGEX = /^[A-Z0-9-]+$/;
export const ROOM_LABEL_REGEX = /^[A-Za-z0-9\s#/-]+$/;

export function trimValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export function collapseWhitespace(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;
}

export function lowerTrimmedValue(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function upperTrimmedValue(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
