import type { ClassItem, ScheduleDay } from "../../types/class";

export type TeacherHomeScheduleItem = {
  id: string;
  classItem: ClassItem;
  startMinutes: number;
  endMinutes: number;
  timeLabel: string;
  isInProgress: boolean;
  isNext: boolean;
};

type PriorityAssessment = {
  id: string;
  classId: string;
  title: string;
  dueDate?: string | null;
};

export type TeacherHomePriority = {
  kind: "intervention" | "assessment" | "draft" | "clear";
  title: string;
  detail: string;
  classId?: string;
  assessmentId?: string;
};

const DAY_ALIASES: Record<number, readonly string[]> = {
  0: ["SU", "SUN", "SUNDAY"],
  1: ["M", "MON", "MONDAY"],
  2: ["T", "TU", "TUE", "TUESDAY"],
  3: ["W", "WED", "WEDNESDAY"],
  4: ["TH", "THU", "THURSDAY"],
  5: ["F", "FRI", "FRIDAY"],
  6: ["SA", "SAT", "SATURDAY"],
};

function normalizeDay(day: ScheduleDay | string) {
  return String(day).trim().replaceAll(".", "").toUpperCase();
}

function parseClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatClock(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function buildTeacherHomeSchedule(
  classes: readonly ClassItem[],
  now: Date,
): TeacherHomeScheduleItem[] {
  const dayAliases = DAY_ALIASES[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const items = classes
    .flatMap((classItem) =>
      (classItem.schedules ?? []).flatMap((schedule) => {
        const occursToday = schedule.days.some((day) =>
          dayAliases.includes(normalizeDay(day)),
        );
        if (!occursToday) return [];

        const startMinutes = parseClock(schedule.startTime);
        const endMinutes = parseClock(schedule.endTime);
        if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return [];

        return [{
          id: schedule.id || `${classItem.id}-${startMinutes}`,
          classItem,
          startMinutes,
          endMinutes,
          timeLabel: `${formatClock(startMinutes)}–${formatClock(endMinutes)}`,
          isInProgress: startMinutes <= currentMinutes && currentMinutes < endMinutes,
          isNext: false,
        }];
      }),
    )
    .sort((left, right) => left.startMinutes - right.startMinutes);

  const nextIndex = items.findIndex((item) => item.startMinutes >= currentMinutes);
  return items.map((item, index) => ({ ...item, isNext: index === nextIndex }));
}

function formatPriorityDueDate(value: string | null | undefined, now: Date) {
  if (!value) return "soon";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "soon";
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  if (sameDay) {
    return `today at ${due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function selectTeacherHomePriority(
  input: {
    interventionCount: number;
    interventionClassId?: string;
    draftCount: number;
    upcomingAssessments: readonly PriorityAssessment[];
  },
  now: Date,
): TeacherHomePriority {
  if (input.interventionCount > 0) {
    return {
      kind: "intervention",
      title: `${input.interventionCount} learner${input.interventionCount === 1 ? "" : "s"} may need support`,
      detail: "Review the latest intervention signals before your next class.",
      classId: input.interventionClassId,
    };
  }

  const assessment = input.upcomingAssessments
    .filter((item) => {
      const due = item.dueDate ? new Date(item.dueDate).getTime() : Number.NaN;
      return Number.isFinite(due) && due >= now.getTime();
    })
    .sort(
      (left, right) =>
        new Date(left.dueDate || 0).getTime() - new Date(right.dueDate || 0).getTime(),
    )[0];
  if (assessment) {
    return {
      kind: "assessment",
      title: `${assessment.title} is due ${formatPriorityDueDate(assessment.dueDate, now)}`,
      detail: "Open the assessment to review readiness and submissions.",
      classId: assessment.classId,
      assessmentId: assessment.id,
    };
  }

  if (input.draftCount > 0) {
    return {
      kind: "draft",
      title: `${input.draftCount} assessment draft${input.draftCount === 1 ? "" : "s"} waiting`,
      detail: "Continue a draft when you are ready; nothing was changed automatically.",
    };
  }

  return {
    kind: "clear",
    title: "You are caught up",
    detail: "No urgent class, assessment, or intervention item needs action right now.",
  };
}

export function formatTeacherHomeDate(now: Date) {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
