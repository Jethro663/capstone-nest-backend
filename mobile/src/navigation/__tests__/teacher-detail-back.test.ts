import type { RootStackParamList } from "../types";

type BackModule = typeof import("../teacher-detail-back");

let backModule: Partial<BackModule> = {};
try {
  backModule = jest.requireActual("../teacher-detail-back") as BackModule;
} catch {
  backModule = {};
}

const resolve = backModule.resolveTeacherDetailBackTarget ?? (() => null as never);
const navigateBack = backModule.navigateTeacherDetailBack ?? (() => undefined);

describe("teacher detail Back fallbacks", () => {
  it("exports the durable resolver and navigator", () => {
    expect(typeof backModule.resolveTeacherDetailBackTarget).toBe("function");
    expect(typeof backModule.navigateTeacherDetailBack).toBe("function");
  });

  it.each([
    ["classes", "Classes"],
    ["home", "Home"],
    ["announcements", "TeacherAnnouncements"],
    ["calendar", "TeacherCalendar"],
  ] as const)("returns a class opened from %s to %s", (source, screen) => {
    expect(
      resolve("TeacherClassDetail", { classId: "class-1", source }),
    ).toEqual({ name: "TeacherDrawer", params: { screen } });
  });

  it("returns a library module to Teaching Library", () => {
    expect(
      resolve("TeacherModuleDetail", {
        classId: "class-1",
        moduleId: "module-1",
        source: "library",
      }),
    ).toEqual({
      name: "TeacherDrawer",
      params: { screen: "TeacherLibrary" },
    });
  });

  it("returns a class module to the Modules workspace", () => {
    expect(
      resolve("TeacherModuleDetail", {
        classId: "class-1",
        moduleId: "module-1",
        source: "class",
      }),
    ).toEqual({
      name: "TeacherClassDetail",
      params: { classId: "class-1", initialTab: "modules" },
    });
  });

  it("returns a module lesson to the exact module", () => {
    expect(
      resolve("TeacherLessonDetail", {
        classId: "class-1",
        lessonId: "lesson-1",
        moduleId: "module-1",
        source: "module",
      }),
    ).toEqual({
      name: "TeacherModuleDetail",
      params: {
        classId: "class-1",
        moduleId: "module-1",
        source: "class",
      },
    });
  });

  it("preserves a library module origin across a restored lesson route", () => {
    expect(
      resolve("TeacherLessonDetail", {
        classId: "class-1",
        lessonId: "lesson-1",
        moduleId: "module-1",
        source: "module",
        moduleSource: "library",
      }),
    ).toEqual({
      name: "TeacherModuleDetail",
      params: {
        classId: "class-1",
        moduleId: "module-1",
        source: "library",
      },
    });
  });

  it("returns a class lesson without module provenance to Modules", () => {
    expect(
      resolve("TeacherLessonDetail", {
        classId: "class-1",
        lessonId: "lesson-1",
      }),
    ).toEqual({
      name: "TeacherClassDetail",
      params: { classId: "class-1", initialTab: "modules" },
    });
  });

  it("returns the standalone lesson route to the Lessons drawer page", () => {
    expect(
      resolve("TeacherLessonDetail", {
        lessonId: "lesson-1",
        source: "lessons",
      }),
    ).toEqual({
      name: "TeacherDrawer",
      params: { screen: "TeacherLessons" },
    });
  });

  it("returns Add Students to the Students workspace", () => {
    expect(
      resolve("TeacherClassAddStudents", {
        classId: "class-1",
        sourceTab: "students",
      }),
    ).toEqual({
      name: "TeacherClassDetail",
      params: { classId: "class-1", initialTab: "students" },
    });
  });

  it("returns a resumed assessment job to Assessments", () => {
    expect(
      resolve("TeacherAiDraft", {
        classId: "class-1",
        jobId: "job-1",
        source: "assessments",
      }),
    ).toEqual({
      name: "TeacherDrawer",
      params: { screen: "Assessments" },
    });
  });

  it("returns a class AI draft to its recorded class workspace", () => {
    expect(
      resolve("TeacherAiDraft", {
        classId: "class-1",
        source: "class",
        sourceTab: "announcements",
      }),
    ).toEqual({
      name: "TeacherClassDetail",
      params: { classId: "class-1", initialTab: "announcements" },
    });
  });

  it("pops actual history before consulting a fallback", () => {
    const navigation = {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    navigateBack(
      navigation as never,
      "TeacherLessonDetail",
      {
        classId: "class-1",
        lessonId: "lesson-1",
        moduleId: "module-1",
        source: "module",
      } satisfies RootStackParamList["TeacherLessonDetail"],
    );

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("navigates to the resolved fallback without history", () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    navigateBack(
      navigation as never,
      "TeacherLessonDetail",
      {
        classId: "class-1",
        lessonId: "lesson-1",
        moduleId: "module-1",
        source: "module",
      } satisfies RootStackParamList["TeacherLessonDetail"],
    );

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith("TeacherModuleDetail", {
      classId: "class-1",
      moduleId: "module-1",
      source: "class",
    });
  });
});
