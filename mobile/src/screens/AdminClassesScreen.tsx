import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Alert, TextInput, View } from "react-native";
import { adminApi } from "../api/services/admin";
import { classesApi } from "../api/services/classes";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import type { ScheduleDay } from "../types/class";
import { TeacherActionButton, TeacherChip, TeacherEmpty, TeacherPanel, TeacherRow, TeacherScreen, TeacherSearch, TeacherStats, teacherTheme as theme } from "../components/teacher/TeacherMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Classes">;
type ViewMode = "classes" | "sections";
const scheduleDays: ScheduleDay[] = ["M", "T", "W", "Th", "F", "Sa", "Su"];
const roomNumbers = ["101", "102", "103", "104", "105", "201", "202", "203", "204", "205", "301", "302", "303", "304", "305", "401", "402", "403", "404", "405"] as const;

export function AdminClassesScreen({ navigation }: Props) {
  const [mode, setMode] = useState<ViewMode>("classes");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [grade, setGrade] = useState<"7" | "8" | "9" | "10">("7");
  const [schoolYear, setSchoolYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [room, setRoom] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedDays, setSelectedDays] = useState<ScheduleDay[]>(["M"]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [busy, setBusy] = useState(false);
  const classes = useQuery({ queryKey: ["admin-classes-all"], queryFn: () => classesApi.getAll() });
  const sections = useQuery({ queryKey: ["admin-sections-all"], queryFn: () => sectionsApi.getAll() });
  const teachers = useQuery({ queryKey: ["admin-teachers-all"], queryFn: () => adminApi.getAllUsers({ role: "teacher", status: "ACTIVE" }) });

  const visibleClasses = useMemo(() => (classes.data ?? []).filter((entry) => `${entry.subjectCode} ${entry.subjectName} ${entry.section?.name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())), [classes.data, search]);
  const visibleSections = useMemo(() => (sections.data?.data ?? []).filter((entry) => `${entry.name} ${entry.gradeLevel} ${entry.schoolYear}`.toLowerCase().includes(search.trim().toLowerCase())), [sections.data?.data, search]);

  const reset = () => { setEditingId(null); setName(""); setCode(""); setRoom(""); setSelectedSection(""); setSelectedTeacher(""); setSelectedDays(["M"]); setStartTime("08:00"); setEndTime("09:00"); setShowCreate(false); };
  const editClass = (entry: (typeof visibleClasses)[number]) => { const schedule = entry.schedules?.[0]; setMode("classes"); setEditingId(entry.id); setName(entry.subjectName); setCode(entry.subjectCode); setGrade((entry.subjectGradeLevel === "8" || entry.subjectGradeLevel === "9" || entry.subjectGradeLevel === "10") ? entry.subjectGradeLevel : "7"); setSchoolYear(entry.schoolYear); setRoom(entry.room ?? ""); setSelectedSection(entry.sectionId); setSelectedTeacher(entry.teacherId ?? ""); setSelectedDays(schedule?.days?.length ? schedule.days : ["M"]); setStartTime(schedule?.startTime ?? "08:00"); setEndTime(schedule?.endTime ?? "09:00"); setShowCreate(true); };
  const editSection = (entry: (typeof visibleSections)[number]) => { setMode("sections"); setEditingId(entry.id); setName(entry.name); setGrade((entry.gradeLevel === "8" || entry.gradeLevel === "9" || entry.gradeLevel === "10") ? entry.gradeLevel : "7"); setSchoolYear(entry.schoolYear); setRoom(entry.roomNumber ?? ""); setSelectedTeacher(entry.adviser?.id ?? ""); setShowCreate(true); };
  const create = async () => {
    if (!name.trim() || !schoolYear.trim()) return Alert.alert("Missing fields", "Name and school year are required.");
    try {
      setBusy(true);
      if (mode === "sections") {
        const payload = { name: name.trim(), gradeLevel: grade, schoolYear: schoolYear.trim(), capacity: 50, roomNumber: room.trim() || undefined, adviserId: selectedTeacher || undefined };
        if (editingId) await sectionsApi.update(editingId, payload); else await sectionsApi.create(payload);
        await sections.refetch();
      } else {
        if (!code.trim() || !selectedSection || !selectedTeacher || !room || !selectedDays.length) throw new Error("Subject code, section, teacher, room, and at least one schedule day are required.");
        if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) throw new Error("Enter a valid schedule with the start time before the end time.");
        const payload = { subjectName: name.trim(), subjectCode: code.trim().toUpperCase(), subjectGradeLevel: grade, sectionId: selectedSection, teacherId: selectedTeacher, schoolYear: schoolYear.trim(), room, schedules: [{ days: selectedDays, startTime, endTime }] };
        if (editingId) await classesApi.update(editingId, payload); else await classesApi.create({ ...payload, gradingProfile: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } });
        await classes.refetch();
      }
      reset();
    } catch (error) {
      Alert.alert("Unable to create record", toAppError(error).message);
    } finally { setBusy(false); }
  };

  return (
    <TeacherScreen title="Classes and sections" workspaceLabel="Admin workspace" subtitle="Create, inspect, archive, restore, and open roster/enrollment workspaces using complete backend pages." icon="google-classroom" refreshing={classes.isRefetching || sections.isRefetching} onRefresh={() => void Promise.all([classes.refetch(), sections.refetch(), teachers.refetch()])}>
      <TeacherStats items={[{ label: "Classes", value: classes.data?.length ?? 0, tone: "red" }, { label: "Sections", value: sections.data?.pagination?.total ?? sections.data?.data.length ?? 0, tone: "blue" }, { label: "Teachers", value: teachers.data?.total ?? 0, tone: "green" }]} />
      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 8 }}><TeacherChip label="Classes" active={mode === "classes"} onPress={() => setMode("classes")} /><TeacherChip label="Sections" active={mode === "sections"} onPress={() => setMode("sections")} /><TeacherActionButton label={showCreate ? "Close form" : `Create ${mode === "classes" ? "class" : "section"}`} icon="plus" tone="green" onPress={() => setShowCreate((value) => !value)} /></View>
      <TeacherSearch value={search} onChangeText={setSearch} placeholder={`Search ${mode}`} />
      {showCreate ? <TeacherPanel title={`${editingId ? "Edit" : "New"} ${mode === "classes" ? "class" : "section"}`} subtitle="Required values and choices follow the backend DTO; the server remains the final validator.">
        <View style={{ padding: 14, gap: 9 }}>
          {[{ label: mode === "classes" ? "Subject name" : "Section name", value: name, setter: setName }, ...(mode === "classes" ? [{ label: "Subject code", value: code, setter: setCode }] : []), { label: "School year", value: schoolYear, setter: setSchoolYear }].map((field) => <TextInput key={field.label} accessibilityLabel={field.label} placeholder={field.label} placeholderTextColor={theme.muted} value={field.value} onChangeText={field.setter} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} />)}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{(["7", "8", "9", "10"] as const).map((value) => <TeacherChip key={value} label={`Grade ${value}`} active={grade === value} onPress={() => setGrade(value)} />)}</View>
          {mode === "classes" ? <View style={{ gap: 6 }}>{(sections.data?.data ?? []).filter((entry) => entry.gradeLevel === grade).map((entry) => <TeacherChip key={entry.id} label={`Section ${entry.name}`} active={selectedSection === entry.id} onPress={() => setSelectedSection(entry.id)} />)}</View> : null}
          <View style={{ gap: 6 }}>{(teachers.data?.data ?? []).map((teacher) => <TeacherChip key={teacher.id} label={`${teacher.firstName ?? ""} ${teacher.lastName ?? teacher.email}`.trim()} active={selectedTeacher === teacher.id} onPress={() => setSelectedTeacher(teacher.id)} />)}</View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{roomNumbers.map((value) => <TeacherChip key={value} label={`Room ${value}`} active={room === value} onPress={() => setRoom(value)} />)}</View>
          {mode === "classes" ? <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{scheduleDays.map((value) => <TeacherChip key={value} label={value} active={selectedDays.includes(value)} onPress={() => setSelectedDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value])} />)}</View>
            <View style={{ flexDirection: "row", gap: 8 }}><TextInput accessibilityLabel="Schedule start time" placeholder="08:00" placeholderTextColor={theme.muted} value={startTime} onChangeText={setStartTime} style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} /><TextInput accessibilityLabel="Schedule end time" placeholder="09:00" placeholderTextColor={theme.muted} value={endTime} onChangeText={setEndTime} style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} /></View>
          </> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>{editingId ? <TeacherActionButton label="Cancel edit" tone="neutral" onPress={reset} /> : null}<TeacherActionButton label={busy ? "Saving..." : editingId ? "Save changes" : "Create"} icon="content-save" tone="green" disabled={busy} onPress={() => void create()} /></View>
        </View>
      </TeacherPanel> : null}
      <TeacherPanel title={mode === "classes" ? "Class records" : "Section records"} subtitle="Counts and filters cover every page returned by the backend.">
        {mode === "classes" ? visibleClasses.map((entry) => <TeacherRow key={entry.id} title={`${entry.subjectCode} - ${entry.subjectName}`} subtitle={`${entry.section?.name ?? "No section"} · ${entry.schoolYear} · ${entry.isActive ? "Active" : "Archived"}`} onPress={() => (navigation.getParent() as unknown as { navigate: (name: string, params?: unknown) => void })?.navigate("TeacherClassDetail", { classId: entry.id, initialTab: "students" })} right={<View style={{ flexDirection: "row", gap: 5 }}><TeacherActionButton label="Edit" tone="blue" onPress={() => editClass(entry)} /><TeacherActionButton label={entry.isActive ? "Archive" : "Restore"} tone={entry.isActive ? "amber" : "green"} onPress={() => void classesApi.toggleStatus(entry.id).then(() => classes.refetch()).catch((error) => Alert.alert("Update rejected", toAppError(error).message))} /></View>} />) : visibleSections.map((entry) => <TeacherRow key={entry.id} title={`Grade ${entry.gradeLevel} - ${entry.name}`} subtitle={`${entry.schoolYear} · ${entry.studentCount ?? 0} students · ${entry.isActive ? "Active" : "Archived"}`} onPress={() => (navigation.getParent() as unknown as { navigate: (name: string, params?: unknown) => void })?.navigate("TeacherSectionDetail", { sectionId: entry.id })} right={<View style={{ flexDirection: "row", gap: 5 }}><TeacherActionButton label="Edit" tone="blue" onPress={() => editSection(entry)} /><TeacherActionButton label={entry.isActive ? "Archive" : "Restore"} tone={entry.isActive ? "amber" : "green"} onPress={() => void sectionsApi.update(entry.id, { isActive: !entry.isActive }).then(() => sections.refetch()).catch((error) => Alert.alert("Update rejected", toAppError(error).message))} /></View>} />)}
        {(mode === "classes" ? visibleClasses : visibleSections).length === 0 ? <TeacherEmpty title="No matching records" subtitle="Change the search or create a record." icon="database-search-outline" /> : null}
      </TeacherPanel>
    </TeacherScreen>
  );
}
