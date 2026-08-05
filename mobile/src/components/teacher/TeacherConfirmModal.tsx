import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { teacherTheme as theme } from "./TeacherMobilePrimitives";

interface Props {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function TeacherConfirmModal({
  visible,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
        onPress={onCancel}
      >
        <Pressable
          style={{
            width: "100%",
            maxWidth: 400,
            backgroundColor: theme.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 10,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon Header */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: theme.redSoft,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons name="alert-outline" size={26} color={theme.red} />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: theme.text,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: theme.muted,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 18,
              }}
            >
              {description}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={() => void onConfirm()}
              disabled={loading}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                backgroundColor: theme.red,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ffffff" />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>{confirmLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
