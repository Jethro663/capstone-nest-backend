'use client';

import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
 
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { aiService } from '@/services/ai-service';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { extractionService } from '@/services/extraction-service';
import { fileService } from '@/services/file-service';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { LayoutGrid, List, ArrowUpDown, GripVertical, ChevronLeft, ChevronRight, ArrowLeft, BookOpen, CalendarRange, GraduationCap, Users, PencilLine, Rocket, Sparkles, Target, ClipboardList } from 'lucide-react';
 
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import type { CreateAnnouncementDto, UpdateAnnouncementDto } from '@/types/announcement';
import { getDescription } from '@/utils/helpers';
import { cn } from '@/utils/cn';
import { TeacherClassRecordWorkbook } from '@/components/teacher/class-record/TeacherClassRecordWorkbook';
import { TeacherPageShell, TeacherSectionCard, TeacherStatCard } from '@/components/teacher/TeacherPageShell';
import { useTeacherClassRecord } from '@/hooks/use-teacher-class-record';
 
import type { ClassItem, Enrollment } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';
import type { Extraction } from '@/types/extraction';
import type { UploadedFile } from '@/types/file';
const ASSESSMENT_CATEGORIES: Array<{
  value: 'written_work' | 'performance_task' | 'quarterly_assessment' | 'drafts';
  label: string;
}> = [
  { value: 'written_work', label: 'Written Works' },
  { value: 'performance_task', label: 'Performance Tasks' },
  { value: 'quarterly_assessment', label: 'Quarterly Assessment' },
  { value: 'drafts', label: 'Drafts' },
];

const LESSON_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
type LessonStatusFilter = 'all' | 'published' | 'draft';

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}
 

export default function TeacherClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { role } = useAuth();

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Extract module states
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<UploadedFile[]>([]);
  const [selectedLibraryFileId, setSelectedLibraryFileId] = useState('');
  const [reindexing, setReindexing] = useState(false);
 
  // Form states
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [activeTab, setActiveTab] = useState('lessons');
  const [assessmentCategoryTab, setAssessmentCategoryTab] = useState<'written_work' | 'performance_task' | 'quarterly_assessment' | 'drafts'>('written_work');
  const [assessmentViewMode, setAssessmentViewMode] = useState<'list' | 'grid'>('list');
  const [assessmentSortOrder, setAssessmentSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [lessonStatusFilter, setLessonStatusFilter] = useState<LessonStatusFilter>('all');
  const [bulkLessonAction, setBulkLessonAction] = useState<'selecting-all' | 'publish' | 'unpublish' | 'delete' | null>(null);
  const [lessonPageSize, setLessonPageSize] = useState(LESSON_PAGE_SIZE_OPTIONS[0]);
  const [lessonPage, setLessonPage] = useState(1);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [savingLessonOrder, setSavingLessonOrder] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const classRecordState = useTeacherClassRecord(classId);

  const categorizedAssessments = useMemo(() => {
    const filtered = assessments.filter((assessment) => {
      if (assessmentCategoryTab === 'drafts') {
        return !assessment.classRecordCategory || !assessment.isPublished;
      }
      return assessment.classRecordCategory === assessmentCategoryTab;
    });

    const withDate = filtered
      .map((assessment) => ({
        assessment,
        dueTs: assessment.dueDate ? new Date(assessment.dueDate).getTime() : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => {
        if (a.dueTs === b.dueTs) {
          return new Date(b.assessment.createdAt ?? 0).getTime() - new Date(a.assessment.createdAt ?? 0).getTime();
        }
        return assessmentSortOrder === 'asc' ? a.dueTs - b.dueTs : b.dueTs - a.dueTs;
      })
      .map((entry) => entry.assessment);

    return withDate.reduce<Record<string, Assessment[]>>((groups, assessment) => {
      const key = assessment.dueDate
        ? new Date(assessment.dueDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'No due date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(assessment);
      return groups;
    }, {});
  }, [assessments, assessmentCategoryTab, assessmentSortOrder]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.order - b.order),
    [lessons],
  );

  const filteredLessons = useMemo(() => {
    return sortedLessons.filter((lesson) => {
      if (lessonStatusFilter === 'published') {
        return !lesson.isDraft;
      }
      if (lessonStatusFilter === 'draft') {
        return lesson.isDraft;
      }
      return true;
    });
  }, [lessonStatusFilter, sortedLessons]);

  const lessonTotal = filteredLessons.length;
  const lessonTotalPages = Math.max(1, Math.ceil(lessonTotal / lessonPageSize));
  const pagedLessons = filteredLessons.slice(
    (lessonPage - 1) * lessonPageSize,
    lessonPage * lessonPageSize,
  );

  const selectedLessonIdSet = useMemo(
    () => new Set(selectedLessonIds),
    [selectedLessonIds],
  );

  const allVisibleLessonsSelected =
    pagedLessons.length > 0 &&
    pagedLessons.every((lesson) => selectedLessonIdSet.has(lesson.id));

  const canReorderLessons =
    lessonStatusFilter === 'all' && sortedLessons.length > 1;
  const lessonOrderDirty = lessons.some((lesson, index) => lesson.order !== index + 1);
 

  const publishedLessonCount = lessons.filter((lesson) => !lesson.isDraft).length;
  const draftLessonCount = lessons.filter((lesson) => lesson.isDraft).length;
  const completedAssessmentCount = assessments.filter((assessment) => assessment.isPublished).length;

  const handleLessonPageChange = (nextPage: number) => {
    setLessonPage(Math.min(Math.max(nextPage, 1), lessonTotalPages));
  };

  const handleLessonStatusFilterChange = (nextFilter: LessonStatusFilter) => {
    setLessonStatusFilter(nextFilter);
    setLessonPage(1);
    setSelectedLessonIds([]);
  };

  const handleLessonPageSizeChange = (nextSize: string) => {
    const parsed = Number(nextSize);
    setLessonPageSize(Number.isFinite(parsed) && parsed > 0 ? parsed : LESSON_PAGE_SIZE_OPTIONS[0]);
    setLessonPage(1);
  };

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessonIds((current) => (
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId]
    ));
  };

  const handleSelectAllFilteredLessons = async () => {
    setBulkLessonAction('selecting-all');
    try {
      setSelectedLessonIds((current) => {
        const pageIds = pagedLessons.map((lesson) => lesson.id);
        const everySelected = pageIds.every((id) => current.includes(id));
        if (everySelected) {
          return current.filter((id) => !pageIds.includes(id));
        }
        return Array.from(new Set([...current, ...pageIds]));
      });
    } finally {
      setBulkLessonAction(null);
    }
  };

  const handleSelectVisibleLessons = () => {
    const pageIds = pagedLessons.map((lesson) => lesson.id);
    setSelectedLessonIds((current) => {
      const everySelected = pageIds.every((id) => current.includes(id));
      if (everySelected) {
        return current.filter((id) => !pageIds.includes(id));
      }
      return Array.from(new Set([...current, ...pageIds]));
    });
  };

  const clearLessonSelection = () => {
    setSelectedLessonIds([]);
  };

  const handleBulkLessonDraftState = async (markDraft: boolean) => {
    if (selectedLessonIds.length === 0) return;
    setBulkLessonAction(markDraft ? 'unpublish' : 'publish');
    try {
      await Promise.all(selectedLessonIds.map((lessonId) => lessonService.update(lessonId, { isDraft: markDraft })));
      setLessons((current) => current.map((lesson) => (
        selectedLessonIds.includes(lesson.id) ? { ...lesson, isDraft: markDraft } : lesson
      )));
      toast.success(markDraft ? 'Selected lessons moved to draft' : 'Selected lessons published');
      setSelectedLessonIds([]);
    } catch {
      toast.error(markDraft ? 'Failed to unpublish selected lessons' : 'Failed to publish selected lessons');
    } finally {
      setBulkLessonAction(null);
    }
  };

  const handleBulkDeleteLessons = () => {
    if (selectedLessonIds.length === 0) return;
    setConfirmation({
      title: 'Delete selected lessons?',
      description: 'All selected lessons will be removed from this class permanently.',
      confirmLabel: `Delete ${selectedLessonIds.length} Lesson${selectedLessonIds.length === 1 ? '' : 's'}`,
      tone: 'danger',
      onConfirm: async () => {
        setBulkLessonAction('delete');
        try {
          await Promise.all(selectedLessonIds.map((lessonId) => lessonService.delete(lessonId)));
          setLessons((current) => current.filter((lesson) => !selectedLessonIds.includes(lesson.id)));
          setSelectedLessonIds([]);
          toast.success('Selected lessons deleted');
        } catch {
          toast.error('Failed to delete selected lessons');
        } finally {
          setBulkLessonAction(null);
        }
      },
    });
  };

  const handlePublishLesson = async (lessonId: string) => {
    try {
      await lessonService.update(lessonId, { isDraft: false });
      setLessons((current) => current.map((lesson) => (
        lesson.id === lessonId ? { ...lesson, isDraft: false } : lesson
      )));
      toast.success('Lesson published');
    } catch {
      toast.error('Failed to publish lesson');
    }
  };

  const handleLessonDragStart = (lessonId: string) => {
    if (!canReorderLessons) return;
    setDraggedLessonId(lessonId);
  };

  const handleLessonDrop = (targetLessonId: string) => {
    if (!draggedLessonId || !canReorderLessons || draggedLessonId === targetLessonId) {
      setDraggedLessonId(null);
      return;
    }

    setLessons((current) => {
      const sourceIndex = current.findIndex((lesson) => lesson.id === draggedLessonId);
      const targetIndex = current.findIndex((lesson) => lesson.id === targetLessonId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }
      return moveItem(current, sourceIndex, targetIndex).map((lesson, index) => ({
        ...lesson,
        order: index + 1,
      }));
    });
    setDraggedLessonId(null);
  };

  const handleResetLessonOrder = () => {
    setLessons((current) => [...current].sort((a, b) => a.order - b.order));
    setDraggedLessonId(null);
  };

  const handleSaveLessonOrder = async () => {
    setSavingLessonOrder(true);
    try {
      toast.success('Lesson order updated');
    } finally {
      setSavingLessonOrder(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, lessonsRes, assessmentsRes, enrollmentsRes, announcementsRes, extractionsRes, libraryRes] = await Promise.all([
        classService.getById(classId),
        lessonService.getByClass(classId),
        assessmentService.getByClass(classId),
        classService.getEnrollments(classId),
        announcementService.getByClass(classId).catch(() => ({ data: [] as Announcement[] })),
        extractionService.listByClass(classId).catch(() => ({ data: [] as Extraction[] })),
        fileService.getAll().catch(() => ({ data: [] as UploadedFile[] })),
      ]);
      setClassItem(classRes.data);
      setLessons(lessonsRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);
      setExtractions(Array.isArray(extractionsRes.data) ? extractionsRes.data : []);
      setLibraryFiles(Array.isArray(libraryRes.data) ? libraryRes.data : []);
    } catch {
      toast.error('Failed to load class details');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const handleCreateLesson = async () => {
    if (!lessonTitle.trim()) return;
    try {
      await lessonService.create({ title: lessonTitle, description: lessonDesc, classId });
      toast.success('Lesson created');
      setShowCreateLesson(false);
      setLessonTitle('');
      setLessonDesc('');
      const res = await lessonService.getByClass(classId);
      setLessons(res.data || []);
    } catch {
      toast.error('Failed to create lesson');
    }
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    setConfirmation({
      title: 'Delete lesson?',
      description: 'This lesson and its class visibility will be removed permanently.',
      confirmLabel: 'Delete Lesson',
      tone: 'danger',
      details: <p className="text-sm font-black text-[var(--teacher-text-strong)]">{lesson.title}</p>,
      onConfirm: async () => {
        try {
          await lessonService.delete(lesson.id);
          toast.success('Lesson deleted');
          setLessons((prev) => prev.filter((entry) => entry.id !== lesson.id));
        } catch {
          toast.error('Failed to delete lesson');
        }
      },
    });
  };

  const handleCreateAssessment = async () => {
    try {
      const res = await assessmentService.create({ title: 'Untitled Assessment', classId });
      toast.success('Assessment created â€” redirecting to editor');
      router.push(`/dashboard/teacher/assessments/${res.data.id}/edit`);
    } catch {
      toast.error('Failed to create assessment');
    }
  };

  const handleDeleteAssessment = (assessment: Assessment) => {
    setConfirmation({
      title: 'Delete assessment?',
      description: 'This removes the assessment from the class and deletes its current draft state.',
      confirmLabel: 'Delete Assessment',
      tone: 'danger',
      details: <p className="text-sm font-black text-[var(--teacher-text-strong)]">{assessment.title}</p>,
      onConfirm: async () => {
        try {
          await assessmentService.delete(assessment.id);
          toast.success('Assessment deleted');
          setAssessments((prev) => prev.filter((entry) => entry.id !== assessment.id));
        } catch {
          toast.error('Failed to delete assessment');
        }
      },
    });
  };

  const handleRemoveStudent = (enrollment: Enrollment) => {
    const studentName = `${enrollment.student?.firstName ?? ''} ${enrollment.student?.lastName ?? ''}`.trim() || 'Selected student';
    setConfirmation({
      title: 'Remove student from class?',
      description: 'This unenrolls the student from the class roster.',
      confirmLabel: 'Remove Student',
      tone: 'danger',
      details: <p className="text-sm font-black text-[var(--teacher-text-strong)]">{studentName}</p>,
      onConfirm: async () => {
        try {
          await classService.unenrollStudent(classId, enrollment.studentId);
          toast.success('Student removed');
          setEnrollments((prev) => prev.filter((entry) => entry.studentId !== enrollment.studentId));
        } catch {
          toast.error('Failed to remove student');
        }
      },
    });
  };

  const resetAnnouncementComposer = () => {
    setEditingAnnouncement(null);
    setAnnTitle('');
    setAnnContent('');
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnTitle(announcement.title);
    setAnnContent(announcement.content);
    setShowCreateAnnouncement(true);
  };

  const handleDeleteAnnouncement = (announcement: Announcement) => {
    setConfirmation({
      title: 'Delete announcement?',
      description: 'This announcement will be removed for everyone in the class.',
      confirmLabel: 'Delete Announcement',
      tone: 'danger',
      details: <p className="text-sm font-black text-[var(--teacher-text-strong)]">{announcement.title}</p>,
      onConfirm: async () => {
        try {
          await announcementService.delete(classId, announcement.id);
          setAnnouncements((prev) => prev.filter((entry) => entry.id !== announcement.id));
          toast.success('Announcement deleted');
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to delete announcement'));
        }
      },
    });
  };

  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    try {
      if (editingAnnouncement) {
        const payload: UpdateAnnouncementDto = {
          title: annTitle.trim(),
          content: annContent.trim(),
          isPinned: editingAnnouncement.isPinned ?? false,
        };
        await announcementService.update(classId, editingAnnouncement.id, payload);
        toast.success('Announcement updated');
      } else {
        const payload: CreateAnnouncementDto = {
          title: annTitle.trim(),
          content: annContent.trim(),
          isPinned: false,
        };
        await announcementService.create(classId, payload);
        toast.success('Announcement created');
      }
      setShowCreateAnnouncement(false);
      resetAnnouncementComposer();
      const res = await announcementService.getByClass(classId);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, editingAnnouncement ? 'Failed to update announcement' : 'Failed to create announcement'));
    }
  };

  // â”€â”€ Class Record handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

 
  const queueExtraction = async (fileId: string) => {
    setExtracting(true);
    try {
      const extractRes = await extractionService.extractModule({ fileId });
      toast.success('Extraction queued! Redirecting to review page...');
      setExtractFile(null);
      setSelectedLibraryFileId('');
      router.push(`/dashboard/teacher/extractions/${extractRes.data.extractionId}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg =
        axiosErr?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        'Failed to start extraction';
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractModule = async () => {
    if (!extractFile) return;
    setExtracting(true);
    try {
      const uploadRes = await fileService.upload(extractFile, { classId });
      setLibraryFiles((prev) => [uploadRes.data, ...prev]);
      await queueExtraction(uploadRes.data.id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message ||
          (err instanceof Error ? err.message : null) ||
          'Failed to start extraction',
      );
      setExtracting(false);
    }
  };

  const handleReindexClass = async () => {
    setReindexing(true);
    try {
      const res = await aiService.reindexClass(classId);
      toast.success(`Indexed ${res.data.chunksIndexed} content chunk(s)`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to reindex class content'));
    } finally {
      setReindexing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!classItem) return <p className="text-muted-foreground">Class not found.</p>;

  return (
    <>
    <TeacherPageShell
      className={role === 'admin' ? 'theme-admin-bridge' : undefined}
      badge="Class Workspace"
      title={`${classItem.subjectName} (${classItem.subjectCode})`}
      description={`Manage lessons, assessments, announcements, records, and roster details from a clearer workspace for ${classItem.section?.name || 'this class'}.`}
      actions={(
        <Button variant="outline" size="sm" onClick={() => router.back()} className="teacher-button-outline rounded-xl font-black">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      stats={(
        <>
          <TeacherStatCard label="Section" value={classItem.section?.name || 'Unassigned'} caption={`Grade ${classItem.section?.gradeLevel || classItem.subjectGradeLevel || 'â€”'}`} icon={GraduationCap} accent="sky" />
          <TeacherStatCard label="Students" value={enrollments.length} caption="Currently enrolled learners" icon={Users} accent="teal" />
          <TeacherStatCard label="Assessments" value={assessments.length} caption="Across active and draft work" icon={BookOpen} accent="amber" />
          <TeacherStatCard label="School Year" value={classItem.schoolYear || 'â€”'} caption="Current class cycle" icon={CalendarRange} accent="rose" />
        </>
      )}
    >
      <TeacherSectionCard
        title="Subject Space"
        description="A more welcoming class overview so you can orient quickly before diving into lessons, assessments, and records."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="teacher-dashboard-spotlight">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="teacher-dashboard-chip">
                  <Sparkles className="h-4 w-4" />
                  Active Subject
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-black tracking-tight text-[var(--teacher-text-strong)]">
                    {classItem.subjectName} ({classItem.subjectCode})
                  </p>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--teacher-text-muted)]">
                    {classItem.section?.name || 'Section not set'} â€¢ Grade {classItem.section?.gradeLevel || classItem.subjectGradeLevel || 'â€”'} â€¢ {classItem.teacher ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}` : 'Teacher not assigned'}
                  </p>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--teacher-text-muted)]">
                    Use this subject hub to keep the learning flow clear for students while you manage sequencing, assessments, announcements, and workbook records from one place.
                  </p>
                </div>
              </div>
              <div className="grid min-w-[220px] grid-cols-3 gap-3 text-right">
                <div className="teacher-dashboard-metric">
                  <span>Lessons</span>
                  <strong>{lessonTotal}</strong>
                </div>
                <div className="teacher-dashboard-metric">
                  <span>Students</span>
                  <strong>{enrollments.length}</strong>
                </div>
                <div className="teacher-dashboard-metric">
                  <span>Assessments</span>
                  <strong>{assessments.length}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="teacher-dashboard-mini-panel">
              <div className="teacher-dashboard-mini-panel__icon bg-sky-500/15 text-sky-300">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">Published Lessons</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">{publishedLessonCount}</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Ready for student access</p>
              </div>
            </div>
            <div className="teacher-dashboard-mini-panel">
              <div className="teacher-dashboard-mini-panel__icon bg-amber-400/15 text-amber-200">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">Draft Lessons</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">{draftLessonCount}</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Still waiting for review</p>
              </div>
            </div>
            <div className="teacher-dashboard-mini-panel">
              <div className="teacher-dashboard-mini-panel__icon bg-emerald-500/15 text-emerald-200">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">Live Assessments</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">{completedAssessmentCount}</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Published for this subject</p>
              </div>
            </div>
          </div>
        </div>
      </TeacherSectionCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TeacherSectionCard
          title="Class Areas"
          description="Move between learning content, assessment tools, announcements, records, and roster details from one cleaner navigation surface."
          className="bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))]"
          contentClassName="pt-5"
        >
          <TabsList className="teacher-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="lessons" className="teacher-tab rounded-xl px-4 font-black">Lessons</TabsTrigger>
            <TabsTrigger value="assessments" className="teacher-tab rounded-xl px-4 font-black">Assessments</TabsTrigger>
            <TabsTrigger value="extraction" className="teacher-tab rounded-xl px-4 font-black">Lesson Creator</TabsTrigger>
            <TabsTrigger value="announcements" className="teacher-tab rounded-xl px-4 font-black">Announcements</TabsTrigger>
            <TabsTrigger value="class-record" className="teacher-tab rounded-xl px-4 font-black">Class Record</TabsTrigger>
            <TabsTrigger value="students" className="teacher-tab rounded-xl px-4 font-black">Students</TabsTrigger>
          </TabsList>
        </TeacherSectionCard>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4 mt-4">
          <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--teacher-text-strong)]">
                    {lessonTotal} lesson{lessonTotal === 1 ? '' : 's'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Bulk publish, unpublish, delete, and drag lessons into a cleaner sequence.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={lessonStatusFilter}
                    onChange={(e) =>
                      handleLessonStatusFilterChange(e.target.value as LessonStatusFilter)
                    }
                    className="teacher-select h-9 rounded-md px-3 text-sm"
                  >
                    <option value="all">All lessons</option>
                    <option value="draft">Draft only</option>
                    <option value="published">Published only</option>
                  </select>
                  <select
                    value={String(lessonPageSize)}
                    onChange={(e) => handleLessonPageSizeChange(e.target.value)}
                    className="teacher-select h-9 rounded-md px-3 text-sm"
                  >
                    {LESSON_PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                  <Button size="sm" className="teacher-button-solid rounded-xl font-black" onClick={() => setShowCreateLesson(true)}>+ New Lesson</Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={handleSelectVisibleLessons}
                      disabled={sortedLessons.length === 0}
                    >
                      {allVisibleLessonsSelected ? 'Clear Page' : 'Select Page'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={handleSelectAllFilteredLessons}
                      disabled={lessonTotal === 0 || bulkLessonAction === 'selecting-all'}
                    >
                      {bulkLessonAction === 'selecting-all' ? 'Selecting...' : 'Select All Filtered'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={clearLessonSelection}
                      disabled={selectedLessonIds.length === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="teacher-button-solid rounded-xl font-black"
                      onClick={() => handleBulkLessonDraftState(false)}
                      disabled={selectedLessonIds.length === 0 || bulkLessonAction !== null}
                    >
                      {bulkLessonAction === 'publish' ? 'Publishing...' : 'Publish Selected'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={() => handleBulkLessonDraftState(true)}
                      disabled={selectedLessonIds.length === 0 || bulkLessonAction !== null}
                    >
                      {bulkLessonAction === 'unpublish' ? 'Unpublishing...' : 'Unpublish Selected'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="teacher-button-danger rounded-xl font-black"
                      onClick={handleBulkDeleteLessons}
                      disabled={selectedLessonIds.length === 0 || bulkLessonAction !== null}
                    >
                      {bulkLessonAction === 'delete' ? 'Deleting...' : 'Delete Selected'}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
                  <span>
                    {selectedLessonIds.length} selected across {lessonTotal} filtered lesson
                    {lessonTotal === 1 ? '' : 's'}.
                  </span>
                  <span>
                    Reordering is available in <strong>All lessons</strong> view so the saved sequence stays global.
                  </span>
                </div>
              </div>

              {canReorderLessons && (
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Drag lessons by the handle to change the order shown to students.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={handleResetLessonOrder}
                      disabled={!lessonOrderDirty || savingLessonOrder}
                    >
                      Reset Order
                    </Button>
                    <Button
                      size="sm"
                      className="teacher-button-solid rounded-xl font-black"
                      onClick={handleSaveLessonOrder}
                      disabled={!lessonOrderDirty || savingLessonOrder}
                    >
                      {savingLessonOrder ? 'Saving...' : 'Save Order'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="teacher-dashboard-mini-panel">
              <div className="teacher-dashboard-mini-panel__icon bg-sky-500/15 text-sky-300">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">In View</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">{sortedLessons.length}</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Lessons matching the current filter</p>
              </div>
            </div>
            <div className="teacher-dashboard-mini-panel">
              <div className="teacher-dashboard-mini-panel__icon bg-emerald-500/15 text-emerald-200">
                <Rocket className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">Selection</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">{selectedLessonIds.length}</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Lessons selected for bulk actions</p>
              </div>
            </div>
            <div className="teacher-dashboard-mini-panel">
              <div className="teacher-dashboard-mini-panel__icon bg-amber-400/15 text-amber-200">
                <ArrowUpDown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">Reorder Mode</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">{canReorderLessons ? 'On' : 'Off'}</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Available in the all-lessons view</p>
              </div>
            </div>
          </div>

          {sortedLessons.length === 0 ? (
            <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]">
              <CardContent className="p-8 text-center text-muted-foreground">
                No lessons in this view yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                {pagedLessons.map((lesson, index) => (
                  <Card
                    key={lesson.id}
                    className={cn(
                      'relative overflow-hidden border border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--teacher-accent)]/35 hover:shadow-[0_34px_64px_-34px_rgba(148,11,26,0.28)]',
                      selectedLessonIdSet.has(lesson.id) && 'ring-2 ring-[var(--teacher-accent)]/35',
                      draggedLessonId === lesson.id && 'opacity-70',
                    )}
                    draggable={canReorderLessons}
                    onDragStart={() => handleLessonDragStart(lesson.id)}
                    onDragEnd={() => setDraggedLessonId(null)}
                    onDragOver={(event) => {
                      if (canReorderLessons) event.preventDefault();
                    }}
                    onDrop={() => handleLessonDrop(lesson.id)}
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[var(--teacher-accent)]/10 blur-3xl opacity-80" />
                    <CardContent className="relative space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedLessonIdSet.has(lesson.id)}
                            onChange={() => toggleLessonSelection(lesson.id)}
                            className="mt-1 h-4 w-4 rounded border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)]"
                          />
                          <button
                            type="button"
                            className={cn(
                              'mt-0.5 rounded-xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-2 text-[var(--teacher-text-muted)] shadow-sm transition',
                              canReorderLessons
                                ? 'cursor-grab hover:border-[var(--teacher-accent)]/35 hover:bg-[var(--teacher-accent)]/10 hover:text-[var(--teacher-text-strong)] active:cursor-grabbing'
                                : 'cursor-not-allowed opacity-50',
                            )}
                            disabled={!canReorderLessons}
                            onMouseDown={() => handleLessonDragStart(lesson.id)}
                            aria-label={`Reorder ${lesson.title}`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full bg-[var(--teacher-accent)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--teacher-accent-strong)]">
                                Lesson {((lessonPage - 1) * lessonPageSize) + index + 1}
                              </span>
                              <Badge variant={lesson.isDraft ? 'secondary' : 'default'} className={lesson.isDraft ? 'border border-amber-400/30 bg-amber-50 text-amber-700' : 'border border-emerald-400/30 bg-emerald-50 text-emerald-700'}>
                                {lesson.isDraft ? 'Draft' : 'Published'}
                              </Badge>
                            </div>
                            <p className="text-lg font-black tracking-tight text-[var(--teacher-text-strong)]">{lesson.title}</p>
                            <p className="line-clamp-3 text-sm leading-6 text-[var(--teacher-text-muted)]">
                              {getDescription(lesson.description)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--teacher-text-muted)]">
                        <span className="rounded-full border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-3 py-1">
                          Order #{lesson.order}
                        </span>
                        <span className="rounded-full border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-3 py-1">
                          {lesson.contentBlocks?.length ?? 0} block{(lesson.contentBlocks?.length ?? 0) === 1 ? '' : 's'}
                        </span>
                        <span className="rounded-full border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-3 py-1">
                          {lesson.isDraft ? 'Needs publishing' : 'Visible to students'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-sm text-[var(--teacher-text-muted)]">
                          {lesson.isDraft
                            ? 'Review the content, then publish when this lesson is ready for students.'
                            : 'Students can already access this lesson from their subject space.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {!lesson.isDraft ? null : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="teacher-button-solid rounded-xl font-black"
                              onClick={() => handlePublishLesson(lesson.id)}
                              disabled={bulkLessonAction !== null}
                            >
                              <Rocket className="mr-1 h-3.5 w-3.5" />
                              Publish
                            </Button>
                          )}
                          <Link
                            href={`/dashboard/teacher/lessons/${lesson.id}/edit`}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-3 text-sm font-black text-[var(--teacher-text-strong)] shadow-[0_16px_38px_-24px_rgba(2,6,23,0.45)] transition hover:border-[var(--teacher-accent)]/35 hover:bg-[var(--teacher-accent)]/10 hover:text-[var(--teacher-text-strong)]"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Edit Lesson
                          </Link>
                          <Button variant="destructive" size="sm" className="teacher-button-danger rounded-xl font-black" onClick={() => handleDeleteLesson(lesson)}>Delete</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]">
                <CardContent className="flex flex-col items-start gap-3 p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {lessonPage} of {lessonTotalPages}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={() => handleLessonPageChange(lessonPage - 1)}
                      disabled={lessonPage <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={() => handleLessonPageChange(lessonPage + 1)}
                      disabled={lessonPage >= lessonTotalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
 
            </div>
          )}
        </TabsContent>

        <TabsContent value="extraction" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="overflow-hidden border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))]">
              <CardHeader>
                <CardTitle className="text-xl">Extraction Workspace</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload a new PDF for this class or reuse one from Nexora Library. Completed extractions stay here for review and lesson drafting.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-4">
                  <Label>Upload a fresh module PDF</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setExtractFile(e.target.files?.[0] || null)}
                  />
                  <Button className="teacher-button-solid rounded-xl font-black" onClick={handleExtractModule} disabled={!extractFile || extracting}>
                    {extracting ? 'Uploading & Extracting...' : 'Start New Extraction'}
                  </Button>
                </div>
                <div className="space-y-3 rounded-2xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-4">
                  <Label>Pick an existing library PDF</Label>
                  <select
                    value={selectedLibraryFileId}
                    onChange={(e) => setSelectedLibraryFileId(e.target.value)}
                    className="teacher-select h-10 w-full rounded-md px-3 text-sm"
                  >
                    <option value="">Select from Nexora Library</option>
                    {libraryFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.originalName} {file.scope === 'general' ? 'â€¢ General' : 'â€¢ My Library'}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className="teacher-button-outline rounded-xl font-black"
                    onClick={() => selectedLibraryFileId && queueExtraction(selectedLibraryFileId)}
                    disabled={!selectedLibraryFileId || extracting}
                  >
                    Use Selected PDF
                  </Button>
                  <Button
                    variant="secondary"
                    className="teacher-button-outline rounded-xl font-black"
                    onClick={handleReindexClass}
                    disabled={reindexing}
                  >
                    {reindexing ? 'Reindexing...' : 'Reindex Class AI Content'}
                  </Button>
 
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold">Extraction Queue</p>
                  <p className="text-sm text-muted-foreground">
                    {extractions.length} extraction run(s) for this class
                  </p>
                </div>
              </div>

              {extractions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No extraction history yet. Start with a PDF upload or choose a library file above.
                  </CardContent>
                </Card>
              ) : (
                extractions.map((ext) => (
                  <Card key={ext.id} className="border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={
                            ext.extractionStatus === 'completed' || ext.extractionStatus === 'applied'
                              ? 'default'
                              : ext.extractionStatus === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }>
                            {ext.extractionStatus}
                          </Badge>
                          <span className="text-sm font-medium">
                            {ext.originalName || ext.structuredContent?.title || 'PDF extraction'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ext.structuredContent?.lessons?.length ?? 0} lesson(s) â€¢ {new Date(ext.createdAt).toLocaleString()}
                        </p>
                        {ext.errorMessage && (
                          <p className="text-sm text-red-600">{ext.errorMessage}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/teacher/extractions/${ext.id}`)}>
                          Review
                        </Button>
                        {!ext.isApplied && ext.extractionStatus !== 'applied' && (
                          <Button
                            variant="ghost"
                            className="teacher-button-danger rounded-xl font-black"
                            onClick={() => {
                              setConfirmation({
                                title: 'Delete extraction run?',
                                description: 'This removes the extraction record and its review state from this class.',
                                confirmLabel: 'Delete Extraction',
                                tone: 'danger',
                                details: <p className="text-sm font-black text-[var(--teacher-text-strong)]">{ext.originalName || ext.structuredContent?.title || 'PDF extraction'}</p>,
                                onConfirm: async () => {
                                  try {
                                    await extractionService.delete(ext.id);
                                    setExtractions((prev) => prev.filter((entry) => entry.id !== ext.id));
                                    toast.success('Extraction deleted');
                                  } catch (error) {
                                    toast.error(getApiErrorMessage(error, 'Failed to delete extraction'));
                                  }
                                },
                              });
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-4 mt-4">
          <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{assessments.length} assessments</p>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border p-0.5">
                    <Button
                      size="sm"
                      variant={assessmentViewMode === 'list' ? 'default' : 'ghost'}
                      className={cn('h-8 rounded-xl font-black', assessmentViewMode === 'list' ? 'teacher-button-solid' : 'teacher-button-outline')}
                      onClick={() => setAssessmentViewMode('list')}
                    >
                      <List className="mr-1 h-4 w-4" /> List
                    </Button>
                    <Button
                      size="sm"
                      variant={assessmentViewMode === 'grid' ? 'default' : 'ghost'}
                      className={cn('h-8 rounded-xl font-black', assessmentViewMode === 'grid' ? 'teacher-button-solid' : 'teacher-button-outline')}
                      onClick={() => setAssessmentViewMode('grid')}
                    >
                      <LayoutGrid className="mr-1 h-4 w-4" /> Grid
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="teacher-button-outline h-8 rounded-xl font-black"
                    onClick={() => setAssessmentSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  >
                    <ArrowUpDown className="mr-1 h-4 w-4" />
                    {assessmentSortOrder === 'asc' ? 'Date: Nearest' : 'Date: Latest'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="teacher-button-outline rounded-xl font-black"
                    onClick={() => {
                      router.push(`/dashboard/teacher/classes/${classId}/ai-draft`);
                    }}
                  >
                    AI Draft Quiz
                  </Button>
                  <Button size="sm" className="teacher-button-solid rounded-xl font-black" onClick={handleCreateAssessment}>+ New Assessment</Button>
                </div>
              </div>

              <Tabs value={assessmentCategoryTab} onValueChange={(value) => setAssessmentCategoryTab(value as 'written_work' | 'performance_task' | 'quarterly_assessment' | 'drafts')}>
                <TabsList className="teacher-tab-list h-auto grid w-full grid-cols-2 gap-2 rounded-2xl p-2 sm:grid-cols-4">
                  {ASSESSMENT_CATEGORIES.map((category) => (
                    <TabsTrigger key={category.value} value={category.value} className="teacher-tab min-h-[44px] rounded-xl px-3 text-center font-black leading-tight">
                      {category.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {Object.keys(categorizedAssessments).length === 0 ? (
            <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]">
              <CardContent className="p-6 text-center text-muted-foreground">
                No assessments in this category yet.
              </CardContent>
            </Card>
 
          ) : (
            <div className="space-y-5">
              {Object.entries(categorizedAssessments).map(([groupLabel, groupedAssessments]) => (
                <section key={groupLabel} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--teacher-text-strong)]">{groupLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {groupedAssessments.length} assessment{groupedAssessments.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className={assessmentViewMode === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
                    {groupedAssessments.map((assessment, index) => {
                      const categoryStyle = assessment.classRecordCategory === 'written_work'
                        ? 'border-l-4 border-l-blue-500'
                        : assessment.classRecordCategory === 'performance_task'
                          ? 'border-l-4 border-l-emerald-500'
                          : 'border-l-4 border-l-violet-500';
                      const isPastDue = Boolean(assessment.dueDate && new Date(assessment.dueDate) < new Date());

                      return (
                        <motion.div
                          key={assessment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04, duration: 0.2 }}
                        >
                          <Card className={`group ${categoryStyle} border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] transition-shadow hover:shadow-md`}>
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold leading-tight">{assessment.title}</p>
                                  <p className="mt-1 text-xs capitalize text-muted-foreground">{assessment.type.replace(/_/g, ' ')}</p>
                                </div>
                                <Badge variant={assessment.isPublished ? 'default' : 'secondary'}>
                                  {assessment.isPublished ? 'Published' : 'Draft'}
                                </Badge>
                              </div>

                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="capitalize font-medium">{assessment.type.replace(/_/g, ' ')}</span>
                                <span>{assessment.totalPoints} pts</span>
                                <span>Passing: {assessment.passingScore}%</span>
                                <span>{assessment.questions?.length ?? 0} questions</span>
                                {assessment.dueDate && (
                                  <span className={isPastDue ? 'font-medium text-red-500' : ''}>
                                    {isPastDue ? 'Past due' : 'Due'}: {new Date(assessment.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Link href={`/dashboard/teacher/assessments/${assessment.id}`}>
                                  <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl font-black">View</Button>
                                </Link>
                                <Link href={`/dashboard/teacher/assessments/${assessment.id}/edit`}>
                                  <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl font-black">Edit</Button>
                                </Link>
                                <Button variant="destructive" size="sm" className="teacher-button-danger rounded-xl font-black" onClick={() => handleDeleteAssessment(assessment)}>
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{announcements.length} announcements</p>
            <Button
              size="sm"
              className="teacher-button-solid rounded-xl font-black"
              onClick={() => {
                resetAnnouncementComposer();
                setShowCreateAnnouncement(true);
              }}
            >
              + New Announcement
            </Button>
          </div>
          {announcements.length === 0 ? (
            <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]"><CardContent className="p-6 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <Card key={ann.id} className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--teacher-text-strong)]">{ann.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{ann.content}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {ann.isPinned ? <Badge variant="secondary">Pinned</Badge> : null}
                        <Button
                          variant="outline"
                          size="sm"
                          className="teacher-button-outline rounded-xl font-black"
                          onClick={() => handleEditAnnouncement(ann)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="teacher-button-danger rounded-xl font-black"
                          onClick={() => handleDeleteAnnouncement(ann)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(ann.createdAt!).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Class Record Tab */}
        <TabsContent value="class-record" className="space-y-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <TeacherClassRecordWorkbook
              state={classRecordState}
              emptyMessage="No class record exists for this class yet. Generate a quarter workbook to begin."
            />
          </motion.div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{enrollments.length} students</p>
            <Button size="sm" className="teacher-button-solid rounded-xl font-black" onClick={() => router.push(`/dashboard/teacher/classes/${classId}/students/add`)}>+ Add Student</Button>
 
          </div>
          {enrollments.length === 0 ? (
            <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]"><CardContent className="p-6 text-center text-muted-foreground">No students enrolled.</CardContent></Card>
          ) : (
            <Card className="border-[var(--teacher-outline)] bg-[linear-gradient(180deg,var(--teacher-surface),var(--teacher-surface-soft))] shadow-[var(--teacher-shadow)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--teacher-outline)]">
                    <TableHead>Student</TableHead>
 
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e) => (
                    <TableRow key={e.id} className="border-[var(--teacher-outline)]">
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          {e.student?.profile?.profilePicture ? (
                            <AvatarImage
                              src={e.student.profile.profilePicture}
                              alt={`${e.student?.firstName || ''} ${e.student?.lastName || ''}`.trim()}
                            />
                          ) : null}
                          <AvatarFallback>
                            {`${e.student?.firstName?.[0] || ''}${e.student?.lastName?.[0] || ''}`.toUpperCase() || 'S'}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${e.studentId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {e.student?.firstName} {e.student?.lastName}
                        </Link>
                      </TableCell>
 
                      <TableCell className="text-muted-foreground">{e.student?.email}</TableCell>
                      <TableCell className="text-muted-foreground">{e.student?.lrn || 'â€”'}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/teacher/classes/${classId}/students/${e.studentId}`)}>
                            View Profile
                          </Button>
                          <Button variant="destructive" size="sm" className="teacher-button-danger rounded-xl font-black" onClick={() => handleRemoveStudent(e)}>Remove</Button>
                        </div>
 
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </TeacherPageShell>

      {/* Create Lesson Modal */}
      <Dialog open={showCreateLesson} onOpenChange={setShowCreateLesson}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Lesson</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Lesson title" /></div>
            <div><Label>Description (optional)</Label><Textarea value={lessonDesc} onChange={(e) => setLessonDesc(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => setShowCreateLesson(false)}>Cancel</Button>
            <Button className="teacher-button-solid rounded-xl font-black" onClick={handleCreateLesson} disabled={!lessonTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Assessment Modal removed â€” create-and-redirect flow instead */}

      {/* Create Announcement Modal */}
      <Dialog
        open={showCreateAnnouncement}
        onOpenChange={(open) => {
          setShowCreateAnnouncement(open);
          if (!open) resetAnnouncementComposer();
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement title" /></div>
            <div><Label>Content</Label><Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Announcement content" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => setShowCreateAnnouncement(false)}>Cancel</Button>
            <Button className="teacher-button-solid rounded-xl font-black" onClick={handleCreateAnnouncement} disabled={!annTitle.trim() || !annContent.trim()}>
              {editingAnnouncement ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}

