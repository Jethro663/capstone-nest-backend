import { announcementPreview } from "../utils/announcementContent";
import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { useAnnouncements, useTeacherAnnouncementMutation, useTeacherClasses, useTeacherDeleteAnnouncementMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import type { TeacherDrawerScreenProps } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
import { TeacherAnnouncementEditorModal } from "../components/teacher/TeacherAnnouncementEditorModal";
import { TeacherAnnouncementRow } from "../components/teacher/TeacherAnnouncementRow";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherScreen,
  TeacherSearch,
  TeacherSelectMenu,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherContextStrip,
  TeacherFlatSection,
  TeacherSegmentedTabs,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = TeacherDrawerScreenProps<"TeacherAnnouncements">;
type FeedFilter = "all" | "pinned" | "scheduled";

export function TeacherAnnouncementsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"feed" | "compose">("feed");
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
      const text = `${entry.title} ${announcementPreview(entry.content)}`.toLowerCase();
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
      subtitle="Read class communication or open the focused composer."
      icon="bullhorn-outline"
      onBackPress={() => navigation.goBack()}
      refreshing={classesQuery.isRefetching || announcementsQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([classesQuery.refetch(), announcementsQuery.refetch()]);
      }}
    >
      <TeacherSelectMenu
        label="Class"
        selectedValue={effectiveClassId ?? ""}
        options={(classesQuery.data ?? []).map((entry) => ({ value: entry.id, label: `${entry.subjectCode} · ${entry.subjectName}` }))}
        onSelect={setSelectedClassId}
      />
      <TeacherContextStrip
        title={currentClass ? currentClass.subjectName : "Select a class"}
        subtitle={currentClass ? currentClass.subjectCode : "Announcement audience"}
        status={`${announcements.length} posts`}
        icon="bullhorn-outline"
      />
      <TeacherSegmentedTabs
        accessibilityLabel="Announcement modes"
        activeKey={viewMode}
        items={[
          { key: "feed", label: "Feed", count: filteredAnnouncements.length },
          { key: "compose", label: "Compose" },
        ]}
        onSelect={(mode) => {
          setViewMode(mode);
          if (mode === "compose") {
            setEditingAnnouncement(null);
            setShowEditorModal(true);
          }
        }}
      />

      {viewMode === "feed" ? (
        <>
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search announcement feed" />
      <TeacherFlatSection title="Announcement feed" subtitle="Pinned, scheduled, and posted communication for this class.">
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
      </TeacherFlatSection>
        </>
      ) : (
        <TeacherFlatSection
          title="Compose announcement"
          subtitle="Audience, rich message, pinning, scheduling, attachments, review, and publish remain in the existing editor."
          action={
            <TeacherActionButton
              label="Open composer"
              icon="square-edit-outline"
              tone="green"
              disabled={!effectiveClassId}
              onPress={() => {
                setEditingAnnouncement(null);
                setShowEditorModal(true);
              }}
            />
          }
        >
          {currentClass ? (
            <TeacherActionButton
              label="Open class announcements"
              icon="book-open-variant"
              tone="blue"
              onPress={() => navigation.navigate("TeacherClassDetail", { classId: currentClass.id, initialTab: "announcements", source: "announcements" })}
            />
          ) : null}
        </TeacherFlatSection>
      )}

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
