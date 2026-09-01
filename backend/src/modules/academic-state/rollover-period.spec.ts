import { resolveRolloverPeriod } from './rollover-period';

describe('explicit assessment rollover period mapping', () => {
  it('preserves a valid source period without an administrator mapping', () => {
    expect(resolveRolloverPeriod('Q1', {}, ['Q1', 'Q2', 'Q3', 'Q4'])).toBe(
      'Q1',
    );
  });
  it('rejects Q4 in a destination policy without Q4', () => {
    expect(() =>
      resolveRolloverPeriod('Q4', { Q4: 'Q4' }, ['Q1', 'Q2', 'Q3']),
    ).toThrow('destination');
  });
  it('preserves Q4 when the destination policy supports four quarters', () => {
    expect(
      resolveRolloverPeriod('Q4', { Q4: 'Q4' }, ['Q1', 'Q2', 'Q3', 'Q4']),
    ).toBe('Q4');
  });
  it('does not downgrade Q4 when a conflicting old mapping is supplied', () => {
    expect(
      resolveRolloverPeriod('Q4', { Q4: 'Q3' }, ['Q1', 'Q2', 'Q3', 'Q4']),
    ).toBe('Q4');
    expect(
      resolveRolloverPeriod(null, { unassigned: 'Q2' }, [
        'Q1',
        'Q2',
        'Q3',
        'Q4',
      ]),
    ).toBe('Q2');
  });
});
