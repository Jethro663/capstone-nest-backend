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

  it('treats template as compatible when subject name matches even if subject codes differ', () => {
    expect(
      isTemplateCompatibleWithClass(
        {
          status: 'published',
          name: 'Mathematics Core Template',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
        },
        {
          subjectName: 'Mathematics',
          subjectCode: 'ALGEBRA-7',
          subjectGradeLevel: '7',
        },
      ),
    ).toBe(true);
  });

  it('rejects template when subject name does not match', () => {
    expect(
      isTemplateCompatibleWithClass(
        {
          status: 'published',
          name: 'Science Core Template',
          subjectCode: 'SCI-7',
          subjectGradeLevel: '7',
        },
        {
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
        },
      ),
    ).toBe(false);
  });

  it('builds subject code candidates from subject name hints and explicit input', () => {
    expect(getSubjectCodeCandidates('Mathematics', '')).toEqual(
      expect.arrayContaining(['MATH', 'MATHEMATICS']),
    );
    expect(getSubjectCodeCandidates('Mathematics', 'math-07')).toContain('MATH-7');
  });
});
