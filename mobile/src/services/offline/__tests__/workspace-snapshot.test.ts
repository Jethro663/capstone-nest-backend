import { OfflineWorkspaceSnapshotStore } from "../workspace-snapshot";

describe("OfflineWorkspaceSnapshotStore", () => {
  const now = new Date("2026-09-18T12:00:00.000Z").getTime();
  let values: Map<string, string>;
  let store: OfflineWorkspaceSnapshotStore;

  beforeEach(() => {
    values = new Map();
    store = new OfflineWorkspaceSnapshotStore(
      {
        getItem: async (key) => values.get(key) ?? null,
        setItem: async (key, value) => {
          values.set(key, value);
        },
        removeItem: async (key) => {
          values.delete(key);
        },
        getAllKeys: async () => [...values.keys()],
        multiRemove: async (keys) => keys.forEach((key) => values.delete(key)),
      },
      () => now,
    );
  });

  it("serializes only the approved low-sensitivity student overview allowlist", async () => {
    await store.write("user-1", "student_overview", {
      generatedAt: "2026-09-18T11:50:00.000Z",
      courses: [
        {
          id: "class-1",
          subjectName: "Mathematics",
          subjectCode: "MATH-7",
          sectionName: "Bonifacio",
          teacherName: "Teacher",
          totalLessons: 10,
          completedLessonCount: 4,
          totalAssessments: 3,
          classmateCount: 40,
          progress: 40,
          grade: 99,
          privateStudentList: ["student-2"],
        },
      ],
      accessToken: "secret-token",
    });

    const serialized = [...values.values()][0];
    expect(serialized).toContain("Mathematics");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("privateStudentList");
    expect(serialized).not.toContain('"grade"');
  });

  it("uses schema- and user-scoped keys and rejects expired snapshots", async () => {
    await store.write("user-1", "student_overview", { courses: [] });
    expect([...values.keys()][0]).toBe(
      "nexora.offline-workspace.v1.user-1.student_overview",
    );

    const expiredStore = new OfflineWorkspaceSnapshotStore(
      {
        getItem: async (key) => values.get(key) ?? null,
        setItem: async () => undefined,
        removeItem: async (key) => {
          values.delete(key);
        },
        getAllKeys: async () => [...values.keys()],
        multiRemove: async () => undefined,
      },
      () => now + 24 * 60 * 60 * 1000 + 1,
    );

    await expect(
      expiredStore.read("user-1", "student_overview"),
    ).resolves.toBeNull();
    expect(values.size).toBe(0);
  });

  it("rejects corrupt or cross-user data", async () => {
    values.set(
      "nexora.offline-workspace.v1.user-1.student_overview",
      "not-json",
    );
    await expect(store.read("user-1", "student_overview")).resolves.toBeNull();

    values.set(
      "nexora.offline-workspace.v1.user-1.student_overview",
      JSON.stringify({
        schemaVersion: 1,
        userId: "user-2",
        kind: "student_overview",
        savedAt: now,
        expiresAt: now + 1000,
        payload: { courses: [] },
      }),
    );
    await expect(store.read("user-1", "student_overview")).resolves.toBeNull();
  });

  it("purges every snapshot for a logged-out account without touching another user", async () => {
    await store.write("user-1", "student_overview", { courses: [] });
    await store.write("user-1", "calendar", { classes: [] });
    await store.write("user-2", "student_overview", { courses: [] });

    await store.purgeUser("user-1");

    expect([...values.keys()]).toEqual([
      "nexora.offline-workspace.v1.user-2.student_overview",
    ]);
  });

  it("keeps only the calendar range marker needed to reject the wrong cached month", async () => {
    await store.write("user-1", "calendar", {
      classes: [],
      snapshotRange: {
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-10-12T23:59:59.999Z",
      },
      unsafeQuery: "private-data",
    });

    const result = await store.read("user-1", "calendar");
    expect(result?.payload).toEqual(
      expect.objectContaining({
        snapshotRange: {
          from: "2026-09-01T00:00:00.000Z",
          to: "2026-10-12T23:59:59.999Z",
        },
      }),
    );
    expect(JSON.stringify(result?.payload)).not.toContain("private-data");
  });
});
