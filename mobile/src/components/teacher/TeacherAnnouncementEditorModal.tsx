import { useEffect, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { DatePickerModal } from "../ui/DatePickerModal";
import { teacherTheme as theme } from "./TeacherMobilePrimitives";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface AnnouncementFormPayload {
  title: string;
  content: string;
  isPinned: boolean;
  scheduledAt?: string;
}

interface Props {
  visible: boolean;
  className?: string;
  editingId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialPinned?: boolean;
  initialScheduledAt?: string;
  saving?: boolean;
  onSave: (payload: AnnouncementFormPayload) => Promise<void> | void;
  onClose: () => void;
}

export function TeacherAnnouncementEditorModal({
  visible,
  className,
  editingId,
  initialTitle = "",
  initialContent = "",
  initialPinned = false,
  initialScheduledAt = "",
  saving = false,
  onSave,
  onClose,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt);
  const [attachments, setAttachments] = useState<Array<{ name: string; uri: string; size?: number }>>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setContent(initialContent);
      setIsPinned(initialPinned);
      setScheduledAt(initialScheduledAt);
      setAttachments([]);
    }
  }, [visible, initialTitle, initialContent, initialPinned, initialScheduledAt]);

  if (!visible) return null;

  const insertFormatting = (prefix: string, suffix: string = "", defaultPlaceholder: string = "") => {
    const start = selection.start;
    const end = selection.end;
    const selectedText = content.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  const formattingTools: Array<{ label: string; icon: IconName; prefix: string; suffix: string; placeholder: string }> = [
    { label: "Bold", icon: "format-bold", prefix: "<b>", suffix: "</b>", placeholder: "bold text" },
    { label: "Italic", icon: "format-italic", prefix: "<i>", suffix: "</i>", placeholder: "italic text" },
    { label: "Heading", icon: "format-header-2", prefix: "<h2>", suffix: "</h2>", placeholder: "Heading text" },
    { label: "Bullet", icon: "format-list-bulleted", prefix: "<ul>\n  <li>", suffix: "</li>\n</ul>", placeholder: "List item" },
    { label: "Numbered", icon: "format-list-numbered", prefix: "<ol>\n  <li>", suffix: "</li>\n</ol>", placeholder: "List item" },
    { label: "Quote", icon: "format-quote-close", prefix: "<blockquote>", suffix: "</blockquote>", placeholder: "Quote text" },
    { label: "Code", icon: "code-tags", prefix: "<code>", suffix: "</code>", placeholder: "code" },
    { label: "Link", icon: "link-variant", prefix: '<a href="https://">', suffix: "</a>", placeholder: "Link description" },
  ];

  const handleSavePress = () => {
    if (!title.trim() || !content.trim()) return;
    void onSave({
      title: title.trim(),
      content: content.trim(),
      isPinned,
      scheduledAt: scheduledAt.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
        <View
          style={{
            maxHeight: "90%",
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 24,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>
                {editingId ? "Edit Announcement" : "Create Announcement"}
              </Text>
              {className ? (
                <Text style={{ marginTop: 2, fontSize: 12, color: theme.subtext }}>
                  Posting to <Text style={{ fontWeight: "700", color: theme.red }}>{className}</Text>
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.surface2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="close" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
              Announcement Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Upcoming Quiz & Assignment Guidelines"
              placeholderTextColor={theme.dim}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                color: theme.text,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                marginBottom: 14,
              }}
            />

            {/* Rich Text Formatting Bar */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Content & Formatting *
              </Text>
              <Text style={{ fontSize: 10, color: theme.muted }}>Tap tools to format text</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, flexDirection: "row" }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {formattingTools.map((tool) => (
                  <Pressable
                    key={tool.label}
                    onPress={() => insertFormatting(tool.prefix, tool.suffix, tool.placeholder)}
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface2,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MaterialCommunityIcons name={tool.icon} size={15} color={theme.red} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>{tool.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Content Multi-line TextInput */}
            <TextInput
              value={content}
              onChangeText={setContent}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              placeholder="Write announcement details here... You can use standard HTML formatting tags like <b>bold</b>, <i>italic</i>, or lists."
              placeholderTextColor={theme.dim}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 130,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                color: theme.text,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 13,
                lineHeight: 19,
                marginBottom: 14,
              }}
            />

            {/* Post Settings: Pin & Schedule */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              {/* Pin Toggle */}
              <Pressable
                onPress={() => setIsPinned((prev) => !prev)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isPinned ? theme.redLine : theme.border,
                  backgroundColor: isPinned ? theme.redSoft : theme.active,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialCommunityIcons name="pin-outline" size={16} color={isPinned ? theme.red : theme.muted} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: isPinned ? theme.red : theme.text }}>
                    Pin to top
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isPinned ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={18}
                  color={isPinned ? theme.red : theme.dim}
                />
              </Pressable>

              {/* Schedule Date */}
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: scheduledAt ? theme.blueLine : theme.border,
                  backgroundColor: scheduledAt ? theme.blueSoft : theme.active,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: scheduledAt ? theme.blue : theme.muted, textTransform: "uppercase" }}>
                    Schedule Post
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: scheduledAt ? theme.blue : theme.text }} numberOfLines={1}>
                    {scheduledAt || "Post immediately"}
                  </Text>
                </View>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={scheduledAt ? theme.blue : theme.muted} />
              </Pressable>
            </View>

            {/* Document Picker Attachments Trigger */}
            <Pressable
              onPress={async () => {
                try {
                  const DocumentPicker = await import("expo-document-picker");
                  const result = await DocumentPicker.getDocumentAsync({
                    type: "*/*",
                    copyToCacheDirectory: true,
                  });
                  if (!result.canceled && result.assets && result.assets.length > 0) {
                    const picked = result.assets[0];
                    setAttachments((prev) => [...prev, { name: picked.name, uri: picked.uri, size: picked.size }]);
                  }
                } catch {
                  // Fallback if DocumentPicker fails
                }
              }}
              style={{
                marginBottom: 16,
                borderRadius: 10,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.blueLine,
                backgroundColor: theme.blueSoft,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="paperclip" size={18} color={theme.blue} />
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.blue }}>
                    Attach Documents or Files
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.subtext }}>
                    {attachments.length > 0 ? `${attachments.length} file(s) attached` : "Tap to pick PDF, DOCX, or Image file"}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="plus" size={18} color={theme.blue} />
            </Pressable>

            {attachments.length > 0 ? (
              <View style={{ marginBottom: 16, gap: 6 }}>
                {attachments.map((att, idx) => (
                  <View
                    key={`${att.uri}-${idx}`}
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface2,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                      <MaterialCommunityIcons name="file-document-outline" size={16} color={theme.red} />
                      <Text style={{ fontSize: 12, color: theme.text, flex: 1 }} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      hitSlop={8}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color={theme.red} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface2,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSavePress}
              disabled={saving || !title.trim() || !content.trim()}
              style={{
                opacity: saving || !title.trim() || !content.trim() ? 0.45 : 1,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.redLine,
                backgroundColor: theme.red,
                paddingHorizontal: 18,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MaterialCommunityIcons name="bullhorn-outline" size={16} color="#ffffff" />
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#ffffff" }}>
                {saving ? "Posting..." : editingId ? "Save Changes" : "Publish Announcement"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        value={scheduledAt}
        onSelect={(dateStr: string) => setScheduledAt(dateStr)}
        onClose={() => setShowDatePicker(false)}
      />
    </Modal>
  );
}
