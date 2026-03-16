export function getCurrentToFutureSchoolYears(span = 4): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();

  return Array.from({ length: span }, (_, index) => {
    const startYear = currentYear + index;
    const endYear = startYear + 1;
    return `${startYear}-${endYear}`;
  });
}
