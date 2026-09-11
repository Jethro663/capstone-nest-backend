import fs from "node:fs";
import path from "node:path";
import {
  adminParityManifest,
  adminWebRouteParity,
  adminWebCategoryOrder,
  type AdminParityStatus,
} from "../admin-parity-manifest";

const expectedDomains = [
  "home",
  "diagnostics",
  "users",
  "sections",
  "classes",
  "calendar",
  "roster-import",
  "class-record",
  "user-reports",
  "library",
  "announcements",
  "reports",
  "evaluations",
  "admin-chatbot",
  "audit",
  "system-settings",
  "profile",
  "class-templates",
  "assessments",
] as const;

const expectedWebRoutes = [
  "/dashboard/admin",
  "/dashboard/admin/academic-records/:classId",
  "/dashboard/admin/access-students",
  "/dashboard/admin/announcements",
  "/dashboard/admin/audit",
  "/dashboard/admin/calendar",
  "/dashboard/admin/chatbot",
  "/dashboard/admin/class-record",
  "/dashboard/admin/class-templates",
  "/dashboard/admin/class-templates/:id",
  "/dashboard/admin/class-templates/:id/announcements/:announcementKey/edit",
  "/dashboard/admin/class-templates/:id/announcements/new",
  "/dashboard/admin/class-templates/:id/assessments/:assessmentKey/edit",
  "/dashboard/admin/class-templates/:id/lessons/:lessonKey/edit",
  "/dashboard/admin/class-templates/:id/modules/:moduleKey",
  "/dashboard/admin/classes",
  "/dashboard/admin/classes/:id",
  "/dashboard/admin/classes/:id/edit",
  "/dashboard/admin/classes/:id/students/add",
  "/dashboard/admin/classes/new",
  "/dashboard/admin/diagnostics",
  "/dashboard/admin/evaluations",
  "/dashboard/admin/library",
  "/dashboard/admin/profile",
  "/dashboard/admin/reports",
  "/dashboard/admin/roster-import",
  "/dashboard/admin/sections",
  "/dashboard/admin/sections/:id/edit",
  "/dashboard/admin/sections/:id/roster",
  "/dashboard/admin/sections/:id/students",
  "/dashboard/admin/sections/:id/students/add",
  "/dashboard/admin/sections/new",
  "/dashboard/admin/system-settings",
  "/dashboard/admin/system-settings/academic-year",
  "/dashboard/admin/system-settings/assessments-grading",
  "/dashboard/admin/system-settings/audit-recovery",
  "/dashboard/admin/system-settings/learner-completion",
  "/dashboard/admin/system-settings/year-transition",
  "/dashboard/admin/user-reports",
  "/dashboard/admin/users",
  "/dashboard/admin/users/:id",
  "/dashboard/admin/users/create",
] as const;

function discoverWebAdminRoutes() {
  const root = path.resolve(
    __dirname,
    "../../../..",
    "next-frontend/app/(dashboard)/dashboard/admin",
  );
  const pages: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.name === "page.tsx") {
        const suffix = path
          .relative(root, directory)
          .split(path.sep)
          .filter(Boolean)
          .map((segment) => segment.replace(/^\[([^\]]+)\]$/, ":$1"))
          .join("/");
        pages.push(`/dashboard/admin${suffix ? `/${suffix}` : ""}`);
      }
    }
  };
  visit(root);
  return pages.sort();
}

describe("administrator web/mobile parity manifest", () => {
  it("tracks every accepted administrator domain exactly once", () => {
    expect(adminParityManifest.map((entry) => entry.id).sort()).toEqual(
      [...expectedDomains].sort(),
    );
    expect(new Set(adminParityManifest.map((entry) => entry.id)).size).toBe(
      expectedDomains.length,
    );
  });

  it("mirrors the web administrator category order", () => {
    expect(adminWebCategoryOrder).toEqual([
      "Overview",
      "School Setup",
      "Content & Comms",
      "Insights & AI",
      "Account",
      "Contextual",
    ]);
  });

  it("records backend ownership and an explicit gap for incomplete domains", () => {
    const incomplete: AdminParityStatus[] = ["partial", "missing"];

    for (const entry of adminParityManifest) {
      expect(entry.webPath).toMatch(/^\/dashboard\/admin(?:\/|$)/);
      expect(entry.backendOwners.length).toBeGreaterThan(0);
      expect(entry.targetMobileRoute.length).toBeGreaterThan(0);
      if (incomplete.includes(entry.status)) {
        expect(entry.gap?.trim()).toBeTruthy();
      }
    }
  });

  it("keeps assessments and class templates contextual instead of drawer roots", () => {
    for (const id of ["assessments", "class-templates"] as const) {
      const entry = adminParityManifest.find(
        (candidate) => candidate.id === id,
      );
      expect(entry?.category).toBe("Contextual");
      expect(entry?.drawerRoot).toBe(false);
    }
  });

  it("marks every administrator domain aligned after implementation", () => {
    expect(
      adminParityManifest.filter((entry) => entry.status !== "aligned"),
    ).toEqual([]);
  });

  it("maps every current web administrator page to an explicit mobile task", () => {
    expect(discoverWebAdminRoutes()).toEqual([...expectedWebRoutes].sort());
    expect(adminWebRouteParity.map((entry) => entry.webPath).sort()).toEqual(
      discoverWebAdminRoutes(),
    );
    expect(
      new Set(adminWebRouteParity.map((entry) => entry.webPath)).size,
    ).toBe(expectedWebRoutes.length);
    for (const entry of adminWebRouteParity) {
      expect(entry.mobileRoute.trim()).toBeTruthy();
      expect(entry.mobileTask.trim()).toBeTruthy();
      expect(entry.evidence.trim()).toMatch(/\.tsx$/);
      expect(
        fs.existsSync(path.resolve(__dirname, "../../screens", entry.evidence)),
      ).toBe(true);
      expect(entry.exception).toBeUndefined();
    }
  });
});
