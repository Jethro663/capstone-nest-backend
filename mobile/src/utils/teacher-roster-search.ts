type SearchableTeacherRosterEntry = {
  student?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    lrn?: string | null;
    profile?: { lrn?: string | null } | null;
  } | null;
};

function normalizeRosterValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

export function filterTeacherRoster<T extends SearchableTeacherRosterEntry>(
  rows: T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeRosterValue(query);
  if (!normalizedQuery) return rows;

  return rows.filter((entry) => {
    const student = entry.student;
    const fullName = [student?.firstName, student?.lastName]
      .filter(Boolean)
      .join(" ");
    return [fullName, student?.email, student?.lrn, student?.profile?.lrn].some(
      (value) => normalizeRosterValue(value).includes(normalizedQuery),
    );
  });
}
