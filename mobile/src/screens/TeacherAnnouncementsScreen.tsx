import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, View } from "react-native";
import { useAnnouncements, useTeacherAnnouncementMutation, useTeacherClasses, useTeacherDeleteAnnouncementMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
import { TeacherAnnouncementEditorModal } from "../components/teacher/TeacherAnnouncementEditorModal";
import { TeacherAnnouncementRow } from "../components/teacher/TeacherAnnouncementRow";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  stripRichText,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherAnnouncements">;
type FeedFilter = "all" | "pinned" | "scheduled";

export function TeacherAnnouncementsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [search, setSearch] = useState("");
  const effectiveClassId = selectedClassId !== "all" ? selectedClassId : classesQuery.data?.[0]?.id;
  const announcementsQuery = useAnnouncements(effectiveClassId);
  const saveMutation = useTeacherAnnouncementMutation(effectiveClassId);
  const deleteMutation = useTeacherDeleteAnnouncementMutation(effectiveClassId);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<{
    id?: string;
    title?: string;
    content?: string;
    isPinned?: boolean;
    scheduledAt?: string;
  } | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (selectedClassId === "all" && classesQuery.data?.[0]?.id) {
      setSelectedClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, selectedClassId]);

  const currentClass = classesQuery.data?.find((entry) => entry.id === effectiveClassId);
  const announcements = useMemo(
    () =>
      (announcementsQuery.data ?? [])
        .slice()
        .sort((left, right) => {
          if (left.isPinned !== right.isPinned) {
            return Number(right.isPinned) - Number(left.isPinned);
          }
          return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        }),
    [announcementsQuery.data],
  );

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((entry) => {
      if (feedFilter === "pinned" && !entry.isPinned) return false;
      if (feedFilter === "scheduled" && !entry.scheduledAt) return false;
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      const text = `${entry.title} ${stripRichText(entry.content)}`.toLowerCase();
      return text.includes(query);
    });
  }, [announcements, feedFilter, search]);

  const handleSave = async (payload: { title: string; content: string; isPinned: boolean; scheduledAt?: string }) => {
    if (!effectiveClassId) {
      Alert.alert("No class selected", "Please select a class before posting.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        announcementId: editingAnnouncement?.id,
        payload,
      });
      setShowEditorModal(false);
      setEditingAnnouncement(null);
      await announcementsQuery.refetch();
      Alert.alert("Success", editingAnnouncement?.id ? "Announcement updated." : "Announcement published.");
    } catch (error) {
      Alert.alert("Unable to save announcement", toAppError(error).message);
    }
  };

  return (
    <TeacherScreen
      title="Announcements"
      subtitle="Create, schedule, pin, and edit class announcements with rich formatting."
      icon="bullhorn-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={classesQuery.isRefetching || announcementsQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([classesQuery.refetch(), announcementsQuery.refetch()]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Classes", value: classesQuery.data?.length ?? 0, tone: "red" },
          { label: "Posts", value: announcements.length, tone: "blue" },
          { label: "Pinned", value: announcements.filter((entry) => entry.isPinned).length, tone: "amber" },
          { label: "Shown", value: filteredAnnouncements.length, tone: "green" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {(classesQuery.data ?? []).map((entry) => (
          <TeacherChip
            key={entry.id}
            label={entry.subjectCode}
            active={effectiveClassId === entry.id}
            onPress={() => {
              setSelectedClassId(entry.id);
            }}
          />
        ))}
      </View>

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search announcement feed" />

      <TeacherPanel
        title="Class Announcement Composer"
        subtitle={currentClass ? `Target class: ${currentClass.subjectCode} - ${currentClass.subjectName}` : "Select a class to post announcements."}
        action={
          <TeacherActionButton
            label="Create Announcement"
            icon="plus"
            tone="green"
            disabled={!effectiveClassId}
            onPress={() => {
              setEditingAnnouncement(null);
              setShowEditorModal(true);
            }}
          />
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="New Post with Rich Text"
            icon="square-edit-outline"
            tone="green"
            disabled={!effectiveClassId}
            onPress={() => {
              setEditingAnnouncement(null);
              setShowEditorModal(true);
            }}
          />
          {currentClass ? (
            <TeacherActionButton
              label="Open Class View"
              icon="book-open-variant"
              tone="blue"
              onPress={() => {
                navigation.navigate("TeacherClassDetail", {
                  classId: currentClass.id,
                  initialTab: "announcements",
                });
              }}
            />
          ) : null}
        </View>
      </TeacherPanel>

      <TeacherPanel title="Announcement Feed" subtitle="Tap an announcement to read it. Use Edit or Delete for announcements you own.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["all", "pinned", "scheduled"] as FeedFilter[]).map((entry) => (
            <TeacherChip
              key={entry}
              label={entry === "all" ? "All posts" : entry}
              active={feedFilter === entry}
              onPress={() => setFeedFilter(entry)}
            />
          ))}
        </View>

        {filteredAnnouncements.length ? (
          filteredAnnouncements.map((announcement) => (
            <TeacherAnnouncementRow
              key={announcement.id}
              announcement={announcement}
              onEdit={(entry) => {
                setEditingAnnouncement({
                  id: entry.id,
                  title: entry.title,
                  content: entry.content,
                  isPinned: Boolean(entry.isPinned),
                  scheduledAt: entry.scheduledAt || "",
                });
                setShowEditorModal(true);
              }}
              onDelete={(entry) =>
                setDeletingAnnouncement({ id: entry.id, title: entry.title })
              }
            />
          ))
        ) : (
          <TeacherEmpty title="No announcements yet" subtitle="Create the first announcement for this class using the composer button above." icon="bullhorn-outline" />
        )}
      </TeacherPanel>

      <TeacherAnnouncementEditorModal
        visible={showEditorModal}
        className={currentClass?.subjectName}
        editingId={editingAnnouncement?.id}
        initialTitle={editingAnnouncement?.title ?? ""}
        initialContent={editingAnnouncement?.content ?? ""}
        initialPinned={editingAnnouncement?.isPinned ?? false}
        initialScheduledAt={editingAnnouncement?.scheduledAt ?? ""}
        saving={saveMutation.isPending}
        onSave={(payload) => void handleSave(payload)}
        onClose={() => {
          setShowEditorModal(false);
          setEditingAnnouncement(null);
        }}
      />

      <TeacherConfirmModal
        visible={Boolean(deletingAnnouncement)}
        title="Delete Announcement"
        description={
          deletingAnnouncement
            ? `Are you sure you want to delete "${deletingAnnouncement.title}"?`
            : ""
        }
        loading={deleteMutation.isPending}
        onCancel={() => setDeletingAnnouncement(null)}
        onConfirm={async () => {
          if (!deletingAnnouncement) return;
          try {
            await deleteMutation.mutateAsync(deletingAnnouncement.id);
            setDeletingAnnouncement(null);
            await announcementsQuery.refetch();
          } catch (error) {
            Alert.alert("Unable to delete announcement", toAppError(error).message);
          }
        }}
      />
    </TeacherScreen>
  );
}
