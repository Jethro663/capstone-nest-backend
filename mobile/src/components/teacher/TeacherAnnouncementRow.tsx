import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { Announcement } from "../../types/announcement";
import { teacherTheme as theme } from "./TeacherMobilePrimitives";
import { RichTextContent } from "../ui/RichTextContent";
import { announcementPreview, normalizeAnnouncementContent } from "../../utils/announcementContent";

interface Props {
  announcement: Announcement;
  contextLabel?: string;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
}

function formatDate(value?: string | null) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function restrictionMessage(
  announcement: Announcement,
  action: "edited" | "deleted",
) {
  if (announcement.restrictionReason === "core_template") {
    return `This administrator-managed announcement cannot be ${action}.`;
  }
  return `This announcement was created by another account and cannot be ${action} by you.`;
}

export function TeacherAnnouncementRow({ announcement, contextLabel, onEdit, onDelete }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const summary = announcementPreview(announcement.content);

  return (
    <>
      <View
        style={{
          minHeight: 76,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${announcement.title} announcement`}
          onPress={() => setShowDetails(true)}
          style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>
            {announcement.title}
          </Text>
          <Text
            numberOfLines={2}
            style={{ marginTop: 3, fontSize: 11, lineHeight: 17, color: theme.subtext }}
          >
            {announcement.isPinned ? "Pinned · " : ""}
            {contextLabel ? `${contextLabel} · ` : ""}
            {formatDate(announcement.scheduledAt || announcement.createdAt)} · {summary.slice(0, 90)}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${announcement.title}`}
          onPress={() => {
            if (announcement.canEdit !== true) {
              Alert.alert("Action not allowed", restrictionMessage(announcement, "edited"));
              return;
            }
            onEdit(announcement);
          }}
          style={{
            minWidth: 44,
            minHeight: 44,
            borderRadius: 8,
            backgroundColor: theme.surface2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.text} />
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.text }}>Edit</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${announcement.title}`}
          onPress={() => {
            if (announcement.canDelete !== true) {
              Alert.alert("Action not allowed", restrictionMessage(announcement, "deleted"));
              return;
            }
            onDelete(announcement);
          }}
          style={{
            minWidth: 44,
            minHeight: 44,
            borderRadius: 8,
            backgroundColor: theme.redSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.red} />
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.red }}>Delete</Text>
        </Pressable>
      </View>

      {showDetails ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShowDetails(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.65)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                maxHeight: "85%",
                backgroundColor: theme.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>
                    {announcement.title}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 11, color: theme.subtext }}>
                    {formatDate(announcement.createdAt)}
                    {announcement.author
                      ? ` · ${announcement.author.firstName ?? ""} ${announcement.author.lastName ?? ""}`.trimEnd()
                      : ""}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close announcement details"
                  onPress={() => setShowDetails(false)}
                  style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <MaterialCommunityIcons name="close" size={22} color={theme.text} />
                </Pressable>
              </View>
              <ScrollView style={{ marginTop: 18 }}>
                <RichTextContent
                  html={normalizeAnnouncementContent(announcement.content)}
                  color={theme.text}
                  mutedColor={theme.subtext}
                  accentColor={theme.red}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
