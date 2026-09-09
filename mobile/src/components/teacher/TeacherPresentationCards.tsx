import type { ComponentProps, ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, Text, View } from "react-native";
import type { ClassItem } from "../../types/class";
import type { TeacherSection } from "../../types/teacher";
import { getPresetColors } from "../../utils/class-card-presets";
import { teacherTheme as theme } from "../../theme/teacher";

const GABHS_FALLBACK = ["#C96B68", "#A85A5B", "#98484A"] as const;

function heroColors(preset?: string | null): [string, string, ...string[]] {
  return (preset ? getPresetColors(preset) : GABHS_FALLBACK) as [
    string,
    string,
    ...string[],
  ];
}

function subjectIcon(subjectName: string) {
  if (/math|algebra|geometry|statistics|calculus/i.test(subjectName)) return "calculator-variant-outline";
  if (/science|biology|chem|physics|earth/i.test(subjectName)) return "flask-outline";
  if (/history|social|civics|politics/i.test(subjectName)) return "bank-outline";
  if (/english|language|reading|literature/i.test(subjectName)) return "alphabetical-variant";
  if (/music|arts|perform/i.test(subjectName)) return "music-note-outline";
  if (/research|capstone|project/i.test(subjectName)) return "atom-variant";
  return "book-open-page-variant-outline";
}

function statusForSection(section: TeacherSection) {
  if (section.isHidden) return "Hidden";
  if (section.isActive === false) return "Archived";
  return "Active";
}

function adviserName(section: TeacherSection) {
  const name = [section.adviser?.firstName, section.adviser?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Unassigned adviser";
}

function MetricTile({ value, label }: { value: string | number; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface2,
        paddingHorizontal: 12,
        paddingVertical: 11,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "900", color: theme.text }}>
        {value}
      </Text>
      <Text
        style={{
          marginTop: 3,
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.7,
          textTransform: "uppercase",
          color: theme.muted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function PresentationCard({
  title,
  eyebrow,
  heroMeta,
  status,
  icon,
  bannerUri,
  preset,
  onOpen,
  onCustomize,
  children,
}: {
  title: string;
  eyebrow: string;
  heroMeta: string;
  status: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  bannerUri?: string;
  preset?: string | null;
  onOpen: () => void;
  onCustomize: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      onPress={onOpen}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        overflow: "hidden",
      }}
    >
      <View style={{ height: 132, overflow: "hidden" }}>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={heroColors(preset)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 }}
          />
        )}
        {bannerUri ? (
          <LinearGradient
            colors={["rgba(15,23,42,0.12)", "rgba(15,23,42,0.78)"]}
            style={{ position: "absolute", inset: 0 }}
          />
        ) : null}
        <View
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: 999,
            right: -30,
            top: -50,
            backgroundColor: "rgba(255,255,255,0.10)",
          }}
        />
        <View
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 14,
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.42)",
                backgroundColor: "rgba(0,0,0,0.16)",
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#FFFFFF" }}>
                {status}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Customize ${title}`}
              onPress={(event) => {
                event.stopPropagation();
                onCustomize();
              }}
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.42)",
                backgroundColor: "rgba(0,0,0,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="palette-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 10, fontWeight: "900", letterSpacing: 1, color: "rgba(255,255,255,0.82)" }}
              >
                {eyebrow.toUpperCase()}
              </Text>
              <Text numberOfLines={2} style={{ marginTop: 3, fontSize: 23, lineHeight: 27, fontWeight: "900", color: "#FFFFFF" }}>
                {title}
              </Text>
              <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.88)" }}>
                {heroMeta}
              </Text>
            </View>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.35)",
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name={icon} size={21} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>

      <View style={{ padding: 16, gap: 12 }}>{children}</View>
    </Pressable>
  );
}

export function TeacherClassPresentationCard({
  classItem,
  bannerUri,
  schedule,
  onOpen,
  onCustomize,
}: {
  classItem: ClassItem;
  bannerUri?: string;
  schedule: string;
  onOpen: () => void;
  onCustomize: () => void;
}) {
  const subjectName = classItem.subjectName || classItem.className || classItem.name || "Class";
  const gradeLevel = classItem.section?.gradeLevel || classItem.subjectGradeLevel || "TBA";
  const students = classItem.enrollmentCount ?? classItem.enrollments?.length ?? 0;

  return (
    <PresentationCard
      title={subjectName}
      eyebrow={classItem.subjectCode || "Subject"}
      heroMeta={`${classItem.section?.name || "Section TBA"} · ${classItem.schoolYear}`}
      status={`Grade ${gradeLevel}`}
      icon={subjectIcon(subjectName)}
      bannerUri={bannerUri}
      preset={classItem.cardPreset}
      onOpen={onOpen}
      onCustomize={onCustomize}
    >
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface2,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <MaterialCommunityIcons name="calendar-clock-outline" size={17} color={theme.red} />
        <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: theme.subtext }}>
          {schedule}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <MetricTile value={students} label="Learners" />
        <MetricTile value={classItem.room || "TBA"} label="Room" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted }}>
          {classItem.isActive ? "Ready for class updates" : "Review archived class"}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "900", color: theme.red }}>Open class →</Text>
      </View>
    </PresentationCard>
  );
}

export function TeacherSectionPresentationCard({
  section,
  bannerUri,
  onOpen,
  onCustomize,
}: {
  section: TeacherSection;
  bannerUri?: string;
  onOpen: () => void;
  onCustomize: () => void;
}) {
  const students = section.studentCount ?? section.enrollmentCount ?? 0;
  const capacity = Math.max(1, section.capacity ?? 1);
  const occupancy = Math.min(100, Math.round((students / capacity) * 100));

  return (
    <PresentationCard
      title={section.name}
      eyebrow={`Grade ${section.gradeLevel}`}
      heroMeta={`${section.schoolYear} · Room ${section.roomNumber || "TBA"}`}
      status={statusForSection(section)}
      icon="account-group-outline"
      bannerUri={bannerUri}
      preset={section.cardPreset}
      onOpen={onOpen}
      onCustomize={onCustomize}
    >
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface2,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 0.7, color: theme.muted }}>ADVISER</Text>
        <Text style={{ marginTop: 4, fontSize: 14, fontWeight: "900", color: theme.text }}>
          {adviserName(section)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <MetricTile value={students} label="Students" />
        <MetricTile value={capacity} label="Capacity" />
      </View>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface2,
          padding: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: theme.subtext }}>Occupancy</Text>
          <Text style={{ fontSize: 12, fontWeight: "900", color: theme.red }}>{`${occupancy}%`}</Text>
        </View>
        <View style={{ marginTop: 8, height: 7, borderRadius: 999, backgroundColor: theme.border, overflow: "hidden" }}>
          <LinearGradient
            colors={["#C96B68", "#E6A09B"]}
            style={{ width: `${occupancy}%`, height: "100%", borderRadius: 999 }}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <Text style={{ fontSize: 13, fontWeight: "900", color: theme.red }}>Open section →</Text>
      </View>
    </PresentationCard>
  );
}
