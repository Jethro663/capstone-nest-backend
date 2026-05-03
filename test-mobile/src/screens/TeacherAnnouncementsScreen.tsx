import { useEffect, useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Alert, Pressable, Text, View } from "react-native";
import { useAnnouncements, useTeacherAnnouncementMutation, useTeacherClasses, useTeacherDeleteAnnouncementMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherInlineField,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  stripRichText,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Announcements">;

function formatDate(value?: string | null) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TeacherAnnouncementsScreen(_: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const effectiveClassId = selectedClassId !== "all" ? selectedClassId : classesQuery.data?.[0]?.id;
  const announcementsQuery = useAnnouncements(effectiveClassId);
  const saveMutation = useTeacherAnnouncementMutation(effectiveClassId);
  const deleteMutation = useTeacherDeleteAnnouncementMutation(effectiveClassId);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (selectedClassId === "all" && classesQuery.data?.[0]?.id) {
      setSelectedClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, selectedClassId]);

  const currentClass = classesQuery.data?.find((entry) => entry.id === effectiveClassId);
  const announcements = useMemo(
    () => (announcementsQuery.data ?? []).slice().sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()),
    [announcementsQuery.data],
  );

  const resetForm = () => {
    setEditingId(undefined);
    setTitle("");
    setContent("");
    setScheduledAt("");
    setPinned(false);
  };

  const saveAnnouncement = async () => {
    if (!effectiveClassId || !title.trim() || !content.trim()) {
      Alert.alert("Missing details", "Select a class, then provide both a title and content.");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        announcementId: editingId,
        payload: {
          title: title.trim(),
          content: content.trim(),
          isPinned: pinned,
          scheduledAt: scheduledAt.trim() || undefined,
        },
      });
      resetForm();
    } catch (error) {
      Alert.alert("Unable to save announcement", toAppError(error).message);
    }
  };

  const removeAnnouncement = async (announcementId: string) => {
    try {
      await deleteMutation.mutateAsync(announcementId);
      if (editingId === announcementId) {
        resetForm();
      }
    } catch (error) {
      Alert.alert("Unable to delete announcement", toAppError(error).message);
    }
  };

  return (
    <TeacherScreen
      title="Announcements"
      subtitle="Manage class updates with the same mobile theme used throughout the student shell."
      icon="bullhorn-outline"
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
              resetForm();
            }}
          />
        ))}
      </View>

      <TeacherPanel
        title={editingId ? "Edit announcement" : "Create announcement"}
        subtitle={currentClass ? `Posting to ${currentClass.subjectCode} · ${currentClass.subjectName}` : "Select a class first."}
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} placeholder="Post title" />
          <TeacherInlineField label="Content" value={content} onChangeText={setContent} placeholder="Write the class update" multiline />
          <TeacherInlineField
            label="Schedule (optional)"
            value={scheduledAt}
            onChangeText={setScheduledAt}
            placeholder="ISO or YYYY-MM-DD HH:mm"
          />

          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton
              label={pinned ? "Pinned" : "Pin post"}
              icon="pin-outline"
              tone={pinned ? "amber" : "neutral"}
              onPress={() => setPinned((current) => !current)}
            />
            <TeacherActionButton
              label={editingId ? "Save changes" : "Create post"}
              icon="content-save-outline"
              tone="green"
              onPress={() => void saveAnnouncement()}
              disabled={saveMutation.isPending}
            />
            {editingId ? (
              <TeacherActionButton label="Cancel edit" icon="close" tone="purple" onPress={resetForm} />
            ) : null}
          </View>
        </View>
      </TeacherPanel>

      <TeacherPanel title="Announcement feed" subtitle="Tap a post to load it into the editor for quick mobile edits.">
        {announcements.length ? (
          announcements.map((announcement) => (
            <TeacherRow
              key={announcement.id}
              title={announcement.title}
              subtitle={`${announcement.isPinned ? "Pinned" : "Post"} · ${formatDate(announcement.scheduledAt || announcement.createdAt)} · ${stripRichText(announcement.content).slice(0, 110)}`}
              onPress={() => {
                setEditingId(announcement.id);
                setTitle(announcement.title);
                setContent(stripRichText(announcement.content));
                setScheduledAt(announcement.scheduledAt || "");
                setPinned(Boolean(announcement.isPinned));
              }}
              right={
                <Pressable onPress={() => void removeAnnouncement(announcement.id)}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#FF9CAA" }}>Delete</Text>
                </Pressable>
              }
            />
          ))
        ) : (
          <TeacherEmpty title="No announcements yet" subtitle="Create the first announcement for this class from the composer above." icon="bullhorn-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
