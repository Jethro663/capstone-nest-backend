import { resolveRolloverPeriod } from './rollover-period';

describe('explicit assessment rollover period mapping', () => {
  it('never silently copies an unmapped source period', () => {
    expect(() => resolveRolloverPeriod('Q1', {}, ['Q1', 'Q2', 'Q3'])).toThrow(
      'explicit',
    );
  });
  it('rejects Q4 in a destination policy without Q4', () => {
    expect(() =>
      resolveRolloverPeriod('Q4', { Q4: 'Q4' }, ['Q1', 'Q2', 'Q3']),
    ).toThrow('destination');
  });
  it('maps only copied content, using the administrator selection', () => {
    expect(resolveRolloverPeriod('Q4', { Q4: 'Q3' }, ['Q1', 'Q2', 'Q3'])).toBe(
      'Q3',
    );
    expect(
      resolveRolloverPeriod(null, { unassigned: 'Q2' }, ['Q1', 'Q2', 'Q3']),
    ).toBe('Q2');
  });
});
