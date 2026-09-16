export interface SearchableStudentRosterRow {
  fullName: string;
  email: string;
  lrn: string;
}

function normalizeRosterSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function filterStudentRoster<T extends SearchableStudentRosterRow>(
  rows: T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeRosterSearchValue(query);
  if (!normalizedQuery) return rows;

  return rows.filter((row) =>
    [row.fullName, row.email, row.lrn].some((value) =>
      normalizeRosterSearchValue(value).includes(normalizedQuery),
    ),
  );
}
