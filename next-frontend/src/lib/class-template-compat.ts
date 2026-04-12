type TemplateLike = {
  status?: string | null;
  subjectCode?: string | null;
  subjectGradeLevel?: string | null;
  name?: string | null;
};

type ClassLike = {
  subjectCode?: string | null;
  subjectGradeLevel?: string | null;
};

const SUBJECT_CODE_HINTS: Record<string, string[]> = {
  science: ['SCI', 'SCIENCE'],
  'araling panlipunan': ['AP', 'ARALING', 'PANLIPUNAN'],
  mathematics: ['MATH', 'MATHEMATICS'],
  english: ['ENG', 'ENGLISH'],
  fili: ['FIL', 'FILI', 'FILIPINO'],
  tle: ['TLE'],
  values: ['VALUES', 'ESP'],
  mapeh: ['MAPEH'],
};

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

export function getSubjectCodeCandidates(
  subjectName: string,
  subjectCodeInput: string,
) {
  const candidates = new Set<string>();
  const explicitCode = normalizeSubjectCode(subjectCodeInput);

  if (explicitCode) {
    candidates.add(explicitCode);
  }

  const key = subjectName.trim().toLowerCase();
  const hints = SUBJECT_CODE_HINTS[key] ?? [subjectName];

  for (const hint of hints) {
    const normalizedHint = normalizeSubjectCode(hint);
    if (normalizedHint) {
      candidates.add(normalizedHint);
    }
  }

  return Array.from(candidates);
}

export function matchesTemplateToSubject(
  template: TemplateLike,
  subjectName: string,
  subjectCodeInput: string,
) {
  const templateCode = normalizeSubjectCode(template.subjectCode);
  const templateName = String(template.name ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const candidates = getSubjectCodeCandidates(subjectName, subjectCodeInput);

  return candidates.some((candidate) => {
    const token = normalizeSubjectCode(candidate).replace(/-/g, '');
    if (!token) {
      return false;
    }

    const normalizedTemplateCode = templateCode.replace(/-/g, '');
    return (
      normalizedTemplateCode === token ||
      normalizedTemplateCode.includes(token) ||
      token.includes(normalizedTemplateCode) ||
      templateName.includes(token)
    );
  });
}

export function isTemplateCompatibleWithClass(
  template: TemplateLike,
  classValues: ClassLike,
) {
  return (
    template.status === 'published' &&
    String(template.subjectGradeLevel ?? '').trim() ===
      String(classValues.subjectGradeLevel ?? '').trim() &&
    normalizeSubjectCode(template.subjectCode) ===
      normalizeSubjectCode(classValues.subjectCode)
  );
}
