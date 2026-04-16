export function hasRole(
  roles: unknown,
  target: "student" | "teacher" | "admin",
): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => {
    if (typeof role === "string") return role.toLowerCase() === target;
    if (role && typeof role === "object" && "name" in role) {
      return typeof role.name === "string" && role.name.toLowerCase() === target;
    }
    return false;
  });
}

export function resolveMobileRole(roles: unknown): "admin" | "teacher" | "student" {
  if (hasRole(roles, "admin")) return "admin";
  if (hasRole(roles, "teacher")) return "teacher";
  return "student";
}
