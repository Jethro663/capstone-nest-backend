import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Text, TextInput, View } from "react-native";
import { adminApi } from "../api/services/admin";
import { evaluationsApi, type SystemEvaluationAudienceRole } from "../api/services/evaluations";
import { fileUploadApi } from "../api/services/file-upload";
import { reportsApi } from "../api/services/reports";
import { rosterImportApi, type RosterImportPreview } from "../api/services/roster-import";
import { schoolEventsApi } from "../api/services/school-events";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { PasswordChangeForm } from "../components/account/PasswordChangeForm";
import { TeacherActionButton, TeacherChip, TeacherEmpty, TeacherPanel, TeacherRow, TeacherScreen, TeacherStats, teacherTheme as theme } from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "AdminTools">;
type Tool = NonNullable<RootStackParamList["AdminTools"]["section"]>;
const tools: Array<{ key: Tool; label: string }> = [
  { key: "users", label: "Users" }, { key: "evaluations", label: "Evaluations" }, { key: "calendar", label: "Calendar" }, { key: "library", label: "Library" }, { key: "reports", label: "Reports" }, { key: "audit", label: "Audit" }, { key: "diagnostics", label: "Diagnostics" }, { key: "roster", label: "Roster" }, { key: "templates", label: "Templates" }, { key: "settings", label: "Settings" }, { key: "records", label: "Records" },
];
const inputStyle = { borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, paddingHorizontal: 11, paddingVertical: 10 } as const;
const defaultEventStart = () => new Date(Date.now() + 86400000).toISOString();
const defaultEventEnd = () => new Date(Date.now() + 86400000 + 3600000).toISOString();

export function AdminToolsScreen({ navigation, route }: Props) {
  const [tool, setTool] = useState<Tool>(route.params?.section ?? "users");
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => adminApi.getAllUsers(), enabled: tool === "users" });
  const campaigns = useQuery({ queryKey: ["admin-evaluation-campaigns"], queryFn: () => evaluationsApi.getCampaigns(), enabled: tool === "evaluations" });
  const events = useQuery({ queryKey: ["admin-school-events"], queryFn: () => schoolEventsApi.getAll(), enabled: tool === "calendar" });
  const files = useQuery({ queryKey: ["admin-library-files"], queryFn: () => fileUploadApi.getAll(), enabled: tool === "library" });
  const storage = useQuery({ queryKey: ["admin-library-storage"], queryFn: () => fileUploadApi.getStorageSummary(), enabled: tool === "library" });
  const report = useQuery({ queryKey: ["admin-system-usage-report"], queryFn: () => reportsApi.getSystemUsage({ page: 1, limit: 100 }), enabled: tool === "reports" });
  const audit = useQuery({ queryKey: ["admin-audit-complete"], queryFn: () => adminApi.getAllAudit(), enabled: tool === "audit" });
  const readiness = useQuery({ queryKey: ["admin-readiness"], queryFn: () => adminApi.getReadiness(), enabled: tool === "diagnostics" });
  const liveness = useQuery({ queryKey: ["admin-liveness"], queryFn: () => adminApi.getLiveness(), enabled: tool === "diagnostics" });
  const sections = useQuery({ queryKey: ["admin-roster-sections"], queryFn: () => sectionsApi.getAll(), enabled: tool === "roster" });
  const templates = useQuery({ queryKey: ["admin-class-templates"], queryFn: () => adminApi.getTemplates(), enabled: tool === "templates" });

  const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState<"student" | "teacher" | "admin">("student"); const [roleIdentifier, setRoleIdentifier] = useState(""); const [contactNumber, setContactNumber] = useState("");
  const [title, setTitle] = useState(""); const [location, setLocation] = useState(""); const [audience, setAudience] = useState<SystemEvaluationAudienceRole>("student");
  const [eventType, setEventType] = useState<"school_event" | "holiday_break">("school_event"); const [eventSchoolYear, setEventSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`); const [eventStartsAt, setEventStartsAt] = useState(defaultEventStart); const [eventEndsAt, setEventEndsAt] = useState(defaultEventEnd);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState(""); const [templateCode, setTemplateCode] = useState(""); const [templateGrade, setTemplateGrade] = useState<"7" | "8" | "9" | "10">("7");
  const [selectedSection, setSelectedSection] = useState(""); const [rosterPreview, setRosterPreview] = useState<RosterImportPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const createUser = async () => {
    try { setBusy(true); await adminApi.createUser({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), role, ...(role === "student" ? { lrn: roleIdentifier.trim() } : role === "teacher" ? { employeeId: roleIdentifier.trim(), contactNumber: contactNumber.trim() } : {}) }); setFirstName(""); setLastName(""); setEmail(""); setRoleIdentifier(""); setContactNumber(""); await users.refetch(); }
    catch (error) { Alert.alert("Unable to create user", toAppError(error).message); } finally { setBusy(false); }
  };
  const createCampaign = async () => {
    const startsAt = new Date(); const endsAt = new Date(startsAt.getTime() + 7 * 86400000);
    try { setBusy(true); await evaluationsApi.createCampaign({ formType: "system", audienceRole: audience, title: title.trim(), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status: "active" }); setTitle(""); await campaigns.refetch(); }
    catch (error) { Alert.alert("Unable to create campaign", toAppError(error).message); } finally { setBusy(false); }
  };
  const createEvent = async () => {
    try { setBusy(true); const payload = { eventType, schoolYear: eventSchoolYear.trim(), title: title.trim(), ...(eventType === "school_event" ? { location: location.trim() } : {}), startsAt: eventStartsAt.trim(), endsAt: eventEndsAt.trim(), allDay: eventType === "holiday_break" }; if (editingEventId) await schoolEventsApi.update(editingEventId, payload); else await schoolEventsApi.create(payload); setEditingEventId(null); setTitle(""); setLocation(""); setEventStartsAt(defaultEventStart()); setEventEndsAt(defaultEventEnd()); await events.refetch(); }
    catch (error) { Alert.alert("Unable to create event", toAppError(error).message); } finally { setBusy(false); }
  };
  const previewRoster = async () => {
    if (!selectedSection) return;
    try { const Picker = await import("expo-document-picker"); const result = await Picker.getDocumentAsync({ type: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] }); if (result.canceled || !result.assets[0]) return; setBusy(true); setRosterPreview(await rosterImportApi.preview(selectedSection, result.assets[0])); }
    catch (error) { Alert.alert("Preview rejected", toAppError(error).message); } finally { setBusy(false); }
  };
  const downloadSystemReport = async () => {
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");
      const { openLocalFile } = await import("../api/services/protected-files");
      const { csv, fileName } = await reportsApi.exportCsv("system-usage");
      const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!baseDirectory) throw new Error("File exports are unavailable on this device.");
      const fileUri = `${baseDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Share official audited report", UTI: "public.comma-separated-values-text" });
      } else {
        await openLocalFile(fileUri);
      }
      Alert.alert("Official report exported", `${fileName} was generated by the backend and saved on this device.`);
    } catch (error) {
      Alert.alert("Export failed", toAppError(error).message);
    }
  };
  const createTemplate = async () => {
    try {
      setBusy(true);
      await adminApi.createTemplate({ name: templateName.trim(), subjectCode: templateCode.trim().toUpperCase(), subjectGradeLevel: templateGrade });
      setTemplateName(""); setTemplateCode("");
      await templates.refetch();
    } catch (error) {
      Alert.alert("Template creation rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const loading = users.isFetching || campaigns.isFetching || events.isFetching || files.isFetching || report.isFetching || audit.isFetching || readiness.isFetching || sections.isFetching || templates.isFetching;
  return (
    <TeacherScreen title="Administration tools" workspaceLabel="Admin workspace" subtitle="Backend-owned workspaces for operations that were previously absent from mobile." icon="tools" showBackButton onBackPress={() => navigation.goBack()} refreshing={loading} onRefresh={() => void Promise.all([users.refetch(), campaigns.refetch(), events.refetch(), files.refetch(), storage.refetch(), report.refetch(), audit.refetch(), readiness.refetch(), liveness.refetch(), sections.refetch(), templates.refetch()])}>
      <View style={{ paddingHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{tools.map((entry) => <TeacherChip key={entry.key} label={entry.label} active={tool === entry.key} onPress={() => setTool(entry.key)} />)}</View>

      {tool === "users" ? <>
        <TeacherStats items={[{ label: "Users", value: users.data?.total ?? 0, tone: "red" }, { label: "Loaded", value: users.data?.data.length ?? 0, tone: "blue" }]} />
        <TeacherPanel title="Create user" subtitle="Student and teacher identifiers are validated by the backend DTO."><View style={{ padding: 14, gap: 8 }}><TextInput accessibilityLabel="First name" placeholder="First name" placeholderTextColor={theme.muted} value={firstName} onChangeText={setFirstName} style={inputStyle} /><TextInput accessibilityLabel="Last name" placeholder="Last name" placeholderTextColor={theme.muted} value={lastName} onChangeText={setLastName} style={inputStyle} /><TextInput accessibilityLabel="Email" autoCapitalize="none" placeholder="Email" placeholderTextColor={theme.muted} value={email} onChangeText={setEmail} style={inputStyle} /><View style={{ flexDirection: "row", gap: 6 }}>{(["student", "teacher", "admin"] as const).map((value) => <TeacherChip key={value} label={value} active={role === value} onPress={() => setRole(value)} />)}</View>{role !== "admin" ? <TextInput accessibilityLabel={role === "student" ? "LRN" : "Employee ID"} placeholder={role === "student" ? "12-digit LRN" : "Employee ID"} placeholderTextColor={theme.muted} value={roleIdentifier} onChangeText={setRoleIdentifier} style={inputStyle} /> : null}{role === "teacher" ? <TextInput accessibilityLabel="Teacher contact number" keyboardType="phone-pad" placeholder="09171234567" placeholderTextColor={theme.muted} value={contactNumber} onChangeText={setContactNumber} style={inputStyle} /> : null}<TeacherActionButton label={busy ? "Creating..." : "Create user"} icon="account-plus" tone="green" disabled={busy || !firstName.trim() || !lastName.trim() || !email.trim() || (role !== "admin" && !roleIdentifier.trim()) || (role === "teacher" && !contactNumber.trim())} onPress={() => void createUser()} /></View></TeacherPanel>
        <TeacherPanel title="User lifecycle" subtitle="Suspend, reactivate, reset credentials, or archive from the authoritative complete user list.">{(users.data?.data ?? []).map((user) => <TeacherRow key={user.id} title={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email} subtitle={`${user.email} · ${user.status}`} right={<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}><TeacherActionButton label={user.status === "SUSPENDED" ? "Reactivate" : user.status === "DELETED" ? "Archived" : "Suspend"} tone={user.status === "SUSPENDED" ? "green" : "amber"} disabled={user.status === "DELETED"} onPress={() => void adminApi.setUserLifecycle(user.id, user.status === "SUSPENDED" ? "reactivate" : "suspend").then(() => users.refetch()).catch((error) => Alert.alert("Lifecycle rejected", toAppError(error).message))} /><TeacherActionButton label="Reset" tone="blue" disabled={user.status === "DELETED"} onPress={() => void adminApi.resetUserPassword(user.id).then((result) => Alert.alert("Temporary password", result.generatedPassword)).catch((error) => Alert.alert("Reset rejected", toAppError(error).message))} /><TeacherActionButton label="Archive" tone="red" disabled={user.status === "DELETED"} onPress={() => Alert.alert("Archive this user?", "The account will be soft-deleted and can no longer sign in.", [{ text: "Cancel", style: "cancel" }, { text: "Archive", style: "destructive", onPress: () => void adminApi.setUserLifecycle(user.id, "archive").then(() => users.refetch()).catch((error) => Alert.alert("Archive rejected", toAppError(error).message)) }])} /></View>} />)}</TeacherPanel>
      </> : null}

      {tool === "evaluations" ? <><TeacherPanel title="Create system evaluation campaign" subtitle="Creates a seven-day active system form for the selected role."><View style={{ padding: 14, gap: 8 }}><TextInput accessibilityLabel="Campaign title" placeholder="Campaign title" placeholderTextColor={theme.muted} value={title} onChangeText={setTitle} style={inputStyle} /><View style={{ flexDirection: "row", gap: 6 }}>{(["student", "teacher"] as const).map((value) => <TeacherChip key={value} label={value} active={audience === value} onPress={() => setAudience(value)} />)}</View><TeacherActionButton label="Create active campaign" icon="plus" tone="green" disabled={busy || !title.trim()} onPress={() => void createCampaign()} /></View></TeacherPanel><TeacherPanel title="Campaigns" subtitle="Change campaign status with the dedicated RBAC endpoint.">{(campaigns.data?.campaigns ?? []).map((campaign) => <TeacherRow key={campaign.id} title={campaign.title} subtitle={`${campaign.audienceRole} · ${campaign.status} · ${campaign.submittedCount}/${campaign.assignmentCount} submitted`} right={<TeacherActionButton label={campaign.status === "active" ? "Close" : "Activate"} tone={campaign.status === "active" ? "amber" : "green"} onPress={() => void evaluationsApi.updateCampaignStatus(campaign.id, campaign.status === "active" ? "closed" : "active").then(() => campaigns.refetch()).catch((error) => Alert.alert("Status rejected", toAppError(error).message))} />} />)}</TeacherPanel></> : null}

      {tool === "calendar" ? <><TeacherPanel title={editingEventId ? "Edit school event" : "Create school event"} subtitle="Create or update a dated school event or all-day holiday break using the backend DTO."><View style={{ padding: 14, gap: 8 }}><View style={{ flexDirection: "row", gap: 6 }}><TeacherChip label="School event" active={eventType === "school_event"} onPress={() => setEventType("school_event")} /><TeacherChip label="Holiday break" active={eventType === "holiday_break"} onPress={() => setEventType("holiday_break")} /></View><TextInput accessibilityLabel="Event title" placeholder="Event title" placeholderTextColor={theme.muted} value={title} onChangeText={setTitle} style={inputStyle} />{eventType === "school_event" ? <TextInput accessibilityLabel="Event location" placeholder="Event location" placeholderTextColor={theme.muted} value={location} onChangeText={setLocation} style={inputStyle} /> : null}<TextInput accessibilityLabel="Event school year" placeholder="2026-2027" placeholderTextColor={theme.muted} value={eventSchoolYear} onChangeText={setEventSchoolYear} style={inputStyle} /><TextInput accessibilityLabel="Event start ISO timestamp" autoCapitalize="none" placeholder="2026-09-03T08:00:00.000Z" placeholderTextColor={theme.muted} value={eventStartsAt} onChangeText={setEventStartsAt} style={inputStyle} /><TextInput accessibilityLabel="Event end ISO timestamp" autoCapitalize="none" placeholder="2026-09-03T09:00:00.000Z" placeholderTextColor={theme.muted} value={eventEndsAt} onChangeText={setEventEndsAt} style={inputStyle} /><View style={{ flexDirection: "row", gap: 8 }}>{editingEventId ? <TeacherActionButton label="Cancel edit" tone="neutral" onPress={() => { setEditingEventId(null); setTitle(""); setLocation(""); }} /> : null}<TeacherActionButton label={editingEventId ? "Save event" : "Create event"} icon="calendar-plus" tone="green" disabled={busy || !title.trim() || !eventSchoolYear.trim() || !eventStartsAt.trim() || !eventEndsAt.trim() || (eventType === "school_event" && !location.trim())} onPress={() => void createEvent()} /></View></View></TeacherPanel><TeacherPanel title="School calendar" subtitle="Tap an event to edit its authoritative values.">{(events.data ?? []).map((event) => <TeacherRow key={event.id} title={event.title} subtitle={`${new Date(event.startsAt).toLocaleString()} · ${event.location ?? "All-day break"}`} onPress={() => { setEditingEventId(event.id); setEventType(event.eventType); setEventSchoolYear(event.schoolYear); setTitle(event.title); setLocation(event.location ?? ""); setEventStartsAt(event.startsAt); setEventEndsAt(event.endsAt); }} right={<TeacherActionButton label="Delete" tone="red" onPress={() => void schoolEventsApi.remove(event.id).then(() => events.refetch()).catch((error) => Alert.alert("Delete rejected", toAppError(error).message))} />} />)}</TeacherPanel></> : null}

      {tool === "library" ? <><TeacherStats items={[{ label: "Files", value: storage.data?.totalFiles ?? files.data?.length ?? 0, tone: "red" }, { label: "Storage", value: `${storage.data?.totalMB ?? 0} MB`, tone: "blue" }]} /><TeacherPanel title="Administrator library" subtitle="Complete file list with download and retry-index actions.">{(files.data ?? []).map((file) => <TeacherRow key={file.id} title={file.originalName} subtitle={`${file.scope ?? "private"} · ${file.indexStatus ?? "not indexed"}`} right={<TeacherActionButton label={file.indexStatus === "failed" ? "Retry" : "Open"} tone={file.indexStatus === "failed" ? "amber" : "blue"} onPress={() => void (file.indexStatus === "failed" ? fileUploadApi.retryIndex(file.id).then(() => files.refetch()) : fileUploadApi.open(file.id, file.originalName)).catch((error) => Alert.alert("File action failed", toAppError(error).message))} />} />)}</TeacherPanel></> : null}

      {tool === "reports" ? <TeacherPanel title="System usage report" subtitle="Live backend report plus official audited CSV export."><Text style={{ color: theme.text, padding: 14 }}>{JSON.stringify(report.data?.data ?? {}, null, 2)}</Text><View style={{ padding: 14 }}><TeacherActionButton label="Official audited CSV" icon="download" tone="green" onPress={() => void downloadSystemReport()} /></View></TeacherPanel> : null}
      {tool === "audit" ? <TeacherPanel title="Audit log" subtitle={`${audit.data?.total ?? 0} authoritative events across all loaded pages.`}>{(audit.data?.data ?? []).slice(0, 200).map((entry) => <TeacherRow key={entry.id} title={entry.action} subtitle={`${entry.targetType} · ${new Date(entry.createdAt).toLocaleString()} · ${entry.actor?.email ?? entry.actorId}`} />)}</TeacherPanel> : null}
      {tool === "diagnostics" ? <><TeacherPanel title="Liveness"><TeacherRow title={liveness.data?.status ?? "Unavailable"} subtitle={liveness.data?.timestamp ?? "No timestamp"} /></TeacherPanel><TeacherPanel title="Readiness">{Object.entries(readiness.data?.dependencies ?? {}).map(([name, status]) => <TeacherRow key={name} title={name} subtitle={status.ok ? status.degraded ? "Degraded" : "Ready" : status.message ?? "Unavailable"} />)}</TeacherPanel></> : null}

      {tool === "roster" ? <><TeacherPanel title="Roster import" subtitle="Choose a section, preview a CSV/XLSX, then commit only the reviewed valid and pending rows."><View style={{ padding: 14, gap: 8 }}><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{(sections.data?.data ?? []).map((section) => <TeacherChip key={section.id} label={`${section.gradeLevel}-${section.name}`} active={selectedSection === section.id} onPress={() => { setSelectedSection(section.id); setRosterPreview(null); }} />)}</View><TeacherActionButton label="Choose file and preview" icon="file-eye-outline" tone="blue" disabled={!selectedSection || busy} onPress={() => void previewRoster()} />{rosterPreview ? <><Text style={{ color: theme.text }}>{rosterPreview.summary.validRows} valid · {rosterPreview.summary.pendingCount} pending · {rosterPreview.summary.errorCount} errors</Text><TeacherActionButton label="Commit reviewed roster" icon="account-check" tone="green" disabled={busy || rosterPreview.summary.errorCount > 0} onPress={() => void rosterImportApi.commit(selectedSection, rosterPreview).then(() => { Alert.alert("Roster committed"); setRosterPreview(null); }).catch((error) => Alert.alert("Commit rejected", toAppError(error).message))} /></> : null}</View></TeacherPanel></> : null}

      {tool === "templates" ? <><TeacherPanel title="Create class template" subtitle="Create a backend-owned draft shell before publishing or adding web-grade content."><View style={{ padding: 14, gap: 8 }}><TextInput accessibilityLabel="Template name" placeholder="Template name" placeholderTextColor={theme.muted} value={templateName} onChangeText={setTemplateName} style={inputStyle} /><TextInput accessibilityLabel="Template subject code" autoCapitalize="characters" placeholder="Subject code" placeholderTextColor={theme.muted} value={templateCode} onChangeText={setTemplateCode} style={inputStyle} /><View style={{ flexDirection: "row", gap: 6 }}>{(["7", "8", "9", "10"] as const).map((value) => <TeacherChip key={value} label={`Grade ${value}`} active={templateGrade === value} onPress={() => setTemplateGrade(value)} />)}</View><TeacherActionButton label="Create draft template" icon="plus" tone="green" disabled={busy || !templateName.trim() || !templateCode.trim()} onPress={() => void createTemplate()} /></View></TeacherPanel><TeacherPanel title="Class templates" subtitle="Publish and reuse backend-owned template shells.">{(templates.data ?? []).map((template) => <TeacherRow key={template.id} title={template.name} subtitle={`${template.subjectCode ?? "Subject"} · ${template.subjectGradeLevel ?? "Grade"} · ${template.status ?? "draft"}`} right={<TeacherActionButton label={template.status === "published" ? "Unpublish" : "Publish"} tone={template.status === "published" ? "amber" : "green"} onPress={() => void adminApi.publishTemplate(template.id, template.status === "published" ? "draft" : "published").then(() => templates.refetch()).catch((error) => Alert.alert("Template update rejected", toAppError(error).message))} />} />)}</TeacherPanel></> : null}
      {tool === "settings" || tool === "records" ? <TeacherPanel title={tool === "settings" ? "System settings" : "Academic records"} subtitle="Academic policy, period, recovery, state-alignment, workbook, and annual-grade controls share the guarded academic administrator workspace."><View style={{ padding: 14, gap: 10 }}><TeacherActionButton label="Open academic administration" icon="school-outline" tone="blue" onPress={() => navigation.navigate("AdminAcademic")} /><PasswordChangeForm /></View></TeacherPanel> : null}
      {!loading && ((tool === "audit" && !audit.data?.data.length) || (tool === "templates" && !templates.data?.length)) ? <TeacherEmpty title="No records" subtitle="The backend returned an empty data set." icon="database-outline" /> : null}
    </TeacherScreen>
  );
}
