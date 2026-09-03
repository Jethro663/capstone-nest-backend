import { useEffect, useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { JaAskMessage } from "../../types/ja";
import { studentDarkTheme } from "../../theme/studentDark";
import { colors } from "../../theme/tokens";
import { resolveJaAvatar, resolveJaStateFromMessage } from "../../utils/jaAssets";
import { RichTextContent } from "../ui/RichTextContent";
import type { JaChatEntryState, JaLessonSelection } from "./ja-chat-model";

type Props = {
  classLabel: string;
  entryState: JaChatEntryState;
  lessonSelection: JaLessonSelection;
  messages: JaAskMessage[];
  busy: boolean;
  error: string;
  dataError?: string;
  refreshing?: boolean;
  onOpenMenu: () => void;
  onOpenLessons: () => void;
  onOpenPrompts: () => void;
  onRefresh: () => void;
  onDismissError: () => void;
};

const theme = studentDarkTheme;

function citationLabel(citation: Record<string, unknown>, index: number) {
  for (const key of ["title", "label", "source", "lessonTitle"]) {
    const value = citation[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return `Lesson source ${index + 1}`;
}

function lessonGuidance(selection: JaLessonSelection) {
  switch (selection.kind) {
    case "selected":
      return `Using ${selection.lesson.title}`;
    case "requires-selection":
      return "Choose a lesson to continue";
    case "unavailable":
      return "No visible lessons are available for JA Ask yet.";
    case "stale":
      return "This chat's lesson is no longer available. Start a new grounded chat.";
  }
}

export function JaChatWorkspace({
  classLabel,
  entryState,
  lessonSelection,
  messages,
  busy,
  error,
  dataError,
  refreshing = false,
  onOpenMenu,
  onOpenLessons,
  onOpenPrompts,
  onRefresh,
  onDismissError,
}: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<JaAskMessage> | null>(null);
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role !== "student");
  const visualState = busy ? "thinking" : resolveJaStateFromMessage(lastAssistantMessage);
  const avatar = resolveJaAvatar(visualState);
  const avatarSource = process.env.NODE_ENV === "test" ? undefined : avatar.getSource();
  const promptEnabled =
    !busy &&
    lessonSelection.kind === "selected" &&
    entryState.mode !== "resume-loading";

  useEffect(() => {
    if (!messages.length && !busy) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(timer);
  }, [busy, messages]);

  const renderMessage = ({ item }: { item: JaAskMessage }) => {
    const isStudent = item.role === "student";
    return (
      <View
        style={{
          alignSelf: isStudent ? "flex-end" : "flex-start",
          width: isStudent ? "auto" : "100%",
          maxWidth: isStudent ? "88%" : "100%",
          borderRadius: isStudent ? 18 : 0,
          borderTopRightRadius: isStudent ? 5 : 0,
          borderWidth: isStudent || item.blocked ? 1 : 0,
          borderColor: item.blocked ? colors.red : theme.blueLine,
          backgroundColor: isStudent ? theme.blueSoft : "transparent",
          paddingHorizontal: isStudent ? 13 : 2,
          paddingVertical: 11,
        }}
      >
        {!isStudent && item.blocked ? (
          <Text style={{ color: colors.red, fontSize: 10, fontWeight: "900", marginBottom: 7 }}>
            Response limited
          </Text>
        ) : null}
        {isStudent ? (
          <Text style={{ color: theme.text, fontSize: 13, lineHeight: 20 }}>{item.content}</Text>
        ) : (
          <RichTextContent
            html={item.content}
            color={theme.text}
            mutedColor={theme.muted}
            accentColor={theme.red}
          />
        )}
        {!isStudent && item.citations?.length ? (
          <View style={{ marginTop: 10, gap: 5 }}>
            <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "900" }}>Lesson sources</Text>
            {item.citations.map((citation, index) => (
              <Text key={`${item.id}-citation-${index}`} style={{ color: theme.red, fontSize: 11, lineHeight: 16 }}>
                {index + 1}. {citationLabel(citation, index)}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "left", "right"]}>
      <View
        style={{
          minHeight: 64,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: theme.header,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {avatarSource ? (
            <Image source={avatarSource} style={{ width: 34, height: 34 }} resizeMode="contain" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>JA</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: theme.text, fontSize: 15, fontWeight: "900" }}>
            JA Hub
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ color: theme.muted, fontSize: 10, marginTop: 2 }}>
            {classLabel}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open JA tools"
          onPress={onOpenMenu}
          style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.surface }}
        >
          <MaterialCommunityIcons name="menu" size={22} color={theme.red} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose lesson context"
        disabled={busy}
        onPress={onOpenLessons}
        style={{
          minHeight: 48,
          paddingHorizontal: 16,
          paddingVertical: 9,
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          backgroundColor: lessonSelection.kind === "stale" ? "#FFF1F2" : theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: lessonSelection.kind === "stale" ? colors.red : theme.border,
        }}
      >
        <MaterialCommunityIcons
          name={lessonSelection.kind === "selected" ? "book-check-outline" : "book-open-page-variant-outline"}
          size={17}
          color={lessonSelection.kind === "stale" ? colors.red : theme.red}
        />
        <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={{ flex: 1, color: lessonSelection.kind === "stale" ? colors.red : theme.text, fontSize: 11, lineHeight: 16, fontWeight: "700" }}>
          {lessonGuidance(lessonSelection)}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={theme.muted} />
      </Pressable>

      {dataError ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 9, backgroundColor: "#FFF1F2", borderBottomWidth: 1, borderBottomColor: colors.red }}>
          <Text style={{ color: colors.red, fontSize: 11, fontWeight: "800" }}>{dataError}</Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: messages.length ? 0 : 1,
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 18,
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={(
          <View style={{ flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 }}>
            <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: theme.blueSoft, alignItems: "center", justifyContent: "center" }}>
              {avatarSource ? (
                <Image source={avatarSource} style={{ width: 70, height: 70 }} resizeMode="contain" />
              ) : (
                <MaterialCommunityIcons name="auto-fix" size={28} color={theme.red} />
              )}
            </View>
            <Text style={{ marginTop: 16, color: theme.text, fontSize: 19, fontWeight: "900", textAlign: "center" }}>
              {entryState.mode === "resume-loading" ? "Opening your latest conversation" : "Start with a lesson question"}
            </Text>
            <Text style={{ marginTop: 7, color: theme.muted, fontSize: 12, lineHeight: 19, textAlign: "center" }}>
              {entryState.mode === "resume-loading"
                ? "JA is restoring the complete saved thread."
                : "Choose an approved prompt and JA will answer using only your selected lesson context."}
            </Text>
          </View>
        )}
        ListFooterComponent={busy ? (
          <View style={{ alignSelf: "flex-start", borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border2, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "800" }}>JA is thinking...</Text>
          </View>
        ) : null}
      />

      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 8) + 86,
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          gap: 8,
        }}
      >
        {error ? (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.red, backgroundColor: "#FFF1F2", padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ flex: 1, color: colors.red, fontSize: 11, lineHeight: 16, fontWeight: "700" }}>{error}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss JA error" onPress={onDismissError} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ color: colors.red, fontSize: 11, fontWeight: "900" }}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open approved JA prompts"
          disabled={!promptEnabled}
          onPress={onOpenPrompts}
          style={{
            minHeight: 50,
            borderRadius: 16,
            backgroundColor: promptEnabled ? theme.red : theme.active,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 16,
            opacity: promptEnabled ? 1 : 0.7,
          }}
        >
          <MaterialCommunityIcons name="message-question-outline" size={18} color={promptEnabled ? "#FFFFFF" : theme.muted} />
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ color: promptEnabled ? "#FFFFFF" : theme.muted, fontSize: 13, fontWeight: "900" }}>
            Ask JA about this lesson
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
