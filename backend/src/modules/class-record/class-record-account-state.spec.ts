import { toClassRecordAccountState } from './class-record-account-state';

describe('toClassRecordAccountState', () => {
  it.each([
    ['DELETED', 'archived'],
    ['ACTIVE', 'active'],
    ['PENDING', 'active'],
    ['SUSPENDED', 'active'],
    [null, 'active'],
  ] as const)('maps %s to %s', (status, expected) => {
    expect(toClassRecordAccountState(status)).toBe(expected);
  });
});
