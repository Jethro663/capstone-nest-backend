import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const MOBILE_DEEP_LINK_PREFIX = "nexora-lms-mobile://";

export type MobileDeepLinkRole = "student" | "teacher" | "admin";

export type MobileDeepLinkDescriptor =
  | { kind: "notifications" | "home" | "performance" }
  | {
      kind: "assessment" | "class" | "lesson" | "intervention";
      resourceId: string;
    };

export type MobileDeepLinkTarget = {
  routeName: keyof RootStackParamList;
  params?: unknown;
};

export type MobileDeepLinkResolution =
  | { status: "accepted"; target: MobileDeepLinkTarget }
  | { status: "deferred"; descriptor: MobileDeepLinkDescriptor }
  | { status: "rejected"; reason: "invalid_link" | "role_not_allowed" };

const RESOURCE_KINDS = new Set([
  "assessment",
  "class",
  "lesson",
  "intervention",
]);
const SINGLETON_KINDS = new Set(["notifications", "home", "performance"]);
const SAFE_RESOURCE_ID = /^[A-Za-z0-9_-]{1,128}$/;
let pendingMobileDeepLink: string | null = null;

export type MobileUrlRuntime = {
  getInitialURL: () => Promise<string | null>;
  subscribe: (listener: (url: string) => void) => () => void;
};

const EMPTY_URL_RUNTIME: MobileUrlRuntime = {
  getInitialURL: async () => null,
  subscribe: () => () => undefined,
};

function decodeSafeSegment(segment: string): string | null {
  try {
    const decoded = decodeURIComponent(segment);
    return SAFE_RESOURCE_ID.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function parseMobileDeepLink(
  value: string,
): MobileDeepLinkDescriptor | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "nexora-lms-mobile:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash
  ) {
    return null;
  }

  const rawSegments = [parsed.hostname, ...parsed.pathname.split("/")].filter(
    Boolean,
  );
  if (rawSegments.length === 1 && SINGLETON_KINDS.has(rawSegments[0])) {
    return {
      kind: rawSegments[0] as "notifications" | "home" | "performance",
    };
  }

  if (rawSegments.length !== 2 || !RESOURCE_KINDS.has(rawSegments[0])) {
    return null;
  }

  const resourceId = decodeSafeSegment(rawSegments[1]);
  if (!resourceId) return null;

  return {
    kind: rawSegments[0] as "assessment" | "class" | "lesson" | "intervention",
    resourceId,
  };
}

export function resolveAllowedMobileDestination(
  descriptor: MobileDeepLinkDescriptor,
  role: MobileDeepLinkRole,
): MobileDeepLinkTarget | null {
  if (descriptor.kind === "notifications") {
    return { routeName: "Notifications" };
  }

  if (descriptor.kind === "home") {
    return role === "teacher"
      ? { routeName: "TeacherDrawer", params: { screen: "Home" } }
      : {
          routeName: "MainTabs",
          params: { screen: role === "admin" ? "Home" : "Dashboard" },
        };
  }

  if (descriptor.kind === "performance") {
    if (role === "student") return { routeName: "Performance" };
    if (role === "teacher") {
      return {
        routeName: "TeacherDrawer",
        params: { screen: "TeacherPerformance" },
      };
    }
    return null;
  }

  if (descriptor.kind === "assessment") {
    if (role === "student") {
      return {
        routeName: "AssessmentHistory",
        params: { assessmentId: descriptor.resourceId },
      };
    }
    return {
      routeName: "TeacherAssessmentDetail",
      params: { assessmentId: descriptor.resourceId },
    };
  }

  if (descriptor.kind === "class") {
    return role === "student"
      ? {
          routeName: "ClassDetail",
          params: { classId: descriptor.resourceId, source: "classes" },
        }
      : {
          routeName: "TeacherClassDetail",
          params: { classId: descriptor.resourceId, source: "classes" },
        };
  }

  if (descriptor.kind === "lesson") {
    return role === "student"
      ? {
          routeName: "LessonDetail",
          params: { lessonId: descriptor.resourceId, source: "lessons" },
        }
      : {
          routeName: "TeacherLessonDetail",
          params: { lessonId: descriptor.resourceId, source: "lessons" },
        };
  }

  if (descriptor.kind === "intervention" && role !== "student") {
    return {
      routeName: "TeacherInterventionDetail",
      params: { caseId: descriptor.resourceId },
    };
  }

  return null;
}

export function resolveMobileDeepLink(
  value: string,
  role: MobileDeepLinkRole | null,
): MobileDeepLinkResolution {
  const descriptor = parseMobileDeepLink(value);
  if (!descriptor) return { status: "rejected", reason: "invalid_link" };
  if (!role) return { status: "deferred", descriptor };

  const target = resolveAllowedMobileDestination(descriptor, role);
  return target
    ? { status: "accepted", target }
    : { status: "rejected", reason: "role_not_allowed" };
}

export function deferMobileDeepLink(value: string): boolean {
  if (!parseMobileDeepLink(value)) return false;
  pendingMobileDeepLink = value;
  return true;
}

export function consumePendingMobileDeepLink(
  role: MobileDeepLinkRole,
): string | null {
  const value = pendingMobileDeepLink;
  pendingMobileDeepLink = null;
  if (!value) return null;
  return resolveMobileDeepLink(value, role).status === "accepted"
    ? value
    : null;
}

function roleScreens(role: MobileDeepLinkRole) {
  const shared = { Notifications: "notifications" };
  if (role === "student") {
    return {
      ...shared,
      MainTabs: { screens: { Dashboard: "home" } },
      AssessmentHistory: "assessment/:assessmentId",
      ClassDetail: "class/:classId",
      LessonDetail: "lesson/:lessonId",
      Performance: "performance",
    };
  }
  if (role === "teacher") {
    return {
      ...shared,
      TeacherDrawer: {
        screens: { Home: "home", TeacherPerformance: "performance" },
      },
      TeacherAssessmentDetail: "assessment/:assessmentId",
      TeacherClassDetail: "class/:classId",
      TeacherLessonDetail: "lesson/:lessonId",
      TeacherInterventionDetail: "intervention/:caseId",
    };
  }
  return {
    ...shared,
    MainTabs: { screens: { Home: "home" } },
    TeacherAssessmentDetail: "assessment/:assessmentId",
    TeacherClassDetail: "class/:classId",
    TeacherLessonDetail: "lesson/:lessonId",
    TeacherInterventionDetail: "intervention/:caseId",
  };
}

export function createMobileLinking(
  role: MobileDeepLinkRole | null,
  onRejected?: (reason: "invalid_link" | "role_not_allowed") => void,
  runtime: MobileUrlRuntime = EMPTY_URL_RUNTIME,
): LinkingOptions<RootStackParamList> {
  const handleUrl = (value: string): string | null => {
    const resolution = resolveMobileDeepLink(value, role);
    if (resolution.status === "accepted") return value;
    if (resolution.status === "deferred") {
      deferMobileDeepLink(value);
      return null;
    }
    onRejected?.(resolution.reason);
    return null;
  };

  return {
    enabled: true,
    prefixes: [MOBILE_DEEP_LINK_PREFIX],
    filter: (url) =>
      role !== null && resolveMobileDeepLink(url, role).status === "accepted",
    getInitialURL: async () => {
      const deferred = role ? consumePendingMobileDeepLink(role) : null;
      if (deferred) return deferred;
      const initialUrl = await runtime.getInitialURL();
      return initialUrl ? handleUrl(initialUrl) : null;
    },
    subscribe: (listener) => {
      const unsubscribe = runtime.subscribe((url) => {
        const accepted = handleUrl(url);
        if (accepted) listener(accepted);
      });
      if (role) {
        const deferred = consumePendingMobileDeepLink(role);
        if (deferred) {
          setTimeout(() => listener(deferred), 0);
        }
      }
      return unsubscribe;
    },
    config: role
      ? ({
          screens: roleScreens(role),
        } as LinkingOptions<RootStackParamList>["config"])
      : undefined,
  };
}
