import {
  getSubjectCodeCandidates,
  isTemplateCompatibleWithClass,
  normalizeSubjectCode,
} from '../class-template-compat';

describe('class template compatibility', () => {
  it('normalizes subject code variants to the same canonical value', () => {
    expect(normalizeSubjectCode('math-07')).toBe('MATH-7');
    expect(normalizeSubjectCode('Math 7')).toBe('MATH-7');
    expect(normalizeSubjectCode('MATH7')).toBe('MATH-7');
  });

  it('treats published templates with normalized matching codes as compatible', () => {
    expect(
      isTemplateCompatibleWithClass(
        {
          status: 'published',
          subjectCode: 'MATH-07',
          subjectGradeLevel: '7',
        },
        {
          subjectCode: 'math-7',
          subjectGradeLevel: '7',
        },
      ),
    ).toBe(true);
  });

  it('builds subject code candidates from subject name hints and explicit input', () => {
    expect(getSubjectCodeCandidates('Mathematics', '')).toEqual(
      expect.arrayContaining(['MATH', 'MATHEMATICS']),
    );
    expect(getSubjectCodeCandidates('Mathematics', 'math-07')).toContain('MATH-7');
  });
});
