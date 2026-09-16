import { filterTeacherRoster } from "../teacher-roster-search";

const roster = [
  {
    student: {
      firstName: "Maria",
      lastName: "Santos",
      email: "maria.santos@example.edu",
      lrn: "123456789012",
    },
  },
  {
    student: {
      firstName: "Juan",
      lastName: "Dela Cruz",
      email: "juan@example.edu",
      profile: { lrn: "987654321098" },
    },
  },
];

describe("filterTeacherRoster", () => {
  it.each([
    ["maria", "Maria"],
    ["JUAN@EXAMPLE.EDU", "Juan"],
    ["321098", "Juan"],
  ])("matches %s against name, email, or LRN", (query, firstName) => {
    expect(filterTeacherRoster(roster, query)[0]?.student?.firstName).toBe(
      firstName,
    );
  });

  it("keeps all rows for a blank query and reports no unmatched rows", () => {
    expect(filterTeacherRoster(roster, "   ")).toHaveLength(2);
    expect(filterTeacherRoster(roster, "not enrolled")).toEqual([]);
  });
});
