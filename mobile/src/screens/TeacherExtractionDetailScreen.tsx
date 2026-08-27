import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { extractionsApi } from "../api/services/extractions";
import { addActiveExtraction, removeActiveExtraction } from "../api/teacher-extraction-jobs";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import type { ApplyExtractionResult, Extraction, ExtractionBlock, ExtractionReviewIssue, ExtractionSection } from "../types/extraction";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherInlineField,
  TeacherPanel,
  TeacherScreen,
  TeacherStats,
  teacherTheme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  getExtractionApplyBlocker,
  getExtractionProvenanceLabel,
  nextExtractionReviewState,
} from "./teacher-extraction/model";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherExtractionDetail">;
const ACTIVE_STATUSES = new Set(["pending", "processing"]);

function getErrorMessage(error: unknown) {
  return toAppError(error).message;
}

function statusLabel(value?: string | null) {
  return (value || "pending").replace(/_/g, " ");
}

function cloneSections(sections: ExtractionSection[]) {
  return JSON.parse(JSON.stringify(sections)) as ExtractionSection[];
}

function getBlockText(block: ExtractionBlock) {
  if (typeof block.content === "string") return block.content;
  if (typeof block.content.text === "string") return block.content.text;
  if (typeof block.content.html === "string") {
    return block.content.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function withBlockText(block: ExtractionBlock, text: string): ExtractionBlock {
  if (typeof block.content === "string") return { ...block, content: text };
  if (typeof block.content.html === "string") return { ...block, content: { ...block.content, html: text } };
  return { ...block, content: { ...block.content, text } };
}

function issueLocation(issue: ExtractionReviewIssue) {
  const section = typeof issue.sectionIndex === "number" ? issue.sectionIndex + 1 : null;
  const block = typeof issue.blockIndex === "number" ? issue.blockIndex + 1 : null;
  if (section && block) return `Section ${section}, block ${block}`;
  if (section) return `Section ${section}`;
  return "Module";
}

export function TeacherExtractionDetailScreen({ navigation, route }: Props) {
  const { extractionId, classId } = route.params;
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editSections, setEditSections] = useState<ExtractionSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pollingWarning, setPollingWarning] = useState<string | null>(null);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyExtractionResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingFailuresRef = useRef(0);

  const resolvedClassId = classId || extraction?.classId || "";
  const isActive = Boolean(extraction && ACTIVE_STATUSES.has(extraction.extractionStatus));
  const canEdit = extraction?.extractionStatus === "completed" && !extraction.isApplied;

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const hydrate = useCallback((value: Extraction) => {
    const content = value.structuredContent;
    const sections = cloneSections(content?.sections ?? []);
    setTitle(content?.title || value.originalName || "Extraction");
    setDescription(content?.description || "");
    setEditSections(sections);
    setSelectedSections(new Set(sections.map((_, index) => index)));
    if (content?.audit?.applyResult) setApplyResult(content.audit.applyResult);
    setDirty(false);
  }, []);

  const load = useCallback(async (shouldHydrate = true) => {
    try {
      setLoading(true);
      const data = await extractionsApi.getById(extractionId);
      setExtraction(data);
      if (shouldHydrate) hydrate(data);
      setPollingWarning(null);
      setPollingPaused(false);
      if (!ACTIVE_STATUSES.has(data.extractionStatus) && data.classId) {
        await removeActiveExtraction(data.classId, data.id);
      }
    } catch (error) {
      Alert.alert("Unable to load extraction", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [extractionId, hydrate]);

  const refreshStatus = useCallback(async () => {
    const status = await extractionsApi.getStatus(extractionId);
    pollingFailuresRef.current = 0;
    setPollingWarning(null);
    setExtraction((current) => current ? {
      ...current,
      extractionStatus: status.status,
      progressPercent: status.progressPercent,
      totalChunks: status.totalChunks,
      processedChunks: status.processedChunks,
      modelUsed: status.modelUsed,
      errorMessage: status.errorMessage,
    } : current);
    if (!ACTIVE_STATUSES.has(status.status)) {
      stopPolling();
      await load(true);
    }
  }, [extractionId, load, stopPolling]);

  useEffect(() => {
    void load(true);
    return stopPolling;
  }, [load, stopPolling]);

  useEffect(() => {
    if (!isActive || pollingPaused || pollRef.current) return;
    pollRef.current = setInterval(() => {
      void refreshStatus().catch((error) => {
        pollingFailuresRef.current += 1;
        if (pollingFailuresRef.current >= 3) {
          stopPolling();
          setPollingPaused(true);
          setPollingWarning(`${getErrorMessage(error)} Progress is saved; pull to refresh when your connection returns.`);
        }
      });
    }, 8_000);
    return stopPolling;
  }, [isActive, pollingPaused, refreshStatus, stopPolling]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (isActive) void refreshStatus()
        .then(() => setPollingPaused(false))
        .catch((error) => setPollingWarning(`${getErrorMessage(error)} Pull to refresh to try again.`));
      else void load(!dirty);
    });
    return () => subscription.remove();
  }, [dirty, isActive, load, refreshStatus]);

  const issues = extraction?.structuredContent?.audit?.reviewIssues ?? [];
  const applyBlocker = useMemo(
    () => getExtractionApplyBlocker(extraction, { dirty, selectedSectionCount: selectedSections.size }),
    [dirty, extraction, selectedSections.size],
  );

  const updateSection = (sectionIndex: number, patch: Partial<ExtractionSection>) => {
    setEditSections((current) => current.map((section, index) => index === sectionIndex ? { ...section, ...patch } : section));
    setDirty(true);
  };

  const updateBlockText = (sectionIndex: number, blockIndex: number, text: string) => {
    setEditSections((current) => current.map((section, index) => index !== sectionIndex ? section : {
      ...section,
      lessonBlocks: section.lessonBlocks.map((block, position) => position === blockIndex ? withBlockText(block, text) : block),
    }));
    setDirty(true);
  };

  const moveBlock = (sectionIndex: number, blockIndex: number, offset: -1 | 1) => {
    setEditSections((current) => current.map((section, index) => {
      if (index !== sectionIndex) return section;
      const target = blockIndex + offset;
      if (target < 0 || target >= section.lessonBlocks.length) return section;
      const blocks = [...section.lessonBlocks];
      [blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]];
      return { ...section, lessonBlocks: blocks.map((block, order) => ({ ...block, order: order + 1 })) };
    }));
    setDirty(true);
  };

  const removeBlock = (sectionIndex: number, blockIndex: number) => {
    setEditSections((current) => current.map((section, index) => index !== sectionIndex ? section : {
      ...section,
      lessonBlocks: section.lessonBlocks.filter((_, position) => position !== blockIndex).map((block, order) => ({ ...block, order: order + 1 })),
    }));
    setDirty(true);
  };

  const toggleSection = (sectionIndex: number) => {
    setSelectedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionIndex)) next.delete(sectionIndex);
      else next.add(sectionIndex);
      return next;
    });
  };

  const markIssueReviewed = (issueId: string) => {
    setExtraction((current) => {
      if (!current?.structuredContent?.audit) return current;
      return {
        ...current,
        structuredContent: {
          ...current.structuredContent,
          audit: {
            ...current.structuredContent.audit,
            reviewIssues: (current.structuredContent.audit.reviewIssues ?? []).map((issue) => issue.id === issueId
              ? { ...issue, resolved: true, resolution: "teacher-reviewed" }
              : issue),
          },
        },
      };
    });
    setDirty(true);
  };

  const save = async () => {
    if (!extraction?.structuredContent) return;
    try {
      setSaving(true);
      const nextIssues = extraction.structuredContent.audit?.reviewIssues ?? [];
      const updated = await extractionsApi.update(extraction.id, {
        title,
        description,
        sections: editSections,
        mediaAssets: extraction.structuredContent.mediaAssets,
        reviewIssues: nextIssues,
        reviewState: nextExtractionReviewState(nextIssues),
      });
      setExtraction(updated);
      hydrate(updated);
    } catch (error) {
      Alert.alert("Unable to save extraction", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const applySelected = async (sectionIndices: number[]) => {
    if (!extraction) return;
    try {
      setApplying(true);
      const result = await extractionsApi.apply(extraction.id, { sectionIndices });
      setApplyResult(result);
      await load(false);
    } catch (error) {
      Alert.alert("Unable to apply extraction", getErrorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  const reviewAndApply = async () => {
    if (!extraction) return;
    if (applyBlocker) {
      Alert.alert("Cannot apply extraction", applyBlocker);
      return;
    }
    const sectionIndices = Array.from(selectedSections).sort((left, right) => left - right);
    try {
      const preview = await extractionsApi.previewApply(extraction.id, { sectionIndices });
      Alert.alert("Apply selected content?", [
        `${preview.sectionsCreated ?? sectionIndices.length} section(s)`,
        `${preview.lessonsCreated ?? sectionIndices.length} lesson(s)`,
        `${preview.assessmentsCreated ?? 0} assessment(s)`,
      ].join("\n"), [
        { text: "Cancel", style: "cancel" },
        { text: "Apply selected", onPress: () => void applySelected(sectionIndices) },
      ]);
    } catch (error) {
      Alert.alert("Unable to preview extraction", getErrorMessage(error));
    }
  };

  const cancelExtraction = async () => {
    if (!extraction) return;
    try {
      await extractionsApi.cancel(extraction.id);
      stopPolling();
      if (resolvedClassId) await removeActiveExtraction(resolvedClassId, extraction.id);
      await load(true);
    } catch (error) {
      Alert.alert("Unable to cancel extraction", getErrorMessage(error));
    }
  };

  const retryExtraction = async () => {
    if (!extraction) return;
    try {
      const audit = extraction.structuredContent?.audit;
      const target = audit?.requestedSectionCount;
      const response = await extractionsApi.retry(extraction.id, {
        extractionStyle: audit?.extractionStyle,
        targetSectionCount: target === 3 || target === 4 || target === 5 ? target : undefined,
      });
      if (resolvedClassId) await addActiveExtraction(resolvedClassId, response.extractionId);
      navigation.replace("TeacherExtractionDetail", { extractionId: response.extractionId, classId: resolvedClassId || undefined });
    } catch (error) {
      Alert.alert("Unable to retry extraction", getErrorMessage(error));
    }
  };

  const confirmDelete = () => {
    if (!extraction) return;
    Alert.alert("Delete extraction?", "This removes the extraction record and cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void (async () => {
          try {
            await extractionsApi.delete(extraction.id);
            if (resolvedClassId) await removeActiveExtraction(resolvedClassId, extraction.id);
            navigation.goBack();
          } catch (error) {
            Alert.alert("Unable to delete extraction", getErrorMessage(error));
          }
        })(),
      },
    ]);
  };

  return (
    <TeacherScreen
      title={title || extraction?.originalName || "Extraction detail"}
      subtitle={`${statusLabel(extraction?.extractionStatus)} | ${extraction?.progressPercent ?? 0}%`}
      icon="file-document-edit-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void load(!dirty)}
    >
      <TeacherStats items={[
        { label: "Sections", value: editSections.length, tone: "blue" },
        { label: "Chunks", value: `${extraction?.processedChunks ?? 0}/${extraction?.totalChunks ?? "?"}`, tone: "amber" },
        { label: "Quality", value: extraction?.qualityGate || "pending", tone: extraction?.qualityGate === "fail" ? "red" : "green" },
      ]} />

      {pollingWarning ? <TeacherPanel title="Live updates paused"><Text style={{ paddingHorizontal: 14, paddingBottom: 14, color: teacherTheme.amber }}>{pollingWarning}</Text></TeacherPanel> : null}

      <TeacherPanel title="Execution details" subtitle="Current backend extraction state and model information.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>
          <Text style={{ color: teacherTheme.text }}>Status: {statusLabel(extraction?.extractionStatus)}</Text>
          <Text style={{ color: teacherTheme.subtext }}>Progress: {extraction?.progressPercent ?? 0}%</Text>
          <Text style={{ color: teacherTheme.subtext }}>Model: {extraction?.modelUsed || "Pending"}</Text>
          <Text style={{ color: teacherTheme.subtext }}>Quality gate: {extraction?.qualityGate || "Pending"}</Text>
          {extraction?.errorMessage ? <Text style={{ color: teacherTheme.red }}>{extraction.errorMessage}</Text> : null}
          {(extraction?.repairNotes ?? []).map((note, index) => <Text key={`${note}-${index}`} style={{ color: teacherTheme.subtext }}>Repair: {note}</Text>)}
          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {isActive ? <TeacherActionButton label="Cancel extraction" tone="amber" onPress={() => void cancelExtraction()} /> : null}
            {extraction && ["failed", "completed", "applied"].includes(extraction.extractionStatus) ? <TeacherActionButton label="Retry extraction" tone="purple" onPress={() => void retryExtraction()} /> : null}
            <TeacherActionButton label="Delete" tone="red" disabled={!extraction} onPress={confirmDelete} />
          </View>
        </View>
      </TeacherPanel>

      {applyResult ? (
        <TeacherPanel title="Applied successfully" subtitle={applyResult.moduleTitle || "The selected content was created."}>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
            <Text style={{ color: teacherTheme.text }}>Sections: {applyResult.sectionsCreated ?? 0}</Text>
            <Text style={{ color: teacherTheme.text }}>Lessons: {applyResult.lessonsCreated ?? 0}</Text>
            <Text style={{ color: teacherTheme.text }}>Assessments: {applyResult.assessmentsCreated ?? 0}</Text>
            {applyResult.moduleId && resolvedClassId ? <TeacherActionButton label="Open Module" tone="green" onPress={() => navigation.navigate("TeacherModuleDetail", { classId: resolvedClassId, moduleId: applyResult.moduleId! })} /> : null}
          </View>
        </TeacherPanel>
      ) : null}

      {canEdit ? (
        <TeacherPanel title="Review fields" subtitle="Save all edits and resolve blocking issues before applying.">
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <TeacherInlineField label="Title" value={title} onChangeText={(value) => { setTitle(value); setDirty(true); }} />
            <TeacherInlineField label="Description" value={description} onChangeText={(value) => { setDescription(value); setDirty(true); }} multiline />
            <Text style={{ marginTop: 10, color: dirty ? teacherTheme.amber : teacherTheme.subtext }}>{dirty ? "Unsaved changes. Save before apply." : "All changes saved."}</Text>
            <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <TeacherActionButton label={saving ? "Saving..." : "Save changes"} tone="blue" disabled={saving || !dirty} onPress={() => void save()} />
              <TeacherActionButton label={applying ? "Applying..." : "Review & apply"} tone="green" disabled={applying || Boolean(applyBlocker)} onPress={() => void reviewAndApply()} />
            </View>
            {applyBlocker ? <Text style={{ marginTop: 10, color: teacherTheme.amber }}>{applyBlocker}</Text> : null}
          </View>
        </TeacherPanel>
      ) : null}

      {issues.length ? (
        <TeacherPanel title="Review issues" subtitle="Blocking issues must be reviewed and saved before apply.">
          {issues.map((issue) => {
            const block = typeof issue.sectionIndex === "number" && typeof issue.blockIndex === "number" ? editSections[issue.sectionIndex]?.lessonBlocks[issue.blockIndex] : undefined;
            return (
              <View key={issue.id} style={{ borderTopWidth: 1, borderTopColor: teacherTheme.border, padding: 14, gap: 6 }}>
                <Text style={{ color: issue.resolved ? teacherTheme.green : teacherTheme.amber, fontWeight: "700" }}>{issue.code} | {issue.resolved ? "resolved" : issue.severity}</Text>
                <Text style={{ color: teacherTheme.text }}>{issue.message}</Text>
                <Text style={{ color: teacherTheme.subtext }}>{issueLocation(issue)} | {getExtractionProvenanceLabel(block?.metadata)}</Text>
                {!issue.resolved && canEdit ? <TeacherActionButton label="Mark reviewed" tone="green" onPress={() => markIssueReviewed(issue.id)} /> : null}
              </View>
            );
          })}
        </TeacherPanel>
      ) : null}

      <TeacherPanel title="Generated sections" subtitle="Choose which sections to apply and edit their native lesson blocks.">
        {editSections.length ? editSections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={{ borderTopWidth: 1, borderTopColor: teacherTheme.border, padding: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <TeacherChip label={selectedSections.has(sectionIndex) ? `Section ${sectionIndex + 1} selected` : `Select section ${sectionIndex + 1}`} active={selectedSections.has(sectionIndex)} onPress={() => toggleSection(sectionIndex)} />
              {section.confidence != null ? <TeacherChip label={`${Math.round(section.confidence * 100)}% confidence`} /> : null}
            </View>
            <TeacherInlineField label="Section title" value={section.title} onChangeText={(value) => updateSection(sectionIndex, { title: value })} />
            <TeacherInlineField label="Section description" value={section.description || ""} onChangeText={(value) => updateSection(sectionIndex, { description: value })} multiline />
            {section.lessonBlocks.map((block, blockIndex) => (
              <View key={`block-${sectionIndex}-${blockIndex}`} style={{ marginTop: 12, borderWidth: 1, borderColor: teacherTheme.border, borderRadius: 8, padding: 10 }}>
                <Text style={{ color: teacherTheme.text, fontWeight: "700" }}>{block.type} block {blockIndex + 1}</Text>
                <Text style={{ marginTop: 3, color: teacherTheme.subtext }}>{getExtractionProvenanceLabel(block.metadata)}</Text>
                {block.type !== "divider" ? <TeacherInlineField label="Content" value={getBlockText(block)} onChangeText={(value) => updateBlockText(sectionIndex, blockIndex, value)} multiline /> : null}
                <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <TeacherActionButton label="Move up" tone="neutral" disabled={blockIndex === 0} onPress={() => moveBlock(sectionIndex, blockIndex, -1)} />
                  <TeacherActionButton label="Move down" tone="neutral" disabled={blockIndex === section.lessonBlocks.length - 1} onPress={() => moveBlock(sectionIndex, blockIndex, 1)} />
                  <TeacherActionButton label="Delete block" tone="red" onPress={() => removeBlock(sectionIndex, blockIndex)} />
                </View>
              </View>
            ))}
          </View>
        )) : <TeacherEmpty title="No generated content" subtitle="Refresh after extraction processing completes." icon="file-search-outline" />}
      </TeacherPanel>
    </TeacherScreen>
  );
}
