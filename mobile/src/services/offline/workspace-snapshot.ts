import AsyncStorage from "@react-native-async-storage/async-storage";

export type WorkspaceSnapshotKind =
  | "student_overview"
  | "teacher_overview"
  | "calendar";

type SnapshotStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<unknown>;
};

const PREFIX = "nexora.offline-workspace.v1";
const SCHEMA_VERSION = 1;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type SnapshotEnvelope = {
  schemaVersion: 1;
  userId: string;
  kind: WorkspaceSnapshotKind;
  savedAt: number;
  expiresAt: number;
  payload: unknown;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function schedules(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    return [
      {
        id: text(item.id),
        days: Array.isArray(item.days)
          ? item.days.filter((day): day is string => typeof day === "string")
          : [],
        startTime: text(item.startTime),
        endTime: text(item.endTime),
      },
    ];
  });
}

function classes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    const section = record(item.section);
    return [
      {
        id: text(item.id),
        sectionId: text(item.sectionId),
        isActive: item.isActive === true,
        subjectName: text(item.subjectName),
        subjectCode: text(item.subjectCode),
        schoolYear: text(item.schoolYear),
        room: nullableText(item.room),
        section: section
          ? {
              id: text(section.id),
              name: text(section.name),
              gradeLevel: text(section.gradeLevel),
            }
          : null,
        enrollmentCount: number(item.enrollmentCount),
        schedules: schedules(item.schedules),
      },
    ];
  });
}

function assessments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    return [
      {
        id: text(item.id),
        classId: text(item.classId),
        title: text(item.title),
        dueDate: nullableText(item.dueDate),
        isPublished: item.isPublished === true,
        createdAt: nullableText(item.createdAt),
      },
    ];
  });
}

function announcements(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    return [
      {
        id: text(item.id),
        classId: text(item.classId),
        title: text(item.title),
        createdAt: text(item.createdAt),
        scheduledAt: nullableText(item.scheduledAt),
        publishedAt: nullableText(item.publishedAt),
      },
    ];
  });
}

function schoolEvents(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    return [
      {
        id: text(item.id),
        eventType: text(item.eventType),
        schoolYear: text(item.schoolYear),
        title: text(item.title),
        location: nullableText(item.location),
        startsAt: text(item.startsAt),
        endsAt: text(item.endsAt),
        allDay: item.allDay === true,
      },
    ];
  });
}

function sanitizePayload(kind: WorkspaceSnapshotKind, value: unknown) {
  const input = record(value);
  if (!input) return null;
  if (kind === "student_overview") {
    if (!Array.isArray(input.courses)) return null;
    return {
      courses: input.courses.flatMap((entry) => {
        const item = record(entry);
        if (!item) return [];
        return [
          {
            id: text(item.id),
            subjectName: text(item.subjectName),
            subjectCode: text(item.subjectCode),
            subjectGradeLevel: text(item.subjectGradeLevel),
            schoolYear: text(item.schoolYear),
            sectionName: text(item.sectionName),
            sectionGradeLevel: text(item.sectionGradeLevel),
            teacherName: text(item.teacherName),
            totalLessons: number(item.totalLessons),
            completedLessonCount: number(item.completedLessonCount),
            totalAssessments: number(item.totalAssessments),
            assessmentDueCount: number(item.assessmentDueCount),
            announcementCount: number(item.announcementCount),
            classmateCount: number(item.classmateCount),
            progress: number(item.progress),
            schedules: schedules(item.schedules),
          },
        ];
      }),
      generatedAt: text(input.generatedAt),
    };
  }
  if (!Array.isArray(input.classes)) return null;
  if (kind === "teacher_overview") {
    return {
      classes: classes(input.classes),
      assessments: assessments(input.assessments),
      announcements: announcements(input.announcements),
      generatedAt: text(input.generatedAt),
    };
  }
  return {
    classes: classes(input.classes),
    assessments: assessments(input.assessments),
    announcements: announcements(input.announcements),
    schoolEvents: schoolEvents(input.schoolEvents),
    sections: {
      classes: "ok",
      assessments: "ok",
      announcements: "ok",
      schoolEvents: "ok",
    },
    snapshotRange: (() => {
      const range = record(input.snapshotRange);
      return range ? { from: text(range.from), to: text(range.to) } : undefined;
    })(),
    generatedAt: text(input.generatedAt),
  };
}

export class OfflineWorkspaceSnapshotStore {
  constructor(
    private readonly storage: SnapshotStorage,
    private readonly now: () => number = Date.now,
  ) {}

  async write(
    userId: string,
    kind: WorkspaceSnapshotKind,
    payload: unknown,
  ): Promise<void> {
    const safePayload = sanitizePayload(kind, payload);
    if (!safePayload) return;
    const savedAt = this.now();
    const envelope: SnapshotEnvelope = {
      schemaVersion: SCHEMA_VERSION,
      userId,
      kind,
      savedAt,
      expiresAt: savedAt + MAX_AGE_MS,
      payload: safePayload,
    };
    await this.storage.setItem(
      this.key(userId, kind),
      JSON.stringify(envelope),
    );
  }

  async read(
    userId: string,
    kind: WorkspaceSnapshotKind,
  ): Promise<{ payload: unknown; savedAt: number } | null> {
    const key = this.key(userId, kind);
    try {
      const raw = await this.storage.getItem(key);
      if (!raw) return null;
      const envelope = JSON.parse(raw) as Partial<SnapshotEnvelope>;
      if (
        envelope.schemaVersion !== SCHEMA_VERSION ||
        envelope.userId !== userId ||
        envelope.kind !== kind ||
        typeof envelope.savedAt !== "number" ||
        typeof envelope.expiresAt !== "number" ||
        envelope.expiresAt <= this.now()
      ) {
        await this.storage.removeItem(key);
        return null;
      }
      const payload = sanitizePayload(kind, envelope.payload);
      if (!payload) {
        await this.storage.removeItem(key);
        return null;
      }
      return { payload, savedAt: envelope.savedAt };
    } catch {
      await this.storage.removeItem(key).catch(() => undefined);
      return null;
    }
  }

  async purgeUser(userId: string): Promise<void> {
    const prefix = `${PREFIX}.${encodeURIComponent(userId)}.`;
    const keys = (await this.storage.getAllKeys()).filter((key) =>
      key.startsWith(prefix),
    );
    if (keys.length > 0) await this.storage.multiRemove(keys);
  }

  private key(userId: string, kind: WorkspaceSnapshotKind): string {
    return `${PREFIX}.${encodeURIComponent(userId)}.${kind}`;
  }
}

export const workspaceSnapshotStore = new OfflineWorkspaceSnapshotStore(
  AsyncStorage,
);
