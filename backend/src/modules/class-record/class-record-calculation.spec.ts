import { calculateStudentRecord } from './class-record-calculation';
import { getDefaultAcademicPolicy } from '../academic-state/academic-policy';
const legacy = getDefaultAcademicPolicy('2025-2026');
const modern = getDefaultAcademicPolicy('2026-2027');
const category = { id: 'ww', name: 'Written Works', weightPercentage: '100' };
function item(id: string, score: string | null, status = 'recorded') {
  return {
    id,
    categoryId: 'ww',
    maxScore: '100',
    scores:
      score === null && status === 'recorded'
        ? []
        : [
            {
              studentId: 's',
              score,
              status,
              reason: status === 'excused' ? 'Approved accommodation' : null,
            },
          ],
  };
}
describe('complete class record calculation', () => {
  it('does not round an initial grade across a transmutation threshold', () => {
    const result = calculateStudentRecord(
      's',
      modern,
      [category],
      [{ ...item('a', '69.9996'), maxScore: '100' }],
    );
    expect(result.initialGrade).toBe(70);
    expect(result.quarterlyGrade).toBe(74);
  });
  it('keeps missing evidence provisional rather than treating it as zero', () => {
    const result = calculateStudentRecord(
      's',
      legacy,
      [category],
      [item('a', null)],
    );
    expect(result.quarterlyGrade).toBeNull();
    expect(result.initialGrade).toBeNull();
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_score', itemId: 'a' }),
      ]),
    );
  });
  it('accepts an explicit zero', () => {
    const result = calculateStudentRecord(
      's',
      legacy,
      [category],
      [item('a', '0')],
    );
    expect(result.blockers).toEqual([]);
    expect(result.initialGrade).toBe(0);
    expect(result.quarterlyGrade).toBe(60);
  });
  it('excludes excused HPS for the individual learner', () => {
    const result = calculateStudentRecord(
      's',
      legacy,
      [category],
      [item('a', '80'), item('b', null, 'excused')],
    );
    expect(result.initialGrade).toBe(80);
    expect(result.categoryBreakdown[0].totalHPS).toBe(100);
  });
  it('blocks an entirely excused required category and unjustified exemptions', () => {
    expect(
      calculateStudentRecord(
        's',
        legacy,
        [category],
        [item('a', null, 'excused')],
      ).blockers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'empty_student_category' }),
      ]),
    );
    const unjustified = item('a', null, 'excused');
    unjustified.scores[0].reason = null;
    expect(
      calculateStudentRecord('s', legacy, [category], [unjustified]).blockers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_exemption' }),
      ]),
    );
  });
  it('ignores unused slots and detects missing configured categories', () => {
    expect(
      calculateStudentRecord(
        's',
        legacy,
        [category],
        [item('a', '80'), { ...item('unused', null), maxScore: '0' }],
      ).blockers,
    ).toEqual([]);
    expect(
      calculateStudentRecord('s', legacy, [category], []).blockers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'empty_category' }),
      ]),
    );
  });
  it('weights ST1/ST2/TE by 30/30/40 rather than their possible points', () => {
    const exam = {
      id: 'ex',
      name: 'Quarterly Assessment',
      weightPercentage: '100',
    };
    const items = [
      {
        ...item('st1', '10'),
        categoryId: 'ex',
        maxScore: '10',
        examComponent: 'ST1',
      },
      {
        ...item('st2', '0'),
        categoryId: 'ex',
        maxScore: '20',
        examComponent: 'ST2',
      },
      {
        ...item('te', '50'),
        categoryId: 'ex',
        maxScore: '100',
        examComponent: 'TE',
      },
    ];
    const result = calculateStudentRecord('s', modern, [exam], items);
    expect(result.initialGrade).toBe(50);
    expect(result.blockers).toEqual([]);
    expect(
      calculateStudentRecord('s', modern, [exam], items.slice(0, 2)).blockers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_exam_component' }),
      ]),
    );
  });
  it('rejects scores over HPS and unknown students do not inherit another score', () => {
    expect(
      calculateStudentRecord('s', legacy, [category], [item('a', '101')])
        .blockers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_score' }),
      ]),
    );
    expect(
      calculateStudentRecord('other', legacy, [category], [item('a', '90')])
        .quarterlyGrade,
    ).toBeNull();
  });

  it('caps each reasoned bonus before category aggregation', () => {
    const result = calculateStudentRecord(
      's',
      legacy,
      [category],
      [
        {
          id: 'bonus-item',
          categoryId: category.id,
          maxScore: '10',
          scores: [
            {
              studentId: 's',
              score: '5',
              bonusPoints: '15',
              bonusReason: 'Teacher-approved correction',
              status: 'recorded',
            },
          ],
        },
        {
          id: 'zero-item',
          categoryId: category.id,
          maxScore: '10',
          scores: [
            {
              studentId: 's',
              score: '0',
              bonusPoints: '0',
              bonusReason: null,
              status: 'recorded',
            },
          ],
        },
      ],
    );

    expect(result.blockers).toEqual([]);
    expect(result.categoryBreakdown[0]).toMatchObject({
      totalRaw: 10,
      totalHPS: 20,
      percentageScore: 50,
      weightedScore: 50,
    });
    expect(result.initialGrade).toBe(50);
  });
});
