import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Alert, View } from "react-native";
import { announcementsApi } from "../api/services/announcements";
import { classesApi } from "../api/services/classes";
import { toAppError } from "../api/http";
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminField,
  AdminFilterBar,
  AdminMetricStrip,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";
import { AdminAnnouncementRow } from "../components/admin/AdminAnnouncementRow";
import { AssessmentRichTextEditor } from "../components/ui/AssessmentRichTextEditor";
import { announcementPreview, normalizeAnnouncementContent } from "../utils/announcementContent";

type AnnouncementFilter = "all" | "pinned" | "scheduled" | "published";

type Props = {
  navigation?: {
    getState?: () => { type?: string };
    goBack: () => void;
  };
};

export function AdminAnnouncementsScreen({ navigation }: Props = {}) {
  const legacyStackEntry = navigation?.getState?.().type === "stack";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AnnouncementFilter>("all");
  const [showComposer, setShowComposer] = useState(false);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const classes = useQuery({ queryKey: ["admin-announcement-classes"], queryFn: () => classesApi.getAll() });
  const queries = useQueries({ queries: (classes.data ?? []).map((entry) => ({ queryKey: ["admin-announcements", entry.id], queryFn: () => announcementsApi.getByClass(entry.id) })) });
  const rows = useMemo(
    () => queries.flatMap((query, index) => (query.data ?? []).map((announcement) => ({ announcement, classItem: classes.data?.[index] }))).sort((left, right) => Date.parse(right.announcement.createdAt ?? "") - Date.parse(left.announcement.createdAt ?? "")),
    [classes.data, queries],
  );
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const now = Date.now();
    return rows.filter(({ announcement, classItem }) => {
      const preview = announcementPreview(announcement.content);
      const matchesSearch = !needle || `${announcement.title} ${preview} ${classItem?.subjectCode ?? ""}`.toLowerCase().includes(needle);
      const scheduled = Boolean(announcement.scheduledAt && Date.parse(announcement.scheduledAt) > now);
      const matchesStatus = filter === "all" || (filter === "pinned" ? announcement.isPinned : filter === "scheduled" ? scheduled : !scheduled);
      return matchesSearch && matchesStatus;
    });
  }, [filter, rows, search]);
  const hasFilters = Boolean(search.trim()) || filter !== "all";
  const clearFilters = () => { setSearch(""); setFilter("all"); };
  const resetComposer = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setIsPinned(false);
    setScheduledAt("");
    setShowComposer(false);
  };

  const publish = async () => {
    if (!classId || !title.trim() || !announcementPreview(content)) {
      Alert.alert("Missing fields", "Choose a class and enter a title and message.");
      return;
    }
    try {
      setSaving(true);
      const payload = { title: title.trim(), content: content.trim(), isPinned, ...(scheduledAt.trim() ? { scheduledAt: scheduledAt.trim() } : {}) };
      if (editingId) await announcementsApi.update(classId, editingId, payload);
      else await announcementsApi.create(classId, payload);
      resetComposer();
      await Promise.all(queries.map((query) => query.refetch()));
    } catch (error) {
      Alert.alert("Unable to publish", toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreen
      title="Announcements"
      subtitle="Publish and inspect messages across classes"
      showBackButton={legacyStackEntry}
      onBackPress={legacyStackEntry ? navigation?.goBack : undefined}
      refreshing={classes.isRefetching || queries.some((query) => query.isRefetching)}
      onRefresh={() => void Promise.all([classes.refetch(), ...queries.map((query) => query.refetch())])}
    >
      <AdminMetricStrip items={[
        { label: "Classes", value: classes.data?.length ?? 0 },
        { label: "Posts", value: rows.length },
        { label: "Pinned", value: rows.filter(({ announcement }) => announcement.isPinned).length, tone: "amber" },
      ]} />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search announcements"
        segments={[
          { key: "all", label: "All" },
          { key: "pinned", label: "Pinned" },
          { key: "scheduled", label: "Scheduled" },
          { key: "published", label: "Published" },
        ]}
        activeSegment={filter}
        onSegmentChange={setFilter}
        resultCount={visibleRows.length}
      />

      <AdminSection
        title={editingId ? "Edit announcement" : "Announcement feed"}
        subtitle="Every current class is included"
        action={<AdminButton label={showComposer ? "Close" : "Compose"} icon={showComposer ? "close" : "plus"} variant={showComposer ? "soft" : "solid"} onPress={() => showComposer ? resetComposer() : setShowComposer(true)} />}
      >
        {showComposer ? (
          <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: "#DDE3EA" }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(classes.data ?? []).map((entry) => <AdminChip key={entry.id} label={entry.subjectCode} active={classId === entry.id} onPress={() => setClassId(entry.id)} />)}
            </View>
            <AdminField label="Announcement title" value={title} onChangeText={setTitle} placeholder="Title" />
            <AssessmentRichTextEditor label="Announcement content" value={content} onChange={setContent} disabled={saving} extendedFormatting />
            <AdminField label="Schedule" value={scheduledAt} onChangeText={setScheduledAt} autoCapitalize="none" placeholder="Optional ISO date and time" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AdminChip label="Pinned" active={isPinned} onPress={() => setIsPinned((value) => !value)} />
              <View style={{ flex: 1 }} />
              {editingId ? <AdminButton label="Cancel edit" tone="neutral" onPress={resetComposer} /> : null}
              <AdminButton label={saving ? "Saving…" : editingId ? "Save" : "Publish"} icon="send" tone="green" variant="solid" disabled={saving} onPress={() => void publish()} />
            </View>
          </View>
        ) : null}

        {visibleRows.map(({ announcement, classItem }) => (
          <AdminAnnouncementRow
            key={announcement.id}
            announcement={announcement}
            contextLabel={classItem?.subjectCode ?? "Class"}
            onEdit={(entry) => {
              setClassId(entry.classId);
              setEditingId(entry.id);
              setTitle(entry.title);
              setContent(normalizeAnnouncementContent(entry.content));
              setIsPinned(entry.isPinned);
              setScheduledAt(entry.scheduledAt ?? "");
              setShowComposer(true);
            }}
            onDelete={(entry) => Alert.alert(
              "Delete announcement?",
              "This removes the announcement from its class.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => void announcementsApi.delete(entry.classId, entry.id).then(() => Promise.all(queries.map((query) => query.refetch()))).catch((error) => Alert.alert("Delete rejected", toAppError(error).message)) },
              ],
            )}
          />
        ))}
        {!visibleRows.length ? (
          <AdminEmpty
            title={hasFilters ? "No matching announcements" : "No announcements"}
            subtitle={hasFilters ? "Clear filters to return to the complete feed." : "Compose the first class announcement."}
            icon="bullhorn-outline"
            actionLabel={hasFilters ? "Clear filters" : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}
