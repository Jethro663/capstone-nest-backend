import { useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View, Modal, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTeacherClasses, useTeacherClassPresentationUpdateMutation, useUploadClassBannerMutation } from "../api/hooks";
import { API_BASE_URL } from "../api/config";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherScreen,
  TeacherSearch,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import { TeacherClassPresentationCard } from "../components/teacher/TeacherPresentationCards";
import type { ClassItem } from "../types/class";
import { CLASS_CARD_PRESETS } from "../utils/class-card-presets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Classes">,
  NativeStackScreenProps<RootStackParamList>
>;

type VisibilityFilter = "active" | "inactive" | "all";

function formatTime(value?: string) {
  if (!value) return "";
  const [hourText, minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText.padStart(2, "0")} ${period}`;
}

const assetBaseUrl = API_BASE_URL.replace(/\/api$/, "");

function resolveImageUri(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${assetBaseUrl}${path}`;
}

function formatSchedule(classItem: ClassItem) {
  const schedule = classItem.schedules?.[0];
  if (!schedule) return classItem.room ? `Room ${classItem.room}` : "Schedule TBA";
  return `${schedule.days.join("/")} · ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}${classItem.room ? ` · ${classItem.room}` : ""}`;
}

export function TeacherClassesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<VisibilityFilter>("active");
  const classesQuery = useTeacherClasses(teacherId, filter);
  
  // Customization State
  const [isPaletteVisible, setIsPaletteVisible] = useState(false);
  const [customizingClass, setCustomizingClass] = useState<ClassItem | null>(null);
  const classPresentationMutation = useTeacherClassPresentationUpdateMutation();

  const classUploadMutation = useUploadClassBannerMutation();

  const handleSelectPreset = async (presetId: string) => {
    if (!customizingClass) return;
    try {
      await classPresentationMutation.mutateAsync({ classId: customizingClass.id, cardPreset: presetId, cardBannerUrl: null });
      setIsPaletteVisible(false);
      setCustomizingClass(null);
    } catch (err) {
      // @ts-ignore
      Alert.alert("Unable to update class palette", err?.message || "An error occurred");
    }
  };

  const handleUploadImage = async () => {
    if (!customizingClass) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photos to upload a class image.");
        return;
      }
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (selection.canceled || !selection.assets.length) return;

      await classUploadMutation.mutateAsync({
        classId: customizingClass.id,
        imageUri: selection.assets[0].uri,
      });
      // The backend will set the banner, but we must explicitly clear the preset
      await classPresentationMutation.mutateAsync({ classId: customizingClass.id, cardPreset: null });
      setIsPaletteVisible(false);
      setCustomizingClass(null);
    } catch (err) {
      // @ts-ignore
      Alert.alert("Upload failed", err?.message || "An error occurred");
    }
  };

  const handleRemoveImage = async () => {
    if (!customizingClass) return;
    try {
      await classPresentationMutation.mutateAsync({ classId: customizingClass.id, cardBannerUrl: null });
      setIsPaletteVisible(false);
      setCustomizingClass(null);
    } catch (err) {
      // @ts-ignore
      Alert.alert("Failed to remove image", err?.message || "An error occurred");
    }
  };

  const filteredClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return classesQuery.data ?? [];
    return (classesQuery.data ?? []).filter((entry) =>
      `${entry.subjectCode} ${entry.subjectName} ${entry.section?.name || ""} ${entry.schoolYear}`.toLowerCase().includes(normalizedSearch),
    );
  }, [classesQuery.data, search]);

  return (
    <TeacherScreen
      title="Classes"
      subtitle="Browse your assigned classes, open the mobile class workspace, and jump into modules, assessments, announcements, and roster."
      icon="book-open-variant-outline"
      refreshing={classesQuery.isRefetching}
      onRefresh={() => {
        void classesQuery.refetch();
      }}
    >
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search by subject, section, or school year" />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {(["active", "inactive", "all"] as const).map((entry) => (
          <TeacherChip key={entry} label={entry[0].toUpperCase() + entry.slice(1)} active={filter === entry} onPress={() => setFilter(entry)} />
        ))}
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 18, gap: 14 }}>
        {filteredClasses.length ? (
          filteredClasses.map((classItem) => (
              <TeacherClassPresentationCard
                key={classItem.id}
                classItem={classItem}
                bannerUri={resolveImageUri(classItem.cardBannerUrl)}
                schedule={formatSchedule(classItem)}
                onOpen={() =>
                  navigation.navigate("TeacherClassDetail", { classId: classItem.id })
                }
                onCustomize={() => {
                  setCustomizingClass(classItem);
                  setIsPaletteVisible(true);
                }}
              />
            ))
        ) : (
          <TeacherEmpty
            title="No classes found"
            subtitle={search.trim() ? "Try another search term or status filter." : "Assigned teacher classes will appear here."}
            icon="book-remove-outline"
          />
        )}
      </View>

      <Modal visible={isPaletteVisible} transparent animationType="slide" onRequestClose={() => setIsPaletteVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Class Background</Text>
              <Pressable onPress={() => {
                setIsPaletteVisible(false);
                setCustomizingClass(null);
              }}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView>
              {customizingClass?.cardBannerUrl && (
                <Pressable
                  onPress={handleRemoveImage}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.redSoft, padding: 12, borderRadius: 8, marginBottom: 12 }}
                >
                  <MaterialCommunityIcons name="image-off-outline" size={20} color={theme.red} style={{ marginRight: 8 }} />
                  <Text style={{ color: theme.red, fontWeight: '700' }}>Remove Image</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleUploadImage}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface2, padding: 12, borderRadius: 8, marginBottom: 16 }}
              >
                <MaterialCommunityIcons name="image-plus" size={20} color={theme.red} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.red, fontWeight: '700' }}>Upload Image</Text>
              </Pressable>
              
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.subtext, marginBottom: 12 }}>Or choose a preset color:</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {CLASS_CARD_PRESETS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={{ width: '47%', borderRadius: 8, overflow: 'hidden', borderWidth: (!customizingClass?.cardBannerUrl && customizingClass?.cardPreset === opt.id) ? 2 : 0, borderColor: theme.red }}
                    onPress={() => handleSelectPreset(opt.id)}
                  >
                    <LinearGradient colors={opt.colors as any} style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>{opt.label}</Text>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}
