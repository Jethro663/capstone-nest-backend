import { selectAnnualSources } from './annual-grade-sources';
import { getDefaultAcademicPolicy } from './academic-policy';
const policy = getDefaultAcademicPolicy('2026-2027');
const source = (id: string, period: string, classId = 'c') => ({
  id,
  period,
  grade: 80,
  sourceType: 'period_revision' as const,
  classId,
  trusted: true,
});
describe('annual source selection', () => {
  it('combines the same subject across different section classes', () => {
    const result = selectAnnualSources(
      policy,
      [
        source('a', 'Q1', 'old'),
        source('b', 'Q2', 'new'),
        source('c', 'Q3', 'new'),
      ],
      [],
    );
    expect(result.blockers).toEqual([]);
    expect(result.components.map((component) => component.sourceId)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
  it('reports missing periods and refuses a partial annual grade', () => {
    const result = selectAnnualSources(policy, [source('a', 'Q1')], []);
    expect(result.blockers.map((blocker) => blocker.period)).toEqual([
      'Q2',
      'Q3',
    ]);
  });
  it('requires explicit selection for duplicate sources even if their grades match', () => {
    const sources = [
      source('a', 'Q1'),
      source('duplicate', 'Q1'),
      source('b', 'Q2'),
      source('c', 'Q3'),
    ];
    expect(selectAnnualSources(policy, sources, []).blockers[0].code).toBe(
      'conflicting_period_sources',
    );
    expect(
      selectAnnualSources(policy, sources, [
        { period: 'Q1', sourceId: 'a', sourceType: 'period_revision' },
      ]).blockers,
    ).toEqual([]);
  });
  it('never substitutes another source when a selected source is stale or untrusted', () => {
    const sources = [source('a', 'Q1'), source('b', 'Q2'), source('c', 'Q3')];
    expect(
      selectAnnualSources(policy, sources, [
        { period: 'Q1', sourceId: 'stale', sourceType: 'period_revision' },
      ]).blockers[0].code,
    ).toBe('stale_source_selection');
    sources[0].trusted = false;
    expect(selectAnnualSources(policy, sources, []).blockers[0].code).toBe(
      'untrusted_period_source',
    );
  });
  it('accepts verified external period evidence without inventing item scores', () => {
    const result = selectAnnualSources(
      policy,
      [
        { ...source('external', 'Q1'), sourceType: 'external', classId: null },
        source('b', 'Q2'),
        source('c', 'Q3'),
      ],
      [],
    );
    expect(result.components[0]).toMatchObject({
      sourceType: 'external',
      sourceId: 'external',
      classId: null,
    });
    expect(result.blockers).toEqual([]);
  });
});
