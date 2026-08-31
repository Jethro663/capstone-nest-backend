import type { Assessment } from "@/types/assessment";
import type { ClassItem } from "@/types/class";
import type { SchoolEvent } from "@/types/school-event";
import {
  type StudentUpcomingEvent,
  toDateKey,
} from "@/components/student/my-classes/types";

interface BuildStudentUpcomingEventsOptions {
  classes: ClassItem[];
  assessmentsByClass: Record<string, Assessment[]>;
  schoolEvents: SchoolEvent[];
  now?: Date;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildStudentUpcomingEvents({
  classes,
  assessmentsByClass,
  schoolEvents,
  now = new Date(),
}: BuildStudentUpcomingEventsOptions): StudentUpcomingEvent[] {
  const activeClasses = classes.filter((classItem) => classItem.isActive);
  const activeClassMap = new Map(
    activeClasses.map((classItem) => [classItem.id, classItem]),
  );
  const activeSchoolYears = new Set(
    activeClasses.map((classItem) => classItem.schoolYear),
  );
  const events = new Map<string, StudentUpcomingEvent>();

  for (const [classId, assessments] of Object.entries(assessmentsByClass)) {
    const classItem = activeClassMap.get(classId);
    if (!classItem) continue;

    for (const assessment of assessments) {
      const dueDate = parseDate(assessment.dueDate);
      const activity = assessment.studentActivity;
      if (
        !assessment.isPublished ||
        (assessment.academicCapabilities &&
          !(activity?.ongoingAttemptId
            ? assessment.academicCapabilities.canContinue
            : assessment.academicCapabilities.canStart)) ||
        !dueDate ||
        dueDate.getTime() < now.getTime() ||
        !activity ||
        activity.hasSubmittedAttempt
      ) {
        continue;
      }

      const id = `assessment-${assessment.id}`;
      const classLabel =
        classItem.subjectName ||
        classItem.className ||
        classItem.name ||
        "Class";
      const statusLabel = activity.ongoingAttemptId
        ? `Continue assessment • Due ${timeLabel(dueDate)}`
        : `Due ${timeLabel(dueDate)}`;
      events.set(id, {
        id,
        classId,
        title: assessment.title,
        subtitle: `${classLabel} • ${statusLabel}`,
        tag: "assessment",
        href: `/dashboard/student/assessments/${assessment.id}`,
        timestamp: dueDate.getTime(),
        dateKey: toDateKey(dueDate),
        dayLabel: String(dueDate.getDate()).padStart(2, "0"),
        monthLabel: monthLabel(dueDate),
      });
    }
  }

  for (const schoolEvent of schoolEvents) {
    if (!activeSchoolYears.has(schoolEvent.schoolYear)) continue;
    const startsAt = parseDate(schoolEvent.startsAt);
    const endsAt = parseDate(schoolEvent.endsAt);
    if (!startsAt || !endsAt || endsAt.getTime() < now.getTime()) continue;

    const id = `school-${schoolEvent.id}`;
    events.set(id, {
      id,
      classId: "all",
      title: schoolEvent.title,
      subtitle:
        schoolEvent.description ||
        schoolEvent.location ||
        (schoolEvent.eventType === "holiday_break"
          ? "School holiday"
          : "School event"),
      tag: schoolEvent.eventType === "holiday_break" ? "holiday" : "event",
      href: `/dashboard/student/calendar?date=${toDateKey(startsAt)}`,
      timestamp: startsAt.getTime(),
      dateKey: toDateKey(startsAt),
      dayLabel: String(startsAt.getDate()).padStart(2, "0"),
      monthLabel: monthLabel(startsAt),
    });
  }

  return Array.from(events.values()).sort(
    (left, right) =>
      left.timestamp - right.timestamp || left.title.localeCompare(right.title),
  );
}
