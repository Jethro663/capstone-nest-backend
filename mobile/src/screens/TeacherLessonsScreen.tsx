import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { lessonsApi } from "../api/services/lessons";
import { useLessons, useTeacherClasses } from "../api/hooks";
import { toAppError } from "../api/http";
import { useAuth } from "../providers/AuthProvider";
import type { TeacherDrawerScreenProps } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherSelectMenu,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherActionSheet,
  TeacherBottomActionBar,
  TeacherFlatSection,
  TeacherSegmentedTabs,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = TeacherDrawerScreenProps<"TeacherLessons">;
type LessonFilter = "all" | "published" | "drafts";

export function TeacherLessonsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [classId, setClassId] = useState("");
  const [filter, setFilter] = useState<LessonFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const lessonsQuery = useLessons(classId || undefined);
  const lessons = useMemo(
    () =>
      [...(lessonsQuery.data ?? [])].sort(
        (left, right) => left.order - right.order,
      ),
    [lessonsQuery.data],
  );
  const visibleLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (filter === "published" && lesson.isDraft) return false;
      if (filter === "drafts" && !lesson.isDraft) return false;
      return (
        !query ||
        (lesson.title + " " + (lesson.description ?? ""))
          .toLowerCase()
          .includes(query)
      );
    });
  }, [filter, lessons, search]);

  useEffect(() => {
    if (!classId && classesQuery.data?.[0]?.id) {
      setClassId(classesQuery.data[0].id);
    }
  }, [classId, classesQuery.data]);

  useEffect(() => {
    setSelectedIds([]);
    setBulkVisible(false);
  }, [classId]);

  const runBulkState = async (isDraft: boolean) => {
    if (!classId || !selectedIds.length) return;
    try {
      setBusy(true);
      await lessonsApi.setDraftState(classId, {
        lessonIds: selectedIds,
        isDraft,
      });
      setSelectedIds([]);
      setBulkVisible(false);
      await lessonsQuery.refetch();
    } catch (error) {
      Alert.alert("Lesson update rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = () => {
    if (!classId || !selectedIds.length) return;
    Alert.alert(
      "Delete selected lessons?",
      "This will delete " +
        selectedIds.length +
        " selected lesson" +
        (selectedIds.length === 1 ? "" : "s") +
        ".",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                setBusy(true);
                await lessonsApi.bulkDelete(classId, {
                  lessonIds: selectedIds,
                });
                setSelectedIds([]);
                setBulkVisible(false);
                await lessonsQuery.refetch();
              } catch (error) {
                Alert.alert("Delete rejected", toAppError(error).message);
              } finally {
                setBusy(false);
              }
            })(),
        },
      ],
    );
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (!classId || target < 0 || target >= lessons.length) return;
    const reordered = [...lessons];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    try {
      setBusy(true);
      await lessonsApi.reorderByClass(classId, {
        lessons: reordered.map((lesson, order) => ({
          id: lesson.id,
          order: order + 1,
        })),
      });
      await lessonsQuery.refetch();
    } catch (error) {
      Alert.alert("Reorder rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TeacherScreen
      title="Lesson management"
      subtitle="Find a lesson, then manage only the lifecycle actions you select."
      icon="book-cog-outline"
      onBackPress={() => navigation.goBack()}
      refreshing={classesQuery.isRefetching || lessonsQuery.isRefetching}
      onRefresh={() =>
        void Promise.all([classesQuery.refetch(), lessonsQuery.refetch()])
      }
      bottomAction={
        selectedIds.length ? (
          <TeacherBottomActionBar
            primaryLabel={
              "Manage " +
              selectedIds.length +
              " selected lesson" +
              (selectedIds.length === 1 ? "" : "s")
            }
            primaryIcon="tune-variant"
            onPrimary={() => setBulkVisible(true)}
            secondary={
              <TeacherActionButton
                label="Clear"
                tone="neutral"
                onPress={() => setSelectedIds([])}
              />
            }
          />
        ) : undefined
      }
    >
      <TeacherSelectMenu
        label="Class"
        selectedValue={classId}
        options={(classesQuery.data ?? []).map((entry) => ({
          value: entry.id,
          label: entry.subjectCode + " · " + entry.subjectName,
        }))}
        onSelect={setClassId}
      />
      <TeacherSegmentedTabs
        accessibilityLabel="Lesson status"
        activeKey={filter}
        onSelect={setFilter}
        items={[
          { key: "all", label: "All", count: lessons.length },
          {
            key: "published",
            label: "Published",
            count: lessons.filter((lesson) => !lesson.isDraft).length,
          },
          {
            key: "drafts",
            label: "Drafts",
            count: lessons.filter((lesson) => lesson.isDraft).length,
          },
        ]}
      />
      <TeacherSearch
        value={search}
        onChangeText={setSearch}
        placeholder="Search lesson title or description"
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: "row", justifyContent: "flex-end" }}>
        <TeacherActionButton
          label="Open content builder"
          icon="book-plus-outline"
          tone="green"
          disabled={!classId}
          onPress={() =>
            navigation.navigate("TeacherClassDetail", {
              classId,
              initialTab: "modules",
              source: "classes",
            })
          }
        />
      </View>
      <TeacherFlatSection
        title={selectedIds.length ? "Selection mode" : "Lessons"}
        subtitle={
          selectedIds.length
            ? selectedIds.length + " selected · open Manage below"
            : visibleLessons.length + " lessons match this view"
        }
      >
        {visibleLessons.length ? (
          visibleLessons.map((lesson) => {
            const index = lessons.findIndex((entry) => entry.id === lesson.id);
            const selected = selectedIds.includes(lesson.id);
            return (
              <TeacherRow
                key={lesson.id}
                title={lesson.title}
                subtitle={
                  (lesson.isDraft ? "Draft" : "Published") +
                  " · Position " +
                  (index + 1)
                }
                onPress={() =>
                  navigation.navigate("TeacherLessonDetail", {
                    lessonId: lesson.id,
                    classId,
                    source: "lessons",
                  })
                }
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <TeacherChip
                      label={selected ? "Selected" : "Select"}
                      active={selected}
                      onPress={() =>
                        setSelectedIds((current) =>
                          current.includes(lesson.id)
                            ? current.filter((id) => id !== lesson.id)
                            : [...current, lesson.id],
                        )
                      }
                    />
                    <TeacherActionButton
                      label="Up"
                      tone="neutral"
                      disabled={index === 0 || busy}
                      onPress={() => void move(index, -1)}
                    />
                    <TeacherActionButton
                      label="Down"
                      tone="neutral"
                      disabled={index === lessons.length - 1 || busy}
                      onPress={() => void move(index, 1)}
                    />
                  </View>
                }
              />
            );
          })
        ) : (
          <TeacherEmpty
            title={classId ? "No lessons match this view" : "No class selected"}
            subtitle="Change the class, status, or search to continue."
            icon="book-open-blank-variant-outline"
          />
        )}
      </TeacherFlatSection>
      <TeacherActionSheet
        visible={bulkVisible}
        title="Bulk lesson lifecycle"
        subtitle={
          selectedIds.length +
          " explicitly selected lesson" +
          (selectedIds.length === 1 ? "" : "s")
        }
        onClose={() => setBulkVisible(false)}
      >
        <View style={{ paddingBottom: 18, gap: 8 }}>
          <TeacherActionButton
            label="Select all visible"
            tone="neutral"
            onPress={() =>
              setSelectedIds(visibleLessons.map((lesson) => lesson.id))
            }
            disabled={!visibleLessons.length || busy}
          />
          <TeacherActionButton
            label="Publish"
            icon="publish"
            tone="green"
            onPress={() => void runBulkState(false)}
            disabled={!selectedIds.length || busy}
          />
          <TeacherActionButton
            label="Return to draft"
            icon="file-hidden"
            tone="amber"
            onPress={() => void runBulkState(true)}
            disabled={!selectedIds.length || busy}
          />
          <TeacherActionButton
            label="Delete"
            icon="trash-can-outline"
            tone="red"
            onPress={bulkDelete}
            disabled={!selectedIds.length || busy}
          />
        </View>
      </TeacherActionSheet>
    </TeacherScreen>
  );
}
