"use client";

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { classRecordService } from "@/services/class-record-service";
import { classService } from "@/services/class-service";
import { academicStateService } from "@/services/academic-state-service";
import { exportAcademicWorkbook } from "@/lib/academic-workbook-export";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ClassRecord, SpreadsheetData } from "@/types/class-record";
import type {
  AcademicPolicy,
  PeriodReadiness,
  PeriodRoster,
  ConfirmPeriodRoster,
  PeriodHistory,
  AnnualSummary,
} from "@/types/academic-grading";
import type { GradingPeriod } from "@/utils/constants";

export type ClassRecordLoadStatus = "idle" | "loading" | "ready" | "error";
export interface TeacherClassRecordState {
  classId?: string;
  policy: AcademicPolicy | null;
  classRecords: ClassRecord[];
  selectedRecord: ClassRecord | null;
  spreadsheet: SpreadsheetData | null;
  readiness: PeriodReadiness | null;
  roster: PeriodRoster | null;
  history: PeriodHistory | null;
  annualSummary: AnnualSummary | null;
  recordsStatus: ClassRecordLoadStatus;
  spreadsheetStatus: ClassRecordLoadStatus;
  quarters: GradingPeriod[];
  periodLabel: (period: string) => string;
  generating: boolean;
  finalizing: boolean;
  reopening: boolean;
  savingRoster: boolean;
  syncingItemId: string | null;
  editingCell: { itemId: string; studentId: string } | null;
  editValue: string;
  editingHpsItemId: string | null;
  hpsValue: string;
  editRef: RefObject<HTMLInputElement | null>;
  hpsEditRef: RefObject<HTMLInputElement | null>;
  setSelectedRecordId: (id: string) => void;
  setEditValue: (value: string) => void;
  setHpsValue: (value: string) => void;
  setEditingCell: (value: { itemId: string; studentId: string } | null) => void;
  refresh: () => Promise<void>;
  refreshEvidence: () => Promise<void>;
  loadHistory: () => Promise<void>;
  loadAnnual: () => Promise<void>;
  confirmRoster: (payload: ConfirmPeriodRoster) => Promise<boolean>;
  restoreAssessmentEvidence: (
    itemId: string,
    studentId: string,
    reason: string,
  ) => Promise<boolean>;
  excuseScore: (
    itemId: string,
    studentId: string,
    reason: string,
  ) => Promise<boolean>;
  generateQuarter: (period: GradingPeriod) => Promise<void>;
  finalizeQuarter: () => Promise<boolean>;
  reopenQuarter: (reason: string) => Promise<boolean>;
  handleCellClick: (
    itemId: string,
    studentId: string,
    score: number | null,
    options?: { maxScore?: number | null; assessmentId?: string },
  ) => void;
  handleCellSave: () => Promise<boolean>;
  handleCellKeyDown: (event: ReactKeyboardEvent) => void;
  handleHpsClick: (
    itemId: string,
    hps: number | null,
    assessmentId?: string,
  ) => void;
  handleHpsSave: () => Promise<void>;
  handleHpsKeyDown: (event: ReactKeyboardEvent) => void;
  syncItem: (itemId: string) => Promise<void>;
  exportSpreadsheet: () => Promise<void>;
}

export function useTeacherClassRecord(
  classId?: string,
): TeacherClassRecordState {
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<AcademicPolicy | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [readiness, setReadiness] = useState<PeriodReadiness | null>(null);
  const [roster, setRoster] = useState<PeriodRoster | null>(null);
  const [history, setHistory] = useState<PeriodHistory | null>(null);
  const [annualSummary, setAnnualSummary] = useState<AnnualSummary | null>(
    null,
  );
  const [recordsStatus, setRecordsStatus] =
    useState<ClassRecordLoadStatus>("idle");
  const [spreadsheetStatus, setSpreadsheetStatus] =
    useState<ClassRecordLoadStatus>("idle");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    studentId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingHpsItemId, setEditingHpsItemId] = useState<string | null>(null);
  const [hpsValue, setHpsValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const hpsEditRef = useRef<HTMLInputElement>(null);
  const recordsRequest = useRef(0);
  const sheetRequest = useRef(0);
  const loadedClass = useRef<string | undefined>(undefined);
  const loadedRecord = useRef<string | null>(null);
  const selectedRecord = useMemo(
    () => classRecords.find((record) => record.id === selectedRecordId) ?? null,
    [classRecords, selectedRecordId],
  );
  const fail = (error: unknown, fallback: string) =>
    toast.error(getApiErrorMessage(error, fallback));

  const refresh = useCallback(async () => {
    const request = ++recordsRequest.current;
    if (loadedClass.current !== classId) {
      loadedClass.current = classId;
      loadedRecord.current = null;
      ++sheetRequest.current;
      setClassRecords([]);
      setSelectedRecordId(null);
      setSpreadsheet(null);
      setPolicy(null);
      setReadiness(null);
      setRoster(null);
      setHistory(null);
      setAnnualSummary(null);
      setSpreadsheetStatus("idle");
      setRecordsStatus(classId ? "loading" : "idle");
    }
    if (!classId) return;
    try {
      const [records, cls, active] = await Promise.all([
        classRecordService.getByClass(classId),
        classService.getById(classId),
        academicStateService.getCurrent(),
      ]);
      const yearPolicy =
        cls.data.schoolYear === active.data.schoolYear
          ? active.data.policy
          : (await academicStateService.getPolicy(cls.data.schoolYear)).data;
      if (request !== recordsRequest.current) return;
      setPolicy(yearPolicy);
      setClassRecords(records.data);
      setRecordsStatus("ready");
      setSelectedRecordId((previous) =>
        records.data.some((record) => record.id === previous)
          ? previous
          : (records.data.find(
              (record) => record.gradingPeriod === active.data.quarter,
            )?.id ??
            records.data[0]?.id ??
            null),
      );
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      if (request !== recordsRequest.current) return;
      setRecordsStatus("error");
      fail(error, "Class records could not be loaded.");
    }
  }, [classId]);
  useEffect(() => {
    setEditingCell(null);
    setEditingHpsItemId(null);
    void refresh();
    const recordsCounter = recordsRequest;
    const sheetCounter = sheetRequest;
    return () => {
      ++recordsCounter.current;
      ++sheetCounter.current;
    };
  }, [refresh]);

  const refreshEvidence = useCallback(async () => {
    const request = ++sheetRequest.current;
    if (!selectedRecordId) {
      setSpreadsheet(null);
      setReadiness(null);
      setRoster(null);
      setHistory(null);
      setSpreadsheetStatus("idle");
      return;
    }
    if (loadedRecord.current !== selectedRecordId) {
      loadedRecord.current = selectedRecordId;
      setSpreadsheet(null);
      setReadiness(null);
      setRoster(null);
      setHistory(null);
      setSpreadsheetStatus("loading");
    }
    try {
      const [sheet, ready, register] = await Promise.all([
        classRecordService.getSpreadsheet(selectedRecordId),
        classRecordService.readiness(selectedRecordId),
        classRecordService.roster(selectedRecordId),
      ]);
      if (request !== sheetRequest.current) return;
      setSpreadsheet(sheet.data);
      setReadiness(ready.data);
      setRoster(register.data);
      setSpreadsheetStatus("ready");
      setHistory(null);
      setAnnualSummary(null);
    } catch (error) {
      if (request !== sheetRequest.current) return;
      setSpreadsheetStatus("error");
      fail(error, "The workbook and its readiness could not be loaded.");
    }
  }, [selectedRecordId]);
  useEffect(() => {
    setEditingCell(null);
    setEditingHpsItemId(null);
    void refreshEvidence();
    const sheetCounter = sheetRequest;
    return () => {
      ++sheetCounter.current;
    };
  }, [refreshEvidence, refreshVersion]);
  const loadHistory = useCallback(async () => {
    if (!selectedRecordId) return;
    const id = selectedRecordId;
    try {
      const result = await classRecordService.history(id);
      if (loadedRecord.current === id) setHistory(result.data);
    } catch (error) {
      fail(error, "Revision history could not be loaded.");
    }
  }, [selectedRecordId]);
  const loadAnnual = useCallback(async () => {
    if (!classId) return;
    try {
      const result = await classRecordService.annualSummary(classId);
      if (loadedClass.current === classId) setAnnualSummary(result.data);
    } catch (error) {
      fail(error, "Annual evidence could not be loaded.");
    }
  }, [classId]);
  const generateQuarter = useCallback(
    async (period: GradingPeriod) => {
      if (!classId || !policy?.periods.some((p) => p.key === period)) return;
      setGenerating(true);
      try {
        const created = await classRecordService.generate({
          classId,
          gradingPeriod: period,
        });
        await refresh();
        setSelectedRecordId(created.data.id);
        toast.success(
          "Period workbook created. Confirm its eligibility register before finalizing.",
        );
      } catch (error) {
        fail(error, "Workbook generation failed.");
      } finally {
        setGenerating(false);
      }
    },
    [classId, policy, refresh],
  );
  const finalizeQuarter = useCallback(async () => {
    if (
      !selectedRecord ||
      !readiness?.ready ||
      !spreadsheet?.academicCapabilities?.canGrade
    )
      return false;
    setFinalizing(true);
    try {
      await classRecordService.finalize(selectedRecord.id);
      await refresh();
      toast.success("Period finalized with an immutable grade revision.");
      return true;
    } catch (error) {
      fail(error, "Finalization was rejected. Refresh readiness.");
      await refreshEvidence();
      return false;
    } finally {
      setFinalizing(false);
    }
  }, [selectedRecord, readiness, spreadsheet, refresh, refreshEvidence]);
  const reopenQuarter = useCallback(
    async (reason: string) => {
      if (!selectedRecord || !reason.trim() || !spreadsheet?.canReopen)
        return false;
      setReopening(true);
      try {
        await classRecordService.reopen(selectedRecord.id, reason);
        await refresh();
        toast.success(
          "Record reopened. Dependent annual results must be recomputed after correction.",
        );
        return true;
      } catch (error) {
        fail(error, "Reopening was rejected.");
        return false;
      } finally {
        setReopening(false);
      }
    },
    [selectedRecord, spreadsheet, refresh],
  );
  const confirmRoster = useCallback(
    async (payload: ConfirmPeriodRoster) => {
      if (!selectedRecordId) return false;
      setSavingRoster(true);
      try {
        await classRecordService.confirmRoster(selectedRecordId, payload);
        await refreshEvidence();
        toast.success("Period eligibility confirmed.");
        return true;
      } catch (error) {
        fail(error, "Eligibility confirmation was rejected.");
        return false;
      } finally {
        setSavingRoster(false);
      }
    },
    [selectedRecordId, refreshEvidence],
  );
  const excuseScore = useCallback(
    async (itemId: string, studentId: string, reason: string) => {
      if (!reason.trim() || !spreadsheet?.academicCapabilities?.canGrade)
        return false;
      try {
        await classRecordService.recordScore(itemId, {
          studentId,
          status: "excused",
          score: null,
          reason,
        });
        await refreshEvidence();
        return true;
      } catch (error) {
        fail(error, "Exemption was rejected.");
        return false;
      }
    },
    [spreadsheet, refreshEvidence],
  );
  const restoreAssessmentEvidence = useCallback(
    async (itemId: string, studentId: string, reason: string) => {
      if (!reason.trim() || !spreadsheet?.academicCapabilities?.canGrade)
        return false;
      try {
        await classRecordService.restoreAssessmentEvidence(
          itemId,
          studentId,
          reason,
        );
        await refreshEvidence();
        return true;
      } catch (error) {
        fail(error, "Assessment evidence restoration was rejected.");
        return false;
      }
    },
    [spreadsheet, refreshEvidence],
  );
  const handleCellClick = useCallback(
    (
      itemId: string,
      studentId: string,
      score: number | null,
      options?: { maxScore?: number | null; assessmentId?: string },
    ) => {
      if (!spreadsheet?.academicCapabilities?.canGrade) return;
      if (options?.assessmentId) {
        toast.info("Grade the linked assessment and synchronize its result.");
        return;
      }
      if ((options?.maxScore ?? 0) <= 0) {
        toast.error("Set highest possible score first.");
        return;
      }
      if (
        roster?.participants.find((p) => p.studentId === studentId)
          ?.eligibility !== "eligible"
      ) {
        toast.error("Confirm this learner as eligible before scoring.");
        return;
      }
      setEditingHpsItemId(null);
      setEditingCell({ itemId, studentId });
      setEditValue(score == null ? "" : String(score));
      setTimeout(() => editRef.current?.focus(), 0);
    },
    [spreadsheet, roster],
  );
  const handleCellSave = useCallback(async () => {
    if (!editingCell || !editValue.trim()) return false;
    const score = Number(editValue);
    if (!Number.isFinite(score) || score < 0) {
      toast.error(
        "Enter a valid score. Blank is missing; zero must be explicit.",
      );
      return false;
    }
    try {
      await classRecordService.recordScore(editingCell.itemId, {
        studentId: editingCell.studentId,
        status: "recorded",
        score,
      });
      setEditingCell(null);
      await refreshEvidence();
      return true;
    } catch (error) {
      fail(error, "Score was rejected.");
      return false;
    }
  }, [editingCell, editValue, refreshEvidence]);
  const handleCellKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleCellSave();
      }
      if (event.key === "Escape") setEditingCell(null);
    },
    [handleCellSave],
  );
  const handleHpsClick = useCallback(
    (itemId: string, hps: number | null, assessmentId?: string) => {
      if (!spreadsheet?.academicCapabilities?.canPrepare) return;
      if (assessmentId) {
        toast.info("Edit points in the linked assessment.");
        return;
      }
      setEditingCell(null);
      setEditingHpsItemId(itemId);
      setHpsValue(hps == null ? "" : String(hps));
      setTimeout(() => hpsEditRef.current?.focus(), 0);
    },
    [spreadsheet],
  );
  const handleHpsSave = useCallback(async () => {
    if (!editingHpsItemId || !hpsValue.trim()) return;
    const maxScore = Number(hpsValue);
    if (!Number.isFinite(maxScore) || maxScore < 0) {
      toast.error("Enter a valid highest possible score.");
      return;
    }
    try {
      await classRecordService.updateItem(editingHpsItemId, { maxScore });
      setEditingHpsItemId(null);
      await refreshEvidence();
    } catch (error) {
      fail(error, "Highest possible score was rejected.");
    }
  }, [editingHpsItemId, hpsValue, refreshEvidence]);
  const handleHpsKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleHpsSave();
      }
      if (event.key === "Escape") setEditingHpsItemId(null);
    },
    [handleHpsSave],
  );
  const syncItem = useCallback(
    async (itemId: string) => {
      if (!spreadsheet?.academicCapabilities?.canGrade) return;
      setSyncingItemId(itemId);
      try {
        await classRecordService.syncScores(itemId);
        await refreshEvidence();
        toast.success("Completed assessment results synchronized.");
      } catch (error) {
        fail(error, "Synchronization was rejected.");
      } finally {
        setSyncingItemId(null);
      }
    },
    [spreadsheet, refreshEvidence],
  );
  const exportSpreadsheet = useCallback(async () => {
    if (!spreadsheet || !classId) return;
    try {
      const summary = await classRecordService.annualSummary(classId);
      await exportAcademicWorkbook(spreadsheet, summary.data);
      toast.success("Workbook and annual evidence exported.");
    } catch (error) {
      fail(error, "Export could not load complete academic evidence.");
    }
  }, [spreadsheet, classId]);
  return {
    classId,
    policy,
    classRecords,
    selectedRecord,
    spreadsheet,
    readiness,
    roster,
    history,
    annualSummary,
    recordsStatus,
    spreadsheetStatus,
    quarters: policy?.periods.map((p) => p.key) ?? [],
    periodLabel: (period) =>
      policy?.periods.find((p) => p.key === period)?.label ?? period,
    generating,
    finalizing,
    reopening,
    savingRoster,
    syncingItemId,
    editingCell,
    editValue,
    editingHpsItemId,
    hpsValue,
    editRef,
    hpsEditRef,
    setSelectedRecordId,
    setEditValue,
    setHpsValue,
    setEditingCell,
    refresh,
    refreshEvidence,
    loadHistory,
    loadAnnual,
    confirmRoster,
    excuseScore,
    restoreAssessmentEvidence,
    generateQuarter,
    finalizeQuarter,
    reopenQuarter,
    handleCellClick,
    handleCellSave,
    handleCellKeyDown,
    handleHpsClick,
    handleHpsSave,
    handleHpsKeyDown,
    syncItem,
    exportSpreadsheet,
  };
}
