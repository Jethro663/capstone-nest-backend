import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { classesApi } from "../api/services/classes";
import { sectionsApi } from "../api/services/sections";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/tokens";
import type { ClassItem } from "../types/class";
import type { TeacherSection } from "../types/teacher";

type RoleWorkspaceScreenProps = {
  role: "teacher" | "admin";
  section: "overview" | "classes" | "assessments" | "announcements" | "profile";
};

type ArchiveStatus = "active" | "archived";
type ArchiveView = "classes" | "sections";

function roleLabel(role: "teacher" | "admin") {
  return role === "admin" ? "Admin" : "Teacher";
}

function sectionMessage(section: RoleWorkspaceScreenProps["section"]) {
  switch (section) {
    case "overview":
      return "Mobile role support is now enabled. This section is the launch point for role-specific workflows.";
    case "classes":
      return "Class and section operations will be available here for quick mobile review and updates.";
    case "assessments":
      return "Assessment lifecycle actions will be surfaced here for role-based mobile execution.";
    case "announcements":
      return "School and class announcement management will be exposed here.";
    case "profile":
      return "Role profile and account controls are available on this mobile surface.";
    default:
      return "Role workspace section";
  }
}

function uniqueYears(items: Array<{ schoolYear?: string | null }>) {
  return Array.from(
    new Set(items.map((item) => item.schoolYear).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => right.localeCompare(left));
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: active ? colors.indigo : colors.white,
        borderWidth: 1,
        borderColor: active ? colors.indigo : colors.border,
      }}
    >
      <Text style={{ color: active ? colors.white : colors.textSecondary, fontSize: 12, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function AdminArchiveWorkspace({ onLogout, userEmail }: { onLogout: () => void; userEmail?: string | null }) {
  const [view, setView] = useState<ArchiveView>("classes");
  const [status, setStatus] = useState<ArchiveStatus>("archived");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [schoolYearFilter, setSchoolYearFilter] = useState("all");

  const archiveQuery = useQuery({
    queryKey: ["admin-mobile-archive-browser"],
    queryFn: async () => {
      const [classes, sections] = await Promise.all([
        classesApi.getAll({ limit: 100 }),
        sectionsApi.getAll({ limit: 100 }),
      ]);
      return { classes, sections: sections.data };
    },
  });

  const classes = archiveQuery.data?.classes ?? [];
  const sections = archiveQuery.data?.sections ?? [];
  const yearOptions = useMemo(() => uniqueYears([...classes, ...sections]), [classes, sections]);

  const visibleClasses = useMemo(
    () =>
      classes.filter((classItem) => {
        if (status === "active" && !classItem.isActive) return false;
        if (status === "archived" && classItem.isActive) return false;
        if (gradeFilter !== "all" && classItem.subjectGradeLevel !== gradeFilter) return false;
        if (schoolYearFilter !== "all" && classItem.schoolYear !== schoolYearFilter) return false;
        return true;
      }),
    [classes, gradeFilter, schoolYearFilter, status],
  );

  const visibleSections = useMemo(
    () =>
      sections.filter((section) => {
        if (status === "active" && !section.isActive) return false;
        if (status === "archived" && section.isActive) return false;
        if (gradeFilter !== "all" && String(section.gradeLevel) !== gradeFilter) return false;
        if (schoolYearFilter !== "all" && section.schoolYear !== schoolYearFilter) return false;
        return true;
      }),
    [gradeFilter, schoolYearFilter, sections, status],
  );

  const activeClasses = classes.filter((classItem) => classItem.isActive).length;
  const archivedClasses = classes.length - activeClasses;
  const activeSections = sections.filter((section) => section.isActive).length;
  const archivedSections = sections.length - activeSections;
  const visibleItems = view === "classes" ? visibleClasses : visibleSections;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 20, paddingBottom: 34 }}>
      <View
        style={{
          borderRadius: 30,
          padding: 22,
          backgroundColor: colors.indigo,
          overflow: "hidden",
        }}
      >
        <Text style={{ color: colors.paleIndigo, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 }}>
          ADMIN ARCHIVE CONTROL
        </Text>
        <Text style={{ marginTop: 8, color: colors.white, fontSize: 28, fontWeight: "900" }}>
          School Year Archives
        </Text>
        <Text style={{ marginTop: 8, color: colors.paleIndigo, fontSize: 13, lineHeight: 20 }}>
          Review archived and reusable class or section shells by grade level and school year. Signed in as {userEmail ?? "admin"}.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1, borderRadius: 22, backgroundColor: colors.white, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "900" }}>ACTIVE</Text>
          <Text style={{ marginTop: 5, color: colors.green, fontSize: 24, fontWeight: "900" }}>
            {activeClasses + activeSections}
          </Text>
        </View>
        <View style={{ flex: 1, borderRadius: 22, backgroundColor: colors.white, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "900" }}>ARCHIVED</Text>
          <Text style={{ marginTop: 5, color: colors.red, fontSize: 24, fontWeight: "900" }}>
            {archivedClasses + archivedSections}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 16, borderRadius: 26, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>Archive Filters</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <FilterChip active={view === "classes"} label="Classes" onPress={() => setView("classes")} />
          <FilterChip active={view === "sections"} label="Sections" onPress={() => setView("sections")} />
          <FilterChip active={status === "active"} label="Active" onPress={() => setStatus("active")} />
          <FilterChip active={status === "archived"} label="Archived" onPress={() => setStatus("archived")} />
        </View>
        <Text style={{ marginTop: 14, color: colors.muted, fontSize: 11, fontWeight: "900" }}>GRADE LEVEL</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {["all", "7", "8", "9", "10"].map((grade) => (
            <FilterChip
              key={grade}
              active={gradeFilter === grade}
              label={grade === "all" ? "All Grades" : `Grade ${grade}`}
              onPress={() => setGradeFilter(grade)}
            />
          ))}
        </View>
        <Text style={{ marginTop: 14, color: colors.muted, fontSize: 11, fontWeight: "900" }}>SCHOOL YEAR</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <FilterChip active={schoolYearFilter === "all"} label="All Years" onPress={() => setSchoolYearFilter("all")} />
          {yearOptions.map((schoolYear) => (
            <FilterChip
              key={schoolYear}
              active={schoolYearFilter === schoolYear}
              label={schoolYear}
              onPress={() => setSchoolYearFilter(schoolYear)}
            />
          ))}
        </View>
      </View>

      {archiveQuery.isLoading ? (
        <View style={{ paddingVertical: 30, alignItems: "center" }}>
          <ActivityIndicator color={colors.indigo} />
          <Text style={{ marginTop: 10, color: colors.textSecondary, fontWeight: "800" }}>Loading archive records...</Text>
        </View>
      ) : archiveQuery.isError ? (
        <View style={{ marginTop: 16, borderRadius: 22, padding: 18, backgroundColor: colors.paleRed }}>
          <Text style={{ color: colors.red, fontWeight: "900" }}>Unable to load archive records.</Text>
          <Text style={{ marginTop: 6, color: colors.textSecondary }}>Check your backend connection and try Refresh from the app shell.</Text>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
            {status === "archived" ? "Archived" : "Active"} {view === "classes" ? "Classes" : "Sections"} ({visibleItems.length})
          </Text>
          {view === "classes"
            ? visibleClasses.map((classItem) => <MobileClassArchiveCard key={classItem.id} classItem={classItem} />)
            : visibleSections.map((section) => <MobileSectionArchiveCard key={section.id} section={section} />)}
          {visibleItems.length === 0 ? (
            <View style={{ borderRadius: 22, padding: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: "900" }}>No records match these filters.</Text>
              <Text style={{ marginTop: 5, color: colors.textSecondary }}>Try another grade level, school year, or archive state.</Text>
            </View>
          ) : null}
        </View>
      )}

      <Pressable
        onPress={onLogout}
        style={{
          marginTop: 18,
          borderRadius: 18,
          backgroundColor: colors.text,
          alignItems: "center",
          paddingVertical: 14,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "900", color: colors.white }}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

function MobileClassArchiveCard({ classItem }: { classItem: ClassItem }) {
  return (
    <View style={{ borderRadius: 22, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>{classItem.subjectCode}</Text>
      <Text style={{ marginTop: 3, color: colors.textSecondary, fontWeight: "800" }}>{classItem.subjectName}</Text>
      <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>
        Grade {classItem.subjectGradeLevel ?? "--"} - {classItem.section?.name ?? "No section"} - {classItem.schoolYear}
      </Text>
      <Text style={{ marginTop: 5, color: colors.muted, fontSize: 12 }}>
        Teacher: {classItem.teacher ? `${classItem.teacher.firstName ?? ""} ${classItem.teacher.lastName ?? ""}`.trim() : "Unassigned"}
      </Text>
    </View>
  );
}

function MobileSectionArchiveCard({ section }: { section: TeacherSection }) {
  return (
    <View style={{ borderRadius: 22, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>Grade {section.gradeLevel} - {section.name}</Text>
      <Text style={{ marginTop: 6, color: colors.textSecondary, fontWeight: "800" }}>{section.schoolYear}</Text>
      <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>
        Adviser: {section.adviser ? `${section.adviser.firstName ?? ""} ${section.adviser.lastName ?? ""}`.trim() : "Unassigned"}
      </Text>
      <Text style={{ marginTop: 5, color: colors.muted, fontSize: 12 }}>
        Students: {section.studentCount ?? section.enrollmentCount ?? 0}
      </Text>
    </View>
  );
}

export function RoleWorkspaceScreen({ role, section }: RoleWorkspaceScreenProps) {
  const { logout, user } = useAuth();
  const label = roleLabel(role);

  if (role === "admin" && section === "classes") {
    return <AdminArchiveWorkspace onLogout={() => void logout()} userEmail={user?.email} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        paddingHorizontal: 24,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          borderRadius: 26,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.white,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900", color: colors.indigo }}>
          {label} mobile workspace
        </Text>
        <Text style={{ marginTop: 10, fontSize: 22, fontWeight: "900", color: colors.text }}>
          {label} {section.charAt(0).toUpperCase() + section.slice(1)}
        </Text>
        <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
          Signed in as {user?.email ?? `${role}@lms.local`}.
          {"\n"}
          {sectionMessage(section)}
        </Text>
        <Pressable
          onPress={() => void logout()}
          style={{
            marginTop: 18,
            borderRadius: 16,
            backgroundColor: colors.text,
            alignItems: "center",
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.white }}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}
