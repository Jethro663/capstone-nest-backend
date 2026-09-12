import { resetDeleteOrder, resetIdentifier } from './system-reset.database';

describe('reset deletion ordering', () => {
  it('deletes children before parents without cascade or constraint disabling', () => {
    expect(
      resetDeleteOrder(
        ['users', 'classes', 'lessons'],
        [
          { table: 'classes', target: 'users' },
          { table: 'lessons', target: 'classes' },
        ],
      ),
    ).toEqual(['lessons', 'classes', 'users']);
  });
  it('blocks a future cycle before deleting any data', () => {
    expect(() =>
      resetDeleteOrder(
        ['users', 'classes'],
        [
          { table: 'classes', target: 'users' },
          { table: 'users', target: 'classes' },
        ],
      ),
    ).toThrow('cycle');
  });
  it('supports same-table relationships when clearing the whole table', () => {
    expect(
      resetDeleteOrder(
        ['library_folders'],
        [{ table: 'library_folders', target: 'library_folders' }],
      ),
    ).toEqual(['library_folders']);
  });
  it('never accepts untrusted SQL identifiers', () => {
    expect(() => resetIdentifier('users; DROP SCHEMA public')).toThrow();
    expect(() => resetIdentifier('Unreviewed')).toThrow();
    expect(resetIdentifier('users')).toBe('"users"');
  });
});
