export function normalizeSubjectCode(value: string | null | undefined) {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!raw) {
    return '';
  }

  const compact = raw.replace(/-/g, '');
  const match = compact.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return raw;
  }

  const [, prefix, numericSuffix] = match;
  return `${prefix}-${String(Number(numericSuffix))}`;
}

export function areSubjectCodesEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return normalizeSubjectCode(left) === normalizeSubjectCode(right);
}
