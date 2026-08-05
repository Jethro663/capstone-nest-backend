import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { queryKeys, useStudentClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { toAnnouncementPreview, toSubjectCard } from "../data/mappers";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";

type Props = BottomTabScreenProps<MainTabParamList, "Announcements">;
type FilterMode = "all" | "pinned";

function CountPill({ label, value, color = theme.red }: { label: string; value: string | number; color?: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 12,
        paddingVertical: 11,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
        {label}
      </Text>
      <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "800", color }}>{value}</Text>
    </View>
  );
}

export function AnnouncementsScreen(_: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const classIds = classesQuery.data?.map((item) => item.id) ?? [];

  const announcementQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.announcements(classId),
      queryFn: () => announcementsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const announcements = useMemo(() => {
    if (!classesQuery.data) return [];
    return announcementQueries
      .flatMap((query, index) => {
        const classItem = classesQuery.data?.[index];
        if (!classItem || !query.data) return [];
        const subject = toSubjectCard(classItem, [], [], null);
        return query.data.map((entry) => toAnnouncementPreview(entry, subject));
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [announcementQueries, classesQuery.data]);

  const pinnedCount = announcements.filter((entry) => entry.isPinned).length;
  const filteredAnnouncements = useMemo(() => {
    let list = announcements;
    if (selectedClassId !== "all") {
      list = list.filter((entry) => entry.classId === selectedClassId);
    }
    if (filterMode === "pinned") {
      list = list.filter((entry) => entry.isPinned);
    }
    return list;
  }, [announcements, filterMode, selectedClassId]);

  const refreshing = classesQuery.isRefetching || announcementQueries.some((query) => query.isRefetching);

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            void Promise.all([classesQuery.refetch(), ...announcementQueries.map((query) => query.refetch())]);
          }}
        />
      }
    >
      <View style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.red,
              }}
            >
              <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
                Class updates
              </Text>
              <Text style={{ marginTop: 4, fontSize: 24, fontWeight: "800", color: theme.text }}>Announcements</Text>
            </View>
          </View>
          <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 18, color: theme.muted }}>
            Read teacher posts from all enrolled classes in one compact feed.
          </Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 14, flexDirection: "row", gap: 8 }}>
        <CountPill label="Posts" value={announcements.length} />
        <CountPill label="Pinned" value={pinnedCount} color={theme.amber} />
        <CountPill label="Classes" value={classIds.length} color={theme.blue} />
      </View>

      <View
        style={{
          marginHorizontal: 16,
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
          Latest posts
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["all", "pinned"] as const).map((mode) => {
            const active = filterMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setFilterMode(mode)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? theme.redLine : theme.border,
                  backgroundColor: active ? theme.redSoft : theme.surface,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: active ? theme.red : theme.muted }}>
                  {mode === "all" ? "All" : "Pinned"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {filteredAnnouncements.length === 0 ? (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 18,
            paddingVertical: 26,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.redSoft,
            }}
          >
            <MaterialCommunityIcons name="inbox-outline" size={22} color={theme.red} />
          </View>
          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "800", color: theme.text }}>
            {announcements.length === 0 ? "No announcements yet" : "No pinned announcements"}
          </Text>
          <Text style={{ marginTop: 4, textAlign: "center", fontSize: 12, lineHeight: 18, color: theme.muted }}>
            {announcements.length === 0
              ? "Your class updates will appear here."
              : "Switch back to All to see every class update."}
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 6 }}>
          {filteredAnnouncements.map((announcement, index) => (
            <Pressable
              key={`${announcement.classId}-${announcement.id}`}
              onPress={() => setSelectedAnnouncement(announcement)}
              style={{
                marginHorizontal: 16,
                marginTop: index === 0 ? 6 : 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: announcement.isPinned ? theme.amberSoft : theme.redSoft,
                  }}
                >
                  <MaterialCommunityIcons
                    name={announcement.isPinned ? "pin-outline" : "bullhorn-outline"}
                    size={15}
                    color={announcement.isPinned ? theme.amber : theme.red}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "700", color: theme.text }}>
                      {announcement.title}
                    </Text>
                    {announcement.isPinned ? (
                      <View style={{ borderRadius: 4, backgroundColor: theme.amberSoft, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: theme.amber }}>Pinned</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>
                    {announcement.subject} - {announcement.createdAt}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={3} style={{ marginTop: 9, fontSize: 12, lineHeight: 19, color: theme.subtext }}>
                {stripRichText(announcement.content)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Announcement Detail Modal */}
      <Modal visible={Boolean(selectedAnnouncement)} transparent animationType="slide" onRequestClose={() => setSelectedAnnouncement(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                {selectedAnnouncement?.isPinned ? (
                  <View style={{ alignSelf: "flex-start", borderRadius: 4, backgroundColor: theme.amberSoft, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.amber }}>📌 Pinned Announcement</Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text }}>
                  {selectedAnnouncement?.title}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>
                  {selectedAnnouncement?.subject} | Posted {selectedAnnouncement?.createdAt}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedAnnouncement(null)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator style={{ marginBottom: 16 }}>
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, padding: 14 }}>
                <Text style={{ fontSize: 13, lineHeight: 22, color: theme.text }}>
                  {stripRichText(selectedAnnouncement?.content || "")}
                </Text>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setSelectedAnnouncement(null)}
              style={{ borderRadius: 12, backgroundColor: theme.red, paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>Close Announcement</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenScroll>
  );
}
