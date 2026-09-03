import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  JaActivityHistoryItem,
  JaAskLessonContextSummary,
  JaAskThreadSummary,
  JaClassSummary,
  JaMode,
} from "../../types/ja";
import { studentDarkTheme } from "../../theme/studentDark";
import { colors } from "../../theme/tokens";
import { JA_ASK_PRESET_GROUPS, type JaAskPresetAction } from "./ja-chat-model";

export type JaHubSheetName = "menu" | "lessons" | "prompts" | "activity" | null;
type ActivityFilter = "all" | Extract<JaMode, "ask" | "review">;

type Props = {
  activeSheet: JaHubSheetName;
  classes: JaClassSummary[];
  selectedClassId?: string;
  threads: JaAskThreadSummary[];
  activeThreadId?: string;
  lessons: JaAskLessonContextSummary[];
  selectedLessonId?: string;
  activities: JaActivityHistoryItem[];
  activityFilter: ActivityFilter;
  activityLoading: boolean;
  activityError: boolean;
  busy: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenThread: (threadId: string) => void;
  onSelectClass: (classId: string) => void;
  onSelectLesson: (lesson: JaAskLessonContextSummary) => void;
  onSelectPrompt: (prompt: JaAskPresetAction) => void;
  onOpenActivity: () => void;
  onActivityFilterChange: (filter: ActivityFilter) => void;
  onSwitchPanel: (panel: "review" | "lxp") => void;
  onRefreshActivity: () => void;
};

const theme = studentDarkTheme;

function SheetAction({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.surface, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, opacity: disabled ? 0.55 : 1 }}
    >
      <MaterialCommunityIcons name={icon as never} size={19} color={theme.red} />
      <Text style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: "800" }}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.muted} />
    </Pressable>
  );
}

export function JaHubSheets({
  activeSheet,
  classes,
  selectedClassId,
  threads,
  activeThreadId,
  lessons,
  selectedLessonId,
  activities,
  activityFilter,
  activityLoading,
  activityError,
  busy,
  onClose,
  onNewChat,
  onOpenThread,
  onSelectClass,
  onSelectLesson,
  onSelectPrompt,
  onOpenActivity,
  onActivityFilterChange,
  onSwitchPanel,
  onRefreshActivity,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!activeSheet) return null;

  const title = activeSheet === "menu"
    ? "JA tools"
    : activeSheet === "lessons"
      ? "Lesson context"
      : activeSheet === "prompts"
        ? "Approved prompts"
        : "Activity History";

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 20, 60, 0.42)" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={{ flex: 1 }} />
        <View style={{ maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, paddingBottom: Math.max(insets.bottom, 14) }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ flex: 1, color: theme.text, fontSize: 17, fontWeight: "900" }}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10 }}>
            {activeSheet === "menu" ? (
              <>
                <SheetAction label="New chat" icon="message-plus-outline" onPress={onNewChat} disabled={busy} />
                <SheetAction label="Activity History" icon="history" onPress={onOpenActivity} />
                <SheetAction label="Replay" icon="restore" onPress={() => onSwitchPanel("review")} />
                <SheetAction label="Learner's Path" icon="map-marker-path" onPress={() => onSwitchPanel("lxp")} />

                {classes.length > 1 ? (
                  <View style={{ marginTop: 8, gap: 7 }}>
                    <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>Class</Text>
                    {classes.map((item) => {
                      const selected = item.id === selectedClassId;
                      return (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${item.subjectName}`}
                          disabled={busy}
                          onPress={() => onSelectClass(item.id)}
                          style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: selected ? theme.red : theme.border2, backgroundColor: selected ? theme.blueSoft : theme.surface, padding: 11 }}
                        >
                          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "900" }}>{item.subjectName} ({item.subjectCode})</Text>
                          {item.sectionName ? <Text style={{ marginTop: 3, color: theme.muted, fontSize: 10 }}>{item.sectionName}</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <View style={{ marginTop: 8, gap: 7 }}>
                  <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>Recent conversations</Text>
                  {threads.length ? threads.map((thread) => {
                    const selected = thread.id === activeThreadId;
                    return (
                      <Pressable
                        key={thread.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open conversation ${thread.title || "Ask thread"}`}
                        disabled={busy}
                        onPress={() => onOpenThread(thread.id)}
                        style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: selected ? theme.red : theme.border2, backgroundColor: selected ? theme.blueSoft : theme.surface, padding: 11 }}
                      >
                        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontWeight: "900" }}>{thread.title || "Ask thread"}</Text>
                        <Text numberOfLines={1} style={{ marginTop: 3, color: theme.muted, fontSize: 10 }}>{thread.contextLessonTitle || "Lesson chat"}</Text>
                      </Pressable>
                    );
                  }) : (
                    <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>No saved conversations yet.</Text>
                  )}
                </View>
              </>
            ) : null}

            {activeSheet === "lessons" ? (
              lessons.length ? lessons.map((lesson) => {
                const selected = lesson.lessonId === selectedLessonId;
                return (
                  <Pressable
                    key={lesson.lessonId}
                    accessibilityRole="button"
                    accessibilityLabel={`Use lesson ${lesson.title}`}
                    disabled={busy}
                    onPress={() => onSelectLesson(lesson)}
                    style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: selected ? theme.red : theme.border2, backgroundColor: selected ? theme.blueSoft : theme.surface, padding: 12 }}
                  >
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: "900" }}>{lesson.title}</Text>
                    <Text style={{ marginTop: 4, color: theme.muted, fontSize: 10 }}>{[lesson.moduleTitle, lesson.sectionTitle].filter(Boolean).join(" / ") || "Visible lesson"}</Text>
                  </Pressable>
                );
              }) : (
                <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.surface, padding: 14 }}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: "900" }}>No visible lessons are available</Text>
                  <Text style={{ marginTop: 5, color: theme.muted, fontSize: 11, lineHeight: 17 }}>Open a published lesson in this class before starting a grounded JA chat.</Text>
                </View>
              )
            ) : null}

            {activeSheet === "prompts" ? JA_ASK_PRESET_GROUPS.map((group) => (
              <View key={group.id} style={{ gap: 7, marginBottom: 4 }}>
                <Text style={{ color: theme.red, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{group.label}</Text>
                {group.items.map((prompt) => (
                  <Pressable
                    key={prompt.id}
                    accessibilityRole="button"
                    accessibilityLabel={prompt.label}
                    disabled={busy}
                    onPress={() => onSelectPrompt(prompt)}
                    style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.surface, justifyContent: "center", paddingHorizontal: 12, opacity: busy ? 0.55 : 1 }}
                  >
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: "800" }}>{prompt.label}</Text>
                  </Pressable>
                ))}
              </View>
            )) : null}

            {activeSheet === "activity" ? (
              <>
                <View style={{ flexDirection: "row", gap: 7 }}>
                  {(["all", "ask", "review"] as ActivityFilter[]).map((filter) => (
                    <Pressable
                      key={filter}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${filter} activities`}
                      onPress={() => onActivityFilterChange(filter)}
                      style={{ flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: activityFilter === filter ? theme.red : theme.border2, backgroundColor: activityFilter === filter ? theme.blueSoft : theme.surface, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ color: activityFilter === filter ? theme.red : theme.muted, fontSize: 11, fontWeight: "800" }}>{filter === "review" ? "Replay" : filter[0].toUpperCase() + filter.slice(1)}</Text>
                    </Pressable>
                  ))}
                </View>
                {activityLoading ? <Text style={{ color: theme.muted, fontSize: 12 }}>Loading complete activity history...</Text> : null}
                {activityError ? (
                  <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.red, backgroundColor: "#FFF1F2", padding: 12 }}>
                    <Text style={{ color: colors.red, fontSize: 12, fontWeight: "800" }}>Activity history is unavailable.</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Refresh activity history" onPress={onRefreshActivity} style={{ minHeight: 44, justifyContent: "center" }}>
                      <Text style={{ color: colors.red, fontSize: 11, fontWeight: "900" }}>Refresh</Text>
                    </Pressable>
                  </View>
                ) : null}
                {!activityLoading && !activityError && !activities.length ? (
                  <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>No saved JA activity for this filter yet.</Text>
                ) : null}
                {!activityLoading && !activityError ? activities.map((activity) => (
                  <View key={activity.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.surface, padding: 12 }}>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: "900" }}>{activity.title}</Text>
                    <Text style={{ marginTop: 4, color: theme.muted, fontSize: 10, lineHeight: 15 }}>{activity.subtitle}</Text>
                    <Text style={{ marginTop: 5, color: theme.red, fontSize: 9, fontWeight: "800" }}>{activity.status}</Text>
                  </View>
                )) : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
