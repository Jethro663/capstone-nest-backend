import fs from "node:fs";
import path from "node:path";

const read = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("administrator School Setup workspaces", () => {
  it.each([
    ["AdminUsersScreen.tsx", "getUsersPage"],
    ["AdminSectionsScreen.tsx", "sectionsApi.getPage"],
    ["AdminClassesWorkspaceScreen.tsx", "classesApi.getPage"],
    ["AdminUserReportsScreen.tsx", "getMonitoringPage"],
  ])("uses server paging and virtualization in %s", (file, pageCall) => {
    const source = read(file);
    expect(source).toContain("AdminPaginatedList");
    expect(source).toContain("useInfiniteQuery");
    expect(source).toContain(pageCall);
    expect(source).not.toContain("getAll(");
  });

  it("collects complete class and section creation settings instead of hardcoded defaults", () => {
    const classes = read("AdminClassesWorkspaceScreen.tsx");
    const sections = read("AdminSectionsScreen.tsx");
    expect(classes).toContain("gradingProfile");
    expect(classes).toContain("academicWeightProfile");
    expect(classes).toContain("templateId");
    expect(classes).not.toContain(
      "writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20",
    );
    expect(sections).toContain('label="Capacity"');
    expect(sections).not.toContain("capacity: 50");
  });

  it("moves class templates and assessments into the class workspace", () => {
    const classes = read("AdminClassesWorkspaceScreen.tsx");
    expect(classes).toContain('navigate("AdminTemplates"');
    expect(classes).toContain('initialTab: "assessments"');
  });

  it.each([
    ["AdminClassesWorkspaceScreen.tsx", 'targetType: "CLASS"'],
    ["AdminSectionsScreen.tsx", 'targetType: "SECTION"'],
  ])(
    "preserves web batch selection while reviewing each governed lifecycle action on %s",
    (file, targetType) => {
      const source = read(file);
      expect(source).toContain("selectedIds");
      expect(source).toContain("Select all visible");
      expect(source).toContain("Review selected");
      expect(source).toContain(targetType);
    },
  );

  it("registers dedicated School Setup components instead of routing roots through AdminToolsScreen", () => {
    const navigator = read("../navigation/AppNavigator.tsx").replace(
      /\s+/g,
      " ",
    );
    expect(navigator).toContain(
      '<Tab.Screen name="AdminUsers" component={AdminUsersScreen}',
    );
    expect(navigator).toContain(
      '<Tab.Screen name="AdminSections" component={AdminSectionsScreen}',
    );
    expect(navigator).toContain(
      '<Tab.Screen name="AdminClasses" component={AdminClassesWorkspaceScreen}',
    );
    expect(navigator).toContain(
      '<Tab.Screen name="AdminUserReports" component={AdminUserReportsScreen}',
    );
    expect(navigator).toContain(
      '<Tab.Screen name="AdminCalendar" component={AdminCalendarScreen}',
    );
    expect(navigator).toContain(
      '<Tab.Screen name="AdminRoster" component={AdminRosterScreen}',
    );
    expect(navigator).toContain(
      '<Tab.Screen name="AdminClassRecord" component={AdminClassRecordScreen}',
    );
  });

  it("uses readable calendar controls and serializes transport dates internally", () => {
    const calendar = read("AdminCalendarScreen.tsx");
    expect(calendar).toContain("DateTimePicker");
    expect(calendar).toContain("toISOString()");
    expect(calendar).not.toContain("Start ISO timestamp");
    expect(calendar).not.toContain("End ISO timestamp");
  });

  it("exposes roster preview categories, commit receipt, and pending resolution", () => {
    const roster = read("AdminRosterScreen.tsx");
    expect(roster).toContain("preview.registered");
    expect(roster).toContain("preview.pending");
    expect(roster).toContain("preview.errors");
    expect(roster).toContain("getPending");
    expect(roster).toContain("resolvePending");
    expect(roster).toContain("commitReceipt");
  });

  it("uses exact Demo mode capabilities for mobile class conflicts and restore", () => {
    const classes = read("AdminClassesWorkspaceScreen.tsx");
    expect(classes).toContain("useAdminDemoMode");
    expect(classes).toContain("hasExactRule");
    expect(classes).toContain('"schedule_collision"');
    expect(classes).toContain('"restore_archived_class"');
    expect(classes).toContain("classesApi.toggleStatus");
    expect(classes).toContain("Schedule conflict");
    expect(classes).toContain(
      "Demo mode expired or the server rejected this exception",
    );
  });

  it("uses the exact room/adviser capability while retaining section validation", () => {
    const sections = read("AdminSectionsScreen.tsx");
    expect(sections).toContain("useAdminDemoMode");
    expect(sections).toContain("hasExactRule");
    expect(sections).toContain('"room_adviser_exclusivity"');
    expect(sections).toContain("Room or adviser conflict");
    expect(sections).toContain("positive whole-number capacity");
  });

  it("keeps roster validation closed while surfacing exact Demo mode workflow rules", () => {
    const roster = read("AdminRosterScreen.tsx");
    expect(roster).toContain("useAdminDemoMode");
    expect(roster).toContain("hasExactRule");
    expect(roster).toContain('"section_membership_window"');
    expect(roster).toContain('"section_capacity"');
    expect(roster).toContain("preview.summary.errorCount > 0");
    expect(roster).toContain("demoMode.refresh()");
  });

  it.each(["AdminClassesWorkspaceScreen.tsx", "AdminSectionsScreen.tsx"])(
    "never queues high-risk workspace writes while offline on %s",
    (file) => {
      const source = read(file);
      expect(source).toContain("useAdminNetworkStatus");
      expect(source).toContain("network.isOffline");
      expect(source).toContain("never queued");
    },
  );

  it("implements the web transmutation list, preview, apply, and activate contracts", () => {
    const record = read("AdminClassRecordScreen.tsx");
    const service = fs.readFileSync(
      path.resolve(__dirname, "../../api/services/class-record.ts"),
      "utf8",
    );
    expect(service).toContain("getAllTransmutationTables");
    expect(service).toContain("previewTransmutationTable");
    expect(service).toContain("applyTransmutationTable");
    expect(service).toContain("activateTransmutationTable");
    expect(record).toContain("previewTransmutationTable");
    expect(record).toContain("activateTransmutationTable");
  });
});
