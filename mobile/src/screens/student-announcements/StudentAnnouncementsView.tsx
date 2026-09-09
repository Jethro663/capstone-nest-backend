import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { AnnouncementPreview } from "../../data/types";
import { RichTextContent } from "../../components/ui/RichTextContent";
import {
  StudentFlatSection,
  StudentListRow,
  StudentScreen,
  StudentSegmentedControl,
  StudentSelectMenu,
} from "../../components/student/StudentWorkspacePrimitives";
import { announcementPreview, normalizeAnnouncementContent } from "../../utils/announcementContent";
import { studentDarkTheme as theme } from "../../theme/studentDark";

type FilterMode = "all" | "pinned";

export function StudentAnnouncementsView({
  announcements,
  allAnnouncementCount,
  classOptions,
  selectedClassId,
  onSelectClass,
  filterMode,
  onFilterModeChange,
  selectedAnnouncement,
  onSelectAnnouncement,
  refreshing,
  onRefresh,
}: {
  announcements: AnnouncementPreview[];
  allAnnouncementCount: number;
  classOptions: Array<{ label: string; value: string }>;
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  selectedAnnouncement: AnnouncementPreview | null;
  onSelectAnnouncement: (announcement: AnnouncementPreview | null) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <StudentScreen title="Announcements" refreshing={refreshing} onRefresh={onRefresh}>
      <StudentSelectMenu label="Class" selectedValue={selectedClassId} options={classOptions} onSelect={onSelectClass} icon="google-classroom" />
      <StudentSegmentedControl accessibilityLabel="Announcement status" activeKey={filterMode} items={[{ key: "all", label: "All posts" }, { key: "pinned", label: "Pinned only" }]} onSelect={onFilterModeChange} />
      <StudentFlatSection title="Latest posts" subtitle={`${announcements.length} shown across ${allAnnouncementCount} available`}>
        {announcements.length === 0 ? (
          <StudentListRow title={allAnnouncementCount === 0 ? "No announcements yet" : "No pinned announcements"} subtitle={allAnnouncementCount === 0 ? "Your class updates will appear here." : "Switch back to All posts to see every class update."} icon="inbox-outline" />
        ) : announcements.map((announcement) => (
          <StudentListRow
            key={`${announcement.classId}-${announcement.id}`}
            title={announcement.title}
            subtitle={`${announcement.subject} · ${announcement.createdAt}\n${announcementPreview(announcement.content)}`}
            icon={announcement.isPinned ? "pin-outline" : "bullhorn-outline"}
            status={announcement.isPinned ? "Pinned" : undefined}
            tone={announcement.isPinned ? "amber" : "red"}
            onPress={() => onSelectAnnouncement(announcement)}
          />
        ))}
      </StudentFlatSection>
      <View style={{ height: 24 }} />

      <Modal visible={Boolean(selectedAnnouncement)} transparent animationType="slide" onRequestClose={() => onSelectAnnouncement(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "85%", borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: theme.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 }}>
            <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: theme.border2, alignSelf: "center", marginBottom: 8 }} />
            <View style={{ minHeight: 48, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View style={{ flex: 1 }}>
                {selectedAnnouncement?.isPinned ? <Text style={{ marginBottom: 4, fontSize: 10, fontWeight: "800", color: theme.amber }}>Pinned announcement</Text> : null}
                <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>{selectedAnnouncement?.title}</Text>
                <Text style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>{selectedAnnouncement?.subject} · Posted {selectedAnnouncement?.createdAt}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close announcement" onPress={() => onSelectAnnouncement(null)} style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.active }}>
                <MaterialCommunityIcons name="close" size={20} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator style={{ marginVertical: 12 }}>
              <RichTextContent html={normalizeAnnouncementContent(selectedAnnouncement?.content)} color={theme.text} mutedColor={theme.muted} accentColor={theme.redText} />
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => onSelectAnnouncement(null)} style={{ minHeight: 48, borderRadius: 12, backgroundColor: theme.redText, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>Close Announcement</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </StudentScreen>
  );
}
