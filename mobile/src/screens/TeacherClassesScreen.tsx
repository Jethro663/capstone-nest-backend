import { useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View, Modal, ScrollView, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTeacherClasses, useTeacherClassPresentationUpdateMutation, useUploadClassBannerMutation } from "../api/hooks";
import { API_BASE_URL } from "../api/config";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import type { ClassItem } from "../types/class";
import { CLASS_CARD_PRESETS, getPresetColors } from "../utils/class-card-presets";
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

  const totalStudents = filteredClasses.reduce(
    (sum, entry) => sum + (entry.enrollmentCount ?? entry.enrollments?.length ?? 0),
    0,
  );

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
      <TeacherStats
        items={[
          { label: "Classes", value: filteredClasses.length, tone: "red" },
          { label: "Students", value: totalStudents, tone: "blue" },
          { label: "School Year", value: filteredClasses[0]?.schoolYear || "--", tone: "purple" },
        ]}
      />

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search by subject, section, or school year" />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 6 }}>
        {(["active", "inactive", "all"] as const).map((entry) => (
          <TeacherChip key={entry} label={entry[0].toUpperCase() + entry.slice(1)} active={filter === entry} onPress={() => setFilter(entry)} />
        ))}
      </View>

      <TeacherPanel title="Teaching load" subtitle="Your class load is shown as stacked cards for easier mobile scanning.">
        {filteredClasses.length ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
            {filteredClasses.map((classItem) => (
              <Pressable
                key={classItem.id}
                onPress={() => navigation.navigate("TeacherClassDetail", { classId: classItem.id })}
                style={{
                  minHeight: 160,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  overflow: 'hidden',
                }}
              >
                {/* Banner Section */}
                <View style={{ height: 60, width: '100%' }}>
                  {classItem.cardBannerUrl ? (
                    <Image source={{ uri: resolveImageUri(classItem.cardBannerUrl) }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  ) : classItem.cardPreset ? (
                    <LinearGradient
                      colors={getPresetColors(classItem.cardPreset) as [string, string, ...string[]]}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: theme.surface2 }} />
                  )}
                  {/* Status Badge floating top right */}
                  <View style={{ position: 'absolute', top: 12, right: 12, borderRadius: 999, backgroundColor: classItem.isActive ? theme.greenSoft : theme.amberSoft, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: classItem.isActive ? theme.green : theme.amber }}>
                      {classItem.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                {/* Content Section */}
                <View style={{ padding: 14, flex: 1, justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: theme.blue }}>{classItem.subjectCode}</Text>
                    <Text numberOfLines={2} style={{ marginTop: 4, fontSize: 17, lineHeight: 22, fontWeight: "900", color: theme.text }}>
                      {classItem.subjectName}
                    </Text>
                    <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 12, color: theme.subtext }}>
                      {classItem.section?.name || "Section pending"} · {formatSchedule(classItem)}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 }}>
                    <View>
                      <Text style={{ fontSize: 22, fontWeight: "900", color: theme.text }}>
                        {classItem.enrollmentCount ?? classItem.enrollments?.length ?? 0}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.muted }}>learners</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setCustomizingClass(classItem);
                          setIsPaletteVisible(true);
                        }}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" }}
                      >
                        <MaterialCommunityIcons name="palette" size={16} color={theme.blue} />
                      </Pressable>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.blue }}>Open →</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <TeacherEmpty
            title="No classes found"
            subtitle={search.trim() ? "Try another search term or status filter." : "Assigned teacher classes will appear here."}
            icon="book-remove-outline"
          />
        )}
      </TeacherPanel>

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
                <MaterialCommunityIcons name="image-plus" size={20} color={theme.blue} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.blue, fontWeight: '700' }}>Upload Image</Text>
              </Pressable>
              
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.subtext, marginBottom: 12 }}>Or choose a preset color:</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {CLASS_CARD_PRESETS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={{ width: '47%', borderRadius: 8, overflow: 'hidden', borderWidth: (!customizingClass?.cardBannerUrl && customizingClass?.cardPreset === opt.id) ? 2 : 0, borderColor: theme.blue }}
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
