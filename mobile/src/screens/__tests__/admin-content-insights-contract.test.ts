import fs from "node:fs";
import path from "node:path";

const readScreen = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", name), "utf8");

describe("administrator Content and Insights workspaces", () => {
  it.each([
    ["AdminDiagnosticsScreen.tsx", "adminApi.getReadiness"],
    ["AdminLibraryScreen.tsx", "fileUploadApi.getPage"],
    ["AdminReportsScreen.tsx", "reportsApi.getStudentMasterList"],
    ["AdminEvaluationsScreen.tsx", "evaluationsApi.getEvaluations"],
    ["AdminChatbotScreen.tsx", "adminChatbotApi.sendMessage"],
    ["AdminAuditScreen.tsx", "adminApi.getAuditPage"],
  ])("provides a dedicated %s workspace", (file, contract) => {
    expect(readScreen(file)).toContain(contract);
  });

  it("routes every accepted Content and Insights root to a dedicated screen", () => {
    const source = readScreen("../navigation/AppNavigator.tsx").replace(
      /\s+/g,
      " ",
    );
    for (const mapping of [
      'name="AdminDiagnostics" component={AdminDiagnosticsScreen}',
      'name="AdminLibrary" component={AdminLibraryScreen}',
      'name="AdminReports" component={AdminReportsScreen}',
      'name="AdminEvaluations" component={AdminEvaluationsScreen}',
      'name="AdminChatbot" component={AdminChatbotScreen}',
      'name="AdminAudit" component={AdminAuditScreen}',
    ]) {
      expect(source).toContain(mapping);
    }
  });

  it("renders typed report choices and a shareable audited export", () => {
    const source = readScreen("AdminReportsScreen.tsx");
    expect(source).toContain("class-record");
    expect(source).toContain("student-master-list");
    expect(source).toContain("class-enrollment");
    expect(source).toContain("student-performance");
    expect(source).toContain("intervention-participation");
    expect(source).toContain("assessment-summary");
    expect(source).toContain("system-usage");
    expect(source).toContain("classesApi.getPage");
    expect(source).toContain("classRecordApi.getByClass");
    expect(source).toContain("classRecordApi.getClassAverageReport");
    expect(source).toContain("classRecordApi.getDistributionReport");
    expect(source).toContain("classRecordApi.getInterventionReport");
    expect(source).toContain("DateTimePicker");
    expect(source).toContain("Export CSV");
    expect(source).toContain("Export PDF");
    expect(source).toContain("Print.printToFileAsync");
    expect(source).toContain("Sharing.shareAsync");
    expect(source).not.toContain("Optional ISO");
    expect(source).not.toContain("JSON.stringify(report");
    expect(source).toContain("records.isPending && Boolean(effectiveClassId)");
  });

  it("shows campaign configuration, response summaries, filters, and empty response state", () => {
    const source = readScreen("AdminEvaluationsScreen.tsx");
    expect(source).toContain("formType");
    expect(source).toContain("audienceRole");
    expect(source).toContain("targetModule");
    expect(source).toContain("summary.averages");
    expect(source).toContain("No evaluation responses");
    expect(source).toContain("DateTimePicker");
    expect(source).toContain("classId");
    expect(source).toContain("row.questionRatingsJson");
    expect(source).toContain("row.aiContextMetadata");
    expect(source).toContain("row.campaignId");
    expect(source).not.toContain("ISO timestamps");
    expect(source).not.toContain("T08:00:00");
  });

  it("uses date pickers for optional announcement scheduling and audit boundaries", () => {
    for (const file of [
      "AdminAnnouncementsScreen.tsx",
      "AdminAuditScreen.tsx",
    ]) {
      const source = readScreen(file);
      expect(source).toContain("DateTimePicker");
      expect(source).not.toContain("Optional ISO");
      expect(source).not.toContain('placeholder="2026-');
    }
  });

  it("keeps library paging, folder management, upload, metadata, deletion, and retry visible", () => {
    const source = readScreen("AdminLibraryScreen.tsx");
    expect(source).toContain("useInfiniteQuery");
    expect(source).toContain("getFolders");
    expect(source).toContain("createFolder");
    expect(source).toContain("updateFolder");
    expect(source).toContain("deleteFolder");
    expect(source).toContain("fileUploadApi.upload");
    expect(source).toContain("onUploadProgress");
    expect(source).toContain("AbortController");
    expect(source).toContain("Cancel upload");
    expect(source).toContain("Retry upload");
    expect(source).toContain("fileUploadApi.update");
    expect(source).toContain("folderId: editFolderId");
    expect(source).toContain("scope: editScope");
    expect(source).toContain("subjectKey: editSubjectKey");
    expect(source).toContain("gradeLevel: editGradeLevel");
    expect(source).toContain("teacherVisible: editTeacherVisible");
    expect(source).toContain("aiEnabled: editAiEnabled");
    expect(source).toContain(".delete(file.id)");
    expect(source).toContain("retryIndex");
    expect(source).toContain("scopeFilter");
    expect(source).toContain("subjectFilter");
    expect(source).toContain("gradeFilter");
    expect(source).toContain("indexFilter");
    expect(source).toContain("useAdminNetworkStatus");
    expect(source).toContain("uploadPartitionMissing");
    expect(source).toContain("editPartitionMissing");
    expect(source).toContain("subjectKey: editSubjectKey || null");
    expect(source).toContain("gradeLevel: editGradeLevel || null");
    expect(source).toContain("selected.teacher?.email");
    expect(source).toContain("selected.class?.subjectCode");
    expect(source).toContain("selected.contentHash");
  });

  it("uses server paging and server filters for immutable audit history", () => {
    const source = readScreen("AdminAuditScreen.tsx");
    expect(source).toContain("useInfiniteQuery");
    expect(source).toContain("dateFrom");
    expect(source).toContain("dateTo");
    expect(source).toContain("actorId");
    expect(source).toContain("metadata");
    expect(source).toContain("exportActivity");
    expect(source).not.toContain("getAllAudit");
  });

  it("uses bounded administrator inventories instead of per-class fan-out", () => {
    const announcements = readScreen("AdminAnnouncementsScreen.tsx");
    const assessments = readScreen("AdminAssessmentsScreen.tsx");
    expect(announcements).toContain("getAdminPage");
    expect(assessments).toContain("getAdminPage");
    expect(announcements).not.toContain("Promise.all(");
    expect(assessments).not.toContain("Promise.all(");
  });
});
