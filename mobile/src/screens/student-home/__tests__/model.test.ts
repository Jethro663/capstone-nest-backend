import { buildStudentHomeAgenda } from "../model";

describe("buildStudentHomeAgenda", () => {
  const input = {
    now: new Date("2026-09-10T08:00:00+08:00"),
    assessments: [
      { id: "later", dueAt: "2026-09-12T09:00:00+08:00" },
      { id: "overdue", dueAt: "2026-09-09T17:00:00+08:00" },
      { id: "soon", dueAt: "2026-09-10T10:00:00+08:00" },
    ],
    schedule: [
      { id: "afternoon", startsAtMinutes: 780 },
      { id: "morning", startsAtMinutes: 540 },
    ],
    continueLearning: [{ id: "lesson-1" }, { id: "lesson-2" }],
  };

  it("prioritizes overdue work and keeps due work in chronological order", () => {
    const agenda = buildStudentHomeAgenda(input);

    expect(agenda.next).toEqual({ kind: "assessment", id: "overdue" });
    expect(agenda.dueSoon.map((item) => item.id)).toEqual([
      "overdue",
      "soon",
      "later",
    ]);
  });

  it("keeps today and continue-learning lists short and predictable", () => {
    const agenda = buildStudentHomeAgenda(input);

    expect(agenda.today.map((item) => item.id)).toEqual([
      "morning",
      "afternoon",
    ]);
    expect(agenda.continueLearning).toEqual([{ id: "lesson-1" }]);
  });

  it("falls back from due work to learning, then to class schedule", () => {
    expect(
      buildStudentHomeAgenda({
        ...input,
        assessments: [],
      }).next,
    ).toEqual({ kind: "lesson", id: "lesson-1" });

    expect(
      buildStudentHomeAgenda({
        ...input,
        assessments: [],
        continueLearning: [],
      }).next,
    ).toEqual({ kind: "schedule", id: "morning" });
  });
});
