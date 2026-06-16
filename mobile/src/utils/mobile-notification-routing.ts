import type { MobileNotification } from "../types/notification";

type NavigateFn = (name: string, params?: unknown) => void;

export type MobileNotificationAction = {
  routeName: string;
  params?: unknown;
  fallbackRouteName: string;
  fallbackParams?: unknown;
  requiresReference: boolean;
  kind: "assessment" | "announcement" | "discussion" | "grade" | "intervention" | "extraction" | "history";
  label: string;
};

const AT_RISK_TERMS = ["at risk", "at-risk", "flagged"];
const INTERVENTION_ALERT_TERMS = ["intervention", "support plan"];
const BLUE_REMINDER_TYPES = new Set(["student_pending_task_reminder", "student_pending_intervention_reminder"]);
const BLUE_INTERVENTION_TERMS = ["checklist", "learner path", "learners path", "assigned path", "pending intervention"];
const ASSESSMENT_TYPES = new Set([
  "assessment_assigned",
  "assessment_due",
  "assessment_graded",
  "student_pending_task_reminder",
]);

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function mainTabAction(tabName: string, label: string, kind: MobileNotificationAction["kind"]): MobileNotificationAction {
  return {
    routeName: "MainTabs",
    params: { screen: tabName },
    fallbackRouteName: "MainTabs",
    fallbackParams: { screen: tabName },
    requiresReference: false,
    kind,
    label,
  };
}

function historyAction() {
  return mainTabAction("Announcements", "Open Notifications", "history");
}

export function getMobileNotificationMessage(notification: Pick<MobileNotification, "message" | "body">) {
  const message = notification.message?.trim();
  if (message) return message;
  return notification.body?.trim() || "A new update is available.";
}

export function isMobileInterventionAlertNotification(
  notification: Pick<MobileNotification, "type" | "title" | "message" | "body">,
) {
  if (BLUE_REMINDER_TYPES.has(notification.type)) return false;

  const joined = normalizeText(
    `${notification.type} ${notification.title} ${notification.message ?? ""} ${notification.body ?? ""}`,
  );

  if (AT_RISK_TERMS.some((term) => joined.includes(term))) return true;
  if (BLUE_INTERVENTION_TERMS.some((term) => joined.includes(term))) return false;
  return INTERVENTION_ALERT_TERMS.some((term) => joined.includes(term));
}

export function resolveMobileNotificationAction(
  notification: MobileNotification,
  role: string | null,
): MobileNotificationAction {
  const normalizedRole = normalizeText(role);
  const referenceId = notification.referenceId || undefined;

  if (notification.type === "student_pending_intervention_reminder") {
    return {
      routeName: "LXP",
      params: referenceId ? { classId: referenceId, tab: "paths" } : { tab: "paths" },
      fallbackRouteName: "LXP",
      fallbackParams: { tab: "paths" },
      requiresReference: false,
      kind: "intervention",
      label: "Open Learners Path",
    };
  }

  if (notification.type === "teacher_pending_intervention_reminder") {
    return {
      routeName: "TeacherInterventions",
      params: referenceId ? { classId: referenceId } : undefined,
      fallbackRouteName: "TeacherInterventions",
      requiresReference: false,
      kind: "intervention",
      label: "Open Interventions",
    };
  }

  if (isMobileInterventionAlertNotification(notification)) {
    if (normalizedRole === "teacher") {
      return {
        routeName: referenceId ? "TeacherInterventionDetail" : "TeacherInterventions",
        params: referenceId ? { caseId: referenceId } : undefined,
        fallbackRouteName: "TeacherInterventions",
        requiresReference: Boolean(referenceId),
        kind: "intervention",
        label: "Open Intervention",
      };
    }

    return {
      routeName: "LXP",
      params: { tab: "case" },
      fallbackRouteName: "LXP",
      fallbackParams: { tab: "paths" },
      requiresReference: false,
      kind: "intervention",
      label: "Open Learners Path",
    };
  }

  if (ASSESSMENT_TYPES.has(notification.type)) {
    if (normalizedRole === "teacher") {
      return {
        routeName: referenceId ? "TeacherAssessmentDetail" : "MainTabs",
        params: referenceId ? { assessmentId: referenceId } : { screen: "Assessments" },
        fallbackRouteName: "MainTabs",
        fallbackParams: { screen: "Assessments" },
        requiresReference: Boolean(referenceId),
        kind: "assessment",
        label: "Open Assessment",
      };
    }

    return {
      routeName: "AssessmentHistory",
      params: referenceId ? { assessmentId: referenceId } : undefined,
      fallbackRouteName: "AssessmentHistory",
      requiresReference: Boolean(referenceId),
      kind: "assessment",
      label: "Open Assessment",
    };
  }

  if (notification.type === "announcement_posted") {
    if (normalizedRole === "teacher") {
      return {
        routeName: "TeacherAnnouncements",
        fallbackRouteName: "TeacherAnnouncements",
        requiresReference: false,
        kind: "announcement",
        label: "Open Announcements",
      };
    }
    return mainTabAction("Announcements", "Open Announcements", "announcement");
  }

  if (notification.type === "discussion_thread_posted" || notification.type === "discussion_comment_posted") {
    return mainTabAction("Classes", "Open Classes", "discussion");
  }

  if (notification.type === "grade_updated") {
    if (normalizedRole === "teacher") {
      return {
        routeName: "TeacherClassRecord",
        fallbackRouteName: "TeacherClassRecord",
        requiresReference: false,
        kind: "grade",
        label: "Open Class Record",
      };
    }
    return {
      routeName: "Performance",
      fallbackRouteName: "Performance",
      requiresReference: false,
      kind: "grade",
      label: "Open Performance",
    };
  }

  if (notification.type === "extraction_completed" || notification.type === "extraction_failed") {
    return {
      routeName: referenceId ? "TeacherExtractionDetail" : "MainTabs",
      params: referenceId ? { extractionId: referenceId } : { screen: "Classes" },
      fallbackRouteName: "MainTabs",
      fallbackParams: { screen: "Classes" },
      requiresReference: Boolean(referenceId),
      kind: "extraction",
      label: "Open Extraction",
    };
  }

  return historyAction();
}

async function validateMobileNotificationAction(action: MobileNotificationAction, notification: MobileNotification) {
  if (!action.requiresReference) return true;
  const referenceId = notification.referenceId;
  if (!referenceId) return false;

  if (action.kind === "assessment") {
    const { assessmentsApi } = await import("../api/services/assessments");
    await assessmentsApi.getById(referenceId);
    return true;
  }

  if (action.kind === "intervention") {
    const { lxpApi } = await import("../api/services/lxp");
    await lxpApi.getTeacherCaseDetail(referenceId);
    return true;
  }

  if (action.kind === "extraction") {
    const { extractionsApi } = await import("../api/services/extractions");
    await extractionsApi.getById(referenceId);
    return true;
  }

  if (action.kind === "discussion") {
    const { classesApi } = await import("../api/services/classes");
    await classesApi.getById(referenceId);
    return true;
  }

  return true;
}

export async function openMobileNotification(
  notification: MobileNotification,
  role: string | null,
  navigate: NavigateFn,
) {
  const action = resolveMobileNotificationAction(notification, role);

  try {
    const valid = await validateMobileNotificationAction(action, notification);
    if (valid) {
      navigate(action.routeName, action.params);
      return;
    }
  } catch {
    // Fall through to the known-safe fallback route.
  }

  navigate(action.fallbackRouteName, action.fallbackParams);
}
