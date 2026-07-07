'use client';

import { useEffect, useMemo, useState, useCallback, type CSSProperties } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { moduleService } from '@/services/module-service';
import { performanceService } from '@/services/performance-service';
import { aiService } from '@/services/ai-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TeacherEmptyState,
  TeacherHeaderMetric,
  TeacherPageShell,
  TeacherSectionCard,
} from '@/components/teacher/TeacherPageShell';
import { AiOutageNotice } from '@/components/student/AiOutageNotice';
import { useAiAvailability } from '@/hooks/use-ai-availability';
import { richTextToPlainText } from '@/lib/rich-text';
import { downloadLessonPlanPdf } from '@/utils/lesson-plan-pdf';
import { toast } from 'sonner';
import type { ClassItem } from '@/types/class';
import type { LessonPlanAnchorType, LessonPlanStructuredOutput, AiGenerationJob } from '@/types/ai';
import type { Lesson } from '@/types/lesson';
import type { ClassModule } from '@/types/module';
import type {
  ClassDiagnosticsResponse,
  ClassAtRiskResponse,
  ClassInterventionQuizComparisonResponse,
  ClassPerformanceLogsResponse,
  ClassPerformanceSummary,
  InterventionQuizComparisonRow,
  PerformanceAnalysisJob,
  PerformanceAnalysisStructuredOutput,
  PerformanceStudentRow,
} from '@/types/performance';

type PerformanceWorkspaceView = 'performance' | 'heatmap' | 'lesson-plan' | 'data';
type LessonPlanProcedureKey = keyof LessonPlanStructuredOutput['procedures'];
type LessonPlanDifferentiationKey = keyof LessonPlanStructuredOutput['differentiation'];
type LessonPlanEditorMode = 'preview' | 'edit';
type LessonPlanFocusSection = 'overview' | 'flow' | 'assessment' | 'notes';
const LESSON_PLAN_STORAGE_PREFIX = 'teacher-performance-lesson-plan-job';
const LESSON_PLAN_PROCEDURE_FIELDS: Array<{
  key: LessonPlanProcedureKey;
  label: string;
}> = [
  { key: 'review', label: 'Review of previous lesson' },
  { key: 'purpose', label: 'Establish purpose' },
  { key: 'examples', label: 'Present examples' },
  { key: 'guidedPractice', label: 'Guided practice' },
  { key: 'mastery', label: 'Mastery work' },
  { key: 'application', label: 'Application' },
  { key: 'generalization', label: 'Generalization' },
  { key: 'evaluation', label: 'Evaluation' },
  { key: 'remediationOrEnrichment', label: 'Remediation or enrichment' },
];
const LESSON_PLAN_DIFFERENTIATION_FIELDS: Array<{
  key: LessonPlanDifferentiationKey;
  label: string;
}> = [
  { key: 'support', label: 'Support' },
  { key: 'core', label: 'Core' },
  { key: 'enrichment', label: 'Enrichment' },
];
const LESSON_PLAN_FOCUS_SECTIONS: Array<{
  key: LessonPlanFocusSection;
  label: string;
}> = [
  { key: 'overview', label: 'Overview' },
  { key: 'flow', label: 'Lesson Flow' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'notes', label: 'Notes' },
];

function toPercent(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}%`;
}

function formatStudentName(student: PerformanceStudentRow): string {
  const firstName = student.firstName?.trim() ?? '';
  const lastName = student.lastName?.trim() ?? '';

  if (firstName && lastName) return `${lastName}, ${firstName}`;
  if (lastName) return lastName;
  if (firstName) return firstName;
  return student.email ?? 'Unknown student';
}

function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTriggerSource(triggerSource: string): string {
  return triggerSource
    .split('_')
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ');
}

function formatLogStudent(entry: {
  student?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  studentId: string;
}): string {
  const first = entry.student?.firstName?.trim() ?? '';
  const last = entry.student?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return entry.student?.email ?? entry.studentId;
}

function formatSignedDelta(value: number | null): string {
  if (value === null) return '--';
  if (value > 0) return `+${value.toFixed(1)} pts`;
  if (value < 0) return `${value.toFixed(1)} pts`;
  return '0.0 pts';
}

function trendBadgeClass(trend: InterventionQuizComparisonRow['trend']): string {
  if (trend === 'improved') {
    return 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/45';
  }
  if (trend === 'declined') {
    return 'bg-rose-500/18 text-rose-100 border border-rose-300/45';
  }
  if (trend === 'unchanged') {
    return 'bg-slate-500/18 text-slate-100 border border-slate-300/45';
  }
  return 'bg-amber-500/18 text-amber-100 border border-amber-300/45';
}

function trendLabel(trend: InterventionQuizComparisonRow['trend']): string {
  if (trend === 'improved') return 'Improved';
  if (trend === 'declined') return 'Declined';
  if (trend === 'unchanged') return 'Unchanged';
  return 'Awaiting Retry';
}

function formatComparisonFilterLabel(
  filter: ClassInterventionQuizComparisonResponse['filterOptions'][number],
): string {
  if (filter.id === 'all') return filter.label;
  const category = filter.classRecordCategory ?? filter.assessmentType;
  const categoryLabel = category ? formatTriggerSource(category) : '';
  return categoryLabel ? `${filter.label} - ${categoryLabel}` : filter.label;
}

function formatConceptLabel(rawConcept: string): string {
  const cleaned = richTextToPlainText(rawConcept)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Unlabeled concept';

  const tokens = cleaned.split(' ').filter(Boolean);
  while (tokens[0] && /^p$/i.test(tokens[0])) tokens.shift();
  while (tokens[tokens.length - 1] && /^p$/i.test(tokens[tokens.length - 1])) tokens.pop();

  const normalized = tokens.join(' ').trim();
  if (!normalized) return 'Unlabeled concept';

  const lowSignal =
    normalized.length < 3 ||
    /^[a-z]$/i.test(normalized) ||
    /^(unknown concept|question|item)$/i.test(normalized);
  if (lowSignal) return 'Unlabeled concept';

  return normalized
    .split(' ')
    .map((token) =>
      token.length <= 2
        ? token.toUpperCase()
        : token[0].toUpperCase() + token.slice(1),
    )
    .join(' ');
}

function formatTeacherFacingText(value: string | null | undefined, fallback: string): string {
  const cleaned = richTextToPlainText(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function classifyMasteryBand(score: number) {
  if (score >= 85) {
    return {
      label: 'High mastery',
      tone: 'bg-emerald-500/18 border-emerald-300/45 text-emerald-50',
      fill: 'linear-gradient(180deg, rgba(16,185,129,0.9), rgba(5,150,105,0.72))',
    };
  }
  if (score >= 70) {
    return {
      label: 'Watch',
      tone: 'bg-amber-500/18 border-amber-300/40 text-amber-50',
      fill: 'linear-gradient(180deg, rgba(245,158,11,0.9), rgba(217,119,6,0.72))',
    };
  }
  if (score >= 55) {
    return {
      label: 'Needs reteach',
      tone: 'bg-orange-500/18 border-orange-300/40 text-orange-50',
      fill: 'linear-gradient(180deg, rgba(249,115,22,0.9), rgba(234,88,12,0.72))',
    };
  }
  return {
    label: 'Critical',
    tone: 'bg-rose-500/18 border-rose-300/40 text-rose-50',
    fill: 'linear-gradient(180deg, rgba(244,63,94,0.95), rgba(190,24,93,0.78))',
  };
}

function buildHeatmapCellStyle(score: number): CSSProperties {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const hue = Math.round((clamped / 100) * 120);
  const alpha = 0.28 + ((100 - clamped) / 100) * 0.36;

  return {
    backgroundColor: `hsla(${hue}, 82%, 44%, ${alpha})`,
    borderColor: `hsla(${hue}, 68%, 24%, 0.48)`,
  };
}

function formatAnalysisStatus(status: string): string {
  return status[0].toUpperCase() + status.slice(1);
}

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'lesson-plan';
}

function toLineText(lines: string[]): string {
  return lines.join('\n');
}

function fromLineText(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildLessonPlanFilename(
  classItem: ClassItem | null,
  plan: LessonPlanStructuredOutput,
): string {
  const classLabel = sanitizeFilenamePart(
    classItem?.subjectCode || classItem?.subjectName || 'class',
  );
  const lessonLabel = sanitizeFilenamePart(
    plan.header.lessonTitle || plan.header.moduleTitle || 'lesson-plan',
  );
  const dateLabel = sanitizeFilenamePart(
    plan.header.date ||
      new Date().toISOString().slice(0, 10),
  );
  return `lesson-plan-${classLabel}-${lessonLabel}-${dateLabel}.pdf`;
}

function formatLessonPlanProfile(profile: LessonPlanStructuredOutput['classProfile']): string {
  return profile[0].toUpperCase() + profile.slice(1);
}

export default function TeacherPerformancePage() {
  const { user } = useAuth();
  const aiAvailability = useAiAvailability();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [modules, setModules] = useState<ClassModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [summary, setSummary] = useState<ClassPerformanceSummary | null>(null);
  const [atRisk, setAtRisk] = useState<ClassAtRiskResponse | null>(null);
  const [interventionComparisons, setInterventionComparisons] =
    useState<ClassInterventionQuizComparisonResponse | null>(null);
  const [selectedComparisonFilterId, setSelectedComparisonFilterId] = useState('all');
  const [logs, setLogs] = useState<ClassPerformanceLogsResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<ClassDiagnosticsResponse | null>(null);
  const [analysisJob, setAnalysisJob] = useState<PerformanceAnalysisJob | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PerformanceAnalysisStructuredOutput | null>(null);
  const [analysisTargetStudentId, setAnalysisTargetStudentId] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingLessonPlanSources, setLoadingLessonPlanSources] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingLessonPlan, setGeneratingLessonPlan] = useState(false);
  const [savingLessonPlan, setSavingLessonPlan] = useState(false);
  const [exportingLessonPlan, setExportingLessonPlan] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<PerformanceWorkspaceView>('performance');
  const [lessonPlanAnchorType, setLessonPlanAnchorType] =
    useState<LessonPlanAnchorType>('lesson');
  const [lessonPlanAnchorId, setLessonPlanAnchorId] = useState('');
  const [lessonPlanTeacherNote, setLessonPlanTeacherNote] = useState('');
  const [lessonPlanJob, setLessonPlanJob] = useState<AiGenerationJob | null>(null);
  const [lessonPlanDraft, setLessonPlanDraft] =
    useState<LessonPlanStructuredOutput | null>(null);
  const [lessonPlanEditorMode, setLessonPlanEditorMode] =
    useState<LessonPlanEditorMode>('preview');
  const [lessonPlanFocusSection, setLessonPlanFocusSection] =
    useState<LessonPlanFocusSection>('overview');

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const selectedLessonPlanAnchor = useMemo(() => {
    if (lessonPlanAnchorType === 'module') {
      return modules.find((item) => item.id === lessonPlanAnchorId) ?? null;
    }
    return lessons.find((item) => item.id === lessonPlanAnchorId) ?? null;
  }, [lessonPlanAnchorId, lessonPlanAnchorType, lessons, modules]);
  const teacherDisplayName = useMemo(() => {
    const firstName = user?.firstName?.trim() ?? '';
    const lastName = user?.lastName?.trim() ?? '';
    return [firstName, lastName].filter(Boolean).join(' ') || user?.email || '';
  }, [user?.email, user?.firstName, user?.lastName]);
  const lessonPlanStorageKey = useMemo(
    () =>
      selectedClassId
        ? `${LESSON_PLAN_STORAGE_PREFIX}:${selectedClassId}`
        : '',
    [selectedClassId],
  );
  const aiUnavailable = aiAvailability.status === 'degraded';
  const threshold = summary?.threshold ?? atRisk?.threshold ?? null;
  const conceptHeatmapRows = useMemo(
    () =>
      [...(diagnostics?.conceptHotspots ?? [])]
        .map((concept) => {
          const masteryScore = Number(concept.masteryScore ?? 0);
          return {
            ...concept,
            masteryScore,
            label: formatConceptLabel(concept.concept),
            band: classifyMasteryBand(masteryScore),
            heatStyle: buildHeatmapCellStyle(masteryScore),
          };
        })
        .sort((left, right) => left.masteryScore - right.masteryScore),
    [diagnostics?.conceptHotspots],
  );
  const comparisonFilterOptions = useMemo(
    () =>
      interventionComparisons?.filterOptions?.length
        ? interventionComparisons.filterOptions
        : [
            {
              id: 'all',
              label: 'All assessments',
              assessmentId: null,
              assessmentTitle: null,
              assessmentType: null,
              classRecordCategory: null,
            },
          ],
    [interventionComparisons?.filterOptions],
  );
  const filteredInterventionComparisons = useMemo(
    () =>
      (interventionComparisons?.comparisons ?? []).filter(
        (row) => (row.filterId ?? row.assessmentId) === selectedComparisonFilterId,
      ),
    [interventionComparisons?.comparisons, selectedComparisonFilterId],
  );
  const filteredComparisonCounts = useMemo(
    () => ({
      improved: filteredInterventionComparisons.filter((entry) => entry.trend === 'improved').length,
      declined: filteredInterventionComparisons.filter((entry) => entry.trend === 'declined').length,
      unchanged: filteredInterventionComparisons.filter((entry) => entry.trend === 'unchanged').length,
      awaiting: filteredInterventionComparisons.filter((entry) => entry.trend === 'awaiting_retry').length,
    }),
    [filteredInterventionComparisons],
  );
  const latestComparisonByStudent = useMemo(() => {
    const map = new Map<string, InterventionQuizComparisonRow>();
    const classAverageRows = (interventionComparisons?.comparisons ?? []).filter(
      (row) => (row.comparisonScope ?? 'class_average') === 'class_average' || row.filterId === 'all',
    );
    for (const row of classAverageRows) {
      const current = map.get(row.studentId);
      if (!current) {
        map.set(row.studentId, row);
        continue;
      }
      const currentAfter = current.afterSubmittedAt
        ? new Date(current.afterSubmittedAt).getTime()
        : 0;
      const nextAfter = row.afterSubmittedAt
        ? new Date(row.afterSubmittedAt).getTime()
        : 0;
      if (nextAfter > currentAfter) {
        map.set(row.studentId, row);
      }
    }
    return map;
  }, [interventionComparisons?.comparisons]);
  const lessonPlanMetadata = useMemo(() => {
    if (!lessonPlanDraft) return [];
    return [
      {
        label: 'School',
        value: lessonPlanDraft.header.schoolName || 'Nexora LMS',
      },
      {
        label: 'Teacher',
        value: lessonPlanDraft.header.teacherName || teacherDisplayName || '--',
      },
      {
        label: 'Learning area',
        value:
          lessonPlanDraft.header.learningArea || selectedClass?.subjectName || '--',
      },
      {
        label: 'Section / Grade',
        value:
          [lessonPlanDraft.header.sectionName, lessonPlanDraft.header.gradeLevel]
            .filter(Boolean)
            .join(' / ') ||
          selectedClass?.section?.name ||
          '--',
      },
      {
        label: 'Module',
        value: lessonPlanDraft.header.moduleTitle || '--',
      },
      {
        label: 'Lesson',
        value: lessonPlanDraft.header.lessonTitle || '--',
      },
      {
        label: 'Date / Time',
        value:
          [
            lessonPlanDraft.header.date,
            lessonPlanDraft.header.startTime,
            lessonPlanDraft.header.endTime,
          ]
            .filter(Boolean)
            .join(' ') || '--',
      },
      {
        label: 'School year',
        value:
          lessonPlanDraft.header.schoolYear ||
          selectedClass?.schoolYear ||
          '--',
      },
    ];
  }, [lessonPlanDraft, selectedClass?.schoolYear, selectedClass?.section?.name, selectedClass?.subjectName, teacherDisplayName]);

  const fetchClassList = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingClasses(true);
      const response = await classService.getByTeacher(user.id);
      const nextClasses = response.data ?? [];
      setClasses(nextClasses);
      setSelectedClassId((current) => current || nextClasses[0]?.id || '');
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  }, [user?.id]);

  const fetchPerformance = useCallback(async () => {
    if (!selectedClassId) {
      setSummary(null);
      setAtRisk(null);
      setInterventionComparisons(null);
      setLogs(null);
      setDiagnostics(null);
      return;
    }

    try {
      setLoadingData(true);
      const [summaryRes, atRiskRes, comparisonRes, logsRes, diagnosticsRes] =
        await Promise.allSettled([
        performanceService.getClassSummary(selectedClassId),
        performanceService.getAtRiskStudents(selectedClassId),
        performanceService.getInterventionQuizComparison(selectedClassId),
        performanceService.getClassLogs(selectedClassId, { limit: 25 }),
        performanceService.getClassDiagnostics(selectedClassId),
      ]);
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
      } else {
        setSummary(null);
      }
      if (atRiskRes.status === 'fulfilled') {
        setAtRisk(atRiskRes.value.data);
      } else {
        setAtRisk(null);
      }
      if (comparisonRes.status === 'fulfilled') {
        setInterventionComparisons(comparisonRes.value.data);
      } else {
        setInterventionComparisons(null);
      }
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.data);
      } else {
        setLogs(null);
      }
      if (diagnosticsRes.status === 'fulfilled') {
        setDiagnostics(diagnosticsRes.value.data);
      } else {
        setDiagnostics(null);
      }
      if (
        summaryRes.status === 'rejected' &&
        atRiskRes.status === 'rejected' &&
        comparisonRes.status === 'rejected' &&
        logsRes.status === 'rejected' &&
        diagnosticsRes.status === 'rejected'
      ) {
        toast.error('Failed to load performance summary');
      } else if (
        summaryRes.status === 'rejected' ||
        atRiskRes.status === 'rejected' ||
        comparisonRes.status === 'rejected' ||
        logsRes.status === 'rejected' ||
        diagnosticsRes.status === 'rejected'
      ) {
        toast.warning('Some performance panels are temporarily unavailable.');
      }
    } finally {
      setLoadingData(false);
    }
  }, [selectedClassId]);

  const fetchLessonPlanSources = useCallback(async () => {
    if (!selectedClassId) {
      setModules([]);
      setLessons([]);
      setLessonPlanAnchorId('');
      setLessonPlanJob(null);
      setLessonPlanDraft(null);
      return;
    }

    try {
      setLoadingLessonPlanSources(true);
      const [modulesRes, lessonsRes] = await Promise.allSettled([
        moduleService.getByClass(selectedClassId),
        lessonService.getByClass(selectedClassId, {
          includeBlocks: true,
          order: 'asc',
        }),
      ]);

      const nextModules =
        modulesRes.status === 'fulfilled' ? modulesRes.value?.data ?? [] : [];
      const nextLessons =
        lessonsRes.status === 'fulfilled' ? lessonsRes.value?.data ?? [] : [];

      setModules(nextModules);
      setLessons(nextLessons);

      setLessonPlanAnchorId((current) => {
        const moduleIds = new Set(nextModules.map((item) => item.id));
        const lessonIds = new Set(nextLessons.map((item) => item.id));
        if (
          current &&
          ((lessonPlanAnchorType === 'module' && moduleIds.has(current)) ||
            (lessonPlanAnchorType === 'lesson' && lessonIds.has(current)))
        ) {
          return current;
        }
        if (lessonPlanAnchorType === 'lesson') {
          return nextLessons[0]?.id ?? nextModules[0]?.id ?? '';
        }
        return nextModules[0]?.id ?? nextLessons[0]?.id ?? '';
      });

      if (modulesRes.status === 'rejected' && lessonsRes.status === 'rejected') {
        toast.error('Failed to load lesson plan sources.');
      }
    } finally {
      setLoadingLessonPlanSources(false);
    }
  }, [lessonPlanAnchorType, selectedClassId]);

  const restoreStoredLessonPlan = useCallback(async () => {
    if (!lessonPlanStorageKey || typeof window === 'undefined') {
      return;
    }
    const storedJobId = window.localStorage.getItem(lessonPlanStorageKey);
    if (!storedJobId) {
      setLessonPlanJob(null);
      setLessonPlanDraft(null);
      return;
    }

    try {
      const statusRes = await aiService.getTeacherJobStatus(storedJobId);
      setLessonPlanJob(statusRes.data);
      if (['completed', 'approved'].includes(statusRes.data.status)) {
        const resultRes = await aiService.getLessonPlanJobResult(storedJobId);
        setLessonPlanDraft(resultRes.data.result.structuredOutput);
        setLessonPlanEditorMode('preview');
        setLessonPlanFocusSection('overview');
      } else {
        setLessonPlanDraft(null);
      }
    } catch {
      window.localStorage.removeItem(lessonPlanStorageKey);
      setLessonPlanJob(null);
      setLessonPlanDraft(null);
    }
  }, [lessonPlanStorageKey]);

  useEffect(() => {
    fetchClassList();
  }, [fetchClassList]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  useEffect(() => {
    setSelectedComparisonFilterId('all');
  }, [selectedClassId]);

  useEffect(() => {
    fetchLessonPlanSources();
  }, [fetchLessonPlanSources]);

  useEffect(() => {
    restoreStoredLessonPlan();
  }, [restoreStoredLessonPlan]);

  useEffect(() => {
    if (lessonPlanAnchorType === 'lesson' && !lessons.some((item) => item.id === lessonPlanAnchorId)) {
      setLessonPlanAnchorId(lessons[0]?.id ?? modules[0]?.id ?? '');
    }
    if (lessonPlanAnchorType === 'module' && !modules.some((item) => item.id === lessonPlanAnchorId)) {
      setLessonPlanAnchorId(modules[0]?.id ?? lessons[0]?.id ?? '');
    }
  }, [lessonPlanAnchorId, lessonPlanAnchorType, lessons, modules]);

  const handleRecompute = async () => {
    if (!selectedClassId) return;

    try {
      setRecomputing(true);
      const result = await performanceService.recomputeClass(selectedClassId);
      toast.success(`Recomputed ${result.data.recomputed} student snapshot(s)`);
      await fetchPerformance();
    } catch {
      toast.error('Recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  useEffect(() => {
    if (!analysisJob || !['pending', 'processing'].includes(analysisJob.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const statusRes = await performanceService.getAnalysisJobStatus(analysisJob.jobId);
        setAnalysisJob(statusRes.data);
        if (['completed', 'approved'].includes(statusRes.data.status)) {
          const resultRes = await performanceService.getAnalysisJobResult(statusRes.data.jobId);
          setAnalysisResult(resultRes.data.result.structuredOutput);
          setAnalyzing(false);
          window.clearInterval(interval);
        }
        if (statusRes.data.status === 'failed') {
          setAnalyzing(false);
          toast.error(statusRes.data.errorMessage || 'Performance analysis failed.');
          window.clearInterval(interval);
        }
      } catch {
        setAnalyzing(false);
        toast.error('Failed to refresh analysis job status.');
        window.clearInterval(interval);
      }
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [analysisJob]);

  useEffect(() => {
    if (!lessonPlanJob || !['pending', 'processing'].includes(lessonPlanJob.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const statusRes = await aiService.getTeacherJobStatus(lessonPlanJob.jobId);
        setLessonPlanJob(statusRes.data);
        if (['completed', 'approved'].includes(statusRes.data.status)) {
          const resultRes = await aiService.getLessonPlanJobResult(statusRes.data.jobId);
          setLessonPlanDraft(resultRes.data.result.structuredOutput);
          setLessonPlanEditorMode('preview');
          setLessonPlanFocusSection('overview');
          setGeneratingLessonPlan(false);
          window.clearInterval(interval);
        }
        if (statusRes.data.status === 'failed') {
          setGeneratingLessonPlan(false);
          toast.error(statusRes.data.errorMessage || 'Lesson plan generation failed.');
          window.clearInterval(interval);
        }
      } catch {
        setGeneratingLessonPlan(false);
        toast.error('Failed to refresh lesson plan job status.');
        window.clearInterval(interval);
      }
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [lessonPlanJob]);

  const handleAnalyze = async (studentId?: string) => {
    if (!selectedClassId || aiUnavailable) return;
    try {
      setAnalyzing(true);
      setAnalysisResult(null);
      setAnalysisTargetStudentId(studentId ?? null);
      const jobRes = await performanceService.createAnalysisJob(selectedClassId, {
        studentId,
      });
      setAnalysisJob(jobRes.data);
      if (['completed', 'approved'].includes(jobRes.data.status)) {
        const resultRes = await performanceService.getAnalysisJobResult(jobRes.data.jobId);
        setAnalysisResult(resultRes.data.result.structuredOutput);
        setAnalyzing(false);
      }
    } catch {
      setAnalyzing(false);
      toast.error('Failed to start performance analysis.');
    }
  };

  const handleGenerateLessonPlan = async () => {
    if (!selectedClassId || !lessonPlanAnchorId || aiUnavailable) return;

    try {
      setGeneratingLessonPlan(true);
      setLessonPlanDraft(null);
      const jobRes = await aiService.createLessonPlanJob({
        classId: selectedClassId,
        anchorType: lessonPlanAnchorType,
        anchorId: lessonPlanAnchorId,
        teacherNote: lessonPlanTeacherNote.trim() || undefined,
        header: {
          instructionalFormat: 'Detailed Lesson Plan',
          schoolName: 'Nexora LMS',
          quarter: '',
          date: new Date().toISOString().slice(0, 10),
          startTime: selectedClass?.schedules?.[0]?.startTime,
          endTime: selectedClass?.schedules?.[0]?.endTime,
        },
      });
      setLessonPlanJob(jobRes.data);
      if (typeof window !== 'undefined' && lessonPlanStorageKey) {
        window.localStorage.setItem(lessonPlanStorageKey, jobRes.data.jobId);
      }
      if (['completed', 'approved'].includes(jobRes.data.status)) {
        const resultRes = await aiService.getLessonPlanJobResult(jobRes.data.jobId);
        setLessonPlanDraft(resultRes.data.result.structuredOutput);
        setLessonPlanEditorMode('preview');
        setLessonPlanFocusSection('overview');
        setGeneratingLessonPlan(false);
      }
    } catch {
      setGeneratingLessonPlan(false);
      toast.error('Failed to start lesson plan generation.');
    }
  };

  const handleSaveLessonPlanDraft = async () => {
    if (!lessonPlanJob || !lessonPlanDraft) return;
    try {
      setSavingLessonPlan(true);
      const saveRes = await aiService.updateLessonPlanDraft(lessonPlanJob.jobId, {
        structuredOutput: lessonPlanDraft,
      });
      setLessonPlanJob(saveRes.data);
      toast.success('Lesson plan draft saved.');
    } catch {
      toast.error('Failed to save lesson plan draft.');
    } finally {
      setSavingLessonPlan(false);
    }
  };

  const handleExportLessonPlan = async () => {
    if (!lessonPlanDraft) return;
    try {
      setExportingLessonPlan(true);
      await downloadLessonPlanPdf(
        lessonPlanDraft,
        buildLessonPlanFilename(selectedClass, lessonPlanDraft),
      );
    } catch {
      toast.error('Failed to export lesson plan PDF.');
    } finally {
      setExportingLessonPlan(false);
    }
  };

  const updateLessonPlanHeader = (field: keyof LessonPlanStructuredOutput['header'], value: string) => {
    setLessonPlanDraft((current) =>
      current
        ? {
            ...current,
            header: {
              ...current.header,
              [field]: value,
            },
          }
        : current,
    );
  };

  const updateLessonPlanText = (
    field:
      | 'evidenceSummary'
      | 'contentOrSubjectMatter'
      | 'remarks'
      | 'reflection'
      | 'assignmentOrHomeExtension',
    value: string,
  ) => {
    setLessonPlanDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  };

  const updateLessonPlanList = (
    field: 'objectives' | 'learningResources' | 'assessment' | 'safeguards',
    value: string,
  ) => {
    setLessonPlanDraft((current) =>
      current
        ? {
            ...current,
            [field]: fromLineText(value),
          }
        : current,
    );
  };

  const updateLessonPlanProcedure = (
    field: LessonPlanProcedureKey,
    value: string,
  ) => {
    setLessonPlanDraft((current) =>
      current
        ? {
            ...current,
            procedures: {
              ...current.procedures,
              [field]: fromLineText(value),
            },
          }
        : current,
    );
  };

  const updateLessonPlanDifferentiation = (
    field: LessonPlanDifferentiationKey,
    value: string,
  ) => {
    setLessonPlanDraft((current) =>
      current
        ? {
            ...current,
            differentiation: {
              ...current.differentiation,
              [field]: fromLineText(value),
            },
          }
        : current,
    );
  };

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-[34rem] rounded-[15px]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Performance"
      title="Performance Insights"
      description={
        threshold !== null
          ? `Class teaching signals and support priorities (threshold ${threshold}%).`
          : 'Class teaching signals and support priorities'
      }
      stats={
        <>
          <TeacherHeaderMetric
            label="Total Students"
            value={summary?.totalStudents ?? 0}
            caption={`${summary?.studentsWithData ?? 0} currently with score data`}
            accent="sky"
          />
          <TeacherHeaderMetric
            label="Doing Well"
            value={
              summary && summary.totalStudents > 0
                ? summary.totalStudents - summary.atRiskCount
                : 0
            }
            caption="Students currently above support threshold"
            accent="teal"
          />
          <TeacherHeaderMetric
            label="Needs Support Now"
            value={summary?.atRiskCount ?? 0}
            caption={`${(summary?.atRiskRate ?? 0).toFixed(1)}% of selected class`}
            accent="rose"
          />
          <TeacherHeaderMetric
            label="Class Average (Blended)"
            value={toPercent(summary?.averages.blended ?? null)}
            caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} blended average` : 'No class selected'}
            accent="amber"
          />
        </>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select min-w-[240px] text-sm"
          >
            <option value="">Select class...</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subjectName} ({item.subjectCode}) - {item.section?.name}
              </option>
            ))}
          </select>
          <Button
            variant="teacherOutline"
            onClick={handleRecompute}
            disabled={!selectedClassId || recomputing}
            className="rounded-xl px-4"
          >
            <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      {aiUnavailable ? (
        <AiOutageNotice
          mode="teacher"
          message={aiAvailability.message}
          className="teacher-figma-stagger"
        />
      ) : null}

      {!selectedClassId ? (
        <TeacherSectionCard
          title="Waiting for class selection"
          description="Choose a class to load priority learners and teaching signals."
          className="teacher-figma-stagger"
        >
          <TeacherEmptyState
            title="No class selected"
            description="Select one of your classes to open this performance workspace."
          />
        </TeacherSectionCard>
      ) : null}

      {selectedClassId && loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-[20rem] rounded-[15px]" />
          <Skeleton className="h-[20rem] rounded-[15px]" />
        </div>
      ) : null}

      {selectedClassId && !loadingData ? (
        <>
          <div
            className="teacher-interventions-view-switcher teacher-figma-stagger w-fit"
            aria-label="Performance workspace view"
          >
            <button
              type="button"
              className={`teacher-interventions-view-switcher__tab ${workspaceView === 'performance' ? 'is-active' : ''}`}
              onClick={() => setWorkspaceView('performance')}
            >
              Action
            </button>
            <button
              type="button"
              className={`teacher-interventions-view-switcher__tab ${workspaceView === 'heatmap' ? 'is-active' : ''}`}
              onClick={() => setWorkspaceView('heatmap')}
            >
              Heatmap
            </button>
            <button
              type="button"
              className={`teacher-interventions-view-switcher__tab ${workspaceView === 'lesson-plan' ? 'is-active' : ''}`}
              onClick={() => setWorkspaceView('lesson-plan')}
            >
              Lesson Plan
            </button>
            <button
              type="button"
              className={`teacher-interventions-view-switcher__tab ${workspaceView === 'data' ? 'is-active' : ''}`}
              onClick={() => setWorkspaceView('data')}
            >
              Details
            </button>
          </div>

          {workspaceView === 'performance' ? (
            <>
              <TeacherSectionCard
                title="Priority Learners"
                description="Students currently needing support based on blended performance."
                className="teacher-figma-stagger"
              >
                {(atRisk?.students.length ?? 0) === 0 ? (
                  <TeacherEmptyState
                    title="No priority learners found"
                    description="This class is currently stable based on recent computed scores."
                  />
                ) : (
                  <div className="teacher-table-shell">
                    <Table>
                      <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead>Student</TableHead>
                          <TableHead>Assessment Avg</TableHead>
                          <TableHead>Class Record Avg</TableHead>
                          <TableHead>Before Assessments</TableHead>
                          <TableHead>After AI Quizzes</TableHead>
                          <TableHead>Delta</TableHead>
                          <TableHead>Overall Avg</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">AI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&_tr:last-child]:border-0">
                        {(atRisk?.students ?? []).map((student) => {
                          const studentComparison = latestComparisonByStudent.get(
                            student.studentId,
                          );
                          return (
                            <TableRow key={student.studentId} className="teacher-table-row border-white/10">
                              <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                                {formatStudentName(student)}
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {toPercent(student.assessmentAverage)}
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {toPercent(student.classRecordAverage)}
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {toPercent(
                                  studentComparison?.beforeScorePercent ?? null,
                                )}
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {toPercent(
                                  studentComparison?.afterScorePercent ?? null,
                                )}
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {formatSignedDelta(
                                  studentComparison?.deltaScorePercent ?? null,
                                )}
                              </TableCell>
                              <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                                {toPercent(student.blendedScore)}
                              </TableCell>
                              <TableCell className="space-y-1">
                                <Badge className="teacher-badge-danger border-0">Needs Support</Badge>
                                {studentComparison ? (
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${trendBadgeClass(studentComparison.trend)}`}
                                  >
                                    {trendLabel(studentComparison.trend)}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="teacherOutline"
                                  className="rounded-lg"
                                  disabled={aiUnavailable || analyzing}
                                  onClick={() => handleAnalyze(student.studentId)}
                                >
                                  Analyze
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TeacherSectionCard>

              <TeacherSectionCard
                title="Intervention Progress Comparison"
                description="Compare each learner's assessment average before intervention against completed AI remedial quiz averages."
                className="teacher-figma-stagger"
              >
                {(interventionComparisons?.comparisons.length ?? 0) === 0 ? (
                  <TeacherEmptyState
                    title="No intervention quiz data yet"
                    description="Before averages appear after class assessments, and after averages appear once students submit AI remedial quizzes."
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {comparisonFilterOptions.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setSelectedComparisonFilterId(filter.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                            selectedComparisonFilterId === filter.id
                              ? 'border-cyan-200 bg-cyan-300/20 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                              : 'border-white/15 bg-white/5 text-[var(--teacher-text-muted)] hover:border-cyan-200/50 hover:text-cyan-50'
                          }`}
                        >
                          {formatComparisonFilterLabel(filter)}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary">
                        Improved: {filteredComparisonCounts.improved}
                      </Badge>
                      <Badge variant="secondary">
                        Declined: {filteredComparisonCounts.declined}
                      </Badge>
                      <Badge variant="secondary">
                        Unchanged: {filteredComparisonCounts.unchanged}
                      </Badge>
                      <Badge variant="secondary">
                        Awaiting AI Quiz: {filteredComparisonCounts.awaiting}
                      </Badge>
                    </div>
                    <div className="teacher-table-shell">
                      <Table>
                        <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead>Student</TableHead>
                            <TableHead>Focus</TableHead>
                            <TableHead>Before Avg</TableHead>
                            <TableHead>After AI Avg</TableHead>
                            <TableHead>Delta</TableHead>
                            <TableHead>Trend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="[&_tr:last-child]:border-0">
                          {filteredInterventionComparisons.length ? (
                            filteredInterventionComparisons.map((entry) => (
                              <TableRow
                                key={`${entry.caseId}-${entry.assignmentId}-${entry.assessmentId}`}
                                className="teacher-table-row border-white/10"
                              >
                                <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                                  {entry.student
                                    ? `${entry.student.lastName ?? ''}, ${entry.student.firstName ?? ''}`
                                        .replace(/^,\s*/, '')
                                        .trim() || entry.student.email || entry.studentId
                                    : entry.studentId}
                                </TableCell>
                                <TableCell className="text-[var(--teacher-text-strong)]">
                                  {entry.assessmentTitle}
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teacher-text-muted)]">
                                    {entry.comparisonScope === 'class_average'
                                      ? 'Class average'
                                      : 'Assessment filter'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-[var(--teacher-text-strong)]">
                                  {toPercent(entry.beforeScorePercent)}
                                  <div className="text-[10px] text-[var(--teacher-text-muted)]">
                                    {entry.beforeSampleSize} assessment
                                    {entry.beforeSampleSize === 1 ? '' : 's'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-[var(--teacher-text-strong)]">
                                  {toPercent(entry.afterScorePercent)}
                                  <div className="text-[10px] text-[var(--teacher-text-muted)]">
                                    {entry.afterSampleSize} AI quiz
                                    {entry.afterSampleSize === 1 ? '' : 'zes'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-[var(--teacher-text-strong)]">
                                  {formatSignedDelta(entry.deltaScorePercent)}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${trendBadgeClass(entry.trend)}`}
                                  >
                                    {trendLabel(entry.trend)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow className="border-white/10 hover:bg-transparent">
                              <TableCell
                                colSpan={6}
                                className="py-8 text-center text-sm text-[var(--teacher-text-muted)]"
                              >
                                No comparison rows for this filter yet. Try All assessments or another quiz/performance task.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TeacherSectionCard>

              <TeacherSectionCard
                title="AI Teaching Assistant"
                description="Simple teaching guidance based on learner mistakes and recent lesson evidence."
                className="teacher-figma-stagger"
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant="teacher"
                    className="rounded-lg"
                    disabled={!selectedClassId || aiUnavailable || analyzing}
                    onClick={() => handleAnalyze()}
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze Whole Class'}
                  </Button>
                  {analysisTargetStudentId ? (
                    <Badge variant="secondary">Student view</Badge>
                  ) : (
                    <Badge variant="secondary">Class view</Badge>
                  )}
                  {analysisJob ? (
                    <Badge variant="outline">
                      {formatAnalysisStatus(analysisJob.status)} ({analysisJob.progressPercent}%)
                    </Badge>
                  ) : null}
                </div>

                {!analysisResult ? (
                  <TeacherEmptyState
                    title="No AI teaching insight yet"
                    description="Run analysis to get focus concepts and teacher-ready support actions."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[16px] border border-[var(--teacher-border)] bg-white px-4 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-text-muted)]">
                        Recommended next step
                      </p>
                      <p className="mt-2 font-semibold text-[var(--teacher-text-strong)]">
                        {analysisResult.recommendedIntervention.status === 'insufficient_evidence'
                          ? 'Not enough recent evidence yet'
                          : 'Action-ready teaching insight'}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--teacher-text-muted)]">
                        {formatTeacherFacingText(
                          analysisResult.teacherActions[0],
                          'No teacher action provided.',
                        )}
                      </p>
                    </div>

                    <div className="rounded-[16px] border border-[var(--teacher-border)] bg-white px-4 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-text-muted)]">
                        Concepts to review
                      </p>
                      <div className="mt-3 space-y-2">
                      {analysisResult.learningGaps.slice(0, 6).map((gap) => (
                        <div
                          key={gap.concept}
                          className="flex items-center justify-between gap-4 rounded-[12px] border border-slate-200 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-[var(--teacher-text-strong)]">
                            {formatConceptLabel(gap.concept)}
                          </span>
                          <strong className="text-[var(--teacher-text-muted)]">
                            {gap.masteryScore}% student confidence - {gap.wrongCount} incorrect responses
                          </strong>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                )}
              </TeacherSectionCard>

            </>
          ) : workspaceView === 'heatmap' ? (
            <>
              <TeacherSectionCard
                title="Concept Mastery Heatmap"
                description="Read the colors first, then use the table to decide what to reteach."
                className="teacher-figma-stagger"
              >
                {conceptHeatmapRows.length === 0 ? (
                  <TeacherEmptyState
                    title="No concept focus areas yet"
                    description="Run assessments and recompute this class to surface concept-level mastery signals."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                      <div className="rounded-[16px] border border-[var(--teacher-border)] bg-white px-4 py-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-text-muted)]">
                          How to read this
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {[
                            { label: 'High mastery', score: 92, note: 'Doing well. Keep light review only.' },
                            { label: 'Watch', score: 76, note: 'Monitor and add short reinforcement.' },
                            { label: 'Needs reteach', score: 61, note: 'Plan reteaching before the next graded task.' },
                            { label: 'Critical', score: 32, note: 'Address this first with guided support.' },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex items-start gap-3 rounded-[12px] border border-slate-200 px-3 py-3"
                            >
                              <span
                                className="mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border"
                                style={buildHeatmapCellStyle(item.score)}
                              />
                              <div className="space-y-1">
                                <p className="font-semibold text-[var(--teacher-text-strong)]">{item.label}</p>
                                <p className="text-xs leading-5 text-[var(--teacher-text-muted)]">{item.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[16px] border border-[var(--teacher-border)] bg-[#f8fafc] px-4 py-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-text-muted)]">
                          Class snapshot
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-3">
                            <p className="text-xs text-[var(--teacher-text-muted)]">Tracked concepts</p>
                            <p className="mt-1 text-2xl font-semibold text-[var(--teacher-text-strong)]">
                              {conceptHeatmapRows.length}
                            </p>
                          </div>
                          <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-3">
                            <p className="text-xs text-[var(--teacher-text-muted)]">Support threshold</p>
                            <p className="mt-1 text-2xl font-semibold text-[var(--teacher-text-strong)]">
                              {threshold !== null ? `${threshold}%` : '--'}
                            </p>
                          </div>
                          <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-3">
                            <p className="text-xs text-[var(--teacher-text-muted)]">Lowest mastery</p>
                            <p className="mt-1 text-lg font-semibold text-[var(--teacher-text-strong)]">
                              {conceptHeatmapRows[0]?.masteryScore.toFixed(1) ?? '--'}%
                            </p>
                          </div>
                          <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-3">
                            <p className="text-xs text-[var(--teacher-text-muted)]">Highest mastery</p>
                            <p className="mt-1 text-lg font-semibold text-[var(--teacher-text-strong)]">
                              {conceptHeatmapRows[conceptHeatmapRows.length - 1]?.masteryScore.toFixed(1) ?? '--'}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-[var(--teacher-border)] bg-white px-4 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-text-muted)]">
                        Heat strip
                      </p>
                      <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">
                        Ordered from lowest mastery to highest mastery.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {conceptHeatmapRows.map((concept) => (
                          <div
                            key={`${concept.concept}-tile`}
                            className="rounded-[16px] border p-4 shadow-sm"
                            style={concept.heatStyle}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {concept.label}
                                </p>
                                <p className="mt-1 text-xs text-slate-800/80">
                                  {concept.masteryScore.toFixed(1)}% mastery
                                </p>
                              </div>
                              <Badge className={`border bg-white/70 text-slate-900 ${concept.band.tone}`}>
                                {concept.band.label}
                              </Badge>
                            </div>
                            <div className="mt-4 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-800/80">
                                  Misses
                                </p>
                                <p className="text-lg font-semibold text-slate-950">{concept.wrongCount}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-800/80">
                                  Evidence
                                </p>
                                <p className="text-lg font-semibold text-slate-950">{concept.evidenceCount}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-[var(--teacher-border)] bg-white shadow-sm">
                    <div className="teacher-table-shell">
                      <Table>
                        <TableHeader className="teacher-table-head [&_tr]:border-slate-200">
                          <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="w-[96px]">Heat</TableHead>
                            <TableHead>Concept</TableHead>
                            <TableHead>Mastery</TableHead>
                            <TableHead>Signal</TableHead>
                            <TableHead>Misses</TableHead>
                            <TableHead>Evidence</TableHead>
                            <TableHead>Teacher Read</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="[&_tr:last-child]:border-0">
                          {conceptHeatmapRows.map((concept) => (
                            <TableRow key={`${concept.concept}-row`} className="teacher-table-row border-slate-200">
                              <TableCell>
                                <div
                                  className="flex h-14 items-center justify-center rounded-[12px] border text-sm font-semibold text-slate-950"
                                  style={concept.heatStyle}
                                >
                                  {concept.masteryScore.toFixed(0)}%
                                </div>
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                <div className="space-y-1">
                                  <p className="font-semibold">{concept.label}</p>
                                  <p className="text-xs text-[var(--teacher-text-muted)]">
                                    Focus area for reteaching review
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {concept.masteryScore.toFixed(1)}%
                              </TableCell>
                              <TableCell>
                                <Badge className={`${concept.band.tone} border`}>
                                  {concept.band.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {concept.wrongCount}
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-strong)]">
                                {concept.evidenceCount}
                              </TableCell>
                              <TableCell className="text-[var(--teacher-text-muted)]">
                                {concept.masteryScore < 55
                                  ? 'Immediate reteach and guided practice'
                                  : concept.masteryScore < 70
                                    ? 'Plan reteach before the next graded task'
                                    : concept.masteryScore < 85
                                      ? 'Watch for drift and reinforce with checkpoints'
                                      : 'Maintain with spiral review'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    </div>
                  </div>
                )}
              </TeacherSectionCard>
            </>
          ) : workspaceView === 'lesson-plan' ? (
            <>
              <TeacherSectionCard
                title="Generate Lesson Plan"
                description="Choose a lesson or module, then let AI build a DepEd-style single-day plan around this class."
                className="teacher-figma-stagger"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="teacher-interventions-view-switcher w-fit"
                        aria-label="Lesson plan anchor type"
                      >
                        <button
                          type="button"
                          className={`teacher-interventions-view-switcher__tab ${lessonPlanAnchorType === 'lesson' ? 'is-active' : ''}`}
                          onClick={() => setLessonPlanAnchorType('lesson')}
                        >
                          Lesson
                        </button>
                        <button
                          type="button"
                          className={`teacher-interventions-view-switcher__tab ${lessonPlanAnchorType === 'module' ? 'is-active' : ''}`}
                          onClick={() => setLessonPlanAnchorType('module')}
                        >
                          Module
                        </button>
                      </div>
                      <select
                        value={lessonPlanAnchorId}
                        onChange={(event) => setLessonPlanAnchorId(event.target.value)}
                        disabled={loadingLessonPlanSources}
                        className="teacher-select min-w-[260px] flex-1 text-sm"
                      >
                        <option value="">
                          {loadingLessonPlanSources ? 'Loading options...' : 'Select source...'}
                        </option>
                        {(lessonPlanAnchorType === 'lesson' ? lessons : modules).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="teacher"
                        className="rounded-lg"
                        disabled={
                          !selectedClassId ||
                          !lessonPlanAnchorId ||
                          aiUnavailable ||
                          loadingLessonPlanSources ||
                          generatingLessonPlan
                        }
                        onClick={handleGenerateLessonPlan}
                      >
                        {generatingLessonPlan ? 'Generating...' : 'Generate Lesson Plan'}
                      </Button>
                    </div>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-[var(--teacher-text-strong)]">
                        Teacher note
                      </span>
                      <Textarea
                        value={lessonPlanTeacherNote}
                        onChange={(event) => setLessonPlanTeacherNote(event.target.value)}
                        placeholder="Optional pacing note, class constraint, or concept to emphasize."
                        className="min-h-[90px] resize-y"
                      />
                    </label>
                  </div>

                  <div className="teacher-soft-panel rounded-[12px] border border-white/15 px-4 py-4 text-sm">
                    <p className="font-semibold text-[var(--teacher-text-strong)]">
                      Plan status
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="teacher-figma-kv">
                        <span>Selected anchor</span>
                        <strong>{selectedLessonPlanAnchor?.title ?? '--'}</strong>
                      </div>
                      <div className="teacher-figma-kv">
                        <span>Last job</span>
                        <strong>
                          {lessonPlanJob
                            ? `${formatAnalysisStatus(lessonPlanJob.status)} (${lessonPlanJob.progressPercent}%)`
                            : 'Not started'}
                        </strong>
                      </div>
                      <div className="teacher-figma-kv">
                        <span>Class profile</span>
                        <strong>
                          {lessonPlanDraft
                            ? formatLessonPlanProfile(lessonPlanDraft.classProfile)
                            : '--'}
                        </strong>
                      </div>
                    </div>
                    <p className="mt-4 text-[var(--teacher-text-muted)]">
                      The draft opens in a reading view first, then you can switch into section-by-section editing only where needed.
                    </p>
                  </div>
                </div>
              </TeacherSectionCard>

              <TeacherSectionCard
                title="Lesson Plan Draft"
                description="Review the generated lesson plan as a document, then switch into editing only for the section you want to adjust."
                className="teacher-figma-stagger"
              >
                {!lessonPlanDraft ? (
                  <TeacherEmptyState
                    title="No lesson plan draft yet"
                    description="Generate a lesson plan to open the reading view, section editor, and PDF export."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="teacher-interventions-view-switcher w-fit">
                          <button
                            type="button"
                            className={`teacher-interventions-view-switcher__tab ${lessonPlanEditorMode === 'preview' ? 'is-active' : ''}`}
                            onClick={() => setLessonPlanEditorMode('preview')}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            className={`teacher-interventions-view-switcher__tab ${lessonPlanEditorMode === 'edit' ? 'is-active' : ''}`}
                            onClick={() => setLessonPlanEditorMode('edit')}
                          >
                            Edit
                          </button>
                        </div>
                        <div className="teacher-interventions-view-switcher w-fit">
                          {LESSON_PLAN_FOCUS_SECTIONS.map((section) => (
                            <button
                              key={section.key}
                              type="button"
                              className={`teacher-interventions-view-switcher__tab ${lessonPlanFocusSection === section.key ? 'is-active' : ''}`}
                              onClick={() => setLessonPlanFocusSection(section.key)}
                            >
                              {section.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="teacherOutline"
                          className="rounded-lg"
                          disabled={savingLessonPlan}
                          onClick={handleSaveLessonPlanDraft}
                        >
                          {savingLessonPlan ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button
                          variant="teacherOutline"
                          className="rounded-lg"
                          disabled={exportingLessonPlan}
                          onClick={handleExportLessonPlan}
                        >
                          {exportingLessonPlan ? 'Exporting...' : 'Export PDF'}
                        </Button>
                      </div>
                    </div>

                    {lessonPlanEditorMode === 'preview' ? (
                      <article className="rounded-[14px] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="border-b border-slate-200 pb-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-lg font-semibold text-rose-600">
                              N
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[1.35rem] font-semibold leading-tight text-slate-900">
                                Nexora Lesson Plan
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {lessonPlanDraft.header.instructionalFormat || 'Detailed Lesson Plan'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
                            {lessonPlanMetadata.map((item) => (
                              <div key={item.label} className="space-y-1">
                                <p className="text-[0.72rem] uppercase tracking-[0.16em] text-slate-400">
                                  {item.label}
                                </p>
                                <p className="font-medium text-slate-800">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 space-y-5">
                          {lessonPlanFocusSection === 'overview' ? (
                            <>
                              <section className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{formatLessonPlanProfile(lessonPlanDraft.classProfile)} profile</Badge>
                                  <Badge variant="secondary">
                                    {selectedLessonPlanAnchor?.title ?? lessonPlanDraft.header.lessonTitle ?? 'Selected anchor'}
                                  </Badge>
                                </div>
                                <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p className="text-[0.72rem] uppercase tracking-[0.16em] text-slate-500">
                                    Evidence summary
                                  </p>
                                  <p className="mt-2 leading-7 text-slate-700">
                                    {lessonPlanDraft.evidenceSummary}
                                  </p>
                                </div>
                              </section>

                              <section className="grid gap-5 lg:grid-cols-2">
                                <div className="space-y-3">
                                  <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                    Objectives
                                  </p>
                                  <ul className="space-y-2 pl-4 text-slate-700">
                                    {lessonPlanDraft.objectives.map((item, index) => (
                                      <li key={`${item}-${index}`} className="list-disc leading-7">
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-3">
                                  <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                    Learning resources
                                  </p>
                                  <ul className="space-y-2 pl-4 text-slate-700">
                                    {lessonPlanDraft.learningResources.map((item, index) => (
                                      <li key={`${item}-${index}`} className="list-disc leading-7">
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </section>

                              <section className="space-y-3 border-t border-slate-200 pt-4">
                                <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                  Content / Subject Matter
                                </p>
                                <p className="leading-7 text-slate-700">
                                  {lessonPlanDraft.contentOrSubjectMatter}
                                </p>
                              </section>
                            </>
                          ) : null}

                          {lessonPlanFocusSection === 'flow' ? (
                            <section className="space-y-4">
                              {LESSON_PLAN_PROCEDURE_FIELDS.map((field, index) => (
                                <div key={field.key} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                        {field.label}
                                      </p>
                                      <ul className="mt-2 space-y-2 pl-4 text-slate-700">
                                        {lessonPlanDraft.procedures[field.key].map((item, itemIndex) => (
                                          <li key={`${field.key}-${itemIndex}`} className="list-disc leading-7">
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </section>
                          ) : null}

                          {lessonPlanFocusSection === 'assessment' ? (
                            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                              <div className="space-y-3">
                                <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                  Assessment
                                </p>
                                <ul className="space-y-2 pl-4 text-slate-700">
                                  {lessonPlanDraft.assessment.map((item, index) => (
                                    <li key={`${item}-${index}`} className="list-disc leading-7">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-4">
                                <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                  Differentiation
                                </p>
                                {LESSON_PLAN_DIFFERENTIATION_FIELDS.map((field) => (
                                  <div key={field.key} className="rounded-[12px] border border-slate-200 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                      {field.label}
                                    </p>
                                    <ul className="mt-2 space-y-2 pl-4 text-slate-700">
                                      {lessonPlanDraft.differentiation[field.key].map((item, index) => (
                                        <li key={`${field.key}-${index}`} className="list-disc leading-7">
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </section>
                          ) : null}

                          {lessonPlanFocusSection === 'notes' ? (
                            <section className="space-y-5">
                              <div className="grid gap-5 lg:grid-cols-2">
                                <div className="space-y-3">
                                  <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                    Remarks
                                  </p>
                                  <p className="leading-7 text-slate-700">
                                    {lessonPlanDraft.remarks || 'None'}
                                  </p>
                                </div>
                                <div className="space-y-3">
                                  <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                    Reflection
                                  </p>
                                  <p className="leading-7 text-slate-700">
                                    {lessonPlanDraft.reflection}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3 border-t border-slate-200 pt-4">
                                <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                  Assignment / Home Extension
                                </p>
                                <p className="leading-7 text-slate-700">
                                  {lessonPlanDraft.assignmentOrHomeExtension}
                                </p>
                              </div>
                              <div className="space-y-3 border-t border-slate-200 pt-4">
                                <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-rose-700">
                                  Safeguards
                                </p>
                                <ul className="space-y-2 pl-4 text-slate-700">
                                  {lessonPlanDraft.safeguards.map((item, index) => (
                                    <li key={`${item}-${index}`} className="list-disc leading-7">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </section>
                          ) : null}
                        </div>
                      </article>
                    ) : (
                      <div className="space-y-4">
                        {lessonPlanFocusSection === 'overview' ? (
                          <>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">School</span>
                                <Input
                                  value={lessonPlanDraft.header.schoolName ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('schoolName', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Teacher</span>
                                <Input
                                  value={lessonPlanDraft.header.teacherName ?? teacherDisplayName}
                                  onChange={(event) => updateLessonPlanHeader('teacherName', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Learning area</span>
                                <Input
                                  value={lessonPlanDraft.header.learningArea ?? selectedClass?.subjectName ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('learningArea', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Quarter</span>
                                <Input
                                  value={lessonPlanDraft.header.quarter ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('quarter', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Date</span>
                                <Input
                                  value={lessonPlanDraft.header.date ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('date', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">School year</span>
                                <Input
                                  value={lessonPlanDraft.header.schoolYear ?? selectedClass?.schoolYear ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('schoolYear', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Grade level</span>
                                <Input
                                  value={
                                    lessonPlanDraft.header.gradeLevel ??
                                    selectedClass?.section?.gradeLevel ??
                                    selectedClass?.subjectGradeLevel ??
                                    ''
                                  }
                                  onChange={(event) => updateLessonPlanHeader('gradeLevel', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Section</span>
                                <Input
                                  value={lessonPlanDraft.header.sectionName ?? selectedClass?.section?.name ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('sectionName', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Module</span>
                                <Input
                                  value={lessonPlanDraft.header.moduleTitle ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('moduleTitle', event.target.value)}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Lesson title</span>
                                <Input
                                  value={lessonPlanDraft.header.lessonTitle ?? ''}
                                  onChange={(event) => updateLessonPlanHeader('lessonTitle', event.target.value)}
                                />
                              </label>
                            </div>
                            <label className="space-y-2 text-sm">
                              <span className="font-medium text-[var(--teacher-text-strong)]">Evidence summary</span>
                              <Textarea
                                value={lessonPlanDraft.evidenceSummary}
                                onChange={(event) => updateLessonPlanText('evidenceSummary', event.target.value)}
                                className="min-h-[110px] resize-y"
                              />
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Objectives</span>
                                <Textarea
                                  value={toLineText(lessonPlanDraft.objectives)}
                                  onChange={(event) => updateLessonPlanList('objectives', event.target.value)}
                                  className="min-h-[130px] resize-y"
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Learning resources</span>
                                <Textarea
                                  value={toLineText(lessonPlanDraft.learningResources)}
                                  onChange={(event) =>
                                    updateLessonPlanList('learningResources', event.target.value)
                                  }
                                  className="min-h-[130px] resize-y"
                                />
                              </label>
                            </div>
                            <label className="space-y-2 text-sm">
                              <span className="font-medium text-[var(--teacher-text-strong)]">
                                Content / Subject Matter
                              </span>
                              <Textarea
                                value={lessonPlanDraft.contentOrSubjectMatter}
                                onChange={(event) =>
                                  updateLessonPlanText('contentOrSubjectMatter', event.target.value)
                                }
                                className="min-h-[100px] resize-y"
                              />
                            </label>
                          </>
                        ) : null}

                        {lessonPlanFocusSection === 'flow' ? (
                          <div className="grid gap-3 lg:grid-cols-2">
                            {LESSON_PLAN_PROCEDURE_FIELDS.map((field) => (
                              <label key={field.key} className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">
                                  {field.label}
                                </span>
                                <Textarea
                                  value={toLineText(lessonPlanDraft.procedures[field.key])}
                                  onChange={(event) =>
                                    updateLessonPlanProcedure(field.key, event.target.value)
                                  }
                                  className="min-h-[112px] resize-y"
                                />
                              </label>
                            ))}
                          </div>
                        ) : null}

                        {lessonPlanFocusSection === 'assessment' ? (
                          <>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Assessment</span>
                                <Textarea
                                  value={toLineText(lessonPlanDraft.assessment)}
                                  onChange={(event) => updateLessonPlanList('assessment', event.target.value)}
                                  className="min-h-[120px] resize-y"
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Safeguards</span>
                                <Textarea
                                  value={toLineText(lessonPlanDraft.safeguards)}
                                  onChange={(event) => updateLessonPlanList('safeguards', event.target.value)}
                                  className="min-h-[120px] resize-y"
                                />
                              </label>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-3">
                              {LESSON_PLAN_DIFFERENTIATION_FIELDS.map((field) => (
                                <label key={field.key} className="space-y-2 text-sm">
                                  <span className="font-medium text-[var(--teacher-text-strong)]">
                                    {field.label}
                                  </span>
                                  <Textarea
                                    value={toLineText(lessonPlanDraft.differentiation[field.key])}
                                    onChange={(event) =>
                                      updateLessonPlanDifferentiation(field.key, event.target.value)
                                    }
                                    className="min-h-[120px] resize-y"
                                  />
                                </label>
                              ))}
                            </div>
                          </>
                        ) : null}

                        {lessonPlanFocusSection === 'notes' ? (
                          <>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Remarks</span>
                                <Textarea
                                  value={lessonPlanDraft.remarks}
                                  onChange={(event) => updateLessonPlanText('remarks', event.target.value)}
                                  className="min-h-[100px] resize-y"
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium text-[var(--teacher-text-strong)]">Reflection</span>
                                <Textarea
                                  value={lessonPlanDraft.reflection}
                                  onChange={(event) => updateLessonPlanText('reflection', event.target.value)}
                                  className="min-h-[100px] resize-y"
                                />
                              </label>
                            </div>
                            <label className="space-y-2 text-sm">
                              <span className="font-medium text-[var(--teacher-text-strong)]">
                                Assignment / Home Extension
                              </span>
                              <Textarea
                                value={lessonPlanDraft.assignmentOrHomeExtension}
                                onChange={(event) =>
                                  updateLessonPlanText('assignmentOrHomeExtension', event.target.value)
                                }
                                className="min-h-[100px] resize-y"
                              />
                            </label>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </TeacherSectionCard>
            </>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-3 teacher-figma-stagger">
                <TeacherSectionCard title="Class Pulse">
                  <div className="space-y-3 text-sm">
                    <div className="teacher-figma-kv">
                      <span>Support Threshold</span>
                      <strong>{threshold !== null ? `${threshold}%` : '--'}</strong>
                    </div>
                    <div className="teacher-figma-kv">
                      <span>Students With Data</span>
                      <strong>{summary?.studentsWithData ?? 0}</strong>
                    </div>
                    <div className="teacher-figma-kv">
                      <span>Assessment Average</span>
                      <strong>{toPercent(summary?.averages.assessment ?? null)}</strong>
                    </div>
                    <div className="teacher-figma-kv">
                      <span>Class Record Average</span>
                      <strong>{toPercent(summary?.averages.classRecord ?? null)}</strong>
                    </div>
                  </div>
                </TeacherSectionCard>

                <TeacherSectionCard title="Support Readiness">
                  {(summary?.atRiskCount ?? 0) > 0 ? (
                    <div className="teacher-soft-panel rounded-[12px] border border-[#fecaca] px-3 py-3 text-sm text-[var(--teacher-text-strong)]">
                      <p className="font-semibold text-[#b91c1c]">
                        Priority support list ready
                      </p>
                      <p className="mt-1 text-[var(--teacher-text-muted)]">
                        This class has learners who need immediate support planning.
                      </p>
                    </div>
                  ) : (
                    <TeacherEmptyState
                      title="No immediate support cases"
                      description="No learners currently need support at this threshold."
                    />
                  )}
                </TeacherSectionCard>

                <TeacherSectionCard
                  title="Teaching Signals"
                  description="Lowest-scoring assessments and the current reteaching priorities for this class."
                >
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-[var(--teacher-text-strong)]">Lowest-Scoring Assessments</p>
                      {(diagnostics?.lowestAssessments.length ?? 0) === 0 ? (
                        <p className="text-[var(--teacher-text-muted)]">No assessment signals yet.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {diagnostics?.lowestAssessments.slice(0, 3).map((assessment) => (
                            <div key={assessment.assessmentId} className="teacher-figma-kv">
                              <span>{assessment.title}</span>
                              <strong>
                                {assessment.averageScore !== null
                                  ? `${assessment.averageScore.toFixed(1)}%`
                                  : '--'}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-[16px] border border-white/10 bg-white/6 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[var(--teacher-text-strong)]">Concept Trends Snapshot</p>
                          <p className="mt-1 text-xs text-[var(--teacher-text-muted)]">
                            Open the Heatmap tab for the full mastery table and color map.
                          </p>
                        </div>
                        <Badge className="border border-white/12 bg-white/8 text-[var(--teacher-text-strong)]">
                          {conceptHeatmapRows.length} concept{conceptHeatmapRows.length === 1 ? '' : 's'}
                        </Badge>
                      </div>
                      {conceptHeatmapRows.length === 0 ? (
                        <p className="mt-3 text-[var(--teacher-text-muted)]">No concept focus areas yet.</p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {conceptHeatmapRows.slice(0, 4).map((concept) => (
                            <Badge key={concept.concept} className={`${concept.band.tone} border`}>
                              {concept.label}: {concept.masteryScore.toFixed(1)}%
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TeacherSectionCard>
              </div>

              <TeacherSectionCard
                title="Recent Changes"
                description="Latest student status changes from performance recomputations."
                className="teacher-figma-stagger"
              >
                {(logs?.logs.length ?? 0) === 0 ? (
                  <TeacherEmptyState
                    title="No recent status changes"
                    description="Status transitions will appear once changes are detected."
                  />
                ) : (
                  <div className="teacher-table-shell">
                    <Table>
                      <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead>When</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Transition</TableHead>
                          <TableHead>Blended</TableHead>
                          <TableHead>Trigger</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&_tr:last-child]:border-0">
                        {(logs?.logs ?? []).map((entry) => (
                          <TableRow key={entry.id} className="teacher-table-row border-white/10">
                            <TableCell className="text-[var(--teacher-text-strong)]">
                              {formatDateTime(entry.createdAt)}
                            </TableCell>
                            <TableCell className="text-[var(--teacher-text-strong)]">
                              {formatLogStudent(entry)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={entry.previousIsAtRisk ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}>
                                  {entry.previousIsAtRisk ? 'Needs Support' : 'Stable'}
                                </Badge>
                                <span className="text-xs uppercase tracking-[0.12em] text-[var(--teacher-text-muted)]">to</span>
                                <Badge className={entry.currentIsAtRisk ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}>
                                  {entry.currentIsAtRisk ? 'Needs Support' : 'Stable'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-[var(--teacher-text-strong)]">{toPercent(entry.blendedScore)}</TableCell>
                            <TableCell className="text-[var(--teacher-text-strong)]">{formatTriggerSource(entry.triggerSource)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TeacherSectionCard>
            </>
          )}
        </>
      ) : null}
    </TeacherPageShell>
  );
}
