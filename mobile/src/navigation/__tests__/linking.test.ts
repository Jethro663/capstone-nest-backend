import {
  consumePendingMobileDeepLink,
  createMobileLinking,
  deferMobileDeepLink,
  parseMobileDeepLink,
  resolveMobileDeepLink,
} from "../linking";

describe("mobile deep linking", () => {
  it("parses only the declared custom scheme and exact allowlisted shapes", () => {
    expect(
      parseMobileDeepLink("nexora-lms-mobile://assessment/assessment-1"),
    ).toEqual({ kind: "assessment", resourceId: "assessment-1" });
    expect(parseMobileDeepLink("nexora-lms-mobile:///notifications")).toEqual({
      kind: "notifications",
    });
    expect(
      parseMobileDeepLink("https://example.com/assessment/assessment-1"),
    ).toBeNull();
    expect(parseMobileDeepLink("nexora-lms-mobile://unknown/value")).toBeNull();
    expect(
      parseMobileDeepLink("nexora-lms-mobile://assessment/id/extra"),
    ).toBeNull();
    expect(
      parseMobileDeepLink("nexora-lms-mobile://assessment/id%2Fescape"),
    ).toBeNull();
  });

  it("maps the same assessment descriptor to role-appropriate screens", () => {
    expect(
      resolveMobileDeepLink(
        "nexora-lms-mobile://assessment/assessment-1",
        "student",
      ),
    ).toMatchObject({
      status: "accepted",
      target: {
        routeName: "AssessmentHistory",
        params: { assessmentId: "assessment-1" },
      },
    });
    expect(
      resolveMobileDeepLink(
        "nexora-lms-mobile://assessment/assessment-1",
        "teacher",
      ),
    ).toMatchObject({
      status: "accepted",
      target: {
        routeName: "TeacherAssessmentDetail",
        params: { assessmentId: "assessment-1" },
      },
    });
  });

  it("rejects role-inappropriate intervention destinations", () => {
    expect(
      resolveMobileDeepLink(
        "nexora-lms-mobile://intervention/case-1",
        "student",
      ),
    ).toEqual({ status: "rejected", reason: "role_not_allowed" });
  });

  it("defers authenticated destinations until the role is known", () => {
    expect(
      resolveMobileDeepLink("nexora-lms-mobile://class/class-1", null),
    ).toMatchObject({ status: "deferred" });
  });

  it("retains one safe pre-auth link and consumes it after role restoration", () => {
    expect(deferMobileDeepLink("nexora-lms-mobile://class/class-1")).toBe(true);
    expect(consumePendingMobileDeepLink("student")).toBe(
      "nexora-lms-mobile://class/class-1",
    );
    expect(consumePendingMobileDeepLink("student")).toBeNull();
  });

  it("drops a deferred destination that the restored role cannot open", () => {
    expect(deferMobileDeepLink("nexora-lms-mobile://intervention/case-1")).toBe(
      true,
    );
    expect(consumePendingMobileDeepLink("student")).toBeNull();
    expect(consumePendingMobileDeepLink("teacher")).toBeNull();
  });

  it("builds a typed role-scoped React Navigation linking map", () => {
    const unauthenticated = createMobileLinking(null);
    const teacher = createMobileLinking("teacher");

    expect(unauthenticated.enabled).toBe(true);
    expect(unauthenticated.getInitialURL).toEqual(expect.any(Function));
    expect(unauthenticated.subscribe).toEqual(expect.any(Function));
    expect(teacher.enabled).toBe(true);
    expect(teacher.prefixes).toEqual(["nexora-lms-mobile://"]);
    expect(teacher.filter?.("nexora-lms-mobile://intervention/case-1")).toBe(
      true,
    );
    expect(teacher.filter?.("nexora-lms-mobile://made-up/value")).toBe(false);
  });
});
