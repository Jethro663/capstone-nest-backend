import { useEffect, useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Alert, AppState, Text, View } from "react-native";
import {
  useExtractionCancelMutation,
  useExtractionDeleteMutation,
  useExtractionRetryMutation,
  useExtractionStartMutation,
  useExtractionsByClass,
} from "../../api/hooks";
import { peekAppError, toAppError } from "../../api/http";
import { fileUploadApi } from "../../api/services/file-upload";
import {
  addActiveExtraction,
  loadActiveExtractions,
  removeActiveExtraction,
  setActiveExtractions,
} from "../../api/teacher-extraction-jobs";
import type { ClassItem } from "../../types/class";
import type { Extraction, ExtractionStyle, LibraryGradeLevel, LibrarySubjectKey } from "../../types/extraction";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherSearch,
  teacherTheme,
  stripRichText,
} from "./TeacherMobilePrimitives";

type ExtractionFilter = "all" | "processing" | "completed" | "failed" | "applied" | "review";
type TargetSectionCount = 3 | 4 | 5;

type Props = {
  classId: string;
  classItem?: ClassItem | null;
  registerRefetch?: (refetcher: () => Promise<unknown>) => void;
  onOpenExtraction?: (extractionId: string) => void;
};

const EXTRACTION_FILTERS: ExtractionFilter[] = ["all", "processing", "completed", "failed", "applied", "review"];
const SUBJECT_OPTIONS: LibrarySubjectKey[] = ["math", "science", "english", "filipino", "ap", "tle", "mapeh", "esp"];
const GRADE_OPTIONS: LibraryGradeLevel[] = ["7", "8", "9", "10"];

function normalizeLibrarySubjectKey(
  subjectCode?: string | null,
  subjectName?: string | null,
): LibrarySubjectKey | undefined {
  const raw = `${subjectCode ?? ""} ${subjectName ?? ""}`.toLowerCase();
  if (raw.includes("science") || raw.includes("sci")) return "science";
  if (raw.includes("math")) return "math";
  if (raw.includes("english") || raw.includes("eng")) return "english";
  if (raw.includes("filipino") || raw.includes("fil")) return "filipino";
  if (raw.includes("araling") || raw.includes("panlipunan") || /\bap\b/.test(raw)) return "ap";
  if (raw.includes("tle")) return "tle";
  if (raw.includes("mapeh")) return "mapeh";
  if (raw.includes("esp") || raw.includes("values") || raw.includes("pagpapakatao")) return "esp";
  return undefined;
}

function normalizeLibraryGradeLevel(value?: string | null): LibraryGradeLevel | undefined {
  const match = String(value ?? "").match(/\b(7|8|9|10)\b/);
  if (!match) return undefined;
  return match[1] as LibraryGradeLevel;
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getExtractionStatusLabel(extraction: Extraction) {
  if (extraction.extractionStatus === "failed") return "Failed";
  if (extraction.reviewRequired) return "Needs review";
  if (extraction.extractionStatus === "completed" || extraction.extractionStatus === "applied") return "Ready";
  return extraction.extractionStatus;
}

export function TeacherExtractionBoard({ classId, classItem, registerRefetch, onOpenExtraction }: Props) {
  const extractionsQuery = useExtractionsByClass(classId);
  const startMutation = useExtractionStartMutation(classId);
  const deleteMutation = useExtractionDeleteMutation(classId);
  const retryMutation = useExtractionRetryMutation(classId);
  const cancelMutation = useExtractionCancelMutation(classId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExtractionFilter>("all");
  const [targetSectionCount, setTargetSectionCount] = useState<TargetSectionCount>(3);
  const [extractionStyle, setExtractionStyle] = useState<ExtractionStyle>("clean");
  const [subjectKey, setSubjectKey] = useState<LibrarySubjectKey | undefined>(() =>
    normalizeLibrarySubjectKey(classItem?.subjectCode, classItem?.subjectName),
  );
  const [gradeLevel, setGradeLevel] = useState<LibraryGradeLevel | undefined>(() =>
    normalizeLibraryGradeLevel(classItem?.subjectGradeLevel ?? classItem?.section?.gradeLevel),
  );
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    registerRefetch?.(() => extractionsQuery.refetch());
  }, [extractionsQuery, registerRefetch]);

  useEffect(() => {
    const normalizedSubject = normalizeLibrarySubjectKey(classItem?.subjectCode, classItem?.subjectName);
    const normalizedGrade = normalizeLibraryGradeLevel(classItem?.subjectGradeLevel ?? classItem?.section?.gradeLevel);
    setSubjectKey((current) => current ?? normalizedSubject);
    setGradeLevel((current) => current ?? normalizedGrade);
  }, [classItem?.section?.gradeLevel, classItem?.subjectCode, classItem?.subjectGradeLevel, classItem?.subjectName]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void extractionsQuery.refetch();
    });
    return () => subscription.remove();
  }, [extractionsQuery]);

  const extractionItems = Array.isArray(extractionsQuery.data) ? extractionsQuery.data : [];

  useEffect(() => {
    void loadActiveExtractions(classId).then(async (activeIds) => {
      if (activeIds.length > 0) await extractionsQuery.refetch();
    });
  }, [classId]);

  useEffect(() => {
    if (!extractionsQuery.isSuccess) return;
    void setActiveExtractions(
      classId,
      extractionItems
        .filter((extraction) => extraction.extractionStatus === "pending" || extraction.extractionStatus === "processing")
        .map((extraction) => extraction.id),
    );
  }, [classId, extractionItems, extractionsQuery.isSuccess]);

  const filteredExtractions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...extractionItems]
      .filter((entry) => {
        if (filter === "processing" && !(entry.extractionStatus === "pending" || entry.extractionStatus === "processing")) {
          return false;
        }
        if (filter === "review" && !entry.reviewRequired) {
          return false;
        }
        if (filter === "completed" && entry.extractionStatus !== "completed") {
          return false;
        }
        if (filter === "failed" && entry.extractionStatus !== "failed") {
          return false;
        }
        if (filter === "applied" && !entry.isApplied) {
          return false;
        }
        if (!normalizedSearch) return true;
        const searchable = `${entry.originalName || ""} ${entry.structuredContent?.title || ""}`.toLowerCase();
        return searchable.includes(normalizedSearch);
      })
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [extractionItems, filter, search]);

  const selectedExtraction =
    filteredExtractions.find((entry) => entry.id === selectedExtractionId) ??
    extractionItems.find((entry) => entry.id === selectedExtractionId) ??
    null;
  const hasActiveExtraction = extractionItems.some(
    (entry) => entry.extractionStatus === "pending" || entry.extractionStatus === "processing",
  );

  const startExtraction = async () => {
    try {
      setActionError(null);
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ["application/pdf"],
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      if (!subjectKey || !gradeLevel) {
        setActionError("Select a subject and grade level before uploading.");
        return;
      }

      const asset = picked.assets[0];
      setUploading(true);
      const uploadedFile = await fileUploadApi.upload(
        {
          uri: asset.uri,
          name: asset.name || `extraction-${Date.now()}.pdf`,
          type: asset.mimeType || "application/pdf",
        },
        {
          classId,
          scope: "private",
          subjectKey,
          gradeLevel,
          aiEnabled: true,
        },
      );

      const started = await startMutation.mutateAsync({
        fileId: uploadedFile.id,
        targetSectionCount,
        extractionStyle,
      });
      await addActiveExtraction(classId, started.extractionId);

      await extractionsQuery.refetch();
    } catch (error) {
      setActionError(toAppError(error).message);
    } finally {
      setUploading(false);
    }
  };

  const retryExtraction = async (extraction: Extraction) => {
    try {
      setActionError(null);
      const requested = extraction.structuredContent?.audit?.requestedSectionCount;
      const target = requested === 3 || requested === 4 || requested === 5 ? requested : targetSectionCount;
      const result = await retryMutation.mutateAsync({
        extractionId: extraction.id,
        payload: {
          targetSectionCount: target,
          extractionStyle: extraction.structuredContent?.audit?.extractionStyle ?? extractionStyle,
        },
      });
      await addActiveExtraction(classId, result.extractionId);
      await extractionsQuery.refetch();
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const cancelExtraction = async (extractionId: string) => {
    try {
      setActionError(null);
      await cancelMutation.mutateAsync(extractionId);
      await removeActiveExtraction(classId, extractionId);
      await extractionsQuery.refetch();
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const removeExtraction = async (extractionId: string) => {
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(extractionId);
      await removeActiveExtraction(classId, extractionId);
      if (selectedExtractionId === extractionId) {
        setSelectedExtractionId(null);
      }
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const confirmDeleteExtraction = (extractionId: string) => {
    Alert.alert("Delete extraction?", "This extraction draft will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeExtraction(extractionId) },
    ]);
  };

  return (
    <View>
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search extraction history" />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {EXTRACTION_FILTERS.map((entry) => (
          <TeacherChip
            key={entry}
            label={entry === "all" ? "All" : entry === "review" ? "Needs Review" : entry[0].toUpperCase() + entry.slice(1)}
            active={filter === entry}
            onPress={() => setFilter(entry)}
          />
        ))}
      </View>

      <TeacherPanel title="Start AI Extraction" subtitle="Upload a PDF and convert it into structured lesson and assessment drafts.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#8C8C8C", textTransform: "uppercase", letterSpacing: 0.7 }}>
            Subject
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {SUBJECT_OPTIONS.map((entry) => (
              <TeacherChip
                key={entry}
                label={entry.toUpperCase()}
                active={subjectKey === entry}
                onPress={() => setSubjectKey(entry)}
              />
            ))}
          </View>

          <Text
            style={{
              marginTop: 10,
              fontSize: 10,
              fontWeight: "700",
              color: "#8C8C8C",
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            Grade level
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
            {GRADE_OPTIONS.map((entry) => (
              <TeacherChip
                key={entry}
                label={`Grade ${entry}`}
                active={gradeLevel === entry}
                onPress={() => setGradeLevel(entry)}
              />
            ))}
          </View>

          <Text style={{ marginTop: 10, fontSize: 10, fontWeight: "700", color: "#8C8C8C", textTransform: "uppercase", letterSpacing: 0.7 }}>
            Extraction style
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(["faithful", "clean", "student_friendly"] as const).map((value) => (
              <TeacherChip
                key={value}
                label={value === "student_friendly" ? "Student friendly" : value[0].toUpperCase() + value.slice(1)}
                active={extractionStyle === value}
                onPress={() => setExtractionStyle(value)}
              />
            ))}
          </View>

          <Text
            style={{
              marginTop: 10,
              fontSize: 10,
              fontWeight: "700",
              color: "#8C8C8C",
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            Target section count
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
            {([3, 4, 5] as const).map((value) => (
              <TeacherChip
                key={String(value)}
                label={`${value} sections`}
                active={targetSectionCount === value}
                onPress={() => setTargetSectionCount(value)}
              />
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <TeacherActionButton
              label={uploading || startMutation.isPending ? "Uploading PDF..." : "Upload PDF"}
              icon="file-upload-outline"
              tone="red"
              disabled={uploading || startMutation.isPending}
              onPress={() => void startExtraction()}
            />
            <TeacherActionButton
              label="Refresh"
              icon="refresh"
              tone="blue"
              onPress={() => {
                void extractionsQuery.refetch();
              }}
            />
          </View>
        </View>
      </TeacherPanel>

      {actionError ? (
        <TeacherPanel title="Extraction action failed" subtitle={actionError}>
          <View />
        </TeacherPanel>
      ) : null}

      {extractionsQuery.error && (!hasActiveExtraction || extractionsQuery.failureCount >= 3) ? (
        <TeacherPanel
          title={hasActiveExtraction ? "Live updates paused" : "Extraction list unavailable"}
          subtitle={hasActiveExtraction
            ? `${peekAppError(extractionsQuery.error).message} Active extraction progress is preserved; tap Refresh when your connection returns.`
            : peekAppError(extractionsQuery.error).message}
        >
          <View />
        </TeacherPanel>
      ) : null}

      <TeacherPanel title={`Extraction History (${filteredExtractions.length})`} subtitle="Open an extraction to inspect section output and apply it into this class.">
        {filteredExtractions.length ? (
          filteredExtractions.map((extraction) => (
            <View key={extraction.id} style={{ borderTopWidth: 1, borderTopColor: teacherTheme.border, paddingHorizontal: 14, paddingVertical: 11 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#ECECEC" }}>
                {extraction.structuredContent?.title || extraction.originalName || "PDF Extraction"}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 11, color: "#9D9D9D" }}>
                {formatDate(extraction.createdAt)} - {getExtractionStatusLabel(extraction)}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 11, color: "#9D9D9D" }}>
                {extraction.structuredContent?.sections?.length ?? 0} sections - {extraction.structuredContent?.mediaAssets?.length ?? 0} media assets
              </Text>
              <Text style={{ marginTop: 3, fontSize: 11, color: "#9D9D9D" }}>
                {extraction.progressPercent}% - {extraction.processedChunks}/{extraction.totalChunks ?? "?"} chunks
                {extraction.structuredContent?.audit?.extractionStyle ? ` - ${extraction.structuredContent.audit.extractionStyle.replace("_", " ")}` : ""}
              </Text>
              {extraction.errorMessage ? (
                <Text style={{ marginTop: 5, fontSize: 11, color: teacherTheme.red }}>{extraction.errorMessage}</Text>
              ) : null}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <TeacherActionButton
                  label={selectedExtractionId === extraction.id ? "Opened" : "Open"}
                  icon="eye-outline"
                  tone="blue"
                  onPress={() => setSelectedExtractionId(extraction.id)}
                />
                {onOpenExtraction ? (
                  <TeacherActionButton
                    label="Detail"
                    icon="file-document-edit-outline"
                    tone="purple"
                    onPress={() => onOpenExtraction(extraction.id)}
                  />
                ) : null}
                {extraction.extractionStatus === "pending" || extraction.extractionStatus === "processing" ? (
                  <TeacherActionButton
                    label={cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                    icon="cancel"
                    tone="amber"
                    disabled={cancelMutation.isPending}
                    onPress={() => void cancelExtraction(extraction.id)}
                  />
                ) : null}
                {extraction.extractionStatus === "failed" || extraction.extractionStatus === "completed" || extraction.extractionStatus === "applied" ? (
                  <TeacherActionButton
                    label={retryMutation.isPending ? "Retrying..." : "Retry"}
                    icon="restart"
                    tone="green"
                    disabled={retryMutation.isPending}
                    onPress={() => void retryExtraction(extraction)}
                  />
                ) : null}
                <TeacherActionButton
                  label={deleteMutation.isPending ? "Deleting..." : "Delete"}
                  icon="delete-outline"
                  tone="neutral"
                  disabled={deleteMutation.isPending}
                  onPress={() => confirmDeleteExtraction(extraction.id)}
                />
              </View>
            </View>
          ))
        ) : (
          <TeacherEmpty
            title="No extraction history"
            subtitle="Upload a class PDF to generate AI extraction drafts for lessons and assessments."
            icon="radar"
          />
        )}
      </TeacherPanel>

      {selectedExtraction ? (
        <TeacherPanel
          title={selectedExtraction.structuredContent?.title || selectedExtraction.originalName || "Extraction detail"}
          subtitle={`${selectedExtraction.structuredContent?.sections?.length ?? 0} sections, ${selectedExtraction.structuredContent?.mediaAssets?.length ?? 0} media`}
          action={<TeacherActionButton label="Close" icon="close" tone="neutral" onPress={() => setSelectedExtractionId(null)} />}
        >
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            {selectedExtraction.structuredContent?.description ? (
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: "#BFBFBF" }}>
                {stripRichText(selectedExtraction.structuredContent.description)}
              </Text>
            ) : null}

            {(selectedExtraction.structuredContent?.sections ?? []).map((section, index) => (
              <View
                key={`${section.title}-${index}`}
                style={{
                  marginTop: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: teacherTheme.border,
                  backgroundColor: teacherTheme.surface2,
                  paddingHorizontal: 11,
                  paddingVertical: 9,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#ECECEC" }}>
                  {section.order}. {section.title}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 11, color: "#8D8D8D" }}>
                  {section.lessonBlocks.length} blocks
                  {section.assessmentDraft?.questions?.length
                    ? ` - ${section.assessmentDraft.questions.length} draft questions`
                    : ""}
                </Text>
              </View>
            ))}
          </View>
        </TeacherPanel>
      ) : null}
    </View>
  );
}
