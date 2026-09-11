import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { adminApi } from "../api/services/admin";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import { useAdminDemoMode } from "../hooks/useAdminDemoMode";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import { AdminPaginatedList } from "../components/admin/AdminPaginatedList";
import {
  mergeAdminPages,
  nextAdminPage,
} from "../components/admin/admin-pagination";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminField,
  AdminFilterBar,
  AdminListHeader,
  AdminNotice,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";
import type { TeacherSection } from "../types/teacher";

type Props = BottomTabScreenProps<MainTabParamList, "AdminSections">;
type Status = "all" | "active" | "archived";

export function AdminSectionsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const network = useAdminNetworkStatus();
  const demoMode = useAdminDemoMode();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeacherSection | null>(null);
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<"7" | "8" | "9" | "10">("7");
  const [schoolYear, setSchoolYear] = useState(
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  );
  const [capacity, setCapacity] = useState("50");
  const [roomNumber, setRoomNumber] = useState("");
  const [adviserId, setAdviserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: ["admin-sections", status, debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      sectionsApi.getPage({
        page: pageParam,
        limit: 25,
        search: debouncedSearch || undefined,
        isActive: status === "all" ? undefined : status === "active",
      }),
    getNextPageParam: nextAdminPage,
  });
  const teachers = useQuery({
    queryKey: ["admin-section-advisers"],
    queryFn: () =>
      adminApi.getUsersPage({
        role: "teacher",
        status: "ACTIVE",
        page: 1,
        limit: 100,
      }),
  });
  const conflictSections = useQuery({
    queryKey: ["admin-section-conflict-candidates"],
    queryFn: () => sectionsApi.getPage({ page: 1, limit: 200 }),
    enabled: showForm,
  });
  const rows = useMemo(
    () => mergeAdminPages(query.data?.pages ?? [], (entry) => entry.id),
    [query.data?.pages],
  );
  const total = query.data?.pages[0]?.total ?? rows.length;
  const canRelaxRoomAndAdviser = demoMode.hasExactRule(
    "room_adviser_exclusivity",
  );
  const canRelaxCapacity = demoMode.hasExactRule("section_capacity");
  const activeConflictCandidates = (conflictSections.data?.data ?? []).filter(
    (section) => section.isActive && section.id !== editing?.id,
  );
  const roomConflict = activeConflictCandidates.find(
    (section) =>
      Boolean(roomNumber.trim()) &&
      section.roomNumber?.trim().toLowerCase() ===
        roomNumber.trim().toLowerCase(),
  );
  const adviserConflict = activeConflictCandidates.find(
    (section) => Boolean(adviserId) && section.adviser?.id === adviserId,
  );
  const roomOrAdviserConflict = roomConflict ?? adviserConflict;
  const parsedCapacity = Number(capacity);
  const currentHeadcount =
    editing?.enrollmentCount ?? editing?.studentCount ?? 0;
  const capacityConflict = Boolean(
    editing &&
    Number.isInteger(parsedCapacity) &&
    parsedCapacity < currentHeadcount,
  );
  const duplicateSection = (conflictSections.data?.data ?? []).find(
    (section) =>
      section.id !== editing?.id &&
      section.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      section.gradeLevel === gradeLevel &&
      section.schoolYear.trim() === schoolYear.trim(),
  );
  const rootNavigation = navigation.getParent() as unknown as {
    navigate: (name: string, params?: unknown) => void;
  };
  const allVisibleSelected =
    rows.length > 0 && rows.every((entry) => selectedIds.includes(entry.id));
  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  const selectAllVisible = () =>
    setSelectedIds(allVisibleSelected ? [] : rows.map((entry) => entry.id));
  const reviewSelected = () => {
    const next = rows.find((entry) => selectedIds.includes(entry.id));
    if (!next) return;
    rootNavigation.navigate("AdminLifecycleReview", {
      targetType: "SECTION",
      targetId: next.id,
      targetLabel: `Grade ${next.gradeLevel} · ${next.name}`,
      isActive: Boolean(next.isActive),
    });
  };
  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setName("");
    setGradeLevel("7");
    setSchoolYear(
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    );
    setCapacity("50");
    setRoomNumber("");
    setAdviserId("");
    setFormError(null);
  };
  const edit = (section: TeacherSection) => {
    setEditing(section);
    setName(section.name);
    setGradeLevel(
      (["7", "8", "9", "10"].includes(section.gradeLevel)
        ? section.gradeLevel
        : "7") as "7" | "8" | "9" | "10",
    );
    setSchoolYear(section.schoolYear);
    setCapacity(String(section.capacity ?? 50));
    setRoomNumber(section.roomNumber ?? "");
    setAdviserId(section.adviser?.id ?? "");
    setShowForm(true);
  };
  const save = async () => {
    if (
      !name.trim() ||
      !schoolYear.trim() ||
      !Number.isInteger(parsedCapacity) ||
      parsedCapacity < 1
    ) {
      setFormError(
        "Name, school year, and a positive whole-number capacity are required.",
      );
      return;
    }
    if (network.isOffline) {
      setFormError(
        "A live connection is required. Section writes are never queued while offline.",
      );
      return;
    }
    if (duplicateSection) {
      setFormError(
        "A section with this name, grade, and school year already exists. This identity safeguard stays protected.",
      );
      return;
    }
    if (roomOrAdviserConflict && !canRelaxRoomAndAdviser) {
      setFormError(
        "Room or adviser conflict. Choose an available assignment or activate the exact Demo mode capability.",
      );
      return;
    }
    if (capacityConflict && !canRelaxCapacity) {
      setFormError(
        `Capacity cannot be lower than the current ${currentHeadcount}-student headcount.`,
      );
      return;
    }
    try {
      setBusy(true);
      setFormError(null);
      const payload = {
        name: name.trim(),
        gradeLevel,
        schoolYear: schoolYear.trim(),
        capacity: parsedCapacity,
        roomNumber: roomNumber.trim() || undefined,
        adviserId: adviserId || undefined,
      };
      if (editing) await sectionsApi.update(editing.id, payload);
      else await sectionsApi.create(payload);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
    } catch (error) {
      await demoMode.refresh();
      setFormError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const setVisibility = async (section: TeacherSection) => {
    if (network.isOffline) {
      Alert.alert(
        "Connection required",
        "Section visibility writes are never queued while offline.",
      );
      return;
    }
    try {
      setBusy(true);
      await (section.isHidden
        ? sectionsApi.unhide(section.id)
        : sectionsApi.hide(section.id));
      await queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
    } catch (error) {
      await demoMode.refresh();
      Alert.alert("Visibility update rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const batchControls = (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
      }}
    >
      <AdminButton
        label={
          allVisibleSelected ? "Clear visible selection" : "Select all visible"
        }
        onPress={selectAllVisible}
        disabled={!rows.length}
      />
      {selectedIds.length ? (
        <>
          <AdminButton
            label={`Review selected (${selectedIds.length})`}
            tone="red"
            onPress={reviewSelected}
          />
          <AdminButton
            label="Clear selection"
            onPress={() => setSelectedIds([])}
          />
        </>
      ) : null}
    </View>
  );

  const header = (
    <>
      <AdminListHeader
        title="Sections"
        subtitle={`${total} records · rosters, capacity, and lifecycle`}
        rightAction={
          <AdminButton
            label={showForm ? "Close" : "New section"}
            icon={showForm ? "close" : "plus"}
            variant="solid"
            onPress={() => (showForm ? resetForm() : setShowForm(true))}
          />
        }
      />
      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search section, grade, or school year"
        segments={[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "archived", label: "Archived" },
        ]}
        activeSegment={status}
        onSegmentChange={(value) => {
          setStatus(value);
          setSelectedIds([]);
        }}
        resultCount={total ?? rows.length}
      />
      {batchControls}
      {network.isOffline ? (
        <AdminNotice
          title="Offline · section writes disabled"
          description="Cached sections remain available, but create, edit, and visibility writes are never queued while offline."
          tone="amber"
          icon="cloud-off-outline"
        />
      ) : null}
      {showForm ? (
        <View
          style={{
            marginTop: 10,
            padding: 16,
            gap: 10,
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          {formError ? (
            <AdminNotice
              title="Section was not saved"
              description={formError}
              tone="red"
            />
          ) : null}
          {roomOrAdviserConflict ? (
            <AdminNotice
              title="Room or adviser conflict"
              description={
                canRelaxRoomAndAdviser
                  ? `Demo mode permits this audited exception involving Grade ${roomOrAdviserConflict.gradeLevel} · ${roomOrAdviserConflict.name}.`
                  : `Grade ${roomOrAdviserConflict.gradeLevel} · ${roomOrAdviserConflict.name} already uses this assignment.`
              }
              tone={canRelaxRoomAndAdviser ? "amber" : "red"}
              icon="account-switch-outline"
            />
          ) : null}
          {capacityConflict ? (
            <AdminNotice
              title="Capacity is below current enrollment"
              description={
                canRelaxCapacity
                  ? `Demo mode permits the audited capacity exception; ${currentHeadcount} enrolled students remain preserved.`
                  : `Enter at least ${currentHeadcount}, matching the current enrolled headcount.`
              }
              tone={canRelaxCapacity ? "amber" : "red"}
              icon="account-group-outline"
            />
          ) : null}
          <Text style={{ fontSize: 15, fontWeight: "900", color: theme.text }}>
            {editing ? "Edit section" : "Create section"}
          </Text>
          <AdminField
            label="Section name"
            value={name}
            onChangeText={setName}
          />
          <AdminField
            label="School year"
            value={schoolYear}
            onChangeText={setSchoolYear}
          />
          <AdminField
            label="Capacity"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
          />
          <AdminField
            label="Room number"
            value={roomNumber}
            onChangeText={setRoomNumber}
          />
          <View style={{ flexDirection: "row", gap: 7 }}>
            {(["7", "8", "9", "10"] as const).map((grade) => (
              <AdminChip
                key={grade}
                label={`Grade ${grade}`}
                active={gradeLevel === grade}
                onPress={() => setGradeLevel(grade)}
              />
            ))}
          </View>
          <Text
            style={{ fontSize: 11, fontWeight: "800", color: theme.subtext }}
          >
            ADVISER
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            <AdminChip
              label="Unassigned"
              active={!adviserId}
              onPress={() => setAdviserId("")}
            />
            {(teachers.data?.data ?? []).map((teacher) => (
              <AdminChip
                key={teacher.id}
                label={`${teacher.firstName ?? ""} ${teacher.lastName ?? teacher.email}`.trim()}
                active={adviserId === teacher.id}
                disabled={
                  !canRelaxRoomAndAdviser &&
                  activeConflictCandidates.some(
                    (section) => section.adviser?.id === teacher.id,
                  )
                }
                onPress={() => setAdviserId(teacher.id)}
              />
            ))}
          </View>
          <AdminButton
            label={
              busy ? "Saving…" : editing ? "Save changes" : "Create section"
            }
            icon="content-save"
            tone="green"
            variant="solid"
            disabled={
              busy ||
              network.isOffline ||
              Boolean(duplicateSection) ||
              Boolean(roomOrAdviserConflict && !canRelaxRoomAndAdviser) ||
              Boolean(capacityConflict && !canRelaxCapacity)
            }
            onPress={() => void save()}
          />
        </View>
      ) : null}
    </>
  );

  return (
    <AdminPaginatedList
      data={rows}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <AdminDataRow
            title={`Grade ${item.gradeLevel} · ${item.name}`}
            subtitle={`${item.schoolYear} · capacity ${item.capacity ?? "—"}`}
            meta={
              item.adviser
                ? `${item.adviser.firstName ?? ""} ${item.adviser.lastName ?? ""}`.trim()
                : "No adviser"
            }
            status={
              item.isHidden ? "Hidden" : item.isActive ? "Active" : "Archived"
            }
            statusTone={
              item.isHidden ? "amber" : item.isActive ? "green" : "neutral"
            }
          />
          <View
            style={{
              paddingHorizontal: 12,
              paddingBottom: 10,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <AdminButton
              label={selectedIds.includes(item.id) ? "Deselect" : "Select"}
              icon={
                selectedIds.includes(item.id)
                  ? "checkbox-marked"
                  : "checkbox-blank-outline"
              }
              variant="text"
              onPress={() => toggleSelected(item.id)}
            />
            <AdminButton
              label="Open"
              variant="text"
              onPress={() =>
                rootNavigation.navigate("AdminSectionDetail", {
                  sectionId: item.id,
                })
              }
            />
            <AdminButton
              label="Edit"
              variant="text"
              onPress={() => edit(item)}
            />
            <AdminButton
              label={item.isHidden ? "Unhide" : "Hide"}
              variant="text"
              tone="amber"
              disabled={busy || network.isOffline}
              onPress={() => void setVisibility(item)}
            />
            <AdminButton
              label={item.isActive ? "Archive review" : "Delete review"}
              variant="text"
              tone="red"
              onPress={() =>
                rootNavigation.navigate("AdminLifecycleReview", {
                  targetType: "SECTION",
                  targetId: item.id,
                  targetLabel: `Grade ${item.gradeLevel} · ${item.name}`,
                  isActive: Boolean(item.isActive),
                })
              }
            />
          </View>
        </View>
      )}
      header={header}
      emptyTitle="No sections"
      emptySubtitle="No section records match the current filters."
      error={query.isError ? toAppError(query.error).message : null}
      initialLoading={query.isPending}
      lastUpdatedAt={query.dataUpdatedAt}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      hasNextPage={query.hasNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      fetchNextPage={() => void query.fetchNextPage()}
    />
  );
}
