import { repairRouteForHref } from "../repair-navigation";

describe("administrator lifecycle repair navigation", () => {
  it.each([
    [
      "/dashboard/admin/system-settings/year-transition",
      "AdminSettingsYearTransition",
    ],
    [
      "/dashboard/admin/system-settings/audit-recovery",
      "AdminSettingsAuditRecovery",
    ],
    [
      "/dashboard/admin/system-settings/maintenance-access",
      "AdminSettingsMaintenance",
    ],
  ] as const)("maps %s to %s", (href, route) => {
    expect(repairRouteForHref(href)).toBe(route);
  });

  it("fails closed for an unknown repair destination", () => {
    expect(repairRouteForHref("/dashboard/admin/unknown")).toBeNull();
  });
});
