import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Alert, TextInput, View } from "react-native";
import { announcementsApi } from "../api/services/announcements";
import { classesApi } from "../api/services/classes";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import { TeacherActionButton, TeacherChip, TeacherEmpty, TeacherPanel, TeacherRow, TeacherScreen, TeacherStats, teacherTheme as theme } from "../components/teacher/TeacherMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Announcements">;

export function AdminAnnouncementsScreen() {
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const classes = useQuery({ queryKey: ["admin-announcement-classes"], queryFn: () => classesApi.getAll() });
  const queries = useQueries({ queries: (classes.data ?? []).map((entry) => ({ queryKey: ["admin-announcements", entry.id], queryFn: () => announcementsApi.getByClass(entry.id) })) });
  const rows = useMemo(() => queries.flatMap((query, index) => (query.data ?? []).map((announcement) => ({ announcement, classItem: classes.data?.[index] }))).sort((left, right) => Date.parse(right.announcement.createdAt ?? "") - Date.parse(left.announcement.createdAt ?? "")), [classes.data, queries]);
  const publish = async () => {
    if (!classId || !title.trim() || !content.trim()) return Alert.alert("Missing fields", "Choose a class and enter a title and message.");
    try {
      setSaving(true);
      const payload = { title: title.trim(), content: content.trim(), isPinned, ...(scheduledAt.trim() ? { scheduledAt: scheduledAt.trim() } : {}) };
      if (editingId) await announcementsApi.update(classId, editingId, payload); else await announcementsApi.create(classId, payload);
      setEditingId(null); setTitle(""); setContent(""); setIsPinned(false); setScheduledAt("");
      await Promise.all(queries.map((query) => query.refetch()));
    } catch (error) { Alert.alert("Unable to publish", toAppError(error).message); } finally { setSaving(false); }
  };
  return (
    <TeacherScreen title="Announcements" workspaceLabel="Admin workspace" subtitle="School-wide cross-class announcement inventory and backend-backed publishing." icon="bullhorn-outline" refreshing={classes.isRefetching || queries.some((query) => query.isRefetching)} onRefresh={() => void Promise.all([classes.refetch(), ...queries.map((query) => query.refetch())])}>
      <TeacherStats items={[{ label: "Classes", value: classes.data?.length ?? 0, tone: "blue" }, { label: "Posts", value: rows.length, tone: "red" }, { label: "Pinned", value: rows.filter(({ announcement }) => announcement.isPinned).length, tone: "amber" }]} />
      <TeacherPanel title={editingId ? "Edit announcement" : "Publish announcement"} subtitle="Choose an explicit class target; failures stay visible and are never reported as success.">
        <View style={{ padding: 14, gap: 9 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{(classes.data ?? []).map((entry) => <TeacherChip key={entry.id} label={entry.subjectCode} active={classId === entry.id} onPress={() => setClassId(entry.id)} />)}</View>
          <TextInput accessibilityLabel="Announcement title" value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={theme.muted} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} />
          <TextInput accessibilityLabel="Announcement content" value={content} onChangeText={setContent} placeholder="Message" placeholderTextColor={theme.muted} multiline style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, minHeight: 90, padding: 11, textAlignVertical: "top" }} />
          <TextInput accessibilityLabel="Announcement schedule" value={scheduledAt} onChangeText={setScheduledAt} autoCapitalize="none" placeholder="Optional ISO schedule, e.g. 2026-09-03T08:00:00.000Z" placeholderTextColor={theme.muted} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} />
          <View style={{ flexDirection: "row", gap: 8 }}><TeacherChip label="Pinned" active={isPinned} onPress={() => setIsPinned((value) => !value)} />{editingId ? <TeacherActionButton label="Cancel edit" tone="neutral" onPress={() => { setEditingId(null); setTitle(""); setContent(""); setScheduledAt(""); setIsPinned(false); }} /> : null}<TeacherActionButton label={saving ? "Saving..." : editingId ? "Save" : "Publish"} icon="send" tone="green" disabled={saving} onPress={() => void publish()} /></View>
        </View>
      </TeacherPanel>
      <TeacherPanel title="Announcement feed" subtitle="Complete records from every current class.">
        {rows.map(({ announcement, classItem }) => <TeacherRow key={announcement.id} title={announcement.title} subtitle={`${classItem?.subjectCode ?? "Class"} · ${announcement.isPinned ? "Pinned · " : ""}${new Date(announcement.createdAt ?? 0).toLocaleDateString()}`} right={<View style={{ flexDirection: "row", gap: 5 }}><TeacherActionButton label="Edit" tone="blue" onPress={() => { setClassId(announcement.classId); setEditingId(announcement.id); setTitle(announcement.title); setContent(announcement.content); setIsPinned(announcement.isPinned); setScheduledAt(announcement.scheduledAt ?? ""); }} /><TeacherActionButton label="Delete" tone="red" onPress={() => Alert.alert("Delete announcement?", "This removes the announcement from its class.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void announcementsApi.delete(announcement.classId, announcement.id).then(() => Promise.all(queries.map((query) => query.refetch()))).catch((error) => Alert.alert("Delete rejected", toAppError(error).message)) }])} /></View>} />)}
        {!rows.length ? <TeacherEmpty title="No announcements" subtitle="Publish the first class announcement above." icon="bullhorn-outline" /> : null}
      </TeacherPanel>
    </TeacherScreen>
  );
}
