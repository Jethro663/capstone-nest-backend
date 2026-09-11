import fs from "node:fs";
import path from "node:path";

const source = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");

describe("administrator governed lifecycle screen contract", () => {
  it("replaces direct class and section archive mutations with the review route", () => {
    const classes = source("AdminClassesScreen.tsx");
    expect(classes).not.toContain("classesApi.toggleStatus(entry.id)");
    expect(classes).not.toContain("sectionsApi.update(entry.id, { isActive:");
    expect(classes).toContain('navigate("AdminLifecycleReview"');
  });

  it("renders backend blockers, effects, preservation, credentials, and receipts", () => {
    const lifecycle = source("AdminLifecycleReviewScreen.tsx");
    expect(lifecycle).toContain("manifest.blockers");
    expect(lifecycle).toContain("manifest.effects");
    expect(lifecycle).toContain("manifest.preserved");
    expect(lifecycle).toContain('label="Current password"');
    expect(lifecycle).toContain("Crypto.randomUUID()");
    expect(lifecycle).toContain("result.operationId");
    expect(lifecycle).toContain("result.changed");
    expect(lifecycle).toContain("result.replayed");
  });

  it("requires a live connection for preview and execution and never queues lifecycle writes", () => {
    const lifecycle = source("AdminLifecycleReviewScreen.tsx");
    expect(lifecycle).toContain("useAdminNetworkStatus");
    expect(lifecycle).toContain("network.isOffline");
    expect(lifecycle).toContain("A live connection is required");
    expect(lifecycle).not.toContain("useMutation");
  });

  it("registers the review-and-receipt screen in the admin stack", () => {
    const navigator = source("../navigation/AppNavigator.tsx");
    const types = source("../navigation/types.ts");
    expect(types).toContain("AdminLifecycleReview:");
    expect(navigator).toContain('name="AdminLifecycleReview"');
    expect(navigator).toContain("AdminLifecycleReviewScreen");
  });

  it("makes individual learner lifecycle review reachable from an administrator section detail", () => {
    const sections = source("AdminSectionsScreen.tsx");
    const sectionDetail = source("AdminSectionDetailScreen.tsx");
    const lifecycle = source("AdminLifecycleReviewScreen.tsx");
    const navigator = source("../navigation/AppNavigator.tsx");
    const types = source("../navigation/types.ts");

    expect(sections).toContain('navigate("AdminSectionDetail"');
    expect(sectionDetail).toContain("sectionsApi.getRoster");
    expect(sectionDetail).toContain('targetType: "STUDENT"');
    expect(lifecycle).toContain("adminLifecycleApi.previewStudent");
    expect(lifecycle).toContain("adminLifecycleApi.executeStudent");
    expect(types).toContain('targetType: "CLASS" | "SECTION" | "STUDENT"');
    expect(navigator).toContain('name="AdminSectionDetail"');
  });
});
