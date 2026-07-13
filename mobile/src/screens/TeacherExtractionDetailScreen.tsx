import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { extractionsApi } from "../api/services/extractions";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import type { Extraction, ExtractionSection } from "../types/extraction";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherInlineField,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
} from "../components/teacher/TeacherMobilePrimitives";

type ExtractionDetailProps = NativeStackScreenProps<RootStackParamList, "TeacherExtractionDetail">;

function getErrorMessage(error: unknown) {
  return toAppError(error).message;
}

function stringifyStatus(value?: string | null) {
  return (value || "pending").replace(/_/g, " ");
}

export function TeacherExtractionDetailScreen({ navigation, route }: ExtractionDetailProps) {
  const { extractionId, classId } = route.params;
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await extractionsApi.getById(extractionId);
      setExtraction(data);
      setTitle(data.structuredContent?.title || data.originalName || "Extraction");
      setDescription(data.structuredContent?.description || "");
    } catch (error) {
      Alert.alert("Unable to load extraction", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [extractionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!extraction?.structuredContent) return;
    try {
      setSaving(true);
      await extractionsApi.update(extraction.id, {
        title,
        description,
        sections: extraction.structuredContent.sections,
        mediaAssets: extraction.structuredContent.mediaAssets,
      });
      await load();
    } catch (error) {
      Alert.alert("Unable to save extraction", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const applyExtraction = async () => {
    if (!extraction) return;
    try {
      await extractionsApi.apply(extraction.id);
      Alert.alert("Extraction applied", "Generated lessons and assessments were applied.");
      if (classId || extraction.classId) {
        navigation.navigate("TeacherClassDetail", { classId: classId || extraction.classId, initialTab: "modules" });
      }
    } catch (error) {
      Alert.alert("Unable to apply extraction", getErrorMessage(error));
    }
  };

  const deleteExtraction = async () => {
    if (!extraction) return;
    try {
      await extractionsApi.delete(extraction.id);
      Alert.alert("Extraction deleted", "The extraction record was deleted.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Unable to delete extraction", getErrorMessage(error));
    }
  };

  const sections = extraction?.structuredContent?.sections ?? [];

  return (
    <TeacherScreen
      title={title || "Extraction detail"}
      subtitle={`${stringifyStatus(extraction?.extractionStatus)} | ${extraction?.progressPercent ?? 0}%`}
      icon="file-document-edit-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <TeacherStats
        items={[
          { label: "Sections", value: sections.length, tone: "blue" },
          { label: "Progress", value: `${extraction?.progressPercent ?? 0}%`, tone: "amber" },
          { label: "Applied", value: extraction?.isApplied ? "Yes" : "No", tone: extraction?.isApplied ? "green" : "red" },
        ]}
      />
      <TeacherPanel title="Review fields" subtitle="Edit extraction title and summary before applying generated content.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} />
          <TeacherInlineField label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label={saving ? "Saving..." : "Save"} icon="content-save-outline" tone="blue" disabled={saving || !extraction?.structuredContent} onPress={() => void save()} />
            <TeacherActionButton label="Apply extraction" icon="check-decagram-outline" tone="green" disabled={!extraction || extraction.qualityGate === "fail"} onPress={() => void applyExtraction()} />
            <TeacherActionButton label="Delete" icon="trash-can-outline" tone="red" disabled={!extraction} onPress={() => void deleteExtraction()} />
          </View>
        </View>
      </TeacherPanel>
      <TeacherPanel title="Generated sections" subtitle="The mobile view keeps text-first review of generated lesson sections and assessment drafts.">
        {sections.length ? (
          sections.map((section: ExtractionSection, index) => (
            <TeacherRow
              key={`${section.title}-${index}`}
              title={section.title || `Section ${index + 1}`}
              subtitle={`${section.lessonBlocks?.length ?? 0} block(s) | ${section.assessmentDraft?.questions?.length ?? 0} question(s) | confidence ${section.confidence ?? "N/A"}`}
            />
          ))
        ) : (
          <TeacherEmpty title="No generated content" subtitle="Refresh after extraction processing completes." icon="file-search-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
