import { useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Image, Modal, ScrollView, Alert, Pressable, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTeacherSections, useTeacherSectionPresentationUpdateMutation, useUploadSectionBannerMutation } from "../api/hooks";
import { API_BASE_URL } from "../api/config";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import type { TeacherSection } from "../types/teacher";
import { CLASS_CARD_PRESETS, getPresetColors } from "../utils/class-card-presets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const assetBaseUrl = API_BASE_URL.replace(/\/api$/, "");

function resolveImageUri(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${assetBaseUrl}${path}`;
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Sections">,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = "all" | "active" | "archived" | "hidden";

export function TeacherSectionsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const sectionsQuery = useTeacherSections(filter);

  // Customization State
  const [isPaletteVisible, setIsPaletteVisible] = useState(false);
  const [customizingSection, setCustomizingSection] = useState<TeacherSection | null>(null);
  const sectionPresentationMutation = useTeacherSectionPresentationUpdateMutation();
  const sectionUploadMutation = useUploadSectionBannerMutation();

  const handleSelectPreset = async (presetId: string) => {
    if (!customizingSection) return;
    try {
      await sectionPresentationMutation.mutateAsync({ sectionId: customizingSection.id, cardPreset: presetId, cardBannerUrl: null });
      setIsPaletteVisible(false);
      setCustomizingSection(null);
    } catch (err) {
      // @ts-ignore
      Alert.alert("Unable to update section palette", err?.message || "An error occurred");
    }
  };

  const handleUploadImage = async () => {
    if (!customizingSection) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photos to upload a section image.");
        return;
      }
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (selection.canceled || !selection.assets.length) return;

      await sectionUploadMutation.mutateAsync({
        sectionId: customizingSection.id,
        imageUri: selection.assets[0].uri,
      });
      await sectionPresentationMutation.mutateAsync({ sectionId: customizingSection.id, cardPreset: null });
      setIsPaletteVisible(false);
      setCustomizingSection(null);
    } catch (err) {
      // @ts-ignore
      Alert.alert("Upload failed", err?.message || "An error occurred");
    }
  };

  const handleRemoveImage = async () => {
    if (!customizingSection) return;
    try {
      await sectionPresentationMutation.mutateAsync({ sectionId: customizingSection.id, cardBannerUrl: null });
      setIsPaletteVisible(false);
      setCustomizingSection(null);
    } catch (err) {
      // @ts-ignore
      Alert.alert("Failed to remove image", err?.message || "An error occurred");
    }
  };

  const filtered = useMemo(() => {
    const rows = sectionsQuery.data?.data ?? [];
    if (!search.trim()) return rows;
    const needle = search.trim().toLowerCase();
    return rows.filter((section) => {
      const haystack = `${section.name} ${section.gradeLevel} ${section.schoolYear} ${section.roomNumber ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [search, sectionsQuery.data?.data]);

  const allSections = sectionsQuery.data?.data ?? [];
  const activeCount = allSections.filter((entry) => entry.isActive !== false && !entry.isHidden).length;
  const hiddenCount = allSections.filter((entry) => entry.isHidden).length;

  return (
    <TeacherScreen
      title="My Sections"
      subtitle="Teacher advisory sections, roster access, and room/schedule visibility in one mobile view."
      icon="account-group-outline"
      refreshing={sectionsQuery.isRefetching}
      onRefresh={() => {
        void sectionsQuery.refetch();
      }}
    >
      <TeacherStats
        items={[
          { label: "Sections", value: allSections.length, tone: "red" },
          { label: "Active", value: activeCount, tone: "green" },
          { label: "Hidden", value: hiddenCount, tone: "amber" },
        ]}
      />

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search by section, grade level, or school year" />

      <TeacherPanel title="Visibility filter" subtitle="Switch between active, archived, and hidden sections.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["all", "active", "archived", "hidden"] as const).map((entry) => (
            <TeacherChip
              key={entry}
              label={entry[0].toUpperCase() + entry.slice(1)}
              active={filter === entry}
              onPress={() => setFilter(entry)}
            />
          ))}
        </View>
      </TeacherPanel>

      <TeacherPanel title="Section list" subtitle="Open a section to view roster and class schedule details.">
        {filtered.length ? (
          filtered.map((section) => (
            <Pressable
              key={section.id}
              onPress={() => navigation.navigate("TeacherSectionDetail", { sectionId: section.id })}
              style={{
                minHeight: 160,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              {/* Banner Section */}
              <View style={{ height: 60, width: '100%' }}>
                {section.cardBannerUrl ? (
                  <Image source={{ uri: resolveImageUri(section.cardBannerUrl) }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : section.cardPreset ? (
                  <LinearGradient
                    colors={getPresetColors(section.cardPreset) as [string, string, ...string[]]}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <View style={{ flex: 1, backgroundColor: theme.surface2 }} />
                )}
                {/* Status Badge floating top right */}
                <View style={{ position: 'absolute', top: 12, right: 12, borderRadius: 999, backgroundColor: section.isActive === false ? theme.amberSoft : (section.isHidden ? theme.muted : theme.greenSoft), paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: section.isActive === false ? theme.amber : (section.isHidden ? theme.subtext : theme.green) }}>
                    {section.isActive === false ? "Archived" : (section.isHidden ? "Hidden" : "Active")}
                  </Text>
                </View>
              </View>

              {/* Content Section */}
              <View style={{ padding: 14, flex: 1, justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: theme.blue }}>Grade {section.gradeLevel}</Text>
                  <Text numberOfLines={2} style={{ marginTop: 4, fontSize: 17, lineHeight: 22, fontWeight: "900", color: theme.text }}>
                    {section.name}
                  </Text>
                  <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 12, color: theme.subtext }}>
                    {section.schoolYear} · Room {section.roomNumber || "TBA"}
                  </Text>
                </View>
                
                <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", marginTop: 12 }}>
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setCustomizingSection(section);
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
          ))
        ) : (
          <TeacherEmpty
            title="No sections found"
            subtitle="Adjust the filter or search term to find your section."
            icon="account-search-outline"
          />
        )}
      </TeacherPanel>

      <Modal visible={isPaletteVisible} transparent animationType="slide" onRequestClose={() => setIsPaletteVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Section Background</Text>
              <Pressable onPress={() => {
                setIsPaletteVisible(false);
                setCustomizingSection(null);
              }}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView>
              {customizingSection?.cardBannerUrl && (
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
                    style={{ width: '47%', borderRadius: 8, overflow: 'hidden', borderWidth: (!customizingSection?.cardBannerUrl && customizingSection?.cardPreset === opt.id) ? 2 : 0, borderColor: theme.blue }}
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
