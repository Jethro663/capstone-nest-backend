'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  BookText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Grid2X2,
  GripVertical,
  LayoutPanelTop,
  Megaphone,
  Palette,
  Plus,
  Radar,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { extractionService } from '@/services/extraction-service';
import { aiService } from '@/services/ai-service';
import { classRecordService } from '@/services/class-record-service';
import { fileService } from '@/services/file-service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassWorkspaceShell } from '@/components/class/workspace/ClassWorkspaceShell';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { TeacherClassRecordWorkbook } from '@/components/teacher/class-record/TeacherClassRecordWorkbook';
import { useTeacherClassRecord } from '@/hooks/use-teacher-class-record';
import { plainTextToRichHtml, sanitizeRichTextHtml } from '@/lib/rich-text';
import { isAiDraftTerminalStatus, readTrackedAiDraftJobs, type TrackedAiDraftJobEntry, writeTrackedAiDraftJobs } from '@/lib/ai-draft-job-tracker';
import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { ClassRecord } from '@/types/class-record';
import type { Extraction } from '@/types/extraction';
import type { ClassModule } from '@/types/module';
import './workspace.css';

type WorkspaceTab = 'modules' | 'assignments' | 'extraction' | 'announcements' | 'class-record' | 'students' | 'calendar';
type AssignmentFilter = 'all' | 'written' | 'performance' | 'quarterly' | 'discussion' | 'drafts';
type CalendarKind = 'assessment' | 'event' | 'holiday';
type CalendarViewMode = 'calendar' | 'upcoming';
type ModuleViewMode = 'wide' | 'compact';
type ModuleThemeKind = 'gradient' | 'image';

interface ModulePresentationDraft {
  themeKind: ModuleThemeKind;
  gradientId: string;
  coverImageUrl: string | null;
  imagePositionX: number;
  imagePositionY: number;
  imageScale: number;
}

interface StudentRow {
  enrollmentId: string;
  studentId: string;
  initials: string;
  fullName: string;
  email: string;
  lrn: string;
  gradePercent: number | null;
}

interface CalendarEventItem {
  id: string;
  title: string;
  subtitle: string;
  date: Date;
  kind: CalendarKind;
}

const CLASS_TABS: Array<{ key: WorkspaceTab; label: string; icon: typeof BookOpen }> = [
  { key: 'modules', label: 'Modules', icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'extraction', label: 'Extraction', icon: Radar },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'class-record', label: 'Class Record', icon: FileSpreadsheet },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const ASSIGNMENT_FILTERS: Array<{ key: AssignmentFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'written', label: 'Written Work' },
  { key: 'performance', label: 'Performance Task' },
  { key: 'quarterly', label: 'Quarterly Assessment' },
  { key: 'discussion', label: 'Discussion' },
  { key: 'drafts', label: 'Drafts' },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_KEY_MODULES_VIEW = 'teacher-class-detail-modules-view-v1';
const STORAGE_KEY_CALENDAR_VIEW = 'teacher-class-detail-calendar-view-v1';
const DEFAULT_MODULE_GRADIENT = 'oceanic-blue';
const MODULE_STOCK_IMAGES = [
  '/images/modules/module-stock-board.svg',
  '/images/modules/module-stock-library.svg',
  '/images/modules/module-stock-science.svg',
] as const;
const MODULE_GRADIENT_OPTIONS = [
  { id: 'oceanic-blue', label: 'Oceanic Blue', background: 'linear-gradient(135deg, #2b4fdd 0%, #3c62f0 100%)' },
  { id: 'emerald-wave', label: 'Emerald Wave', background: 'linear-gradient(135deg, #089f79 0%, #10b78f 100%)' },
  { id: 'violet-burst', label: 'Violet Burst', background: 'linear-gradient(135deg, #7f22f0 0%, #9a44f6 100%)' },
  { id: 'sunset-orange', label: 'Sunset Orange', background: 'linear-gradient(135deg, #d76a1f 0%, #f08d2d 100%)' },
  { id: 'rose-dusk', label: 'Rose Dusk', background: 'linear-gradient(135deg, #d42756 0%, #ef5f87 100%)' },
  { id: 'slate-night', label: 'Slate Night', background: 'linear-gradient(135deg, #1d304f 0%, #2e4a73 100%)' },
] as const;

function normalizeModulesOrder(modules: ClassModule[]) {
  return modules.map((module, index) => ({ ...module, order: index + 1 }));
}

function toTimestamp(value?: string) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return (
    value === 'modules' ||
    value === 'assignments' ||
    value === 'extraction' ||
    value === 'announcements' ||
    value === 'class-record' ||
    value === 'students' ||
    value === 'calendar'
  );
}

function formatDateYmd(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toISOString().slice(0, 10);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return 'Unknown';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Unknown';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatEventBadgeDate(date: Date) {
  return {
    day: String(date.getDate()),
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function summarizeModule(module: ClassModule) {
  const lessons = module.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'lesson').length,
    0,
  );
  const assessments = module.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'assessment').length,
    0,
  );
  return { lessons, assessments };
}

function deriveAssignmentFilter(assessment: Assessment): AssignmentFilter {
  const title = assessment.title.toLowerCase();
  const type = assessment.type.toLowerCase();
  if (!assessment.isPublished) return 'drafts';
  if (title.includes('project') || title.includes('performance')) return 'performance';
  if (title.includes('quarter') || title.includes('exam')) return 'quarterly';
  if (title.includes('discussion')) return 'discussion';
  if (type.includes('assignment') || type.includes('file_upload')) return 'written';
  return 'written';
}

function assignmentTagLabel(filter: AssignmentFilter) {
  if (filter === 'written') return 'Written Work';
  if (filter === 'performance') return 'Performance Task';
  if (filter === 'quarterly') return 'Quarterly Assessment';
  if (filter === 'discussion') return 'Discussion';
  return 'Assessment';
}

function inferCalendarKindFromAnnouncement(announcement: Announcement): CalendarKind {
  const content = `${announcement.title} ${announcement.content}`.toLowerCase();
  if (content.includes('quiz') || content.includes('exam') || content.includes('assessment')) return 'assessment';
  if (content.includes('holiday') || content.includes('break')) return 'holiday';
  return 'event';
}

function gradeTone(value: number | null) {
  if (value === null) return 'neutral';
  if (value >= 85) return 'good';
  if (value >= 75) return 'warn';
  return 'bad';
}

function safeInitials(firstName?: string, lastName?: string) {
  const a = (firstName || '').trim().charAt(0);
  const b = (lastName || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || 'NA';
}

function getApiErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    fallback
  );
}

function normalizeModulePresentation(module: ClassModule): ModulePresentationDraft {
  const gradientId =
    MODULE_GRADIENT_OPTIONS.find((option) => option.id === module.gradientId)?.id ||
    DEFAULT_MODULE_GRADIENT;

  const coverImageUrl = module.coverImageUrl || null;
  const themeKind: ModuleThemeKind =
    module.themeKind === 'image' && coverImageUrl ? 'image' : 'gradient';

  const clamp = (value: number | undefined, min: number, max: number, fallback: number) =>
    typeof value === 'number' ? Math.min(Math.max(value, min), max) : fallback;

  return {
    themeKind,
    gradientId,
    coverImageUrl,
    imagePositionX: clamp(module.imagePositionX, 0, 100, 50),
    imagePositionY: clamp(module.imagePositionY, 0, 100, 50),
    imageScale: clamp(module.imageScale, 100, 220, 120),
  };
}

function announcementContentToHtml(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return plainTextToRichHtml(trimmed);
}

export default function TeacherClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const classIdParam = params.id;
  const classId = Array.isArray(classIdParam) ? classIdParam[0] : (classIdParam as string) || '';
  const isClassIdValid = UUID_PATTERN.test(classId);
  const modulesViewStorageKey = `${STORAGE_KEY_MODULES_VIEW}:${isClassIdValid ? classId : 'invalid'}`;
  const calendarViewStorageKey = `${STORAGE_KEY_CALENDAR_VIEW}:${isClassIdValid ? classId : 'invalid'}`;
  const viewParam = searchParams.get('view');
  const activeTab = isWorkspaceTab(viewParam) ? viewParam : 'modules';

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [modules, setModules] = useState<ClassModule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [finalGradeByStudentId, setFinalGradeByStudentId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);
  const [busyModuleId, setBusyModuleId] = useState<string | null>(null);
  const [modulesViewMode, setModulesViewMode] = useState<ModuleViewMode>('wide');
  const [modulesViewLoaded, setModulesViewLoaded] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('upcoming');
  const [calendarViewLoaded, setCalendarViewLoaded] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(new Date()));
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const [dropTargetModuleId, setDropTargetModuleId] = useState<string | null>(null);
  const [isReorderingModules, setIsReorderingModules] = useState(false);
  const [customizingModuleId, setCustomizingModuleId] = useState<string | null>(null);
  const [moduleDraft, setModuleDraft] = useState<ModulePresentationDraft>({
    themeKind: 'gradient',
    gradientId: DEFAULT_MODULE_GRADIENT,
    coverImageUrl: null,
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 120,
  });
  const [savingModuleDesign, setSavingModuleDesign] = useState(false);
  const [uploadingModuleCover, setUploadingModuleCover] = useState(false);

  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [busyAssessmentId, setBusyAssessmentId] = useState<string | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [aiDraftJobs, setAiDraftJobs] = useState<TrackedAiDraftJobEntry[]>([]);
  const [aiDraftJobsBusy, setAiDraftJobsBusy] = useState(false);

  const [uploadingExtraction, setUploadingExtraction] = useState(false);
  const extractionInputRef = useRef<HTMLInputElement | null>(null);

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState<string>('');
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [busyAnnouncementId, setBusyAnnouncementId] = useState<string | null>(null);

  const [busyEnrollmentId, setBusyEnrollmentId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const classRecordState = useTeacherClassRecord(isClassIdValid ? classId : undefined);

  const fetchData = useCallback(async () => {
    if (!isClassIdValid) {
      setClassItem(null);
      setModules([]);
      setAssessments([]);
      setExtractions([]);
      setAnnouncements([]);
      setFinalGradeByStudentId({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [
        classRes,
        modulesRes,
        assessmentsRes,
        extractionsRes,
        announcementsRes,
        classRecordsRes,
        enrollmentsRes,
      ] = await Promise.all([
        classService.getById(classId),
        moduleService.getByClass(classId).catch(() => ({ data: [] as ClassModule[] })),
        assessmentService.getByClass(classId, { page: 1, limit: 100, status: 'all' }).catch(() => ({ data: [] as Assessment[] })),
        extractionService.listByClass(classId).catch(() => ({ data: [] as Extraction[] })),
        announcementService.getByClass(classId, { limit: 50 }).catch(() => ({ data: [] as Announcement[] })),
        classRecordService.getByClass(classId).catch(() => ({ data: [] as ClassRecord[] })),
        classService.getEnrollments(classId).catch(() => ({ data: [] as ClassItem['enrollments'] })),
      ]);

      const enrolled = enrollmentsRes.data || classRes.data.enrollments || [];
      setClassItem({ ...classRes.data, enrollments: enrolled });
      setModules((modulesRes.data || []).slice().sort((a, b) => a.order - b.order));
      setAssessments((assessmentsRes.data || []).slice().sort((a, b) => {
        const aTs = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTs = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTs - aTs;
      }));
      setExtractions((extractionsRes.data || []).slice().sort((a, b) => {
        const aTs = new Date(a.createdAt || 0).getTime();
        const bTs = new Date(b.createdAt || 0).getTime();
        return bTs - aTs;
      }));
      setAnnouncements((announcementsRes.data || []).slice().sort((a, b) => {
        const aTs = new Date(a.createdAt || 0).getTime();
        const bTs = new Date(b.createdAt || 0).getTime();
        return bTs - aTs;
      }));

      const records = (classRecordsRes.data || []).slice().sort((left, right) => {
        const leftTs = Math.max(toTimestamp(left.updatedAt), toTimestamp(left.createdAt));
        const rightTs = Math.max(toTimestamp(right.updatedAt), toTimestamp(right.createdAt));
        return rightTs - leftTs;
      });
      const prioritizedRecord =
        records.find((record) => record.status === 'finalized') ??
        records.find((record) => record.status === 'draft') ??
        null;

      if (!prioritizedRecord?.id) {
        setFinalGradeByStudentId({});
      } else {
        const finalGradesRes = await classRecordService
          .getFinalGrades(prioritizedRecord.id)
          .catch(() => ({ data: [] as { studentId: string; finalPercentage: number }[] }));
        const gradeMap = Object.fromEntries(
          (finalGradesRes.data || []).map((grade) => [grade.studentId, grade.finalPercentage]),
        );
        setFinalGradeByStudentId(gradeMap);
      }
    } catch {
      setClassItem(null);
      setModules([]);
      setAssessments([]);
      setExtractions([]);
      setAnnouncements([]);
      setFinalGradeByStudentId({});
    } finally {
      setLoading(false);
    }
  }, [classId, isClassIdValid]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refreshAiDraftJobs = useCallback(async () => {
    if (!isClassIdValid) {
      setAiDraftJobs([]);
      return;
    }
    const cached = readTrackedAiDraftJobs(classId);
    if (cached.length === 0) {
      setAiDraftJobs([]);
      return;
    }

    setAiDraftJobsBusy(true);
    try {
      const refreshed = await Promise.all(cached.map(async (entry) => {
        try {
          const statusRes = await aiService.getTeacherJobStatus(entry.jobId);
          return {
            ...entry,
            lastKnownStatus: statusRes.data.status,
            lastKnownProgress: statusRes.data.progressPercent,
            assessmentId: statusRes.data.assessmentId ?? entry.assessmentId ?? null,
            updatedAt: statusRes.data.updatedAt ?? entry.updatedAt ?? null,
          };
        } catch {
          return entry;
        }
      }));

      const sorted = [...refreshed].sort((a, b) => {
        const aTs = Date.parse(a.updatedAt || a.createdAt);
        const bTs = Date.parse(b.updatedAt || b.createdAt);
        return bTs - aTs;
      });
      writeTrackedAiDraftJobs(classId, sorted);
      setAiDraftJobs(readTrackedAiDraftJobs(classId));
    } finally {
      setAiDraftJobsBusy(false);
    }
  }, [classId, isClassIdValid]);

  useEffect(() => {
    if (!isClassIdValid) {
      setAiDraftJobs([]);
      return;
    }
    setAiDraftJobs(readTrackedAiDraftJobs(classId));
  }, [classId, isClassIdValid]);

  useEffect(() => {
    if (activeTab !== 'assignments') return;
    void refreshAiDraftJobs();
  }, [activeTab, refreshAiDraftJobs]);

  useEffect(() => {
    if (activeTab !== 'assignments') return;
    if (aiDraftJobs.length === 0) return;
    if (!aiDraftJobs.some((entry) => !isAiDraftTerminalStatus(entry.lastKnownStatus))) return;
    const interval = window.setInterval(() => {
      void refreshAiDraftJobs();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeTab, aiDraftJobs, refreshAiDraftJobs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(modulesViewStorageKey);
    if (raw === 'wide' || raw === 'compact') {
      setModulesViewMode(raw);
    } else {
      setModulesViewMode('wide');
    }
    setModulesViewLoaded(true);
  }, [modulesViewStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !modulesViewLoaded) return;
    window.localStorage.setItem(modulesViewStorageKey, modulesViewMode);
  }, [modulesViewLoaded, modulesViewMode, modulesViewStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(calendarViewStorageKey);
    if (raw === 'calendar' || raw === 'upcoming') {
      setCalendarViewMode(raw);
    } else {
      setCalendarViewMode('upcoming');
    }
    setCalendarViewLoaded(true);
  }, [calendarViewStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !calendarViewLoaded) return;
    window.localStorage.setItem(calendarViewStorageKey, calendarViewMode);
  }, [calendarViewLoaded, calendarViewMode, calendarViewStorageKey]);

  useEffect(() => {
    const moduleIdSet = new Set(modules.map((module) => module.id));
    setSelectedModuleIds((current) => current.filter((id) => moduleIdSet.has(id)));
  }, [modules]);

  const scheduleLine = useMemo(() => {
    const schedule = classItem?.schedules?.[0];
    if (!schedule) return 'Schedule TBA';
    const days = schedule.days.join('/');
    return `${days} ${schedule.startTime}-${schedule.endTime}`;
  }, [classItem]);

  const classInfoLine = useMemo(() => {
    const gradeLevel = classItem?.section?.gradeLevel || classItem?.subjectGradeLevel;
    const sectionName = classItem?.section?.name?.trim() || 'Section';
    const hasGradeInName = gradeLevel
      ? sectionName.toLowerCase().includes(`grade ${String(gradeLevel).toLowerCase()}`)
      : false;
    const sectionLabel = gradeLevel
      ? hasGradeInName
        ? sectionName
        : `Grade ${gradeLevel} - ${sectionName}`
      : sectionName;
    return `${sectionLabel} - ${scheduleLine}${classItem?.room ? ` - Room ${classItem.room}` : ''}`;
  }, [classItem?.room, classItem?.section?.gradeLevel, classItem?.section?.name, classItem?.subjectGradeLevel, scheduleLine]);

  const studentRows = useMemo<StudentRow[]>(() => {
    const enrollments = classItem?.enrollments || [];
    return enrollments.map((enrollment) => {
      const firstName = enrollment.student?.firstName?.trim() || '';
      const lastName = enrollment.student?.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unnamed Student';
      const profileLrn = enrollment.student?.profile?.lrn || '';
      const lrn = enrollment.student?.lrn || profileLrn || '--';
      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        initials: safeInitials(firstName, lastName),
        fullName,
        email: enrollment.student?.email || '--',
        lrn,
        gradePercent: finalGradeByStudentId[enrollment.studentId] ?? null,
      };
    });
  }, [classItem?.enrollments, finalGradeByStudentId]);

  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === 'all') return assessments;
    return assessments.filter((assessment) => deriveAssignmentFilter(assessment) === assignmentFilter);
  }, [assignmentFilter, assessments]);

  const recentAiDraftJobs = useMemo(() => aiDraftJobs.slice(0, 6), [aiDraftJobs]);
  const activeAiDraftJobCount = useMemo(
    () => aiDraftJobs.filter((entry) => !isAiDraftTerminalStatus(entry.lastKnownStatus)).length,
    [aiDraftJobs],
  );

  useEffect(() => {
    const assessmentIdSet = new Set(filteredAssignments.map((assessment) => assessment.id));
    setSelectedAssessmentIds((current) => current.filter((id) => assessmentIdSet.has(id)));
  }, [filteredAssignments]);

  const calendarItems = useMemo<CalendarEventItem[]>(() => {
    const fromAssessments = assessments
      .filter((assessment) => Boolean(assessment.dueDate))
      .map((assessment) => ({
        id: `assessment-${assessment.id}`,
        title: assessment.title,
        subtitle: classItem?.subjectName || 'Assessment',
        date: new Date(assessment.dueDate as string),
        kind: 'assessment' as CalendarKind,
      }))
      .filter((item) => !Number.isNaN(item.date.getTime()));

    const fromAnnouncements = announcements
      .map((announcement) => ({
        id: `announcement-${announcement.id}`,
        title: announcement.title,
        subtitle: classItem?.subjectName || 'Class Event',
        date: new Date(announcement.scheduledAt || announcement.createdAt || ''),
        kind: inferCalendarKindFromAnnouncement(announcement),
      }))
      .filter((item) => !Number.isNaN(item.date.getTime()));

    return [...fromAssessments, ...fromAnnouncements]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 12);
  }, [announcements, assessments, classItem?.subjectName]);

  const calendarEventMap = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    calendarItems.forEach((event) => {
      const key = formatDateKey(event.date);
      const current = map.get(key) || [];
      current.push(event);
      map.set(key, current);
    });
    return map;
  }, [calendarItems]);

  useEffect(() => {
    if (calendarItems.length === 0) {
      setSelectedCalendarDateKey(null);
      return;
    }

    const monthEvent = calendarItems.find(
      (event) =>
        event.date.getFullYear() === calendarMonth.getFullYear() &&
        event.date.getMonth() === calendarMonth.getMonth(),
    );
    const fallback = monthEvent || calendarItems[0];
    const nextKey = formatDateKey(fallback.date);
    setSelectedCalendarDateKey((current) => current || nextKey);
  }, [calendarItems, calendarMonth]);

  const calendarGridDays = useMemo(() => {
    const monthStart = getMonthStart(calendarMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0);
    const prevMonthDays = prevMonthEnd.getDate();

    const cells: Array<{ date: Date; key: string; inMonth: boolean; events: CalendarEventItem[] }> = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, prevMonthDays - i);
      const key = formatDateKey(date);
      cells.push({
        date,
        key,
        inMonth: false,
        events: calendarEventMap.get(key) || [],
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const key = formatDateKey(date);
      cells.push({
        date,
        key,
        inMonth: true,
        events: calendarEventMap.get(key) || [],
      });
    }

    while (cells.length % 7 !== 0) {
      const offset = cells.length - (firstWeekday + daysInMonth);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, offset + 1);
      const key = formatDateKey(date);
      cells.push({
        date,
        key,
        inMonth: false,
        events: calendarEventMap.get(key) || [],
      });
    }

    return cells;
  }, [calendarEventMap, calendarMonth]);

  const selectedCalendarEvents = useMemo(() => {
    if (!selectedCalendarDateKey) return [];
    return calendarEventMap.get(selectedCalendarDateKey) || [];
  }, [calendarEventMap, selectedCalendarDateKey]);

  const moduleTone = (index: number) => {
    const tones = ['blue', 'green', 'violet', 'orange', 'rose', 'slate'] as const;
    return tones[index % tones.length];
  };
  const getModuleGradient = (gradientId?: string) =>
    MODULE_GRADIENT_OPTIONS.find((option) => option.id === gradientId)?.background ||
    MODULE_GRADIENT_OPTIONS[0].background;

  const allModulesSelected = modules.length > 0 && selectedModuleIds.length === modules.length;
  const allFilteredAssessmentsSelected =
    filteredAssignments.length > 0 && selectedAssessmentIds.length === filteredAssignments.length;

  const handleCreateModule = async () => {
    if (creatingModule) return;
    const title = newModuleTitle.trim();
    if (!title) {
      toast.error('Module title is required');
      return;
    }
    if (title.length > 120) {
      toast.error('Module title is too long');
      return;
    }
    try {
      setCreatingModule(true);
      await moduleService.create({
        classId,
        title,
        description: newModuleDescription.trim() || undefined,
      });
      toast.success('Module created');
      setShowAddModuleModal(false);
      setNewModuleTitle('');
      setNewModuleDescription('');
      await fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create module'));
    } finally {
      setCreatingModule(false);
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId],
    );
  };

  const toggleSelectAllModules = () => {
    setSelectedModuleIds(allModulesSelected ? [] : modules.map((module) => module.id));
  };

  const applyModuleReorder = async (nextModules: ClassModule[]) => {
    const previousModules = modules;
    const normalized = normalizeModulesOrder(nextModules);
    setModules(normalized);
    try {
      setIsReorderingModules(true);
      await moduleService.reorderByClass(
        classId,
        normalized.map((module) => ({ id: module.id, order: module.order })),
      );
      toast.success('Module order updated');
    } catch (error) {
      setModules(previousModules);
      toast.error(getApiErrorMessage(error, 'Failed to save module order'));
    } finally {
      setIsReorderingModules(false);
    }
  };

  const handleModuleDragStart = (event: ReactDragEvent<HTMLButtonElement>, moduleId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', moduleId);
    setDraggingModuleId(moduleId);
  };

  const handleModuleDragOver = (event: ReactDragEvent<HTMLElement>, moduleId: string) => {
    if (!draggingModuleId || draggingModuleId === moduleId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetModuleId(moduleId);
  };

  const handleModuleDrop = async (event: ReactDragEvent<HTMLElement>, targetModuleId: string) => {
    event.preventDefault();
    const sourceModuleId = draggingModuleId || event.dataTransfer.getData('text/plain');
    setDropTargetModuleId(null);
    setDraggingModuleId(null);

    if (!sourceModuleId || sourceModuleId === targetModuleId) return;

    const sourceIndex = modules.findIndex((module) => module.id === sourceModuleId);
    const targetIndex = modules.findIndex((module) => module.id === targetModuleId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const reordered = modules.slice();
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    await applyModuleReorder(reordered);
  };

  const handleModuleDragEnd = () => {
    setDraggingModuleId(null);
    setDropTargetModuleId(null);
  };

  const performDeleteModule = async (moduleId: string) => {
    if (busyModuleId) return;
    try {
      setBusyModuleId(moduleId);
      await moduleService.delete(moduleId);
      setModules((current) => current.filter((module) => module.id !== moduleId));
      setSelectedModuleIds((current) => current.filter((id) => id !== moduleId));
      toast.success('Module deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete module'));
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    setConfirmation({
      title: 'Delete Module',
      description: 'This will permanently remove the module and all of its organization details.',
      confirmLabel: 'Delete Module',
      tone: 'danger',
      details: 'This action cannot be undone.',
      onConfirm: () => performDeleteModule(moduleId),
    });
  };

  const handleBulkDeleteModules = () => {
    if (selectedModuleIds.length === 0) return;
    const idsToDelete = selectedModuleIds.slice();
    setConfirmation({
      title: `Delete ${idsToDelete.length} Modules`,
      description: 'Selected modules will be permanently deleted.',
      confirmLabel: 'Delete Selected',
      tone: 'danger',
      details: `You are deleting ${idsToDelete.length} module(s). This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(idsToDelete.map((moduleId) => moduleService.delete(moduleId)));
          setModules((current) => current.filter((module) => !idsToDelete.includes(module.id)));
          setSelectedModuleIds([]);
          toast.success(`${idsToDelete.length} module(s) deleted`);
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to delete selected modules'));
        }
      },
    });
  };

  const openModuleDesignDialog = (module: ClassModule) => {
    setCustomizingModuleId(module.id);
    setModuleDraft(normalizeModulePresentation(module));
  };

  const toggleCoreModuleVisibility = async (module: ClassModule) => {
    try {
      const response = await moduleService.releaseCoreModule(module.id, {
        isVisible: !module.isVisible,
      });
      setModules((current) =>
        current.map((entry) =>
          entry.id === module.id ? response.data : entry,
        ),
      );
      toast.success(
        response.data.isVisible
          ? 'Core module released to students'
          : 'Core module hidden from students',
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Failed to update core module release'),
      );
    }
  };

  const handleUploadModuleCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !customizingModuleId) return;

    try {
      setUploadingModuleCover(true);
      const response = await moduleService.uploadCover(customizingModuleId, file);
      const nextCover = response.data.coverImageUrl;
      setModuleDraft((current) => ({
        ...current,
        themeKind: 'image',
        coverImageUrl: nextCover,
      }));
      setModules((current) =>
        current.map((module) => (module.id === customizingModuleId ? response.data.module : module)),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload cover image'));
    } finally {
      setUploadingModuleCover(false);
    }
  };

  const handleSaveModuleDesign = async () => {
    if (!customizingModuleId || savingModuleDesign) return;
    try {
      setSavingModuleDesign(true);
      const response = await moduleService.update(customizingModuleId, {
        themeKind: moduleDraft.themeKind,
        gradientId: moduleDraft.gradientId,
        coverImageUrl: moduleDraft.coverImageUrl,
        imagePositionX: moduleDraft.imagePositionX,
        imagePositionY: moduleDraft.imagePositionY,
        imageScale: moduleDraft.imageScale,
      });
      setModules((current) =>
        current.map((module) =>
          module.id === customizingModuleId ? response.data : module,
        ),
      );
      setCustomizingModuleId(null);
      toast.success('Module design updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update module design'));
    } finally {
      setSavingModuleDesign(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (creatingAssessment) return;
    try {
      setCreatingAssessment(true);
      const response = await assessmentService.create({
        title: 'Untitled Assessment',
        classId,
      });
      toast.success('Assessment created');
      router.push(`/dashboard/teacher/assessments/${response.data.id}/edit`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create assessment'));
    } finally {
      setCreatingAssessment(false);
    }
  };

  const toggleAssessmentSelection = (assessmentId: string) => {
    setSelectedAssessmentIds((current) =>
      current.includes(assessmentId) ? current.filter((id) => id !== assessmentId) : [...current, assessmentId],
    );
  };

  const toggleSelectAllFilteredAssessments = () => {
    setSelectedAssessmentIds(
      allFilteredAssessmentsSelected ? [] : filteredAssignments.map((assessment) => assessment.id),
    );
  };

  const performDeleteAssessment = async (assessmentId: string) => {
    if (busyAssessmentId) return;
    try {
      setBusyAssessmentId(assessmentId);
      await assessmentService.delete(assessmentId);
      setAssessments((current) => current.filter((assessment) => assessment.id !== assessmentId));
      setSelectedAssessmentIds((current) => current.filter((id) => id !== assessmentId));
      await fetchData();
      toast.success('Assessment deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete assessment'));
    } finally {
      setBusyAssessmentId(null);
    }
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    setConfirmation({
      title: 'Delete Assignment',
      description: 'This assignment will be permanently deleted.',
      confirmLabel: 'Delete Assignment',
      tone: 'danger',
      details: 'This action cannot be undone.',
      onConfirm: () => performDeleteAssessment(assessmentId),
    });
  };

  const handleBulkDeleteAssessments = () => {
    if (selectedAssessmentIds.length === 0) return;
    const idsToDelete = selectedAssessmentIds.slice();
    setConfirmation({
      title: `Delete ${idsToDelete.length} Assignments`,
      description: 'Selected assignments will be permanently deleted.',
      confirmLabel: 'Delete Selected',
      tone: 'danger',
      details: `You are deleting ${idsToDelete.length} assignment(s). This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(idsToDelete.map((assessmentId) => assessmentService.delete(assessmentId)));
          setAssessments((current) => current.filter((assessment) => !idsToDelete.includes(assessment.id)));
          setSelectedAssessmentIds([]);
          await fetchData();
          toast.success(`${idsToDelete.length} assignment(s) deleted`);
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to delete selected assignments'));
        }
      },
    });
  };

  const handleAssignmentCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>, assessmentId: string) => {
      const target = event.target as HTMLElement;
      if (target.closest('a,button,input,textarea,select,label,[role="button"],[role="link"]')) {
        return;
      }
      router.push(`/dashboard/teacher/assessments/${assessmentId}`);
    },
    [router],
  );

  const renderSelectionCheckbox = ({
    checked,
    onChange,
    ariaLabel,
  }: {
    checked: boolean;
    onChange: () => void;
    ariaLabel: string;
  }) => (
    <input
      type="checkbox"
      className="teacher-class-workspace__check"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );

  const handleExtractionSelect = () => {
    extractionInputRef.current?.click();
  };

  const handleExtractionFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadingExtraction) return;
    try {
      setUploadingExtraction(true);
      const uploadRes = await fileService.upload(file, { classId, scope: 'private' });
      await extractionService.extractModule({ fileId: uploadRes.data.id });
      toast.success('Extraction started');
      await fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start extraction'));
    } finally {
      setUploadingExtraction(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    const safeContent = sanitizeRichTextHtml(announcementContent).trim();
    if (!announcementTitle.trim() || !safeContent || creatingAnnouncement) return;
    try {
      setCreatingAnnouncement(true);
      await announcementService.create(classId, {
        title: announcementTitle.trim(),
        content: safeContent,
        isPinned: announcementPinned,
      });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setAnnouncementPinned(false);
      setShowAnnouncementForm(false);
      toast.success('Announcement posted');
      await fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to post announcement'));
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const performDeleteAnnouncement = async (announcementId: string) => {
    if (busyAnnouncementId) return;
    try {
      setBusyAnnouncementId(announcementId);
      await announcementService.delete(classId, announcementId);
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));
      toast.success('Announcement deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete announcement'));
    } finally {
      setBusyAnnouncementId(null);
    }
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    setConfirmation({
      title: 'Delete Announcement',
      description: 'This announcement will be permanently removed from the class feed.',
      confirmLabel: 'Delete Announcement',
      tone: 'danger',
      details: 'This action cannot be undone.',
      onConfirm: () => performDeleteAnnouncement(announcementId),
    });
  };

  const performRemoveStudent = async (enrollmentId: string, studentId: string) => {
    if (busyEnrollmentId) return;
    try {
      setBusyEnrollmentId(enrollmentId);
      await classService.unenrollStudent(classId, studentId);
      setClassItem((current) =>
        current
          ? {
              ...current,
              enrollments: (current.enrollments || []).filter((enrollment) => enrollment.id !== enrollmentId),
            }
          : current,
      );
      toast.success('Student removed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove student'));
    } finally {
      setBusyEnrollmentId(null);
    }
  };

  const handleRemoveStudent = (enrollmentId: string, studentId: string) => {
    setConfirmation({
      title: 'Remove Student',
      description: 'This student will be removed from the class roster.',
      confirmLabel: 'Remove Student',
      tone: 'danger',
      details: 'Class enrollment and module access for this class will be removed.',
      onConfirm: () => performRemoveStudent(enrollmentId, studentId),
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[34rem] rounded-xl" />
      </div>
    );
  }

  if (!classItem) {
    return (
      <section className="teacher-class-workspace__not-found">
        <p>{isClassIdValid ? 'Class not found.' : 'Invalid class link.'}</p>
        <Link href="/dashboard/teacher/classes">Back to Classes</Link>
      </section>
    );
  }

  const workspaceTabs = CLASS_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    href: `/dashboard/teacher/classes/${classId}?view=${tab.key}`,
    icon: tab.icon,
    active: activeTab === tab.key,
  }));

  return (
    <div className="teacher-class-workspace-wrap">
      <ClassWorkspaceShell
        backHref="/dashboard/teacher/classes"
        backLabel={
          <>
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </>
        }
        icon={<BookOpen className="h-5 w-5" />}
        title={classItem.subjectName}
        subtitle={classInfoLine}
        metaItems={[
          { key: 'students', label: `${studentRows.length} students` },
          { key: 'modules', label: `${modules.length} modules` },
        ]}
        tabs={workspaceTabs}
      >
        {activeTab === 'modules' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Course Modules</h2>
                <p>{modules.length} modules</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Button
                  type="button"
                  className="teacher-class-workspace__solid"
                  onClick={() => setShowAddModuleModal(true)}
                  disabled={creatingModule}
                >
                  <Plus className="h-4 w-4" />
                  Add Module
                </Button>
                <div className="teacher-class-workspace__view-toggle" role="group" aria-label="Module view style">
                  <button
                    type="button"
                    data-active={modulesViewMode === 'wide'}
                    onClick={() => setModulesViewMode('wide')}
                    aria-label="Wide list view"
                    title="Wide list view"
                  >
                    <LayoutPanelTop className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-active={modulesViewMode === 'compact'}
                    onClick={() => setModulesViewMode('compact')}
                    aria-label="Compact card view"
                    title="Compact card view"
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                </div>
                <Button type="button" className="teacher-class-workspace__outline" onClick={toggleSelectAllModules}>
                  {allModulesSelected ? 'Clear Selection' : 'Select All'}
                </Button>
                <Button
                  type="button"
                  className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                  disabled={selectedModuleIds.length === 0}
                  onClick={handleBulkDeleteModules}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
            <div
              className={
                modulesViewMode === 'compact'
                  ? 'teacher-class-workspace__modules-grid teacher-class-workspace__modules-grid--compact'
                  : 'teacher-class-workspace__modules-grid teacher-class-workspace__modules-grid--wide'
              }
            >
              {modules.map((module, index) => {
                const summary = summarizeModule(module);
                const isSelected = selectedModuleIds.includes(module.id);
                const isCoreModule = Boolean(module.isCoreTemplateAsset);
                const mediaSource =
                  module.coverImageUrl || MODULE_STOCK_IMAGES[index % MODULE_STOCK_IMAGES.length];
                const gradientBackground = getModuleGradient(module.gradientId);
                const imagePositionX = module.imagePositionX ?? 50;
                const imagePositionY = module.imagePositionY ?? 50;
                const imageScale = module.imageScale ?? 120;
                return (
                  <article
                    key={module.id}
                    className="teacher-class-workspace__module-card"
                    data-tone={moduleTone(index)}
                    data-selected={isSelected}
                    data-dragging={draggingModuleId === module.id}
                    data-drop-target={dropTargetModuleId === module.id}
                    onDragOver={(event) => handleModuleDragOver(event, module.id)}
                    onDrop={(event) => void handleModuleDrop(event, module.id)}
                  >
                    <div className="teacher-class-workspace__module-leading">
                      {renderSelectionCheckbox({
                        checked: isSelected,
                        onChange: () => toggleModuleSelection(module.id),
                        ariaLabel: `Select ${module.title}`,
                      })}
                      <button
                        type="button"
                        className="teacher-class-workspace__module-drag"
                        draggable
                        onDragStart={(event) => handleModuleDragStart(event, module.id)}
                        onDragEnd={handleModuleDragEnd}
                        disabled={isReorderingModules}
                        aria-label={`Drag ${module.title} to reorder`}
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </div>
                    <Link
                      href={`/dashboard/teacher/classes/${classId}/modules/${module.id}`}
                      className="teacher-class-workspace__module-main-link"
                    >
                      <div className="teacher-class-workspace__module-media-wrap">
                        <div
                          className="teacher-class-workspace__module-media"
                          style={{
                            backgroundImage: `linear-gradient(120deg, rgba(8, 23, 44, 0.26), rgba(8, 23, 44, 0.12)), url(${mediaSource})`,
                            backgroundSize: `${imageScale}%`,
                            backgroundPosition: `${imagePositionX}% ${imagePositionY}%`,
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#f1f5fb',
                          }}
                        >
                          <div
                            className="teacher-class-workspace__module-media-gradient"
                            style={{ background: gradientBackground }}
                          />
                        </div>
                      </div>
                      <header>
                        <div className="teacher-class-workspace__module-index">{index + 1}</div>
                        <div className="teacher-class-workspace__module-copy">
                          <h3>{module.title}</h3>
                          {isCoreModule ? (
                            <span className="teacher-class-workspace__pill">
                              Core Module
                            </span>
                          ) : null}
                          <p>{module.description || 'Add a short module description.'}</p>
                        </div>
                      </header>
                      <div className="teacher-class-workspace__module-stats">
                        <article>
                          <BookText className="h-3.5 w-3.5" />
                          <strong>{summary.lessons}</strong>
                          <span>Lessons</span>
                        </article>
                        <article>
                          <ClipboardList className="h-3.5 w-3.5" />
                          <strong>{summary.assessments}</strong>
                          <span>Assessments</span>
                        </article>
                      </div>
                    </Link>
                    {isCoreModule ? (
                      <button
                        type="button"
                        className="teacher-class-workspace__outline"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void toggleCoreModuleVisibility(module);
                        }}
                      >
                        {module.isVisible ? 'Hide Core' : 'Release Core'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="teacher-class-workspace__ghost-icon"
                          onClick={() => openModuleDesignDialog(module)}
                          aria-label="Customize module design"
                          title="Customize module design"
                        >
                          <Palette className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="teacher-class-workspace__ghost-icon"
                          onClick={() => handleDeleteModule(module.id)}
                          disabled={busyModuleId === module.id}
                          aria-label="Delete module"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </article>
                );
              })}
              {modules.length === 0 ? (
                <div className="teacher-class-workspace__empty">No modules yet.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'assignments' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Assignments</h2>
                <p>{filteredAssignments.length} assignments</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Link href={`/dashboard/teacher/classes/${classId}/ai-draft`} className="teacher-class-workspace__outline">
                  AI Draft
                </Link>
                <Button
                  type="button"
                  className="teacher-class-workspace__solid"
                  onClick={() => void handleCreateAssessment()}
                  disabled={creatingAssessment}
                >
                  <Plus className="h-4 w-4" />
                  New Assignment
                </Button>
              </div>
            </div>

            <article className="teacher-class-workspace__assignment-card">
              <div className="teacher-class-workspace__assignment-main">
                <div className="teacher-class-workspace__assignment-icon">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="teacher-class-workspace__assignment-copy">
                  <div className="teacher-class-workspace__assignment-tags">
                    <span>AI Draft Jobs</span>
                    <span data-status={activeAiDraftJobCount > 0 ? 'published' : 'draft'}>
                      {activeAiDraftJobCount > 0 ? `${activeAiDraftJobCount} active` : 'No active jobs'}
                    </span>
                  </div>
                  <p>
                    {aiDraftJobsBusy ? 'Refreshing AI draft tracker...' : `${recentAiDraftJobs.length} tracked job(s) for this class`}
                  </p>
                  {recentAiDraftJobs.length === 0 ? (
                    <div className="teacher-class-workspace__assignment-actions">
                      <Link href={`/dashboard/teacher/classes/${classId}/ai-draft`} className="teacher-class-workspace__outline">
                        Start AI Draft
                      </Link>
                    </div>
                  ) : (
                    <div className="teacher-class-workspace__stack">
                      {recentAiDraftJobs.map((entry) => (
                        <div key={entry.jobId} className="teacher-class-workspace__selection-bar">
                          <div>
                            <strong>{entry.jobId}</strong>
                            <p className="text-xs text-muted-foreground">
                              {entry.lastKnownStatus} • {Math.round(entry.lastKnownProgress)}% • {formatRelativeTime(entry.updatedAt || entry.createdAt)}
                            </p>
                          </div>
                          <div className="teacher-class-workspace__selection-actions">
                            <Link href={`/dashboard/teacher/classes/${classId}/ai-draft`} className="teacher-class-workspace__outline">
                              Resume
                            </Link>
                            {entry.assessmentId ? (
                              <Link href={`/dashboard/teacher/assessments/${entry.assessmentId}/edit`} className="teacher-class-workspace__outline">
                                Open Assessment
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <div className="teacher-class-workspace__chips">
              {ASSIGNMENT_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  data-active={assignmentFilter === filter.key}
                  onClick={() => setAssignmentFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="teacher-class-workspace__selection-bar">
              <label>
                {renderSelectionCheckbox({
                  checked: allFilteredAssessmentsSelected,
                  onChange: toggleSelectAllFilteredAssessments,
                  ariaLabel: 'Select all filtered assignments',
                })}
                <span>Select All (Filtered)</span>
              </label>
              {selectedAssessmentIds.length > 0 ? (
                <div className="teacher-class-workspace__selection-actions">
                  <span>{selectedAssessmentIds.length} selected</span>
                  <Button type="button" className="teacher-class-workspace__outline" onClick={() => setSelectedAssessmentIds([])}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                    onClick={handleBulkDeleteAssessments}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="teacher-class-workspace__stack">
              {filteredAssignments.map((assessment) => {
                const filter = deriveAssignmentFilter(assessment);
                const isSelected = selectedAssessmentIds.includes(assessment.id);
                return (
                  <article key={assessment.id} className="teacher-class-workspace__assignment-card" data-selected={isSelected}>
                    <div
                      className="teacher-class-workspace__assignment-main"
                      onClick={(event) => handleAssignmentCardClick(event, assessment.id)}
                    >
                      {renderSelectionCheckbox({
                        checked: isSelected,
                        onChange: () => toggleAssessmentSelection(assessment.id),
                        ariaLabel: `Select ${assessment.title}`,
                      })}
                      <Link
                        href={`/dashboard/teacher/assessments/${assessment.id}`}
                        className="teacher-class-workspace__assignment-link"
                      >
                        <div className="teacher-class-workspace__assignment-icon">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="teacher-class-workspace__assignment-copy">
                          <div className="teacher-class-workspace__assignment-tags">
                            <span>{assignmentTagLabel(filter)}</span>
                            <span data-status={assessment.isPublished ? 'published' : 'draft'}>
                              {assessment.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <h3>{assessment.title}</h3>
                          <p>
                            {(assessment.questions?.length ?? 0)} questions - {assessment.totalPoints ?? 0} pts - Due {formatDateYmd(assessment.dueDate)}
                          </p>
                        </div>
                      </Link>
                    </div>
                    <div className="teacher-class-workspace__assignment-actions">
                      <Link href={`/dashboard/teacher/assessments/${assessment.id}/edit`} className="teacher-class-workspace__outline">
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="teacher-class-workspace__ghost-icon"
                        onClick={() => handleDeleteAssessment(assessment.id)}
                        disabled={busyAssessmentId === assessment.id}
                        aria-label="Delete assessment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
              {filteredAssignments.length === 0 ? (
                <div className="teacher-class-workspace__empty">No assignments in this filter.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'extraction' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>AI Extractions</h2>
                <p>Upload a PDF to extract lesson content using AI.</p>
              </div>
            </div>
            <div className="teacher-class-workspace__extract-wrap">
              <button
                type="button"
                className="teacher-class-workspace__extract-dropzone"
                onClick={handleExtractionSelect}
                disabled={uploadingExtraction}
              >
                <Radar className="h-6 w-6" />
                <strong>{uploadingExtraction ? 'Uploading PDF...' : 'Drop a PDF here to extract module'}</strong>
                <span>or click to browse</span>
              </button>
              <input
                ref={extractionInputRef}
                type="file"
                accept="application/pdf"
                onChange={(event) => void handleExtractionFile(event)}
                hidden
              />
              <div className="teacher-class-workspace__stack">
                {extractions.map((extraction) => (
                  <article key={extraction.id} className="teacher-class-workspace__extract-item">
                    <div>
                      <h3>{extraction.structuredContent?.title || extraction.originalName || 'PDF Extraction'}</h3>
                      <p>{formatDateYmd(extraction.createdAt)}</p>
                    </div>
                    <div className="teacher-class-workspace__extract-item-actions">
                      <span data-status={extraction.extractionStatus}>{extraction.extractionStatus}</span>
                      <Link href={`/dashboard/teacher/extractions/${extraction.id}`} className="teacher-class-workspace__outline">
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </div>
                  </article>
                ))}
                {extractions.length === 0 ? (
                  <div className="teacher-class-workspace__empty">No extraction history yet.</div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'announcements' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Announcements</h2>
                <p>{announcements.length} posts</p>
              </div>
              <Button
                type="button"
                className="teacher-class-workspace__solid"
                onClick={() => setShowAnnouncementForm((current) => !current)}
              >
                <Plus className="h-4 w-4" />
                New Announcement
              </Button>
            </div>

            {showAnnouncementForm ? (
              <div className="teacher-class-workspace__announcement-form">
                <Input
                  value={announcementTitle}
                  onChange={(event) => setAnnouncementTitle(event.target.value)}
                  placeholder="Announcement title"
                />
                <RichTextEditor
                  value={announcementContent}
                  onChange={setAnnouncementContent}
                  placeholder="Write announcement content..."
                  minHeight={160}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={announcementPinned}
                    onChange={(event) => setAnnouncementPinned(event.target.checked)}
                  />
                  Pin this announcement
                </label>
                <div className="teacher-class-workspace__head-actions">
                  <Button
                    type="button"
                    className="teacher-class-workspace__solid"
                    onClick={() => void handleCreateAnnouncement()}
                    disabled={creatingAnnouncement}
                  >
                    Post Announcement
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAnnouncementForm(false);
                      setAnnouncementTitle('');
                      setAnnouncementContent('');
                      setAnnouncementPinned(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="teacher-class-workspace__stack">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="teacher-class-workspace__announcement-card"
                  data-pinned={announcement.isPinned}
                >
                  <div>
                    {announcement.isPinned ? <span className="teacher-class-workspace__pin">Pinned</span> : null}
                    <h3>{announcement.title}</h3>
                    <RichTextRenderer
                      html={announcementContentToHtml(announcement.content)}
                      className="teacher-class-workspace__announcement-rich"
                    />
                    <small>{formatDateYmd(announcement.createdAt)}</small>
                  </div>
                  <button
                    type="button"
                    className="teacher-class-workspace__ghost-icon"
                    onClick={() => void handleDeleteAnnouncement(announcement.id)}
                    disabled={busyAnnouncementId === announcement.id}
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </article>
              ))}
              {announcements.length === 0 ? (
                <div className="teacher-class-workspace__empty">No announcements yet.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'class-record' ? (
          <div className="teacher-class-workspace__panel teacher-class-workspace__panel--record">
            <div className="teacher-class-workspace__record-scroll">
              <TeacherClassRecordWorkbook
                state={classRecordState}
                emptyMessage="No class record exists yet for this class. Create a quarter workbook to begin."
                className="teacher-class-workspace__record-embed"
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'students' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Students ({studentRows.length})</h2>
              </div>
              <Link href={`/dashboard/teacher/classes/${classId}/students/add`} className="teacher-class-workspace__solid">
                <Plus className="h-4 w-4" />
                Add Student
              </Link>
            </div>
            <div className="teacher-class-workspace__table-wrap">
              <table className="teacher-class-workspace__table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>LRN</th>
                    <th>Grade %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((student) => (
                    <tr key={student.enrollmentId} className="teacher-class-workspace__table-row teacher-class-workspace__table-row--clickable">
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          <div className="teacher-class-workspace__student-cell">
                            <span className="teacher-class-workspace__avatar">{student.initials}</span>
                            <strong>{student.fullName}</strong>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          {student.email}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          {student.lrn}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          <div className="teacher-class-workspace__grade">
                            <div className="teacher-class-workspace__grade-track">
                              <div
                                data-tone={gradeTone(student.gradePercent)}
                                style={{ width: `${Math.max(0, Math.min(100, student.gradePercent ?? 0))}%` }}
                              />
                            </div>
                            <span>{student.gradePercent !== null ? `${student.gradePercent.toFixed(1)}%` : '--'}</span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <div className="teacher-class-workspace__table-actions">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleRemoveStudent(student.enrollmentId, student.studentId);
                            }}
                            disabled={busyEnrollmentId === student.enrollmentId}
                            aria-label="Remove student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {studentRows.length === 0 ? (
                <div className="teacher-class-workspace__empty">No students enrolled.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'calendar' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Class Calendar</h2>
                <p>Upcoming events and assessments for {classItem.subjectName}</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <div className="teacher-class-workspace__view-toggle" role="group" aria-label="Calendar view">
                  <button
                    type="button"
                    data-active={calendarViewMode === 'calendar'}
                    onClick={() => setCalendarViewMode('calendar')}
                    aria-label="Calendar grid view"
                    title="Calendar"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-active={calendarViewMode === 'upcoming'}
                    onClick={() => setCalendarViewMode('upcoming')}
                    aria-label="Upcoming list view"
                    title="Upcoming"
                  >
                    <LayoutPanelTop className="h-4 w-4" />
                  </button>
                </div>
                <Link href={`/dashboard/teacher/calendar?classId=${classId}`} className="teacher-class-workspace__outline">
                  <CalendarDays className="h-4 w-4" />
                  Full Calendar
                </Link>
              </div>
            </div>
            {calendarViewMode === 'upcoming' ? (
              <div className="teacher-class-workspace__stack">
                {calendarItems.map((event) => {
                  const badge = formatEventBadgeDate(event.date);
                  return (
                    <article key={event.id} className="teacher-class-workspace__calendar-item" data-kind={event.kind}>
                      <div className="teacher-class-workspace__calendar-date">
                        <strong>{badge.day}</strong>
                        <span>{badge.month}</span>
                      </div>
                      <div className="teacher-class-workspace__calendar-copy">
                        <h3>{event.title}</h3>
                        <p>{event.subtitle}</p>
                      </div>
                      <span className="teacher-class-workspace__calendar-kind">{event.kind}</span>
                    </article>
                  );
                })}
                {calendarItems.length === 0 ? (
                  <div className="teacher-class-workspace__empty">No upcoming events.</div>
                ) : null}
              </div>
            ) : (
              <div className="teacher-class-workspace__calendar-board">
                <div className="teacher-class-workspace__calendar-grid-wrap">
                  <div className="teacher-class-workspace__calendar-grid-head">
                    <button
                      type="button"
                      className="teacher-class-workspace__ghost-icon"
                      onClick={() => setCalendarMonth((current) => getMonthStart(new Date(current.getFullYear(), current.getMonth() - 1, 1)))}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <strong>
                      {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </strong>
                    <button
                      type="button"
                      className="teacher-class-workspace__ghost-icon"
                      onClick={() => setCalendarMonth((current) => getMonthStart(new Date(current.getFullYear(), current.getMonth() + 1, 1)))}
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="teacher-class-workspace__calendar-grid-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className="teacher-class-workspace__calendar-grid">
                    {calendarGridDays.map((cell) => {
                      const isSelected = selectedCalendarDateKey === cell.key;
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          className="teacher-class-workspace__calendar-cell"
                          data-in-month={cell.inMonth}
                          data-selected={isSelected}
                          onClick={() => setSelectedCalendarDateKey(cell.key)}
                        >
                          <strong>{cell.date.getDate()}</strong>
                          {cell.events.length > 0 ? (
                            <span>{cell.events.length} event{cell.events.length === 1 ? '' : 's'}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="teacher-class-workspace__calendar-selected">
                  <h3>
                    {selectedCalendarDateKey
                      ? new Date(`${selectedCalendarDateKey}T00:00:00`).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Select a date'}
                  </h3>
                  <div className="teacher-class-workspace__stack">
                    {selectedCalendarEvents.length > 0 ? (
                      selectedCalendarEvents.map((event) => (
                        <article key={event.id} className="teacher-class-workspace__calendar-item" data-kind={event.kind}>
                          <div className="teacher-class-workspace__calendar-date">
                            <strong>{event.date.getDate()}</strong>
                            <span>{event.date.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
                          </div>
                          <div className="teacher-class-workspace__calendar-copy">
                            <h3>{event.title}</h3>
                            <p>{event.subtitle}</p>
                          </div>
                          <span className="teacher-class-workspace__calendar-kind">{event.kind}</span>
                        </article>
                      ))
                    ) : (
                      <div className="teacher-class-workspace__empty">No events for this date.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </ClassWorkspaceShell>

      <Dialog open={showAddModuleModal} onOpenChange={setShowAddModuleModal}>
        <DialogContent className="teacher-module-modal">
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
            <DialogDescription>
              Create a module title and brief description. You can refine sections and items after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="teacher-module-modal__fields">
            <div>
              <label htmlFor="new-module-title">Title</label>
              <Input
                id="new-module-title"
                value={newModuleTitle}
                onChange={(event) => setNewModuleTitle(event.target.value)}
                placeholder="Module title"
                maxLength={120}
              />
            </div>
            <div>
              <label htmlFor="new-module-description">Description</label>
              <textarea
                id="new-module-description"
                className="teacher-module-modal__textarea"
                value={newModuleDescription}
                onChange={(event) => setNewModuleDescription(event.target.value)}
                placeholder="What should students learn in this module?"
                rows={4}
              />
            </div>
            <button
              type="button"
              className="teacher-class-workspace__outline teacher-module-modal__template"
              onClick={() => toast.info('Quick templates will be available in a later update.')}
            >
              Quick Template
            </button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModuleModal(false);
                setNewModuleTitle('');
                setNewModuleDescription('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" className="teacher-class-workspace__solid" onClick={() => void handleCreateModule()} disabled={creatingModule}>
              {creatingModule ? 'Creating...' : 'Create Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(customizingModuleId)} onOpenChange={(open) => !open && setCustomizingModuleId(null)}>
        <DialogContent className="teacher-module-modal teacher-module-modal--design">
          <DialogHeader>
            <DialogTitle>Customize Module Design</DialogTitle>
            <DialogDescription>
              Choose the module surface style and media placement. Changes are saved per module.
            </DialogDescription>
          </DialogHeader>
          <div className="teacher-module-modal__fields">
            <div className="teacher-module-modal__theme-toggle" role="group" aria-label="Module theme mode">
              <button
                type="button"
                data-active={moduleDraft.themeKind === 'gradient'}
                onClick={() => setModuleDraft((current) => ({ ...current, themeKind: 'gradient' }))}
              >
                Gradient
              </button>
              <button
                type="button"
                data-active={moduleDraft.themeKind === 'image'}
                onClick={() =>
                  setModuleDraft((current) => ({
                    ...current,
                    themeKind: current.coverImageUrl ? 'image' : 'gradient',
                  }))
                }
              >
                Image
              </button>
            </div>

            <div className="teacher-module-modal__palette">
              {MODULE_GRADIENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-active={moduleDraft.gradientId === option.id}
                  onClick={() => setModuleDraft((current) => ({ ...current, gradientId: option.id }))}
                  aria-label={option.label}
                  title={option.label}
                  style={{ background: option.background }}
                />
              ))}
            </div>

            <div className="teacher-module-modal__stock-grid">
              {MODULE_STOCK_IMAGES.map((imageUrl) => (
                <button
                  key={imageUrl}
                  type="button"
                  data-active={moduleDraft.coverImageUrl === imageUrl}
                  onClick={() =>
                    setModuleDraft((current) => ({
                      ...current,
                      themeKind: 'image',
                      coverImageUrl: imageUrl,
                    }))
                  }
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                  }}
                  aria-label="Use stock image"
                />
              ))}
            </div>

            <div className="teacher-module-modal__upload">
              <label htmlFor="module-cover-upload">
                {uploadingModuleCover ? 'Uploading cover...' : 'Upload custom image'}
              </label>
              <input
                id="module-cover-upload"
                type="file"
                accept="image/*"
                onChange={(event) => void handleUploadModuleCover(event)}
                disabled={uploadingModuleCover}
              />
            </div>

            <div className="teacher-module-modal__sliders">
              <label>
                X Position
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={moduleDraft.imagePositionX}
                  onChange={(event) =>
                    setModuleDraft((current) => ({
                      ...current,
                      imagePositionX: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Y Position
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={moduleDraft.imagePositionY}
                  onChange={(event) =>
                    setModuleDraft((current) => ({
                      ...current,
                      imagePositionY: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Zoom
                <input
                  type="range"
                  min={100}
                  max={220}
                  value={moduleDraft.imageScale}
                  onChange={(event) =>
                    setModuleDraft((current) => ({
                      ...current,
                      imageScale: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomizingModuleId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="teacher-class-workspace__solid"
              onClick={() => void handleSaveModuleDesign()}
              disabled={savingModuleDesign}
            >
              {savingModuleDesign ? 'Saving...' : 'Save Design'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
