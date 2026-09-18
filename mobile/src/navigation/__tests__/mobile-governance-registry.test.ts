import fs from "node:fs";
import path from "node:path";
import { adminDrawerRouteNames } from "../admin-route-manifest";
import { studentParityRouteNames } from "../student-route-manifest";
import {
  teacherParityRouteNames,
  teacherWebRouteMappings,
} from "../teacher-route-manifest";

describe("mobile route governance", () => {
  it("maps the teacher dashboard to the real authenticated Home route", () => {
    expect(
      teacherWebRouteMappings.find(
        (entry) => entry.web === "/dashboard/teacher",
      ),
    ).toMatchObject({ mobile: "Home", coverage: "drawer" });
  });

  it("keeps one evidence-bearing design entry for every governed route", () => {
    const registryPath = path.resolve(
      __dirname,
      "..",
      "mobile-route-design-registry.ts",
    );
    expect(fs.existsSync(registryPath)).toBe(true);

    if (!fs.existsSync(registryPath)) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mobileRouteDesignRegistry } = require(registryPath) as {
      mobileRouteDesignRegistry: ReadonlyArray<{
        role: "student" | "teacher" | "admin";
        route: string;
        status: "legacy" | "partial" | "migrated" | "accepted";
        ownerComponent: string;
        evidence: readonly string[];
        knownResidue?: string;
      }>;
    };

    const expected = [
      ...studentParityRouteNames.map((route) => `student:${route}`),
      ...teacherParityRouteNames.map((route) => `teacher:${route}`),
      ...adminDrawerRouteNames.map((route) => `admin:${route}`),
    ].sort();
    const actual = mobileRouteDesignRegistry
      .map((entry) => `${entry.role}:${entry.route}`)
      .sort();

    expect(actual).toEqual(expected);
    expect(new Set(actual).size).toBe(expected.length);

    for (const entry of mobileRouteDesignRegistry) {
      expect(entry.ownerComponent.trim()).toMatch(/\.tsx$/);
      if (entry.status === "accepted") {
        expect(entry.evidence.length).toBeGreaterThan(0);
      }
      if (entry.status === "legacy" || entry.status === "partial") {
        expect(entry.knownResidue?.trim()).toBeTruthy();
      }
    }
  });
});
