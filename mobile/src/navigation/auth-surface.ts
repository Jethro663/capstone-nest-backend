import { resolveMobileRole } from "./role-resolver";

export type AuthenticatedSurface = "loading" | "auth" | "complete-profile" | "student" | "teacher" | "admin";

export function resolveAuthenticatedSurface(input: {
  loading: boolean;
  isAuthenticated: boolean;
  isProfileIncomplete: boolean;
  roles: unknown;
}): AuthenticatedSurface {
  if (input.loading) return "loading";
  if (!input.isAuthenticated) return "auth";
  if (input.isProfileIncomplete) return "complete-profile";
  return resolveMobileRole(input.roles);
}
