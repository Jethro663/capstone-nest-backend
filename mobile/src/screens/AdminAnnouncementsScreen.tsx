import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { announcementsApi } from "../api/services/announcements";
import { classesApi } from "../api/services/classes";
import { toAppError } from "../api/http";
import { AdminPaginatedList } from "../components/admin/AdminPaginatedList";
import {
  mergeAdminPages,
  nextAdminPage,
} from "../components/admin/admin-pagination";
import { AdminAnnouncementRow } from "../components/admin/AdminAnnouncementRow";
import {
  AdminButton,
  AdminChip,
  AdminField,
  AdminFilterBar,
  AdminListHeader,
  AdminNotice,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import { AssessmentRichTextEditor } from "../components/ui/AssessmentRichTextEditor";
import type { AdminAnnouncement } from "../types/announcement";
import {
  announcementPreview,
  normalizeAnnouncementContent,
} from "../utils/announcementContent";

type Filter = "all" | "pinned" | "scheduled" | "published";
type Props = { navigation?: unknown };

export function AdminAnnouncementsScreen(_props: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showComposer, setShowComposer] = useState(false);
  const [classId, setClassId] = useState("");
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [schedulePicker, setSchedulePicker] = useState<"date" | "time" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const feed = useInfiniteQuery({
    queryKey: ["admin-announcement-inventory", filter, debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      announcementsApi.getAdminPage({
        page: pageParam,
        limit: 25,
        search: debouncedSearch || undefined,
        state: filter,
      }),
    getNextPageParam: nextAdminPage,
  });
  const classes = useQuery({
    queryKey: ["admin-announcement-class-options"],
    queryFn: () => classesApi.getPage({ page: 1, limit: 100 }),
  });
  const rows = useMemo(
    () => mergeAdminPages(feed.data?.pages ?? [], (entry) => entry.id),
    [feed.data?.pages],
  );
  const reset = () => {
    setShowComposer(false);
    setEditing(null);
    setClassId("");
    setTitle("");
    setContent("");
    setIsPinned(false);
    setScheduledAt(null);
    setSchedulePicker(null);
  };
  const save = async () => {
    if (!classId || !title.trim() || !announcementPreview(content)) {
      Alert.alert(
        "Missing fields",
        "Choose a class and enter a title and message.",
      );
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        content: content.trim(),
        isPinned,
        ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
      };
      if (editing) await announcementsApi.update(classId, editing.id, payload);
      else await announcementsApi.create(classId, payload);
      reset();
      await feed.refetch();
    } catch (error) {
      Alert.alert("Unable to publish", toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };
  const beginEdit = (entry: AdminAnnouncement) => {
    setEditing(entry);
    setClassId(entry.classId);
    setTitle(entry.title);
    setContent(normalizeAnnouncementContent(entry.content));
    setIsPinned(entry.isPinned);
    setScheduledAt(entry.scheduledAt ? new Date(entry.scheduledAt) : null);
    setShowComposer(true);
  };
  const changeSchedule = (_event: DateTimePickerEvent, value?: Date) => {
    if (!schedulePicker || !value) {
      setSchedulePicker(null);
      return;
    }
    const next = new Date(scheduledAt ?? Date.now() + 3_600_000);
    if (schedulePicker === "date")
      next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
    else next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    setScheduledAt(next);
    setSchedulePicker(null);
  };
  const remove = (entry: AdminAnnouncement) =>
    Alert.alert(
      "Archive announcement?",
      "This follows the existing class announcement delete procedure.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () =>
            void announcementsApi
              .delete(entry.classId, entry.id)
              .then(() => feed.refetch())
              .catch((error) =>
                Alert.alert("Archive rejected", toAppError(error).message),
              ),
        },
      ],
    );
  return (
    <AdminPaginatedList
      data={rows}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <AdminAnnouncementRow
          announcement={item}
          contextLabel={`${item.class?.subjectCode ?? "Class"}${item.class?.section?.name ? ` · ${item.class.section.name}` : ""}`}
          onEdit={item.canEdit === false ? undefined : beginEdit}
          onDelete={item.canDelete === false ? undefined : remove}
        />
      )}
      header={
        <>
          <AdminListHeader
            title="Announcements"
            subtitle="One bounded cross-class page; editing keeps the class procedure"
            rightAction={
              <AdminButton
                label={showComposer ? "Close" : "Compose"}
                icon={showComposer ? "close" : "plus"}
                onPress={() => (showComposer ? reset() : setShowComposer(true))}
              />
            }
          />
          <AdminFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search announcement content"
            segments={[
              { key: "all", label: "All" },
              { key: "pinned", label: "Pinned" },
              { key: "scheduled", label: "Scheduled" },
              { key: "published", label: "Published" },
            ]}
            activeSegment={filter}
            onSegmentChange={setFilter}
            resultCount={feed.data?.pages[0]?.total ?? rows.length}
          />
          {feed.isError ? (
            <AdminNotice
              title="Announcement feed unavailable"
              description={toAppError(feed.error).message}
              tone="red"
            />
          ) : null}
          {showComposer ? (
            <AdminSection
              title={
                editing ? "Edit in class context" : "Compose in class context"
              }
              subtitle="The backend class route remains the canonical mutation contract"
            >
              <View style={{ padding: 16, gap: 10 }}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {(classes.data?.data ?? []).map((entry) => (
                    <AdminChip
                      key={entry.id}
                      label={entry.subjectCode}
                      active={classId === entry.id}
                      onPress={() => setClassId(entry.id)}
                    />
                  ))}
                </View>
                <AdminField
                  label="Title"
                  value={title}
                  onChangeText={setTitle}
                />
                <AssessmentRichTextEditor
                  label="Announcement content"
                  value={content}
                  onChange={setContent}
                  disabled={saving}
                  extendedFormatting
                />
                <Text style={{ color: theme.text, fontWeight: "800" }}>
                  Schedule:{" "}
                  {scheduledAt?.toLocaleString() ?? "Publish immediately"}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <AdminButton
                    label="Schedule date"
                    onPress={() => setSchedulePicker("date")}
                  />
                  <AdminButton
                    label="Schedule time"
                    onPress={() => setSchedulePicker("time")}
                  />
                  <AdminButton
                    label="Publish immediately"
                    disabled={!scheduledAt}
                    onPress={() => setScheduledAt(null)}
                  />
                </View>
                {schedulePicker ? (
                  <DateTimePicker
                    value={scheduledAt ?? new Date(Date.now() + 3_600_000)}
                    mode={schedulePicker}
                    onChange={changeSchedule}
                  />
                ) : null}
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <AdminChip
                    label="Pinned"
                    active={isPinned}
                    onPress={() => setIsPinned((value) => !value)}
                  />
                  <View style={{ flex: 1 }} />
                  <AdminButton
                    label={
                      saving
                        ? "Saving…"
                        : editing
                          ? "Save"
                          : scheduledAt
                            ? "Schedule"
                            : "Publish"
                    }
                    icon="send"
                    tone="green"
                    disabled={saving}
                    onPress={() => void save()}
                  />
                </View>
              </View>
            </AdminSection>
          ) : null}
        </>
      }
      emptyTitle={
        search.trim() || filter !== "all"
          ? "No matching announcements"
          : "No announcements"
      }
      emptySubtitle={
        search.trim() || filter !== "all"
          ? "Clear filters to return to the complete announcement inventory."
          : "No announcements have been created yet."
      }
      emptyActionLabel={
        search.trim() || filter !== "all" ? "Clear filters" : undefined
      }
      onEmptyAction={
        search.trim() || filter !== "all"
          ? () => {
              setSearch("");
              setFilter("all");
            }
          : undefined
      }
      error={feed.isError ? toAppError(feed.error).message : null}
      initialLoading={feed.isPending}
      lastUpdatedAt={feed.dataUpdatedAt}
      refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      onRefresh={() => void feed.refetch()}
      hasNextPage={feed.hasNextPage}
      isFetchingNextPage={feed.isFetchingNextPage}
      fetchNextPage={() => void feed.fetchNextPage()}
    />
  );
}
