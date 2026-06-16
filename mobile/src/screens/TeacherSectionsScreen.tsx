import { useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { useTeacherSections } from "../api/hooks";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Sections">,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = "all" | "active" | "archived" | "hidden";

export function TeacherSectionsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const sectionsQuery = useTeacherSections(filter);

  const filtered = useMemo(() => {
    const rows = sectionsQuery.data?.data ?? [];
    if (!search.trim()) return rows;
    const needle = search.trim().toLowerCase();
    return rows.filter((section) => {
      const haystack = `${section.name} ${section.gradeLevel} ${section.schoolYear} ${section.roomNumber ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [search, sectionsQuery.data?.data]);

  const allSections = sectionsQuery.data?.data ?? [];
  const activeCount = allSections.filter((entry) => entry.isActive !== false && !entry.isHidden).length;
  const hiddenCount = allSections.filter((entry) => entry.isHidden).length;

  return (
    <TeacherScreen
      title="My Sections"
      subtitle="Teacher advisory sections, roster access, and room/schedule visibility in one mobile view."
      icon="account-group-outline"
      refreshing={sectionsQuery.isRefetching}
      onRefresh={() => {
        void sectionsQuery.refetch();
      }}
    >
      <TeacherStats
        items={[
          { label: "Sections", value: allSections.length, tone: "red" },
          { label: "Active", value: activeCount, tone: "green" },
          { label: "Hidden", value: hiddenCount, tone: "amber" },
        ]}
      />

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search by section, grade level, or school year" />

      <TeacherPanel title="Visibility filter" subtitle="Switch between active, archived, and hidden sections.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["all", "active", "archived", "hidden"] as const).map((entry) => (
            <TeacherChip
              key={entry}
              label={entry[0].toUpperCase() + entry.slice(1)}
              active={filter === entry}
              onPress={() => setFilter(entry)}
            />
          ))}
        </View>
      </TeacherPanel>

      <TeacherPanel title="Section list" subtitle="Open a section to view roster and class schedule details.">
        {filtered.length ? (
          filtered.map((section) => (
            <TeacherRow
              key={section.id}
              title={section.name}
              subtitle={`Grade ${section.gradeLevel} · ${section.schoolYear} · Room ${section.roomNumber || "TBA"}`}
              onPress={() => navigation.navigate("TeacherSectionDetail", { sectionId: section.id })}
            />
          ))
        ) : (
          <TeacherEmpty
            title="No sections found"
            subtitle="Adjust the filter or search term to find your section."
            icon="account-search-outline"
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
