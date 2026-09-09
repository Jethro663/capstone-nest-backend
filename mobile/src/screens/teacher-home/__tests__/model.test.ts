import type { ClassItem } from "../../../types/class";
import {
  buildTeacherHomeSchedule,
  formatTeacherHomeDate,
  selectTeacherHomePriority,
} from "../model";

function classItem(overrides: Partial<ClassItem> & Pick<ClassItem, "id" | "subjectCode">): ClassItem {
  return {
    subjectName: overrides.subjectCode,
    sectionId: `${overrides.id}-section`,
    schoolYear: "2026-2027",
    isActive: true,
    ...overrides,
  };
}

describe("teacher home model", () => {
  const now = new Date(2026, 8, 9, 8, 30, 0);

  it("orders today's class blocks and marks the first class that has not started as next", () => {
    const schedule = buildTeacherHomeSchedule(
      [
        classItem({
          id: "late",
          subjectCode: "SCI",
          room: "Lab 2",
          schedules: [{ id: "late-schedule", days: ["W"], startTime: "10:00", endTime: "11:00" }],
        }),
        classItem({
          id: "early",
          subjectCode: "ENG",
          schedules: [{ id: "early-schedule", days: ["W"], startTime: "08:00", endTime: "09:00" }],
        }),
        classItem({
          id: "tomorrow",
          subjectCode: "MATH",
          schedules: [{ id: "tomorrow-schedule", days: ["Th"], startTime: "07:00", endTime: "08:00" }],
        }),
      ],
      now,
    );

    expect(schedule.map((item) => item.classItem.id)).toEqual(["early", "late"]);
    expect(schedule.find((item) => item.isNext)?.classItem.id).toBe("late");
    expect(schedule[0]).toMatchObject({ timeLabel: "8:00 AM–9:00 AM", isInProgress: true });
  });

  it("accepts backend clock values with seconds and ignores malformed blocks", () => {
    const schedule = buildTeacherHomeSchedule(
      [
        classItem({
          id: "valid",
          subjectCode: "ICT",
          schedules: [{ id: "valid-schedule", days: ["W"], startTime: "13:00:00", endTime: "14:30:00" }],
        }),
        classItem({
          id: "invalid",
          subjectCode: "BAD",
          schedules: [{ id: "invalid-schedule", days: ["W"], startTime: "later", endTime: "soon" }],
        }),
      ],
      now,
    );

    expect(schedule).toHaveLength(1);
    expect(schedule[0].timeLabel).toBe("1:00 PM–2:30 PM");
  });

  it("prioritizes learner intervention, then a due assessment, then drafts", () => {
    expect(
      selectTeacherHomePriority(
        { interventionCount: 1, draftCount: 2, upcomingAssessments: [] },
        now,
      ).kind,
    ).toBe("intervention");

    expect(
      selectTeacherHomePriority(
        {
          interventionCount: 0,
          draftCount: 2,
          upcomingAssessments: [
            { id: "assessment-1", title: "Quarter quiz", classId: "class-1", dueDate: "2026-09-10T08:00:00+08:00" },
          ],
        },
        now,
      ),
    ).toMatchObject({ kind: "assessment", assessmentId: "assessment-1", classId: "class-1" });

    expect(
      selectTeacherHomePriority(
        { interventionCount: 0, draftCount: 2, upcomingAssessments: [] },
        now,
      ).kind,
    ).toBe("draft");
  });

  it("formats the campus date without adding procedural status text", () => {
    expect(formatTeacherHomeDate(now)).toBe("Wednesday, September 9");
  });
});
