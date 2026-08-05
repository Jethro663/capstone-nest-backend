import { useEffect, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { teacherTheme as theme } from "./TeacherMobilePrimitives";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface AddModuleFormPayload {
  title: string;
  description: string;
}

interface Props {
  visible: boolean;
  className?: string;
  saving?: boolean;
  onSave: (payload: AddModuleFormPayload) => Promise<void> | void;
  onClose: () => void;
}

const FORMATTING_TOOLS: Array<{
  label: string;
  icon: IconName;
  prefix: string;
  suffix: string;
  placeholder: string;
}> = [
  { label: "Bold", icon: "format-bold", prefix: "<b>", suffix: "</b>", placeholder: "bold text" },
  { label: "Italic", icon: "format-italic", prefix: "<i>", suffix: "</i>", placeholder: "italic text" },
  { label: "Heading", icon: "format-header-2", prefix: "<h2>", suffix: "</h2>", placeholder: "Heading text" },
  { label: "Bullet", icon: "format-list-bulleted", prefix: "<ul>\n  <li>", suffix: "</li>\n</ul>", placeholder: "List item" },
  { label: "Numbered", icon: "format-list-numbered", prefix: "<ol>\n  <li>", suffix: "</li>\n</ol>", placeholder: "List item" },
  { label: "Quote", icon: "format-quote-close", prefix: "<blockquote>", suffix: "</blockquote>", placeholder: "Quote text" },
];

export function TeacherAddModuleModal({
  visible,
  className,
  saving = false,
  onSave,
  onClose,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const titleRef = useRef<TextInput>(null);

  // Reset fields when modal opens
  useEffect(() => {
    if (visible) {
      setTitle("");
      setDescription("");
      setSelection({ start: 0, end: 0 });
      // Auto-focus title after a brief delay so the slide-up animation completes
      const timer = setTimeout(() => titleRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const insertFormatting = (prefix: string, suffix: string, placeholder: string) => {
    const start = selection.start;
    const end = selection.end;
    const selected = description.substring(start, end) || placeholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const next = description.substring(0, start) + replacement + description.substring(end);
    setDescription(next);
  };

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = () => {
    if (!canSave) return;
    void onSave({ title: title.trim(), description: description.trim() });
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
          {/* ── Header ── */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>Add Module</Text>
              {className ? (
                <Text style={{ marginTop: 2, fontSize: 12, color: theme.subtext }}>
                  Adding to{" "}
                  <Text style={{ fontWeight: "700", color: theme.red }}>{className}</Text>
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
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

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Module Title ── */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: theme.muted,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 6,
              }}
            >
              Module Title *
            </Text>
            <TextInput
              ref={titleRef}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Introduction to Algebra"
              placeholderTextColor={theme.dim}
              returnKeyType="next"
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                color: theme.text,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                marginBottom: 16,
              }}
            />

            {/* ── Description label + toolbar ── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Description & Formatting
              </Text>
              <Text style={{ fontSize: 10, color: theme.muted }}>Tap tools to format</Text>
            </View>

            {/* Formatting toolbar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
            >
              <View style={{ flexDirection: "row", gap: 4 }}>
                {FORMATTING_TOOLS.map((tool) => (
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
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>
                      {tool.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Description text area */}
            <TextInput
              value={description}
              onChangeText={setDescription}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              placeholder="Write a short overview of this module's content... (optional)"
              placeholderTextColor={theme.dim}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 110,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                color: theme.text,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 13,
                lineHeight: 19,
                marginBottom: 8,
              }}
            />

            {/* Hint */}
            <Text style={{ fontSize: 11, color: theme.muted, marginBottom: 16 }}>
              You can add sections and content to this module after it is created.
            </Text>
          </ScrollView>

          {/* ── Footer ── */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
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
              onPress={handleSave}
              disabled={!canSave}
              style={{
                opacity: canSave ? 1 : 0.45,
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
              <MaterialCommunityIcons name="view-module-outline" size={16} color="#ffffff" />
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#ffffff" }}>
                {saving ? "Creating..." : "Create Module"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
