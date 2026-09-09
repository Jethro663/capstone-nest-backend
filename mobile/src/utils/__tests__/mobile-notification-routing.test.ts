import type { MobileNotification } from "../../types/notification";
import { resolveMobileNotificationAction } from "../mobile-notification-routing";

function notification(
  type: string,
  referenceId?: string,
  title = type,
): MobileNotification {
  return {
    id: `notification-${type}`,
    userId: "teacher-1",
    type,
    title,
    message: type,
    isRead: false,
    referenceId,
    createdAt: "2026-09-10T08:00:00.000Z",
  };
}

describe("teacher mobile notification drawer routing", () => {
  it("opens the interventions primary workspace through TeacherDrawer", () => {
    expect(
      resolveMobileNotificationAction(
        notification("teacher_pending_intervention_reminder", "class-1"),
        "teacher",
      ),
    ).toMatchObject({
      routeName: "TeacherDrawer",
      params: {
        screen: "TeacherInterventions",
        params: { classId: "class-1" },
      },
      fallbackRouteName: "TeacherDrawer",
    });
  });

  it("opens teacher announcements and class record through TeacherDrawer", () => {
    expect(
      resolveMobileNotificationAction(notification("announcement_posted"), "teacher"),
    ).toMatchObject({
      routeName: "TeacherDrawer",
      params: { screen: "TeacherAnnouncements" },
    });
    expect(
      resolveMobileNotificationAction(notification("grade_updated"), "teacher"),
    ).toMatchObject({
      routeName: "TeacherDrawer",
      params: { screen: "TeacherClassRecord" },
    });
  });

  it("keeps teacher intervention details on the outer stack with a drawer fallback", () => {
    expect(
      resolveMobileNotificationAction(
        notification("intervention_alert", "case-1", "Student at risk"),
        "teacher",
      ),
    ).toMatchObject({
      routeName: "TeacherInterventionDetail",
      params: { caseId: "case-1" },
      fallbackRouteName: "TeacherDrawer",
      fallbackParams: { screen: "TeacherInterventions" },
    });
  });

  it("preserves the non-teacher extraction fallback on MainTabs", () => {
    expect(
      resolveMobileNotificationAction(notification("extraction_completed"), "student"),
    ).toMatchObject({
      routeName: "MainTabs",
      params: { screen: "Classes" },
      fallbackRouteName: "MainTabs",
    });
  });
});
