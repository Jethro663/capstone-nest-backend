import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Text, View } from "react-native";
import { adminApi } from "../api/services/admin";
import { evaluationsApi, type SystemEvaluationAudienceRole } from "../api/services/evaluations";
import { fileUploadApi } from "../api/services/file-upload";
import { reportsApi } from "../api/services/reports";
import { rosterImportApi, type RosterImportPreview } from "../api/services/roster-import";
import { schoolEventsApi } from "../api/services/school-events";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import type { AdminToolSection } from "../navigation/types";
import { adminToolForRoute } from "../navigation/admin-route-manifest";
import { PasswordChangeForm } from "../components/account/PasswordChangeForm";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminFilterBar,
  AdminMetricStrip,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";

type Props = {
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: unknown) => void;
  };
  route: {
    name: string;
    params?: { section?: AdminToolSection };
  };
};

type FilterKey = "all" | "active" | "suspended" | "archived" | "closed" | "upcoming" | "past" | "ready" | "attention" | "published" | "draft";

const toolLabels: Record<AdminToolSection, string> = {
  users: "Users",
  evaluations: "Evaluations",
  calendar: "School calendar",
  library: "Library",
  reports: "Reports",
  audit: "Audit log",
  diagnostics: "Diagnostics",
  roster: "Roster import",
  templates: "Class templates",
  settings: "System settings",
  records: "Academic records",
};

const defaultEventStart = () => new Date(Date.now() + 86400000).toISOString();
const defaultEventEnd = () => new Date(Date.now() + 86400000 + 3600000).toISOString();

export function AdminToolsScreen({ navigation, route }: Props) {
  const tool = adminToolForRoute(route.name, route.params?.section);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [roleIdentifier, setRoleIdentifier] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState<SystemEvaluationAudienceRole>("student");
  const [eventType, setEventType] = useState<"school_event" | "holiday_break">("school_event");
  const [eventSchoolYear, setEventSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [eventStartsAt, setEventStartsAt] = useState(defaultEventStart);
  const [eventEndsAt, setEventEndsAt] = useState(defaultEventEnd);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [templateGrade, setTemplateGrade] = useState<"7" | "8" | "9" | "10">("7");
  const [selectedSection, setSelectedSection] = useState("");
  const [rosterPreview, setRosterPreview] = useState<RosterImportPreview | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSearch("");
    setFilter("all");
    setShowCreate(false);
  }, [tool]);

  const createUser = async () => {
    try {
      setBusy(true);
      await adminApi.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        ...(role === "student"
          ? { lrn: roleIdentifier.trim() }
          : role === "teacher"
            ? { employeeId: roleIdentifier.trim(), contactNumber: contactNumber.trim() }
            : {}),
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setRoleIdentifier("");
      setContactNumber("");
      setShowCreate(false);
      await users.refetch();
    } catch (error) {
      Alert.alert("Unable to create user", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const createCampaign = async () => {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 7 * 86400000);
    try {
      setBusy(true);
      await evaluationsApi.createCampaign({ formType: "system", audienceRole: audience, title: title.trim(), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status: "active" });
      setTitle("");
      setShowCreate(false);
      await campaigns.refetch();
    } catch (error) {
      Alert.alert("Unable to create campaign", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const createEvent = async () => {
    try {
      setBusy(true);
      const payload = {
        eventType,
        schoolYear: eventSchoolYear.trim(),
        title: title.trim(),
        ...(eventType === "school_event" ? { location: location.trim() } : {}),
        startsAt: eventStartsAt.trim(),
        endsAt: eventEndsAt.trim(),
        allDay: eventType === "holiday_break",
      };
      if (editingEventId) await schoolEventsApi.update(editingEventId, payload);
      else await schoolEventsApi.create(payload);
      setEditingEventId(null);
      setTitle("");
      setLocation("");
      setEventStartsAt(defaultEventStart());
      setEventEndsAt(defaultEventEnd());
      setShowCreate(false);
      await events.refetch();
    } catch (error) {
      Alert.alert("Unable to save event", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const previewRoster = async () => {
    if (!selectedSection) return;
    try {
      const Picker = await import("expo-document-picker");
      const result = await Picker.getDocumentAsync({ type: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] });
      if (result.canceled || !result.assets[0]) return;
      setBusy(true);
      setRosterPreview(await rosterImportApi.preview(selectedSection, result.assets[0]));
    } catch (error) {
      Alert.alert("Preview rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
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
      setTemplateName("");
      setTemplateCode("");
      setShowCreate(false);
      await templates.refetch();
    } catch (error) {
      Alert.alert("Template creation rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const needle = search.trim().toLowerCase();
  const filteredUsers = useMemo(() => (users.data?.data ?? []).filter((user) => {
    const matchesSearch = !needle || `${user.firstName ?? ""} ${user.lastName ?? ""} ${user.email} ${user.status} ${user.roles?.join(" ") ?? ""}`.toLowerCase().includes(needle);
    const normalized = user.status.toLowerCase();
    const matchesFilter = filter === "all" || (filter === "active" ? normalized === "active" : filter === "suspended" ? normalized === "suspended" : filter === "archived" ? normalized === "deleted" : true);
    return matchesSearch && matchesFilter;
  }), [filter, needle, users.data?.data]);
  const filteredCampaigns = useMemo(() => (campaigns.data?.campaigns ?? []).filter((campaign) => {
    const matchesSearch = !needle || `${campaign.title} ${campaign.audienceRole} ${campaign.status}`.toLowerCase().includes(needle);
    return matchesSearch && (filter === "all" || campaign.status === filter);
  }), [campaigns.data?.campaigns, filter, needle]);
  const filteredEvents = useMemo(() => (events.data ?? []).filter((event) => {
    const matchesSearch = !needle || `${event.title} ${event.location ?? ""} ${event.schoolYear}`.toLowerCase().includes(needle);
    const upcoming = Date.parse(event.endsAt) >= Date.now();
    return matchesSearch && (filter === "all" || (filter === "upcoming" ? upcoming : filter === "past" ? !upcoming : true));
  }), [events.data, filter, needle]);
  const filteredFiles = useMemo(() => (files.data ?? []).filter((file) => {
    const matchesSearch = !needle || `${file.originalName} ${file.scope ?? ""} ${file.indexStatus ?? ""}`.toLowerCase().includes(needle);
    const attention = file.indexStatus === "failed";
    return matchesSearch && (filter === "all" || (filter === "attention" ? attention : filter === "ready" ? !attention : true));
  }), [files.data, filter, needle]);
  const filteredAudit = useMemo(() => (audit.data?.data ?? []).slice(0, 200).filter((entry) => !needle || `${entry.action} ${entry.targetType} ${entry.actor?.email ?? entry.actorId}`.toLowerCase().includes(needle)), [audit.data?.data, needle]);
  const filteredSections = useMemo(() => (sections.data?.data ?? []).filter((section) => !needle || `${section.gradeLevel} ${section.name} ${section.schoolYear}`.toLowerCase().includes(needle)), [needle, sections.data?.data]);
  const filteredTemplates = useMemo(() => (templates.data ?? []).filter((template) => {
    const matchesSearch = !needle || `${template.name} ${template.subjectCode ?? ""} ${template.subjectGradeLevel ?? ""} ${template.status ?? ""}`.toLowerCase().includes(needle);
    return matchesSearch && (filter === "all" || template.status === filter);
  }), [filter, needle, templates.data]);

  const filterConfig = (() => {
    if (tool === "users") return { segments: [{ key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "suspended", label: "Suspended" }, { key: "archived", label: "Archived" }] as Array<{ key: FilterKey; label: string }>, count: filteredUsers.length, placeholder: "Search users" };
    if (tool === "evaluations") return { segments: [{ key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "closed", label: "Closed" }] as Array<{ key: FilterKey; label: string }>, count: filteredCampaigns.length, placeholder: "Search campaigns" };
    if (tool === "calendar") return { segments: [{ key: "all", label: "All" }, { key: "upcoming", label: "Upcoming" }, { key: "past", label: "Past" }] as Array<{ key: FilterKey; label: string }>, count: filteredEvents.length, placeholder: "Search events" };
    if (tool === "library") return { segments: [{ key: "all", label: "All" }, { key: "ready", label: "Ready" }, { key: "attention", label: "Needs attention" }] as Array<{ key: FilterKey; label: string }>, count: filteredFiles.length, placeholder: "Search files" };
    if (tool === "audit") return { segments: [{ key: "all", label: "All events" }] as Array<{ key: FilterKey; label: string }>, count: filteredAudit.length, placeholder: "Search audit log" };
    if (tool === "roster") return { segments: [{ key: "all", label: "All sections" }] as Array<{ key: FilterKey; label: string }>, count: filteredSections.length, placeholder: "Search sections" };
    if (tool === "templates") return { segments: [{ key: "all", label: "All" }, { key: "published", label: "Published" }, { key: "draft", label: "Draft" }] as Array<{ key: FilterKey; label: string }>, count: filteredTemplates.length, placeholder: "Search templates" };
    return null;
  })();

  const loading = users.isFetching || campaigns.isFetching || events.isFetching || files.isFetching || report.isFetching || audit.isFetching || readiness.isFetching || sections.isFetching || templates.isFetching;
  const hasFilters = Boolean(search.trim()) || filter !== "all";
  const clearFilters = () => { setSearch(""); setFilter("all"); };
  const legacyStackEntry = route.name === "AdminTools";
  const openAcademic = () => navigation.navigate(legacyStackEntry ? "AdminAcademic" : "Academic");

  const empty = (title: string, baseSubtitle: string) => (
    <AdminEmpty
      title={hasFilters ? `No matching ${title.toLowerCase()}` : title}
      subtitle={hasFilters ? "Clear filters to return to the complete list." : baseSubtitle}
      actionLabel={hasFilters ? "Clear filters" : undefined}
      onAction={hasFilters ? clearFilters : undefined}
    />
  );

  return (
    <AdminScreen
      title={toolLabels[tool]}
      subtitle="Administrator workspace"
      showBackButton={legacyStackEntry}
      onBackPress={legacyStackEntry ? navigation.goBack : undefined}
      refreshing={loading}
      onRefresh={() => void Promise.all([users.refetch(), campaigns.refetch(), events.refetch(), files.refetch(), storage.refetch(), report.refetch(), audit.refetch(), readiness.refetch(), liveness.refetch(), sections.refetch(), templates.refetch()])}
    >
      {filterConfig ? (
        <AdminFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder={filterConfig.placeholder}
          segments={filterConfig.segments}
          activeSegment={filter}
          onSegmentChange={setFilter}
          resultCount={filterConfig.count}
        />
      ) : null}

      {tool === "users" ? (
        <>
          <AdminMetricStrip items={[{ label: "Users", value: users.data?.total ?? 0 }, { label: "Visible", value: filteredUsers.length }]} />
          <AdminSection title="User lifecycle" subtitle="Create, inspect, suspend, reset, or archive accounts" action={<AdminButton label={showCreate ? "Close" : "New user"} icon={showCreate ? "close" : "account-plus"} variant={showCreate ? "soft" : "solid"} onPress={() => setShowCreate((value) => !value)} />}>
            {showCreate ? (
              <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                <AdminField label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
                <AdminField label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
                <AdminField label="Email" value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{(["student", "teacher", "admin"] as const).map((value) => <AdminChip key={value} label={value} active={role === value} onPress={() => setRole(value)} />)}</View>
                {role !== "admin" ? <AdminField label={role === "student" ? "LRN" : "Employee ID"} value={roleIdentifier} onChangeText={setRoleIdentifier} placeholder={role === "student" ? "12-digit LRN" : "Employee ID"} /> : null}
                {role === "teacher" ? <AdminField label="Teacher contact number" value={contactNumber} onChangeText={setContactNumber} placeholder="09171234567" keyboardType="phone-pad" /> : null}
                <AdminButton label={busy ? "Creating…" : "Create user"} icon="account-plus" tone="green" variant="solid" disabled={busy || !firstName.trim() || !lastName.trim() || !email.trim() || (role !== "admin" && !roleIdentifier.trim()) || (role === "teacher" && !contactNumber.trim())} onPress={() => void createUser()} />
              </View>
            ) : null}
            {filteredUsers.map((user) => (
              <AdminDataRow
                key={user.id}
                title={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
                subtitle={user.email}
                meta={user.roles?.join(", ") ?? "Account"}
                status={user.status}
                statusTone={user.status === "ACTIVE" ? "green" : user.status === "SUSPENDED" ? "amber" : "neutral"}
                right={<View style={{ alignItems: "flex-end" }}><AdminButton label={user.status === "SUSPENDED" ? "Reactivate" : user.status === "DELETED" ? "Archived" : "Suspend"} tone={user.status === "SUSPENDED" ? "green" : "amber"} variant="text" disabled={user.status === "DELETED"} onPress={() => void adminApi.setUserLifecycle(user.id, user.status === "SUSPENDED" ? "reactivate" : "suspend").then(() => users.refetch()).catch((error) => Alert.alert("Lifecycle rejected", toAppError(error).message))} /><AdminButton label="Reset password" variant="text" disabled={user.status === "DELETED"} onPress={() => void adminApi.resetUserPassword(user.id).then((result) => Alert.alert("Temporary password", result.generatedPassword)).catch((error) => Alert.alert("Reset rejected", toAppError(error).message))} /><AdminButton label="Archive" tone="red" variant="text" disabled={user.status === "DELETED"} onPress={() => Alert.alert("Archive this user?", "The account will be soft-deleted and can no longer sign in.", [{ text: "Cancel", style: "cancel" }, { text: "Archive", style: "destructive", onPress: () => void adminApi.setUserLifecycle(user.id, "archive").then(() => users.refetch()).catch((error) => Alert.alert("Archive rejected", toAppError(error).message)) }])} /></View>}
              />
            ))}
            {!filteredUsers.length ? empty("Users", "No accounts were returned by the administrator API.") : null}
          </AdminSection>
        </>
      ) : null}

      {tool === "evaluations" ? (
        <AdminSection title="Evaluation campaigns" subtitle="System feedback campaigns for students and teachers" action={<AdminButton label={showCreate ? "Close" : "New campaign"} icon={showCreate ? "close" : "plus"} variant={showCreate ? "soft" : "solid"} onPress={() => setShowCreate((value) => !value)} />}>
          {showCreate ? <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: theme.border }}><AdminField label="Campaign title" value={title} onChangeText={setTitle} placeholder="Campaign title" /><View style={{ flexDirection: "row", gap: 6 }}>{(["student", "teacher"] as const).map((value) => <AdminChip key={value} label={value} active={audience === value} onPress={() => setAudience(value)} />)}</View><AdminButton label={busy ? "Creating…" : "Create active campaign"} icon="plus" tone="green" variant="solid" disabled={busy || !title.trim()} onPress={() => void createCampaign()} /></View> : null}
          {filteredCampaigns.map((campaign) => <AdminDataRow key={campaign.id} title={campaign.title} subtitle={`${campaign.audienceRole} · ${campaign.submittedCount}/${campaign.assignmentCount} submitted`} status={campaign.status} statusTone={campaign.status === "active" ? "green" : "neutral"} right={<AdminButton label={campaign.status === "active" ? "Close" : "Activate"} tone={campaign.status === "active" ? "amber" : "green"} variant="text" onPress={() => void evaluationsApi.updateCampaignStatus(campaign.id, campaign.status === "active" ? "closed" : "active").then(() => campaigns.refetch()).catch((error) => Alert.alert("Status rejected", toAppError(error).message))} />} />)}
          {!filteredCampaigns.length ? empty("Campaigns", "No evaluation campaigns have been created.") : null}
        </AdminSection>
      ) : null}

      {tool === "calendar" ? (
        <AdminSection title="School events" subtitle="Dated events and holiday breaks" action={<AdminButton label={showCreate ? "Close" : "New event"} icon={showCreate ? "close" : "calendar-plus"} variant={showCreate ? "soft" : "solid"} onPress={() => setShowCreate((value) => !value)} />}>
          {showCreate ? <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: theme.border }}><View style={{ flexDirection: "row", gap: 6 }}><AdminChip label="School event" active={eventType === "school_event"} onPress={() => setEventType("school_event")} /><AdminChip label="Holiday break" active={eventType === "holiday_break"} onPress={() => setEventType("holiday_break")} /></View><AdminField label="Event title" value={title} onChangeText={setTitle} placeholder="Event title" />{eventType === "school_event" ? <AdminField label="Event location" value={location} onChangeText={setLocation} placeholder="Event location" /> : null}<AdminField label="School year" value={eventSchoolYear} onChangeText={setEventSchoolYear} placeholder="2026-2027" /><AdminField label="Start ISO timestamp" value={eventStartsAt} onChangeText={setEventStartsAt} autoCapitalize="none" /><AdminField label="End ISO timestamp" value={eventEndsAt} onChangeText={setEventEndsAt} autoCapitalize="none" /><View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>{editingEventId ? <AdminButton label="Cancel edit" tone="neutral" onPress={() => { setEditingEventId(null); setTitle(""); setLocation(""); setShowCreate(false); }} /> : null}<AdminButton label={busy ? "Saving…" : editingEventId ? "Save event" : "Create event"} icon="calendar-plus" tone="green" variant="solid" disabled={busy || !title.trim() || !eventSchoolYear.trim() || !eventStartsAt.trim() || !eventEndsAt.trim() || (eventType === "school_event" && !location.trim())} onPress={() => void createEvent()} /></View></View> : null}
          {filteredEvents.map((event) => <AdminDataRow key={event.id} title={event.title} subtitle={new Date(event.startsAt).toLocaleString()} meta={event.location ?? "All-day break"} status={Date.parse(event.endsAt) >= Date.now() ? "Upcoming" : "Past"} statusTone={Date.parse(event.endsAt) >= Date.now() ? "green" : "neutral"} onPress={() => { setEditingEventId(event.id); setEventType(event.eventType); setEventSchoolYear(event.schoolYear); setTitle(event.title); setLocation(event.location ?? ""); setEventStartsAt(event.startsAt); setEventEndsAt(event.endsAt); setShowCreate(true); }} right={<AdminButton label="Delete" tone="red" variant="text" onPress={() => void schoolEventsApi.remove(event.id).then(() => events.refetch()).catch((error) => Alert.alert("Delete rejected", toAppError(error).message))} />} />)}
          {!filteredEvents.length ? empty("Events", "No school events have been created.") : null}
        </AdminSection>
      ) : null}

      {tool === "library" ? (
        <><AdminMetricStrip items={[{ label: "Files", value: storage.data?.totalFiles ?? files.data?.length ?? 0 }, { label: "Storage", value: `${storage.data?.totalMB ?? 0} MB` }]} /><AdminSection title="Administrator library" subtitle="Open files or retry failed indexing">{filteredFiles.map((file) => <AdminDataRow key={file.id} title={file.originalName} subtitle={file.scope ?? "private"} status={file.indexStatus ?? "not indexed"} statusTone={file.indexStatus === "failed" ? "amber" : "green"} right={<AdminButton label={file.indexStatus === "failed" ? "Retry" : "Open"} tone={file.indexStatus === "failed" ? "amber" : "primary"} variant="text" onPress={() => void (file.indexStatus === "failed" ? fileUploadApi.retryIndex(file.id).then(() => files.refetch()) : fileUploadApi.open(file.id, file.originalName)).catch((error) => Alert.alert("File action failed", toAppError(error).message))} />} />)}{!filteredFiles.length ? empty("Files", "No administrator library files are available.") : null}</AdminSection></>
      ) : null}

      {tool === "reports" ? <AdminSection title="System usage report" subtitle="Live backend report and official audited export"><Text selectable style={{ color: theme.text, padding: 16, fontFamily: "monospace", fontSize: 11, lineHeight: 17 }}>{JSON.stringify(report.data?.data ?? {}, null, 2)}</Text><View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}><AdminButton label="Official audited CSV" icon="download" tone="green" variant="solid" onPress={() => void downloadSystemReport()} /></View></AdminSection> : null}

      {tool === "audit" ? <AdminSection title="Authoritative events" subtitle={`${audit.data?.total ?? 0} events across all loaded pages`}>{filteredAudit.map((entry) => <AdminDataRow key={entry.id} title={entry.action} subtitle={`${entry.targetType} · ${entry.actor?.email ?? entry.actorId}`} meta={new Date(entry.createdAt).toLocaleString()} />)}{!filteredAudit.length ? empty("Audit events", "The backend returned no audit events.") : null}</AdminSection> : null}

      {tool === "diagnostics" ? <><AdminSection title="Liveness"><AdminDataRow title="API server" subtitle={liveness.data?.timestamp ?? "No timestamp"} status={liveness.data?.status ?? "Unavailable"} statusTone={liveness.data?.status === "ok" ? "green" : "red"} /></AdminSection><AdminSection title="Readiness" subtitle="Backend-owned dependency health">{Object.entries(readiness.data?.dependencies ?? {}).map(([name, status]) => <AdminDataRow key={name} title={name} subtitle={status.ok ? status.degraded ? "Available with reduced capability" : "Operating normally" : status.message ?? "Unavailable"} status={status.ok ? status.degraded ? "Degraded" : "Ready" : "Issue"} statusTone={status.ok ? status.degraded ? "amber" : "green" : "red"} />)}{!loading && !Object.keys(readiness.data?.dependencies ?? {}).length ? <AdminEmpty title="Readiness unavailable" subtitle="Pull to refresh the dependency report." /> : null}</AdminSection></> : null}

      {tool === "roster" ? <AdminSection title="Roster import" subtitle="Select a section, preview the file, then commit reviewed rows">{filteredSections.map((section) => <AdminDataRow key={section.id} title={`Grade ${section.gradeLevel} · ${section.name}`} subtitle={section.schoolYear} status={selectedSection === section.id ? "Selected" : undefined} statusTone="primary" onPress={() => { setSelectedSection(section.id); setRosterPreview(null); }} />)}{!filteredSections.length ? empty("Sections", "No sections are available for roster import.") : null}<View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: theme.border }}><AdminButton label="Choose file and preview" icon="file-eye-outline" variant="solid" disabled={!selectedSection || busy} onPress={() => void previewRoster()} />{rosterPreview ? <><AdminNotice title="Preview ready" description={`${rosterPreview.summary.validRows} valid · ${rosterPreview.summary.pendingCount} pending · ${rosterPreview.summary.errorCount} errors`} tone={rosterPreview.summary.errorCount > 0 ? "amber" : "green"} /><AdminButton label="Commit reviewed roster" icon="account-check" tone="green" variant="solid" disabled={busy || rosterPreview.summary.errorCount > 0} onPress={() => void rosterImportApi.commit(selectedSection, rosterPreview).then(() => { Alert.alert("Roster committed"); setRosterPreview(null); }).catch((error) => Alert.alert("Commit rejected", toAppError(error).message))} /></> : null}</View></AdminSection> : null}

      {tool === "templates" ? <AdminSection title="Class templates" subtitle="Create, publish, and reuse backend-owned shells" action={<AdminButton label={showCreate ? "Close" : "New template"} icon={showCreate ? "close" : "plus"} variant={showCreate ? "soft" : "solid"} onPress={() => setShowCreate((value) => !value)} />}>{showCreate ? <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: theme.border }}><AdminField label="Template name" value={templateName} onChangeText={setTemplateName} placeholder="Template name" /><AdminField label="Subject code" value={templateCode} onChangeText={setTemplateCode} placeholder="Subject code" autoCapitalize="characters" /><View style={{ flexDirection: "row", gap: 6 }}>{(["7", "8", "9", "10"] as const).map((value) => <AdminChip key={value} label={`Grade ${value}`} active={templateGrade === value} onPress={() => setTemplateGrade(value)} />)}</View><AdminButton label={busy ? "Creating…" : "Create draft template"} icon="plus" tone="green" variant="solid" disabled={busy || !templateName.trim() || !templateCode.trim()} onPress={() => void createTemplate()} /></View> : null}{filteredTemplates.map((template) => <AdminDataRow key={template.id} title={template.name} subtitle={`${template.subjectCode ?? "Subject"} · ${template.subjectGradeLevel ?? "Grade"}`} status={template.status ?? "draft"} statusTone={template.status === "published" ? "green" : "amber"} right={<AdminButton label={template.status === "published" ? "Unpublish" : "Publish"} tone={template.status === "published" ? "amber" : "green"} variant="text" onPress={() => void adminApi.publishTemplate(template.id, template.status === "published" ? "draft" : "published").then(() => templates.refetch()).catch((error) => Alert.alert("Template update rejected", toAppError(error).message))} />} />)}{!filteredTemplates.length ? empty("Templates", "No class templates have been created.") : null}</AdminSection> : null}

      {tool === "settings" || tool === "records" ? <AdminSection title={tool === "settings" ? "System settings" : "Academic records"} subtitle="Guarded academic controls and account security"><AdminDataRow title="Academic administration" subtitle="Policy, periods, recovery, state alignment, workbooks, and annual grades" onPress={openAcademic} /><View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}><PasswordChangeForm /></View></AdminSection> : null}
    </AdminScreen>
  );
}
