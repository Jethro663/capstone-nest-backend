import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Alert, View } from "react-native";
import { adminApi } from "../api/services/admin";
import { classesApi } from "../api/services/classes";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import type { ScheduleDay } from "../types/class";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminFilterBar,
  AdminMetricStrip,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Classes">;
type ViewMode = "classes" | "sections";
type StatusFilter = "all" | "active" | "archived";

const scheduleDays: ScheduleDay[] = ["M", "T", "W", "Th", "F", "Sa", "Su"];
const roomNumbers = ["101", "102", "103", "104", "105", "201", "202", "203", "204", "205", "301", "302", "303", "304", "305", "401", "402", "403", "404", "405"] as const;

export function AdminClassesScreen({ navigation }: Props) {
  const [mode, setMode] = useState<ViewMode>("classes");
  const [status, setStatus] = useState<StatusFilter>("all");
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

  const visibleClasses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (classes.data ?? []).filter((entry) => {
      const matchesSearch = !needle || `${entry.subjectCode} ${entry.subjectName} ${entry.section?.name ?? ""} ${entry.schoolYear}`.toLowerCase().includes(needle);
      const matchesStatus = status === "all" || (status === "active" ? entry.isActive : !entry.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [classes.data, search, status]);

  const visibleSections = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (sections.data?.data ?? []).filter((entry) => {
      const matchesSearch = !needle || `${entry.name} ${entry.gradeLevel} ${entry.schoolYear} ${entry.adviser?.firstName ?? ""} ${entry.adviser?.lastName ?? ""}`.toLowerCase().includes(needle);
      const matchesStatus = status === "all" || (status === "active" ? entry.isActive : !entry.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [sections.data?.data, search, status]);

  const reset = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setRoom("");
    setSelectedSection("");
    setSelectedTeacher("");
    setSelectedDays(["M"]);
    setStartTime("08:00");
    setEndTime("09:00");
    setShowCreate(false);
  };

  const selectMode = (nextMode: ViewMode) => {
    if (nextMode === mode) return;
    reset();
    setMode(nextMode);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
  };

  const editClass = (entry: (typeof visibleClasses)[number]) => {
    const schedule = entry.schedules?.[0];
    setMode("classes");
    setEditingId(entry.id);
    setName(entry.subjectName);
    setCode(entry.subjectCode);
    setGrade(entry.subjectGradeLevel === "8" || entry.subjectGradeLevel === "9" || entry.subjectGradeLevel === "10" ? entry.subjectGradeLevel : "7");
    setSchoolYear(entry.schoolYear);
    setRoom(entry.room ?? "");
    setSelectedSection(entry.sectionId);
    setSelectedTeacher(entry.teacherId ?? "");
    setSelectedDays(schedule?.days?.length ? schedule.days : ["M"]);
    setStartTime(schedule?.startTime ?? "08:00");
    setEndTime(schedule?.endTime ?? "09:00");
    setShowCreate(true);
  };

  const editSection = (entry: (typeof visibleSections)[number]) => {
    setMode("sections");
    setEditingId(entry.id);
    setName(entry.name);
    setGrade(entry.gradeLevel === "8" || entry.gradeLevel === "9" || entry.gradeLevel === "10" ? entry.gradeLevel : "7");
    setSchoolYear(entry.schoolYear);
    setRoom(entry.roomNumber ?? "");
    setSelectedTeacher(entry.adviser?.id ?? "");
    setShowCreate(true);
  };

  const save = async () => {
    if (!name.trim() || !schoolYear.trim()) {
      Alert.alert("Missing fields", "Name and school year are required.");
      return;
    }
    try {
      setBusy(true);
      if (mode === "sections") {
        const payload = {
          name: name.trim(),
          gradeLevel: grade,
          schoolYear: schoolYear.trim(),
          capacity: 50,
          roomNumber: room.trim() || undefined,
          adviserId: selectedTeacher || undefined,
        };
        if (editingId) await sectionsApi.update(editingId, payload);
        else await sectionsApi.create(payload);
        await sections.refetch();
      } else {
        if (!code.trim() || !selectedSection || !selectedTeacher || !room || !selectedDays.length) {
          throw new Error("Subject code, section, teacher, room, and at least one schedule day are required.");
        }
        if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
          throw new Error("Enter a valid schedule with the start time before the end time.");
        }
        const payload = {
          subjectName: name.trim(),
          subjectCode: code.trim().toUpperCase(),
          subjectGradeLevel: grade,
          sectionId: selectedSection,
          teacherId: selectedTeacher,
          schoolYear: schoolYear.trim(),
          room,
          schedules: [{ days: selectedDays, startTime, endTime }],
        };
        if (editingId) await classesApi.update(editingId, payload);
        else await classesApi.create({ ...payload, gradingProfile: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } });
        await classes.refetch();
      }
      reset();
    } catch (error) {
      Alert.alert("Unable to save record", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const rootNavigation = navigation.getParent() as unknown as {
    navigate: (name: string, params?: unknown) => void;
  };
  const visibleCount = mode === "classes" ? visibleClasses.length : visibleSections.length;
  const hasFilters = Boolean(search.trim()) || status !== "all";

  return (
    <AdminScreen
      title="Classes and sections"
      subtitle="Schedules, assignments, rosters, and archive status"
      refreshing={classes.isRefetching || sections.isRefetching}
      onRefresh={() => void Promise.all([classes.refetch(), sections.refetch(), teachers.refetch()])}
    >
      <AdminMetricStrip items={[
        { label: "Classes", value: classes.data?.length ?? 0 },
        { label: "Sections", value: sections.data?.pagination?.total ?? sections.data?.data.length ?? 0 },
        { label: "Teachers", value: teachers.data?.total ?? 0 },
      ]} />

      <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: "row", gap: 7 }}>
        <AdminChip label="Classes" active={mode === "classes"} onPress={() => selectMode("classes")} />
        <AdminChip label="Sections" active={mode === "sections"} onPress={() => selectMode("sections")} />
        <View style={{ flex: 1 }} />
        <AdminButton
          label={showCreate ? "Close" : `New ${mode === "classes" ? "class" : "section"}`}
          icon={showCreate ? "close" : "plus"}
          variant={showCreate ? "soft" : "solid"}
          onPress={() => showCreate ? reset() : setShowCreate(true)}
        />
      </View>

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder={`Search ${mode}`}
        segments={[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "archived", label: "Archived" },
        ]}
        activeSegment={status}
        onSegmentChange={setStatus}
        resultCount={visibleCount}
      />

      {showCreate ? (
        <AdminSection
          title={`${editingId ? "Edit" : "New"} ${mode === "classes" ? "class" : "section"}`}
          subtitle="Required values follow the existing administrator contract"
        >
          <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: "#DDE3EA" }}>
            <AdminField label={mode === "classes" ? "Subject name" : "Section name"} value={name} onChangeText={setName} placeholder={mode === "classes" ? "Mathematics" : "Bonifacio"} />
            {mode === "classes" ? <AdminField label="Subject code" value={code} onChangeText={setCode} placeholder="MATH-7" autoCapitalize="characters" /> : null}
            <AdminField label="School year" value={schoolYear} onChangeText={setSchoolYear} placeholder="2026-2027" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(["7", "8", "9", "10"] as const).map((value) => <AdminChip key={value} label={`Grade ${value}`} active={grade === value} onPress={() => setGrade(value)} />)}
            </View>
            {mode === "classes" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {(sections.data?.data ?? []).filter((entry) => entry.gradeLevel === grade).map((entry) => <AdminChip key={entry.id} label={`Section ${entry.name}`} active={selectedSection === entry.id} onPress={() => setSelectedSection(entry.id)} />)}
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(teachers.data?.data ?? []).map((teacher) => <AdminChip key={teacher.id} label={`${teacher.firstName ?? ""} ${teacher.lastName ?? teacher.email}`.trim()} active={selectedTeacher === teacher.id} onPress={() => setSelectedTeacher(teacher.id)} />)}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {roomNumbers.map((value) => <AdminChip key={value} label={`Room ${value}`} active={room === value} onPress={() => setRoom(value)} />)}
            </View>
            {mode === "classes" ? (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {scheduleDays.map((value) => <AdminChip key={value} label={value} active={selectedDays.includes(value)} onPress={() => setSelectedDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value])} />)}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><AdminField label="Starts" value={startTime} onChangeText={setStartTime} placeholder="08:00" /></View>
                  <View style={{ flex: 1 }}><AdminField label="Ends" value={endTime} onChangeText={setEndTime} placeholder="09:00" /></View>
                </View>
              </>
            ) : null}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              {editingId ? <AdminButton label="Cancel edit" tone="neutral" onPress={reset} /> : null}
              <AdminButton label={busy ? "Saving…" : editingId ? "Save changes" : "Create"} icon="content-save" tone="green" variant="solid" disabled={busy} onPress={() => void save()} />
            </View>
          </View>
        </AdminSection>
      ) : null}

      <AdminSection title={mode === "classes" ? "Class records" : "Section records"} subtitle={`${visibleCount} visible ${visibleCount === 1 ? "record" : "records"}`}>
        {mode === "classes" ? visibleClasses.map((entry) => (
          <AdminDataRow
            key={entry.id}
            title={`${entry.subjectCode} · ${entry.subjectName}`}
            subtitle={`${entry.section?.name ?? "No section"} · ${entry.schoolYear}`}
            meta={entry.schedules?.[0] ? `${entry.schedules[0].days.join(", ")} · ${entry.schedules[0].startTime}-${entry.schedules[0].endTime}${entry.room ? ` · Room ${entry.room}` : ""}` : entry.room ? `Room ${entry.room}` : "No schedule"}
            status={entry.isActive ? "Active" : "Archived"}
            statusTone={entry.isActive ? "green" : "neutral"}
            onPress={() => rootNavigation?.navigate("TeacherClassDetail", { classId: entry.id, initialTab: "students" })}
            right={<View style={{ gap: 4 }}><AdminButton label="Edit" variant="text" onPress={() => editClass(entry)} /><AdminButton label={entry.isActive ? "Archive" : "Restore"} tone={entry.isActive ? "amber" : "green"} variant="text" onPress={() => void classesApi.toggleStatus(entry.id).then(() => classes.refetch()).catch((error) => Alert.alert("Update rejected", toAppError(error).message))} /></View>}
          />
        )) : visibleSections.map((entry) => (
          <AdminDataRow
            key={entry.id}
            title={`Grade ${entry.gradeLevel} · ${entry.name}`}
            subtitle={`${entry.schoolYear} · ${entry.studentCount ?? 0} students`}
            meta={entry.adviser ? `${entry.adviser.firstName ?? ""} ${entry.adviser.lastName ?? ""}`.trim() : "No adviser assigned"}
            status={entry.isActive ? "Active" : "Archived"}
            statusTone={entry.isActive ? "green" : "neutral"}
            onPress={() => rootNavigation?.navigate("TeacherSectionDetail", { sectionId: entry.id })}
            right={<View style={{ gap: 4 }}><AdminButton label="Edit" variant="text" onPress={() => editSection(entry)} /><AdminButton label={entry.isActive ? "Archive" : "Restore"} tone={entry.isActive ? "amber" : "green"} variant="text" onPress={() => void sectionsApi.update(entry.id, { isActive: !entry.isActive }).then(() => sections.refetch()).catch((error) => Alert.alert("Update rejected", toAppError(error).message))} /></View>}
          />
        ))}
        {visibleCount === 0 ? (
          <AdminEmpty
            title={hasFilters ? "No matching records" : `No ${mode} yet`}
            subtitle={hasFilters ? "Clear filters to return to the complete list." : `Create the first ${mode === "classes" ? "class" : "section"} above.`}
            actionLabel={hasFilters ? "Clear filters" : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}
