import { filterStudentRoster } from "./student-roster-search";

const rows = [
  {
    fullName: "Maria Santos",
    email: "maria.santos@example.edu",
    lrn: "123456789012",
  },
  {
    fullName: "Juan Dela Cruz",
    email: "juan@example.edu",
    lrn: "987654321098",
  },
];

describe("filterStudentRoster", () => {
  it.each([
    ["maria", "Maria Santos"],
    ["JUAN@EXAMPLE.EDU", "Juan Dela Cruz"],
    ["321098", "Juan Dela Cruz"],
  ])("matches %s against name, email, or LRN", (query, expectedName) => {
    expect(filterStudentRoster(rows, query)).toEqual([
      expect.objectContaining({ fullName: expectedName }),
    ]);
  });

  it("returns all rows for whitespace and no rows for an unmatched query", () => {
    expect(filterStudentRoster(rows, "   ")).toHaveLength(2);
    expect(filterStudentRoster(rows, "not enrolled")).toEqual([]);
  });
});
