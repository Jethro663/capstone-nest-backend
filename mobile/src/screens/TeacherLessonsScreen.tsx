import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { lessonsApi } from "../api/services/lessons";
import { useLessons, useTeacherClasses } from "../api/hooks";
import { toAppError } from "../api/http";
import { useAuth } from "../providers/AuthProvider";
import type { RootStackParamList } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherLessons">;

export function TeacherLessonsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [classId, setClassId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const lessonsQuery = useLessons(classId || undefined);
  const lessons = useMemo(
    () => [...(lessonsQuery.data ?? [])].sort((left, right) => left.order - right.order),
    [lessonsQuery.data],
  );

  useEffect(() => {
    if (!classId && classesQuery.data?.[0]?.id) setClassId(classesQuery.data[0].id);
  }, [classId, classesQuery.data]);

  useEffect(() => setSelectedIds([]), [classId]);

  const runBulkState = async (isDraft: boolean) => {
    if (!classId || !selectedIds.length) return;
    try {
      setBusy(true);
      await lessonsApi.setDraftState(classId, { lessonIds: selectedIds, isDraft });
      setSelectedIds([]);
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
      `This will delete ${selectedIds.length} selected lesson${selectedIds.length === 1 ? "" : "s"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void (async () => {
            try {
              setBusy(true);
              await lessonsApi.bulkDelete(classId, { lessonIds: selectedIds });
              setSelectedIds([]);
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
        lessons: reordered.map((lesson, order) => ({ id: lesson.id, order: order + 1 })),
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
      subtitle="Open, reorder, publish, return to draft, and delete lessons through the same backend lifecycle used by web."
      icon="book-cog-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={classesQuery.isRefetching || lessonsQuery.isRefetching}
      onRefresh={() => void Promise.all([classesQuery.refetch(), lessonsQuery.refetch()])}
    >
      <TeacherStats items={[
        { label: "Lessons", value: lessons.length, tone: "red" },
        { label: "Published", value: lessons.filter((lesson) => !lesson.isDraft).length, tone: "green" },
        { label: "Selected", value: selectedIds.length, tone: "blue" },
      ]} />
      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {(classesQuery.data ?? []).map((entry) => <TeacherChip key={entry.id} label={entry.subjectCode} active={classId === entry.id} onPress={() => setClassId(entry.id)} />)}
      </View>
      <TeacherPanel title="Bulk lifecycle" subtitle="Actions apply only to the explicitly selected lessons.">
        <View style={{ padding: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton label="Select all" tone="neutral" onPress={() => setSelectedIds(lessons.map((lesson) => lesson.id))} disabled={!lessons.length || busy} />
          <TeacherActionButton label="Publish" tone="green" onPress={() => void runBulkState(false)} disabled={!selectedIds.length || busy} />
          <TeacherActionButton label="Return to draft" tone="amber" onPress={() => void runBulkState(true)} disabled={!selectedIds.length || busy} />
          <TeacherActionButton label="Delete" tone="red" onPress={bulkDelete} disabled={!selectedIds.length || busy} />
        </View>
      </TeacherPanel>
      <TeacherPanel title="Ordered lessons" subtitle="Order changes are persisted for the selected class.">
        {lessons.map((lesson, index) => (
          <TeacherRow
            key={lesson.id}
            title={lesson.title}
            subtitle={`${lesson.isDraft ? "Draft" : "Published"} · Position ${index + 1}`}
            onPress={() => navigation.navigate("TeacherLessonDetail", { lessonId: lesson.id, classId })}
            right={<View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <TeacherChip label={selectedIds.includes(lesson.id) ? "Selected" : "Select"} active={selectedIds.includes(lesson.id)} onPress={() => setSelectedIds((current) => current.includes(lesson.id) ? current.filter((id) => id !== lesson.id) : [...current, lesson.id])} />
              <TeacherActionButton label="Up" tone="neutral" disabled={index === 0 || busy} onPress={() => void move(index, -1)} />
              <TeacherActionButton label="Down" tone="neutral" disabled={index === lessons.length - 1 || busy} onPress={() => void move(index, 1)} />
            </View>}
          />
        ))}
        {!lessons.length ? <TeacherEmpty title={classId ? "No lessons in this class" : "No class selected"} subtitle="Select a class or create its first lesson from the class workspace." icon="book-open-blank-variant-outline" /> : null}
      </TeacherPanel>
    </TeacherScreen>
  );
}
