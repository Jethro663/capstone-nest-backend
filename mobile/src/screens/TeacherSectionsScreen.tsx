import { useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Modal, ScrollView, Alert, Pressable, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTeacherSections, useTeacherSectionPresentationUpdateMutation, useUploadSectionBannerMutation } from "../api/hooks";
import { API_BASE_URL } from "../api/config";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherScreen,
  TeacherSearch,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import { TeacherSectionPresentationCard } from "../components/teacher/TeacherPresentationCards";
import type { TeacherSection } from "../types/teacher";
import { CLASS_CARD_PRESETS } from "../utils/class-card-presets";
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
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search by section, grade level, or school year" />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["all", "active", "archived", "hidden"] as const).map((entry) => (
            <TeacherChip
              key={entry}
              label={entry[0].toUpperCase() + entry.slice(1)}
              active={filter === entry}
              onPress={() => setFilter(entry)}
            />
          ))}
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 18, gap: 14 }}>
        {filtered.length ? (
          filtered.map((section) => (
            <TeacherSectionPresentationCard
              key={section.id}
              section={section}
              bannerUri={resolveImageUri(section.cardBannerUrl)}
              onOpen={() =>
                navigation.navigate("TeacherSectionDetail", { sectionId: section.id })
              }
              onCustomize={() => {
                setCustomizingSection(section);
                setIsPaletteVisible(true);
              }}
            />
          ))
        ) : (
          <TeacherEmpty
            title="No sections found"
            subtitle="Adjust the filter or search term to find your section."
            icon="account-search-outline"
          />
        )}
      </View>

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
                <MaterialCommunityIcons name="image-plus" size={20} color={theme.red} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.red, fontWeight: '700' }}>Upload Image</Text>
              </Pressable>
              
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.subtext, marginBottom: 12 }}>Or choose a preset color:</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {CLASS_CARD_PRESETS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={{ width: '47%', borderRadius: 8, overflow: 'hidden', borderWidth: (!customizingSection?.cardBannerUrl && customizingSection?.cardPreset === opt.id) ? 2 : 0, borderColor: theme.red }}
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
