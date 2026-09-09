import type { RootStackParamList } from "../types";

type BackModule = typeof import("../student-detail-back");

let backModule: Partial<BackModule> = {};
try {
  backModule = jest.requireActual("../student-detail-back") as BackModule;
} catch {
  backModule = {};
}

const resolve = backModule.resolveStudentDetailBackTarget ?? (() => null as never);
const navigateBack = backModule.navigateStudentDetailBack ?? (() => undefined);

describe("student detail Back fallbacks", () => {
  it("exports the durable resolver and navigator", () => {
    expect(typeof backModule.resolveStudentDetailBackTarget).toBe("function");
    expect(typeof backModule.navigateStudentDetailBack).toBe("function");
  });

  it.each([
    ["classes", "Classes"],
    ["home", "Dashboard"],
    ["assessments", "Assessments"],
  ] as const)("returns a class opened from %s to %s", (source, screen) => {
    expect(resolve("ClassDetail", { classId: "class-1", source })).toEqual({
      name: "MainTabs",
      params: { screen },
    });
  });

  it("returns a module to the class Modules workspace", () => {
    expect(resolve("ModuleDetail", { classId: "class-1", moduleId: "module-1", source: "class" })).toEqual({
      name: "ClassDetail",
      params: { classId: "class-1", initialTab: "modules" },
    });
  });

  it("returns a module lesson to the exact module", () => {
    expect(resolve("LessonDetail", {
      classId: "class-1",
      lessonId: "lesson-1",
      moduleId: "module-1",
      source: "module",
    })).toEqual({
      name: "ModuleDetail",
      params: { classId: "class-1", moduleId: "module-1", source: "class" },
    });
  });

  it("returns standalone assessment detail to Assessments", () => {
    expect(resolve("AssessmentDetail", {
      assessmentId: "assessment-1",
      classId: "class-1",
      source: "assessments",
    })).toEqual({ name: "MainTabs", params: { screen: "Assessments" } });
  });

  it("pops actual history before consulting the fallback", () => {
    const navigation = { canGoBack: jest.fn(() => true), goBack: jest.fn(), navigate: jest.fn() };
    navigateBack(navigation as never, "ModuleDetail", {
      classId: "class-1", moduleId: "module-1", source: "class",
    } satisfies RootStackParamList["ModuleDetail"]);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("navigates to the resolved fallback without history", () => {
    const navigation = { canGoBack: jest.fn(() => false), goBack: jest.fn(), navigate: jest.fn() };
    navigateBack(navigation as never, "ModuleDetail", {
      classId: "class-1", moduleId: "module-1", source: "class",
    } satisfies RootStackParamList["ModuleDetail"]);
    expect(navigation.navigate).toHaveBeenCalledWith("ClassDetail", {
      classId: "class-1", initialTab: "modules",
    });
  });
});
