const { isHarmlessMigrationError } = require('../../migration-error-policy');

describe('migration error policy', () => {
  it('does not suppress an undefined PostgreSQL type or object', () => {
    expect(isHarmlessMigrationError({ code: '42704' })).toBe(false);
  });

  it('continues to tolerate duplicate objects for idempotent replay', () => {
    expect(isHarmlessMigrationError({ code: '42710' })).toBe(true);
  });
});
