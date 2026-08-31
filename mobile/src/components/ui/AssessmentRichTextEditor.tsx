import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ASSESSMENT_RICH_TEXT_HTML } from "../../generated/assessment-rich-text";
import { RichTextContent } from "./RichTextContent";
import { teacherTheme as theme } from "../teacher/TeacherMobilePrimitives";

export function AssessmentRichTextEditor({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const web = useRef<WebView>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const command = (name: string, argument?: string) =>
    web.current?.injectJavaScript(
      `window.assessmentCommand(${JSON.stringify(name)}, ${JSON.stringify(argument ?? "")});true;`,
    );
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.text, fontWeight: "700" }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 70,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          backgroundColor: "white",
        }}
      >
        {value ? (
          <RichTextContent
            html={value}
            color={theme.text}
            mutedColor={theme.subtext}
            accentColor={theme.red}
          />
        ) : (
          <Text style={{ color: theme.muted }}>Tap to write…</Text>
        )}
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                gap: 12,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                {label}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={{ padding: 12 }}
              >
                <Text style={{ color: theme.red, fontWeight: "700" }}>
                  Done
                </Text>
              </Pressable>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                paddingHorizontal: 8,
              }}
            >
              {[
                ["bold", "Bold"],
                ["italic", "Italic"],
                ["bulletList", "Bullets"],
                ["orderedList", "Numbered"],
                ["undo", "Undo"],
                ["redo", "Redo"],
              ].map(([action, text]) => (
                <Pressable
                  key={action}
                  accessibilityRole="button"
                  onPress={() => command(action)}
                  style={{ padding: 12 }}
                >
                  <Text style={{ color: theme.text }}>{text}</Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => setLink("https://")}
                style={{ padding: 12 }}
              >
                <Text style={{ color: theme.text }}>Link</Text>
              </Pressable>
            </View>
            {link !== null && (
              <View style={{ flexDirection: "row", padding: 8, gap: 8 }}>
                <TextInput
                  accessibilityLabel="Link URL"
                  value={link}
                  onChangeText={setLink}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: 8,
                  }}
                />
                <Pressable
                  onPress={() => {
                    command("link", link);
                    setLink(null);
                  }}
                  style={{ padding: 12 }}
                >
                  <Text>Add</Text>
                </Pressable>
              </View>
            )}
            {open && (
              <WebView
                ref={web}
                source={{ html: ASSESSMENT_RICH_TEXT_HTML }}
                originWhitelist={["about:blank"]}
                javaScriptEnabled
                scrollEnabled
                keyboardDisplayRequiresUserAction={false}
                allowFileAccess={false}
                allowUniversalAccessFromFileURLs={false}
                mixedContentMode="never"
                onShouldStartLoadWithRequest={(request) =>
                  request.url === "about:blank"
                }
                onMessage={(event) => {
                  try {
                    const message = JSON.parse(event.nativeEvent.data);
                    if (message.type === "ready")
                      web.current?.injectJavaScript(
                        `window.setAssessmentContent(${JSON.stringify(valueRef.current).replace(/</g, "\\u003c")});true;`,
                      );
                    if (
                      message.type === "change" &&
                      typeof message.html === "string"
                    )
                      onChange(message.html);
                  } catch {
                    /* Ignore messages outside the editor bridge contract. */
                  }
                }}
              />
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
