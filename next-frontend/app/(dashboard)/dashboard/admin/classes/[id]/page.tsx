'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Megaphone,
  MessageSquare,
  Plus,
  Power,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDiscussionRealtimeRefresh } from '@/hooks/use-discussion-realtime-refresh';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ClassWorkspaceShell,
  type ClassWorkspaceTabItem,
} from '@/components/class/workspace/ClassWorkspaceShell';
import {
  ConfirmationDialog,
  type ConfirmationDialogConfig,
} from '@/components/shared/ConfirmationDialog';
import { getApiErrorMessage } from '@/lib/api-error';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { discussionBoardService } from '@/services/discussion-board-service';
import { extractionService } from '@/services/extraction-service';
import { moduleService } from '@/services/module-service';
import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { ClassRecord } from '@/types/class-record';
import type {
  DiscussionComment,
  DiscussionCommentReportReason,
  DiscussionThreadDetail,
  DiscussionThreadSummary,
} from '@/types/discussion';
import type { Extraction } from '@/types/extraction';
import type { ClassModule } from '@/types/module';
import '../../../teacher/classes/[id]/workspace.css';

type WorkspaceTab =
  | 'modules'
  | 'assignments'
  | 'extraction'
  | 'announcements'
  | 'discussion'
  | 'class-record'
  | 'students'
  | 'calendar';

const WORKSPACE_TABS: Array<{
  key: WorkspaceTab;
  label: string;
  icon: typeof BookOpen;
}> = [
  { key: 'modules', label: 'Modules', icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'extraction', label: 'Extraction', icon: Sparkles },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'discussion', label: 'Discussion Board', icon: MessageSquare },
  { key: 'class-record', label: 'Class Record', icon: FileSpreadsheet },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const DISCUSSION_REPORT_REASONS: Array<{
  value: DiscussionCommentReportReason;
  label: string;
}> = [
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'spam', label: 'Spam' },
  { value: 'off_topic', label: 'Off topic' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'academic_dishonesty', label: 'Academic dishonesty' },
];

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return WORKSPACE_TABS.some((tab) => tab.key === value);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return 'No due date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function stripHtml(html?: string | null) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatTeacherName(classItem: ClassItem | null) {
  const teacher = classItem?.teacher;
  if (!teacher) return 'No teacher assigned';
  const fullName = [teacher.firstName, teacher.lastName].filter(Boolean).join(' ').trim();
  return fullName || teacher.email || 'Assigned teacher';
}

function formatStudentName(enrollment: NonNullable<ClassItem['enrollments']>[number]) {
  const student = enrollment.student;
  if (!student) return 'Unknown student';
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
  return fullName || student.email || student.id;
}

function formatScheduleLine(classItem: ClassItem | null) {
  const schedules = classItem?.schedules ?? [];
  if (schedules.length === 0) return 'Schedule not set';
  return schedules
    .map((schedule) => {
      const days = schedule.days.join(', ');
      return `${days} ${schedule.startTime}-${schedule.endTime}`;
    })
    .join(' • ');
}

function buildClassInfoLine(classItem: ClassItem | null) {
  if (!classItem) return '';
  const bits = [
    classItem.subjectCode,
    classItem.section?.name,
    classItem.room || 'Room not set',
    classItem.schoolYear,
  ].filter(Boolean);
  return bits.join(' • ');
}

function normalizeModulesOrder(modules: ClassModule[]) {
  return modules.map((module, index) => ({
    ...module,
    order: index + 1,
  }));
}

function sortDiscussionThreads(threads: DiscussionThreadSummary[]) {
  return threads.slice().sort((left, right) => {
    const leftWeight = left.isPinned ? 1 : 0;
    const rightWeight = right.isPinned ? 1 : 0;
    if (leftWeight !== rightWeight) return rightWeight - leftWeight;
    return (
      Math.max(toTimestamp(right.updatedAt), toTimestamp(right.createdAt)) -
      Math.max(toTimestamp(left.updatedAt), toTimestamp(left.createdAt))
    );
  });
}

function getDiscussionAuthorName(comment: DiscussionComment['author']) {
  if (!comment) return 'Unknown author';
  const fullName = [comment.firstName, comment.lastName].filter(Boolean).join(' ').trim();
  return fullName || comment.email || 'Unknown author';
}

function getStatusClasses(tone: 'default' | 'warning' | 'danger' | 'success' = 'default') {
  switch (tone) {
    case 'warning':
      return 'bg-[#fff4d6] text-[#885400]';
    case 'danger':
      return 'bg-[#fde7e7] text-[#8c1d18]';
    case 'success':
      return 'bg-[#e6f6ed] text-[#0f6b3d]';
    default:
      return 'bg-[#edf3ff] text-[#23457f]';
  }
}

function countModuleLessons(module: ClassModule) {
  return module.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'lesson').length,
    0,
  );
}

function countModuleAssessments(module: ClassModule) {
  return module.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'assessment').length,
    0,
  );
}

function countModuleFiles(module: ClassModule) {
  return module.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'file').length,
    0,
  );
}

function summarizeClassRecord(record: ClassRecord) {
  const categories = record.categories ?? [];
  const items = categories.reduce((sum, category) => sum + (category.items?.length ?? 0), 0);
  return {
    categories: categories.length,
    items,
  };
}

export default function AdminClassDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const classId = String(params?.id ?? '');
  const viewParam = searchParams.get('view');
  const activeTab: WorkspaceTab = isWorkspaceTab(viewParam) ? viewParam : 'modules';

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [modules, setModules] = useState<ClassModule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [discussionThreads, setDiscussionThreads] = useState<DiscussionThreadSummary[]>([]);
  const [selectedDiscussionThreadId, setSelectedDiscussionThreadId] = useState<string | null>(null);
  const [selectedDiscussionThread, setSelectedDiscussionThread] = useState<DiscussionThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isReorderingModules, setIsReorderingModules] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [roomDraft, setRoomDraft] = useState('');
  const [schoolYearDraft, setSchoolYearDraft] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [busyEnrollmentId, setBusyEnrollmentId] = useState<string | null>(null);
  const [busyDiscussionThreadId, setBusyDiscussionThreadId] = useState<string | null>(null);
  const [busyDiscussionCommentId, setBusyDiscussionCommentId] = useState<string | null>(null);
  const [reportDialogComment, setReportDialogComment] = useState<DiscussionComment | null>(null);
  const [discussionReportReason, setDiscussionReportReason] =
    useState<DiscussionCommentReportReason>('inappropriate');
  const [discussionReportNotes, setDiscussionReportNotes] = useState('');
  const [reportingDiscussionComment, setReportingDiscussionComment] = useState(false);

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleTitleDraft, setModuleTitleDraft] = useState('');
  const [moduleDescriptionDraft, setModuleDescriptionDraft] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);

  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [assessmentTitleDraft, setAssessmentTitleDraft] = useState('');
  const [assessmentDescriptionDraft, setAssessmentDescriptionDraft] = useState('');
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementTitleDraft, setAnnouncementTitleDraft] = useState('');
  const [announcementContentDraft, setAnnouncementContentDraft] = useState('');
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

  const loadAll = useCallback(async () => {
    if (!classId) return;

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
        discussionThreadsRes,
      ] = await Promise.all([
        classService.getById(classId),
        moduleService.getByClass(classId).catch(() => ({ data: [] as ClassModule[] })),
        assessmentService
          .getByClass(classId, { page: 1, limit: 100, status: 'all' })
          .catch(() => ({ data: [] as Assessment[] })),
        extractionService.listByClass(classId).catch(() => ({ data: [] as Extraction[] })),
        announcementService.getByClass(classId, { limit: 100 }).catch(() => ({ data: [] as Announcement[] })),
        classRecordService.getByClass(classId).catch(() => ({ data: [] as ClassRecord[] })),
        classService.getEnrollments(classId).catch(() => ({ data: [] as NonNullable<ClassItem['enrollments']>, count: 0 })),
        discussionBoardService
          .listThreads(classId, { limit: 50 })
          .catch(() => ({ data: { items: [] as DiscussionThreadSummary[], total: 0, page: 1, limit: 50 } })),
      ]);

      const enrollments = enrollmentsRes.data || classRes.data.enrollments || [];
      setClassItem({ ...classRes.data, enrollments });
      setModules(
        normalizeModulesOrder(
          (modulesRes.data || []).slice().sort((left, right) => left.order - right.order),
        ),
      );
      setAssessments(
        (assessmentsRes.data || []).slice().sort((left, right) => {
          return (
            Math.max(toTimestamp(right.updatedAt), toTimestamp(right.createdAt)) -
            Math.max(toTimestamp(left.updatedAt), toTimestamp(left.createdAt))
          );
        }),
      );
      setExtractions(
        (extractionsRes.data || []).slice().sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt)),
      );
      setAnnouncements(
        (announcementsRes.data || []).slice().sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt)),
      );
      setClassRecords(
        (classRecordsRes.data || []).slice().sort((left, right) => {
          return (
            Math.max(toTimestamp(right.updatedAt), toTimestamp(right.createdAt)) -
            Math.max(toTimestamp(left.updatedAt), toTimestamp(left.createdAt))
          );
        }),
      );
      const nextThreads = sortDiscussionThreads(discussionThreadsRes.data.items || []);
      setDiscussionThreads(nextThreads);
      setRoomDraft(classRes.data.room || '');
      setSchoolYearDraft(classRes.data.schoolYear || '');
      setSelectedDiscussionThreadId((current) => {
        if (current && nextThreads.some((thread) => thread.id === current)) {
          return current;
        }
        return nextThreads[0]?.id || null;
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load class detail'));
      setClassItem(null);
      setModules([]);
      setAssessments([]);
      setExtractions([]);
      setAnnouncements([]);
      setClassRecords([]);
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setSelectedModuleIds((current) => current.filter((id) => modules.some((module) => module.id === id)));
  }, [modules]);

  useEffect(() => {
    setSelectedAssessmentIds((current) =>
      current.filter((id) => assessments.some((assessment) => assessment.id === id)),
    );
  }, [assessments]);

  useEffect(() => {
    if (!selectedDiscussionThreadId) {
      setSelectedDiscussionThread(null);
      return;
    }

    let active = true;

    const loadDetail = async () => {
      try {
        const response = await discussionBoardService.getThread(classId, selectedDiscussionThreadId);
        if (!active) return;
        setSelectedDiscussionThread(response.data);
      } catch (error) {
        if (!active) return;
        setSelectedDiscussionThread(null);
        toast.error(getApiErrorMessage(error, 'Failed to load discussion thread'));
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [classId, selectedDiscussionThreadId]);

  const loadDiscussionThreads = useCallback(async () => {
    try {
      const response = await discussionBoardService.listThreads(classId, {
        limit: 50,
      });
      const nextThreads = sortDiscussionThreads(response.data.items || []);
      setDiscussionThreads(nextThreads);
      setSelectedDiscussionThreadId((current) => {
        if (current && nextThreads.some((thread) => thread.id === current)) {
          return current;
        }
        return nextThreads[0]?.id || null;
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load discussion threads'));
    }
  }, [classId]);

  const loadDiscussionThreadDetail = useCallback(
    async (threadId: string) => {
      try {
        const response = await discussionBoardService.getThread(classId, threadId);
        setSelectedDiscussionThread(response.data);
      } catch (error) {
        setSelectedDiscussionThread(null);
        toast.error(getApiErrorMessage(error, 'Failed to load discussion thread'));
      }
    },
    [classId],
  );

  useDiscussionRealtimeRefresh({
    enabled: activeTab === 'discussion',
    selectedThreadId: selectedDiscussionThreadId,
    refreshThreads: loadDiscussionThreads,
    refreshThread: loadDiscussionThreadDetail,
  });

  const executeControlledAction = async (
    actionKey: string,
    action: () => Promise<void>,
    options?: { reload?: boolean },
  ) => {
    try {
      setBusyAction(actionKey);
      await action();
      if (options?.reload !== false) {
        await loadAll();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const toggleClassStatus = () => {
    if (!classItem) return;

    if (!classItem.isActive) {
      toast.info('Archived classes can only be purged from the Classes archive list.');
      return;
    }

    setConfirmation({
      title: 'Archive class?',
      description:
        'Archiving clears the assigned teacher and completes active student enrollments. Archived classes cannot be restored; purge them from the archive list if they are no longer needed.',
      confirmLabel: 'Archive class',
      tone: 'danger',
      onConfirm: async () => {
        await executeControlledAction('class-status', async () => {
          await classService.toggleStatus(classItem.id);
          toast.success('Class archived');
        });
      },
    });
  };

  const toggleClassHiddenState = () => {
    if (!classItem) return;
    const hide = !classItem.isHidden;
    setConfirmation({
      title: hide ? 'Hide class from dashboards?' : 'Unhide class?',
      description: hide
        ? 'Hidden classes stay configured but disappear from default views.'
        : 'This class will become visible again on admin and teacher dashboards.',
      confirmLabel: hide ? 'Hide class' : 'Unhide class',
      tone: hide ? 'danger' : 'default',
      onConfirm: async () => {
        await executeControlledAction('class-visibility', async () => {
          if (hide) {
            await classService.hide(classItem.id);
            toast.success('Class hidden');
          } else {
            await classService.unhide(classItem.id);
            toast.success('Class unhidden');
          }
        });
      },
    });
  };

  const handleSaveMeta = async () => {
    if (!classItem) return;
    if (!roomDraft.trim()) {
      toast.error('Room is required');
      return;
    }

    try {
      setSavingMeta(true);
      await classService.update(classItem.id, {
        room: roomDraft.trim(),
        schoolYear: schoolYearDraft.trim() || classItem.schoolYear,
      });
      toast.success('Class metadata updated');
      await loadAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update class metadata'));
    } finally {
      setSavingMeta(false);
    }
  };

  const toggleModuleVisibility = async (module: ClassModule) => {
    await executeControlledAction(`module-visibility-${module.id}`, async () => {
      await moduleService.releaseCoreModule(module.id, {
        isVisible: !module.isVisible,
      });
      toast.success(module.isVisible ? 'Module hidden from students' : 'Module released to students');
    });
  };

  const toggleSelectAllModules = () => {
    setSelectedModuleIds((current) =>
      current.length === modules.length ? [] : modules.map((module) => module.id),
    );
  };

  const moveModuleOneStep = async (moduleId: string, direction: -1 | 1) => {
    if (isReorderingModules) return;
    const sourceIndex = modules.findIndex((module) => module.id === moduleId);
    if (sourceIndex < 0) return;
    const targetIndex = sourceIndex + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const previousModules = modules;
    const reordered = modules.slice();
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const normalized = normalizeModulesOrder(reordered);

    try {
      setIsReorderingModules(true);
      setModules(normalized);
      await moduleService.reorderByClass(
        classId,
        normalized.map((module) => ({ id: module.id, order: module.order })),
      );
      toast.success('Module order updated');
    } catch (error) {
      setModules(previousModules);
      toast.error(getApiErrorMessage(error, 'Failed to update module order'));
    } finally {
      setIsReorderingModules(false);
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    setConfirmation({
      title: 'Delete module?',
      description: 'This permanently removes the module from the class.',
      confirmLabel: 'Delete module',
      tone: 'danger',
      onConfirm: async () => {
        await executeControlledAction(`module-delete-${moduleId}`, async () => {
          await moduleService.delete(moduleId);
          setModules((current) => current.filter((module) => module.id !== moduleId));
          setSelectedModuleIds((current) => current.filter((id) => id !== moduleId));
          toast.success('Module deleted');
        }, { reload: false });
      },
    });
  };

  const handleBulkModuleVisibility = (isVisible: boolean) => {
    if (selectedModuleIds.length === 0) return;
    const ids = selectedModuleIds.slice();
    setConfirmation({
      title: isVisible ? 'Release selected modules?' : 'Hide selected modules?',
      description: isVisible
        ? 'Selected modules will become visible to students.'
        : 'Selected modules will be hidden from students.',
      confirmLabel: isVisible ? 'Release selected' : 'Hide selected',
      tone: isVisible ? 'default' : 'danger',
      onConfirm: async () => {
        await executeControlledAction(`module-bulk-visibility-${isVisible}`, async () => {
          await Promise.all(ids.map((moduleId) => moduleService.releaseCoreModule(moduleId, { isVisible })));
          toast.success(isVisible ? 'Selected modules released' : 'Selected modules hidden');
          setSelectedModuleIds([]);
        });
      },
    });
  };

  const handleBulkDeleteModules = () => {
    if (selectedModuleIds.length === 0) return;
    const ids = selectedModuleIds.slice();
    setConfirmation({
      title: `Delete ${ids.length} selected module(s)?`,
      description: 'This permanently removes the selected modules from the class.',
      confirmLabel: 'Delete selected',
      tone: 'danger',
      onConfirm: async () => {
        await executeControlledAction('module-bulk-delete', async () => {
          await Promise.all(ids.map((moduleId) => moduleService.delete(moduleId)));
          setModules((current) => current.filter((module) => !ids.includes(module.id)));
          setSelectedModuleIds([]);
          toast.success('Selected modules deleted');
        }, { reload: false });
      },
    });
  };

  const handleCreateModule = async () => {
    if (!moduleTitleDraft.trim()) {
      toast.error('Module title is required');
      return;
    }

    try {
      setCreatingModule(true);
      const response = await moduleService.create({
        classId,
        title: moduleTitleDraft.trim(),
        description: moduleDescriptionDraft.trim() || undefined,
        order: modules.length + 1,
      });
      setModules((current) =>
        normalizeModulesOrder([...current, response.data].sort((left, right) => left.order - right.order)),
      );
      setModuleDialogOpen(false);
      setModuleTitleDraft('');
      setModuleDescriptionDraft('');
      toast.success('Module created');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create module'));
    } finally {
      setCreatingModule(false);
    }
  };

  const toggleAssessmentPublication = async (assessment: Assessment) => {
    await executeControlledAction(`assessment-publication-${assessment.id}`, async () => {
      await assessmentService.releaseCore(assessment.id, {
        isPublished: !assessment.isPublished,
      });
      toast.success(assessment.isPublished ? 'Assessment moved to draft' : 'Assessment published');
    });
  };

  const toggleSelectAllAssessments = () => {
    setSelectedAssessmentIds((current) =>
      current.length === assessments.length ? [] : assessments.map((assessment) => assessment.id),
    );
  };

  const handleBulkAssessmentPublication = (isPublished: boolean) => {
    if (selectedAssessmentIds.length === 0) return;
    const ids = selectedAssessmentIds.slice();
    setConfirmation({
      title: isPublished ? 'Publish selected assessments?' : 'Move selected assessments to draft?',
      description: isPublished
        ? 'Selected assessments will become available to students.'
        : 'Selected assessments will be returned to draft state.',
      confirmLabel: isPublished ? 'Publish selected' : 'Set selected to draft',
      tone: 'default',
      onConfirm: async () => {
        await executeControlledAction(`assessment-bulk-publication-${isPublished}`, async () => {
          await Promise.all(ids.map((assessmentId) => assessmentService.releaseCore(assessmentId, { isPublished })));
          toast.success(isPublished ? 'Selected assessments published' : 'Selected assessments moved to draft');
          setSelectedAssessmentIds([]);
        });
      },
    });
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    setConfirmation({
      title: 'Delete assessment?',
      description: 'This permanently removes the assessment from the class.',
      confirmLabel: 'Delete assessment',
      tone: 'danger',
      onConfirm: async () => {
        await executeControlledAction(`assessment-delete-${assessmentId}`, async () => {
          await assessmentService.delete(assessmentId);
          setAssessments((current) => current.filter((assessment) => assessment.id !== assessmentId));
          setSelectedAssessmentIds((current) => current.filter((id) => id !== assessmentId));
          toast.success('Assessment deleted');
        }, { reload: false });
      },
    });
  };

  const handleBulkDeleteAssessments = () => {
    if (selectedAssessmentIds.length === 0) return;
    const ids = selectedAssessmentIds.slice();
    setConfirmation({
      title: `Delete ${ids.length} selected assessment(s)?`,
      description: 'This permanently removes the selected assessments from the class.',
      confirmLabel: 'Delete selected',
      tone: 'danger',
      onConfirm: async () => {
        await executeControlledAction('assessment-bulk-delete', async () => {
          await Promise.all(ids.map((assessmentId) => assessmentService.delete(assessmentId)));
          setAssessments((current) => current.filter((assessment) => !ids.includes(assessment.id)));
          setSelectedAssessmentIds([]);
          toast.success('Selected assessments deleted');
        }, { reload: false });
      },
    });
  };

  const handleCreateAssessment = async () => {
    if (!assessmentTitleDraft.trim()) {
      toast.error('Assessment title is required');
      return;
    }

    try {
      setCreatingAssessment(true);
      const response = await assessmentService.create({
        classId,
        title: assessmentTitleDraft.trim(),
        description: assessmentDescriptionDraft.trim() || undefined,
      });
      setAssessments((current) => [response.data, ...current]);
      setAssessmentDialogOpen(false);
      setAssessmentTitleDraft('');
      setAssessmentDescriptionDraft('');
      toast.success('Assessment created');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create assessment'));
    } finally {
      setCreatingAssessment(false);
    }
  };

  const toggleAnnouncementVisibility = async (announcement: Announcement) => {
    await executeControlledAction(`announcement-visibility-${announcement.id}`, async () => {
      await announcementService.releaseCore(classId, announcement.id, {
        isVisible: announcement.isVisible === false,
      });
      toast.success(announcement.isVisible === false ? 'Announcement visible' : 'Announcement hidden');
    });
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    setConfirmation({
      title: 'Delete announcement?',
      description: 'This permanently removes the announcement from the class feed.',
      confirmLabel: 'Delete announcement',
      tone: 'danger',
      onConfirm: async () => {
        await executeControlledAction(`announcement-delete-${announcementId}`, async () => {
          await announcementService.delete(classId, announcementId);
          setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));
          toast.success('Announcement deleted');
        }, { reload: false });
      },
    });
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitleDraft.trim()) {
      toast.error('Announcement title is required');
      return;
    }
    if (!announcementContentDraft.trim()) {
      toast.error('Announcement content is required');
      return;
    }

    try {
      setCreatingAnnouncement(true);
      const response = await announcementService.create(classId, {
        title: announcementTitleDraft.trim(),
        content: announcementContentDraft.trim(),
      });
      setAnnouncements((current) => [response.data, ...current]);
      setAnnouncementDialogOpen(false);
      setAnnouncementTitleDraft('');
      setAnnouncementContentDraft('');
      toast.success('Announcement created');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create announcement'));
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const handleDeleteExtraction = (extractionId: string) => {
    setConfirmation({
      title: 'Delete extraction?',
      description: 'This removes the extraction record from the class workspace.',
      confirmLabel: 'Delete extraction',
      tone: 'danger',
      onConfirm: async () => {
        await executeControlledAction(`extraction-delete-${extractionId}`, async () => {
          await extractionService.delete(extractionId);
          setExtractions((current) => current.filter((extraction) => extraction.id !== extractionId));
          toast.success('Extraction deleted');
        }, { reload: false });
      },
    });
  };

  const handleDiscussionThreadAction = async (
    threadId: string,
    action: 'publish' | 'close' | 'reopen' | 'archive',
  ) => {
    if (busyDiscussionThreadId) return;
    try {
      setBusyDiscussionThreadId(threadId);

      if (action === 'archive') {
        await discussionBoardService.archiveThread(classId, threadId);
        setDiscussionThreads((current) => current.filter((thread) => thread.id !== threadId));
        if (selectedDiscussionThreadId === threadId) {
          setSelectedDiscussionThreadId(null);
          setSelectedDiscussionThread(null);
        }
        toast.success('Discussion thread archived');
        return;
      }

      const response =
        action === 'publish'
          ? await discussionBoardService.publishThread(classId, threadId)
          : action === 'close'
            ? await discussionBoardService.closeThread(classId, threadId)
            : await discussionBoardService.reopenThread(classId, threadId);

      const updatedThread = response.data;
      setDiscussionThreads((current) =>
        sortDiscussionThreads(
          current.map((thread) => (thread.id === updatedThread.id ? updatedThread : thread)),
        ),
      );
      if (selectedDiscussionThreadId === updatedThread.id) {
        setSelectedDiscussionThread(updatedThread);
      }
      toast.success(
        action === 'publish'
          ? 'Discussion thread published'
          : action === 'close'
            ? 'Discussion thread closed'
            : 'Discussion thread reopened',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update discussion thread'));
    } finally {
      setBusyDiscussionThreadId(null);
    }
  };

  const handleDeleteDiscussionComment = (comment: DiscussionComment) => {
    if (!selectedDiscussionThread) return;
    setConfirmation({
      title: 'Delete comment?',
      description: 'This removes the selected reply from the discussion thread.',
      confirmLabel: 'Delete comment',
      tone: 'danger',
      onConfirm: async () => {
        try {
          setBusyDiscussionCommentId(comment.id);
          await discussionBoardService.deleteComment(classId, selectedDiscussionThread.id, comment.id);
          const response = await discussionBoardService.getThread(classId, selectedDiscussionThread.id);
          setSelectedDiscussionThread(response.data);
          setDiscussionThreads((current) =>
            current.map((thread) =>
              thread.id === response.data.id
                ? { ...thread, commentCount: response.data.commentCount, status: response.data.status }
                : thread,
            ),
          );
          toast.success('Comment deleted');
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to delete comment'));
        } finally {
          setBusyDiscussionCommentId(null);
        }
      },
    });
  };

  const handleSubmitDiscussionReport = async () => {
    if (!selectedDiscussionThread || !reportDialogComment || reportingDiscussionComment) return;
    try {
      setReportingDiscussionComment(true);
      await discussionBoardService.reportComment(
        classId,
        selectedDiscussionThread.id,
        reportDialogComment.id,
        {
          reasonCode: discussionReportReason,
          notes: discussionReportNotes.trim() || undefined,
        },
      );
      toast.success('Comment flagged for moderator follow-up');
      setReportDialogComment(null);
      setDiscussionReportNotes('');
      setDiscussionReportReason('inappropriate');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to report comment'));
    } finally {
      setReportingDiscussionComment(false);
    }
  };

  const handleRemoveStudent = (studentId: string, enrollmentId: string) => {
    setConfirmation({
      title: 'Remove student from class?',
      description: 'This unenrolls the student from the class roster.',
      confirmLabel: 'Remove student',
      tone: 'danger',
      onConfirm: async () => {
        try {
          setBusyEnrollmentId(enrollmentId);
          await classService.unenrollStudent(classId, studentId);
          setClassItem((current) =>
            current
              ? {
                  ...current,
                  enrollments: (current.enrollments || []).filter(
                    (enrollment) => enrollment.id !== enrollmentId,
                  ),
                }
              : current,
          );
          toast.success('Student removed from class');
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to remove student'));
        } finally {
          setBusyEnrollmentId(null);
        }
      },
    });
  };

  const workspaceTabs = useMemo<ClassWorkspaceTabItem[]>(
    () =>
      WORKSPACE_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        href: `/dashboard/admin/classes/${classId}?view=${tab.key}`,
        icon: tab.icon,
        active: activeTab === tab.key,
      })),
    [activeTab, classId],
  );

  const classInfoLine = useMemo(() => buildClassInfoLine(classItem), [classItem]);
  const scheduleLine = useMemo(() => formatScheduleLine(classItem), [classItem]);
  const teacherName = useMemo(() => formatTeacherName(classItem), [classItem]);
  const enrollments = classItem?.enrollments || [];
  const allModulesSelected = modules.length > 0 && selectedModuleIds.length === modules.length;
  const allAssessmentsSelected =
    assessments.length > 0 && selectedAssessmentIds.length === assessments.length;
  const calendarItems = useMemo(() => {
    const assessmentItems = assessments
      .filter((assessment) => Boolean(assessment.dueDate))
      .map((assessment) => ({
        id: `assessment-${assessment.id}`,
        title: assessment.title,
        subtitle: assessment.isPublished ? 'Published assessment' : 'Draft assessment',
        type: 'Assessment',
        date: assessment.dueDate || '',
      }));

    const announcementItems = announcements
      .filter((announcement) => Boolean(announcement.scheduledAt || announcement.createdAt))
      .map((announcement) => ({
        id: `announcement-${announcement.id}`,
        title: announcement.title,
        subtitle: announcement.isVisible === false ? 'Hidden announcement' : 'Visible announcement',
        type: 'Announcement',
        date: announcement.scheduledAt || announcement.createdAt || '',
      }));

    return [...assessmentItems, ...announcementItems]
      .filter((item) => item.date)
      .sort((left, right) => toTimestamp(left.date) - toTimestamp(right.date));
  }, [announcements, assessments]);

  const classRecordSummary = useMemo(() => {
    return classRecords.map((record) => ({
      record,
      summary: summarizeClassRecord(record),
    }));
  }, [classRecords]);

  if (loading) {
    return (
      <div className="teacher-class-workspace-wrap space-y-5">
        <Skeleton className="h-44 rounded-[2rem]" />
        <Skeleton className="h-16 rounded-[1.5rem]" />
        <Skeleton className="h-[32rem] rounded-[2rem]" />
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="teacher-class-workspace-wrap">
        <div className="teacher-class-workspace__panel">
          <div className="teacher-class-workspace__empty">Class not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-class-workspace-wrap">
      <ClassWorkspaceShell
        backHref="/dashboard/admin/classes"
        backLabel={
          <>
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </>
        }
        icon={<ShieldCheck className="h-5 w-5" />}
        title={classItem.subjectName}
        subtitle={classInfoLine}
        metaItems={[
          { key: 'students', label: `${enrollments.length} students` },
          { key: 'modules', label: `${modules.length} modules` },
          { key: 'teacher', label: teacherName },
        ]}
        tabs={workspaceTabs}
        heroActions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline" className="admin-button-outline rounded-xl font-black">
              <Link href={`/dashboard/admin/classes/${classId}/edit`}>Edit Class</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="admin-button-outline rounded-xl font-black"
              onClick={toggleClassHiddenState}
              disabled={busyAction === 'class-visibility'}
            >
              {classItem.isHidden ? (
                <>
                  <Eye className="h-4 w-4" />
                  Unhide
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide
                </>
              )}
            </Button>
            {classItem.isActive ? (
              <Button
                type="button"
                className="admin-button-solid rounded-xl font-black"
                onClick={toggleClassStatus}
                disabled={busyAction === 'class-status'}
              >
                <Power className="h-4 w-4" />
                Archive
              </Button>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
                Archived classes can only be purged from the Classes archive list.
              </div>
            )}
          </div>
        }
      >
        <section className="teacher-class-workspace__panel">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1.3fr]">
            <div className="rounded-[1.5rem] border border-[var(--admin-outline)] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="teacher-class-workspace__section-title">Admin Operations</h2>
                  <p className="mt-1 text-sm text-[#607089]">
                    Keep class metadata and operational state aligned without leaving the workspace.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                    classItem.isActive ? getStatusClasses('success') : getStatusClasses('warning')
                  }`}
                >
                  {classItem.isActive ? 'Active' : 'Archived'}
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#6a7a90]">Room</span>
                  <Input value={roomDraft} onChange={(event) => setRoomDraft(event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#6a7a90]">School Year</span>
                  <Input
                    value={schoolYearDraft}
                    onChange={(event) => setSchoolYearDraft(event.target.value)}
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="admin-button-solid rounded-xl font-black"
                  onClick={() => void handleSaveMeta()}
                  disabled={savingMeta}
                >
                  {savingMeta ? 'Saving...' : 'Save Metadata'}
                </Button>
                <Button asChild variant="outline" className="admin-button-outline rounded-xl font-black">
                  <Link href="/dashboard/admin/calendar">Admin Calendar</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--admin-outline)] bg-white p-5">
              <h2 className="teacher-class-workspace__section-title">Command Snapshot</h2>
              <p className="mt-1 text-sm text-[#607089]">{scheduleLine}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-[#dce5f2] bg-[#f8fbff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6a7a90]">Students</p>
                  <p className="mt-2 text-2xl font-black text-[#14233d]">{enrollments.length}</p>
                </article>
                <article className="rounded-2xl border border-[#dce5f2] bg-[#f8fbff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6a7a90]">Assessments</p>
                  <p className="mt-2 text-2xl font-black text-[#14233d]">{assessments.length}</p>
                </article>
                <article className="rounded-2xl border border-[#dce5f2] bg-[#f8fbff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6a7a90]">Announcements</p>
                  <p className="mt-2 text-2xl font-black text-[#14233d]">{announcements.length}</p>
                </article>
                <article className="rounded-2xl border border-[#dce5f2] bg-[#f8fbff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6a7a90]">Extractions</p>
                  <p className="mt-2 text-2xl font-black text-[#14233d]">{extractions.length}</p>
                </article>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" className="admin-button-outline rounded-xl font-black">
                  <Link href={`/dashboard/admin/sections/${classItem.sectionId}/roster`}>Section Roster</Link>
                </Button>
                <Button asChild variant="outline" className="admin-button-outline rounded-xl font-black">
                  <Link href={`/dashboard/admin/classes/${classItem.id}/students/add`}>
                    Add Class Students
                  </Link>
                </Button>
                <Button asChild variant="outline" className="admin-button-outline rounded-xl font-black">
                  <Link href={`/dashboard/admin/users/${classItem.teacherId}`}>Teacher Profile</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {activeTab === 'modules' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Modules</h2>
                <p>{modules.length} module{modules.length === 1 ? '' : 's'} with direct release and order control.</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline"
                  onClick={toggleSelectAllModules}
                >
                  {allModulesSelected ? 'Clear Selection' : 'Select All'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline"
                  disabled={selectedModuleIds.length === 0}
                  onClick={() => handleBulkModuleVisibility(true)}
                >
                  Release Selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline"
                  disabled={selectedModuleIds.length === 0}
                  onClick={() => handleBulkModuleVisibility(false)}
                >
                  Hide Selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                  disabled={selectedModuleIds.length === 0}
                  onClick={handleBulkDeleteModules}
                >
                  Delete Selected
                </Button>
                <Button
                  type="button"
                  className="teacher-class-workspace__solid"
                  onClick={() => setModuleDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Module
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {modules.length === 0 ? (
                <div className="teacher-class-workspace__empty">No modules yet.</div>
              ) : (
                modules.map((module, index) => {
                  const selected = selectedModuleIds.includes(module.id);
                  return (
                    <article
                      key={module.id}
                      className="rounded-[1.6rem] border border-[#dce5f2] bg-white p-5 shadow-[0_20px_40px_rgba(16,37,74,0.08)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex flex-1 items-start gap-4">
                          <input
                            aria-label={`Select ${module.title}`}
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-[#b8c6dc]"
                            checked={selected}
                            onChange={() =>
                              setSelectedModuleIds((current) =>
                                current.includes(module.id)
                                  ? current.filter((id) => id !== module.id)
                                  : [...current, module.id],
                              )
                            }
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#22457f]">
                                Module {index + 1}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                                  module.isVisible ? getStatusClasses('success') : getStatusClasses('warning')
                                }`}
                              >
                                {module.isVisible ? 'Visible' : 'Hidden'}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                                  module.isLocked ? getStatusClasses('danger') : getStatusClasses('default')
                                }`}
                              >
                                {module.isLocked ? 'Locked' : 'Unlocked'}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-black text-[#12233f]">{module.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-[#607089]">
                              {stripHtml(module.description) || 'No module description yet.'}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                              <span>{countModuleLessons(module)} lessons</span>
                              <span>{countModuleAssessments(module)} assessments</span>
                              <span>{countModuleFiles(module)} files</span>
                              <span>{module.sections.length} sections</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline"
                            disabled={isReorderingModules || index === 0}
                            onClick={() => void moveModuleOneStep(module.id, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                            Up
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline"
                            disabled={isReorderingModules || index === modules.length - 1}
                            onClick={() => void moveModuleOneStep(module.id, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                            Down
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline"
                            disabled={busyAction === `module-visibility-${module.id}`}
                            onClick={() => void toggleModuleVisibility(module)}
                          >
                            {module.isVisible ? (
                              <>
                                <EyeOff className="h-4 w-4" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4" />
                                Release
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                            onClick={() => handleDeleteModule(module.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'assignments' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Assignments</h2>
                <p>{assessments.length} assessment{assessments.length === 1 ? '' : 's'} with publication control.</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline"
                  onClick={toggleSelectAllAssessments}
                >
                  {allAssessmentsSelected ? 'Clear Selection' : 'Select All'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline"
                  disabled={selectedAssessmentIds.length === 0}
                  onClick={() => handleBulkAssessmentPublication(true)}
                >
                  Publish Selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline"
                  disabled={selectedAssessmentIds.length === 0}
                  onClick={() => handleBulkAssessmentPublication(false)}
                >
                  Set Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                  disabled={selectedAssessmentIds.length === 0}
                  onClick={handleBulkDeleteAssessments}
                >
                  Delete Selected
                </Button>
                <Button
                  type="button"
                  className="teacher-class-workspace__solid"
                  onClick={() => setAssessmentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Assessment
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {assessments.length === 0 ? (
                <div className="teacher-class-workspace__empty">No assessments yet.</div>
              ) : (
                assessments.map((assessment) => {
                  const selected = selectedAssessmentIds.includes(assessment.id);
                  return (
                    <article
                      key={assessment.id}
                      className="rounded-[1.6rem] border border-[#dce5f2] bg-white p-5 shadow-[0_18px_36px_rgba(16,37,74,0.08)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex flex-1 items-start gap-4">
                          <input
                            aria-label={`Select ${assessment.title}`}
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-[#b8c6dc]"
                            checked={selected}
                            onChange={() =>
                              setSelectedAssessmentIds((current) =>
                                current.includes(assessment.id)
                                  ? current.filter((id) => id !== assessment.id)
                                  : [...current, assessment.id],
                              )
                            }
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#22457f]">
                                {assessment.type}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                                  assessment.isPublished ? getStatusClasses('success') : getStatusClasses('warning')
                                }`}
                              >
                                {assessment.isPublished ? 'Published' : 'Draft'}
                              </span>
                              {assessment.classRecordPlacement?.itemId ? (
                                <span className="rounded-full bg-[#eef7ec] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#1d6a41]">
                                  Class record linked
                                </span>
                              ) : null}
                            </div>
                            <h3 className="mt-3 text-xl font-black text-[#12233f]">{assessment.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-[#607089]">
                              {stripHtml(assessment.description) || 'No assessment description yet.'}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                              <span>{assessment.questions?.length ?? 0} questions</span>
                              <span>{assessment.totalPoints ?? 0} total points</span>
                              <span>{formatDateOnly(assessment.dueDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline"
                            disabled={busyAction === `assessment-publication-${assessment.id}`}
                            onClick={() => void toggleAssessmentPublication(assessment)}
                          >
                            {assessment.isPublished ? 'Set Draft' : 'Publish'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                            onClick={() => handleDeleteAssessment(assessment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'extraction' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Extraction</h2>
                <p>Monitor AI extraction progress, quality flags, and cleanup actions for this class.</p>
              </div>
            </div>
            <div className="space-y-4">
              {extractions.length === 0 ? (
                <div className="teacher-class-workspace__empty">No extraction runs found for this class.</div>
              ) : (
                extractions.map((extraction) => (
                  <article
                    key={extraction.id}
                    className="rounded-[1.6rem] border border-[#dce5f2] bg-white p-5 shadow-[0_18px_36px_rgba(16,37,74,0.08)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                              extraction.extractionStatus === 'completed' || extraction.extractionStatus === 'applied'
                                ? getStatusClasses('success')
                                : extraction.extractionStatus === 'failed'
                                  ? getStatusClasses('danger')
                                  : getStatusClasses('warning')
                            }`}
                          >
                            {extraction.extractionStatus}
                          </span>
                          {extraction.reviewRequired ? (
                            <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#885400]">
                              Review required
                            </span>
                          ) : null}
                          {extraction.isApplied ? (
                            <span className="rounded-full bg-[#e6f6ed] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#0f6b3d]">
                              Applied
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-xl font-black text-[#12233f]">
                          {extraction.originalName || 'Untitled source file'}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#607089]">
                          {extraction.structuredContent?.description ||
                            extraction.errorMessage ||
                            'No extraction summary available.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                          <span>{extraction.progressPercent}% progress</span>
                          <span>{extraction.structuredContent?.sections.length ?? 0} sections</span>
                          <span>Created {formatDateTime(extraction.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                          onClick={() => handleDeleteExtraction(extraction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'announcements' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Announcements</h2>
                <p>Control bulletin visibility and create new admin notices directly from the class workspace.</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Button
                  type="button"
                  className="teacher-class-workspace__solid"
                  onClick={() => setAnnouncementDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create Announcement
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="teacher-class-workspace__empty">No announcements posted for this class.</div>
              ) : (
                announcements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-[1.6rem] border border-[#dce5f2] bg-white p-5 shadow-[0_18px_36px_rgba(16,37,74,0.08)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {announcement.isPinned ? (
                            <span className="rounded-full bg-[#eef7ec] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#1d6a41]">
                              Pinned
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                              announcement.isVisible === false
                                ? getStatusClasses('warning')
                                : getStatusClasses('success')
                            }`}
                          >
                            {announcement.isVisible === false ? 'Hidden' : 'Visible'}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-black text-[#12233f]">{announcement.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#607089]">
                          {stripHtml(announcement.content) || 'No announcement content.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                          <span>Created {formatDateTime(announcement.createdAt)}</span>
                          {announcement.scheduledAt ? (
                            <span>Scheduled {formatDateTime(announcement.scheduledAt)}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="teacher-class-workspace__outline"
                          disabled={busyAction === `announcement-visibility-${announcement.id}`}
                          onClick={() => void toggleAnnouncementVisibility(announcement)}
                        >
                          {announcement.isVisible === false ? 'Show' : 'Hide'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'discussion' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Discussion Moderation</h2>
                <p>Review thread state, lock or reopen discussion, and moderate replies without leaving the class page.</p>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                {discussionThreads.length === 0 ? (
                  <div className="teacher-class-workspace__empty">No discussion threads found.</div>
                ) : (
                  discussionThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                        selectedDiscussionThreadId === thread.id
                          ? 'border-[#1e4f96] bg-[#f4f8ff]'
                          : 'border-[#dce5f2] bg-white hover:border-[#b6cae7]'
                      }`}
                      onClick={() => setSelectedDiscussionThreadId(thread.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                            thread.status === 'published'
                              ? getStatusClasses('success')
                              : thread.status === 'closed'
                                ? getStatusClasses('warning')
                                : thread.status === 'archived'
                                  ? getStatusClasses('danger')
                                  : getStatusClasses('default')
                          }`}
                        >
                          {thread.status}
                        </span>
                        {thread.isPinned ? (
                          <span className="rounded-full bg-[#eef7ec] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#1d6a41]">
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-base font-black text-[#12233f]">{thread.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#607089]">
                        {stripHtml(thread.bodyHtml) || 'No thread description.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                        <span>{thread.commentCount} comments</span>
                        <span>{formatDateTime(thread.updatedAt || thread.createdAt)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-[1.6rem] border border-[#dce5f2] bg-white p-5 shadow-[0_18px_36px_rgba(16,37,74,0.08)]">
                {!selectedDiscussionThread ? (
                  <div className="teacher-class-workspace__empty">Select a thread to inspect comments and moderation actions.</div>
                ) : (
                  <>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                              selectedDiscussionThread.status === 'published'
                                ? getStatusClasses('success')
                                : selectedDiscussionThread.status === 'closed'
                                  ? getStatusClasses('warning')
                                  : selectedDiscussionThread.status === 'archived'
                                    ? getStatusClasses('danger')
                                    : getStatusClasses('default')
                            }`}
                          >
                            {selectedDiscussionThread.status}
                          </span>
                          <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#22457f]">
                            {selectedDiscussionThread.commentCount} comments
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-black text-[#12233f]">
                          {selectedDiscussionThread.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#607089]">
                          {stripHtml(selectedDiscussionThread.bodyHtml) || 'No thread content.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedDiscussionThread.status === 'draft' ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline"
                            disabled={busyDiscussionThreadId === selectedDiscussionThread.id}
                            onClick={() =>
                              void handleDiscussionThreadAction(selectedDiscussionThread.id, 'publish')
                            }
                          >
                            Publish
                          </Button>
                        ) : null}
                        {selectedDiscussionThread.status === 'published' ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline"
                            disabled={busyDiscussionThreadId === selectedDiscussionThread.id}
                            onClick={() =>
                              void handleDiscussionThreadAction(selectedDiscussionThread.id, 'close')
                            }
                          >
                            Close
                          </Button>
                        ) : null}
                        {selectedDiscussionThread.status === 'closed' ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="teacher-class-workspace__outline"
                            disabled={busyDiscussionThreadId === selectedDiscussionThread.id}
                            onClick={() =>
                              void handleDiscussionThreadAction(selectedDiscussionThread.id, 'reopen')
                            }
                          >
                            Reopen
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                          disabled={busyDiscussionThreadId === selectedDiscussionThread.id}
                          onClick={() =>
                            void handleDiscussionThreadAction(selectedDiscussionThread.id, 'archive')
                          }
                        >
                          Archive
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {selectedDiscussionThread.comments.length === 0 ? (
                        <div className="teacher-class-workspace__empty">No comments yet.</div>
                      ) : (
                        selectedDiscussionThread.comments.map((comment) => (
                          <article
                            key={comment.id}
                            className="rounded-[1.25rem] border border-[#dce5f2] bg-[#f9fbff] p-4"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <strong className="text-sm font-black text-[#12233f]">
                                  {getDiscussionAuthorName(comment.author)}
                                </strong>
                                <p className="mt-2 text-sm leading-6 text-[#607089]">
                                  {stripHtml(comment.bodyHtml) || 'Image-only reply'}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                                  <span>{formatDateTime(comment.createdAt)}</span>
                                  <span>{comment.reactions.total} reactions</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="teacher-class-workspace__outline"
                                  onClick={() => {
                                    setReportDialogComment(comment);
                                    setDiscussionReportReason('inappropriate');
                                    setDiscussionReportNotes('');
                                  }}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  Report
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                                  disabled={busyDiscussionCommentId === comment.id}
                                  onClick={() => handleDeleteDiscussionComment(comment)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'class-record' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Class Record</h2>
                <p>Oversight-first view of quarter workbooks and linked grading structure for this class.</p>
              </div>
            </div>
            <div className="space-y-4">
              {classRecordSummary.length === 0 ? (
                <div className="teacher-class-workspace__empty">No class record workbooks found for this class.</div>
              ) : (
                classRecordSummary.map(({ record, summary }) => (
                  <article
                    key={record.id}
                    className="rounded-[1.6rem] border border-[#dce5f2] bg-white p-5 shadow-[0_18px_36px_rgba(16,37,74,0.08)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#22457f]">
                            {record.gradingPeriod}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                              record.status === 'finalized'
                                ? getStatusClasses('success')
                                : record.status === 'locked'
                                  ? getStatusClasses('danger')
                                  : getStatusClasses('warning')
                            }`}
                          >
                            {record.status}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-black text-[#12233f]">
                          {record.gradingPeriod} workbook
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                          <span>{summary.categories} categories</span>
                          <span>{summary.items} record items</span>
                          <span>Updated {formatDateTime(record.updatedAt || record.createdAt)}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#dce5f2] bg-[#f8fbff] px-4 py-3 text-sm text-[#51657f]">
                        Read-only oversight surface. Use linked class-record tools for score entry or workbook exports.
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'students' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Students</h2>
                <p>Manage the current roster, open user profiles, and remove enrollments from the class.</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Button asChild variant="outline" className="teacher-class-workspace__outline">
                  <Link href={`/dashboard/admin/sections/${classItem.sectionId}/roster`}>Open Section Roster</Link>
                </Button>
                <Button asChild className="teacher-class-workspace__solid">
                  <Link href={`/dashboard/admin/classes/${classItem.id}/students/add`}>
                    Add Students
                  </Link>
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {enrollments.length === 0 ? (
                <div className="teacher-class-workspace__empty">No students are enrolled in this class.</div>
              ) : (
                enrollments.map((enrollment) => (
                  <article
                    key={enrollment.id}
                    className="rounded-[1.35rem] border border-[#dce5f2] bg-white p-4 shadow-[0_14px_28px_rgba(16,37,74,0.06)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-base font-black text-[#12233f]">{formatStudentName(enrollment)}</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#607089]">
                          <span>{enrollment.student?.email || 'No email'}</span>
                          <span>{enrollment.student?.lrn || enrollment.student?.profile?.lrn || 'No LRN'}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="teacher-class-workspace__outline">
                          <Link href={`/dashboard/admin/users/${enrollment.studentId}`}>
                            <UserCog className="h-4 w-4" />
                            Open User
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                          disabled={busyEnrollmentId === enrollment.id}
                          onClick={() => handleRemoveStudent(enrollment.studentId, enrollment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'calendar' ? (
          <section className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Calendar</h2>
                <p>Unified view of due dates and scheduled announcements attached to this class.</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Button asChild variant="outline" className="teacher-class-workspace__outline">
                  <Link href="/dashboard/admin/calendar">
                    <CalendarDays className="h-4 w-4" />
                    Full Calendar
                  </Link>
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {calendarItems.length === 0 ? (
                <div className="teacher-class-workspace__empty">No scheduled class events yet.</div>
              ) : (
                calendarItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.35rem] border border-[#dce5f2] bg-white p-4 shadow-[0_14px_28px_rgba(16,37,74,0.06)]"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#22457f]">
                            {item.type}
                          </span>
                        </div>
                        <h3 className="mt-3 text-base font-black text-[#12233f]">{item.title}</h3>
                        <p className="mt-1 text-sm text-[#607089]">{item.subtitle}</p>
                      </div>
                      <div className="rounded-full bg-[#f3f7fd] px-4 py-2 text-sm font-bold text-[#37577f]">
                        {formatDateTime(item.date)}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
      </ClassWorkspaceShell>

      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent variant="admin">
          <DialogHeader>
            <DialogTitle>Create Module</DialogTitle>
            <DialogDescription>Add a new module directly to this class workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="module-title">Module title</Label>
              <Input
                id="module-title"
                value={moduleTitleDraft}
                onChange={(event) => setModuleTitleDraft(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="module-description">Description</Label>
              <Textarea
                id="module-description"
                value={moduleDescriptionDraft}
                onChange={(event) => setModuleDescriptionDraft(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateModule()} disabled={creatingModule}>
              {creatingModule ? 'Creating...' : 'Create Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent variant="admin">
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>Create a new assessment shell for this class.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="assessment-title">Assessment title</Label>
              <Input
                id="assessment-title"
                value={assessmentTitleDraft}
                onChange={(event) => setAssessmentTitleDraft(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assessment-description">Description</Label>
              <Textarea
                id="assessment-description"
                value={assessmentDescriptionDraft}
                onChange={(event) => setAssessmentDescriptionDraft(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateAssessment()} disabled={creatingAssessment}>
              {creatingAssessment ? 'Creating...' : 'Create Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent variant="admin">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Post a new announcement to this class feed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="announcement-title">Announcement title</Label>
              <Input
                id="announcement-title"
                value={announcementTitleDraft}
                onChange={(event) => setAnnouncementTitleDraft(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-content">Content</Label>
              <Textarea
                id="announcement-content"
                value={announcementContentDraft}
                onChange={(event) => setAnnouncementContentDraft(event.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateAnnouncement()} disabled={creatingAnnouncement}>
              {creatingAnnouncement ? 'Posting...' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportDialogComment)}
        onOpenChange={(open) => {
          if (!open && !reportingDiscussionComment) {
            setReportDialogComment(null);
            setDiscussionReportReason('inappropriate');
            setDiscussionReportNotes('');
          }
        }}
      >
        <DialogContent variant="admin">
          <DialogHeader>
            <DialogTitle>Report Comment</DialogTitle>
            <DialogDescription>Send this reply into the moderation audit trail for follow-up.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-[#dce5f2] bg-[#f8fbff] p-4 text-sm text-[#607089]">
              {reportDialogComment ? stripHtml(reportDialogComment.bodyHtml) || 'Image-only reply' : 'No comment selected'}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">Reason</Label>
              <select
                id="report-reason"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={discussionReportReason}
                onChange={(event) =>
                  setDiscussionReportReason(event.target.value as DiscussionCommentReportReason)
                }
              >
                {DISCUSSION_REPORT_REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-notes">Moderator notes</Label>
              <Textarea
                id="report-notes"
                value={discussionReportNotes}
                onChange={(event) => setDiscussionReportNotes(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportDialogComment(null);
                setDiscussionReportNotes('');
                setDiscussionReportReason('inappropriate');
              }}
              disabled={reportingDiscussionComment}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitDiscussionReport()} disabled={reportingDiscussionComment}>
              {reportingDiscussionComment ? 'Reporting...' : 'Report Comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
