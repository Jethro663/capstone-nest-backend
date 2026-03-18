'use client';

import { Fragment, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { aiService } from '@/services/ai-service';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { extractionService } from '@/services/extraction-service';
import { fileService } from '@/services/file-service';
import { classRecordService } from '@/services/class-record-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { LayoutGrid, List, ArrowUpDown, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { getDescription } from '@/utils/helpers';
import { cn } from '@/utils/cn';
import type { ClassItem, Enrollment } from '@/types/class';
import type { Lesson, LessonStatusFilter } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';
import type { GenerateQuizDraftDto } from '@/types/ai';
import type { Extraction } from '@/types/extraction';
import type { ClassRecord, SpreadsheetData } from '@/types/class-record';
import type { GradingPeriod, FeedbackLevel, QuestionType } from '@/utils/constants';
import type { UploadedFile } from '@/types/file';

const QUARTERS: GradingPeriod[] = ['Q1', 'Q2', 'Q3', 'Q4'];
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

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonPage, setLessonPage] = useState(1);
  const [lessonPageSize, setLessonPageSize] = useState(20);
  const [lessonTotal, setLessonTotal] = useState(0);
  const [lessonTotalPages, setLessonTotalPages] = useState(1);
  const [lessonStatusFilter, setLessonStatusFilter] = useState<LessonStatusFilter>('all');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [bulkLessonAction, setBulkLessonAction] = useState<
    'publish' | 'unpublish' | 'delete' | 'selecting-all' | null
  >(null);
  const [savingLessonOrder, setSavingLessonOrder] = useState(false);
  const [lessonOrderDirty, setLessonOrderDirty] = useState(false);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);

  // Extract module states
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<UploadedFile[]>([]);
  const [selectedLibraryFileId, setSelectedLibraryFileId] = useState('');
  const [reindexing, setReindexing] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizTeacherNote, setQuizTeacherNote] = useState('');
  const [quizQuestionCount, setQuizQuestionCount] = useState('5');
  const [quizQuestionType, setQuizQuestionType] = useState<QuestionType>('multiple_choice');
  const [quizFeedbackLevel, setQuizFeedbackLevel] = useState<FeedbackLevel>('standard');
  const [quizSourceLessonIds, setQuizSourceLessonIds] = useState<string[]>([]);
  const [quizSourceExtractionIds, setQuizSourceExtractionIds] = useState<string[]>([]);

  // Class record state
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [generatingQuarter, setGeneratingQuarter] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string; studentId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // Form states
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [activeTab, setActiveTab] = useState('lessons');
  const [assessmentCategoryTab, setAssessmentCategoryTab] = useState<'written_work' | 'performance_task' | 'quarterly_assessment' | 'drafts'>('written_work');
  const [assessmentViewMode, setAssessmentViewMode] = useState<'list' | 'grid'>('list');
  const [assessmentSortOrder, setAssessmentSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const selectedLessonIdSet = useMemo(
    () => new Set(selectedLessonIds),
    [selectedLessonIds],
  );

  const allVisibleLessonsSelected =
    sortedLessons.length > 0 &&
    sortedLessons.every((lesson) => selectedLessonIdSet.has(lesson.id));

  const canReorderLessons =
    lessonStatusFilter === 'all' && sortedLessons.length > 1;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, assessmentsRes, enrollmentsRes] = await Promise.all([
        classService.getById(classId),
        assessmentService.getByClass(classId),
        classService.getEnrollments(classId),
      ]);
      setClassItem(classRes.data);
      setAssessments(assessmentsRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
     
    } catch {
      toast.error('Failed to load class details');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const fetchLessons = useCallback(
    async (
      page = lessonPage,
      pageSize = lessonPageSize,
      status = lessonStatusFilter,
    ) => {
      const response = await lessonService.getByClass(classId, {
        includeBlocks: false,
        page,
        pageSize,
        status,
      });

      setLessons(response.data || []);
      setLessonTotal(response.total ?? 0);
      setLessonTotalPages(response.totalPages ?? 1);
      setLessonPage(response.page ?? page);
      setLessonPageSize(response.pageSize ?? pageSize);

      return response;
    },
    [classId, lessonPage, lessonPageSize, lessonStatusFilter],
  );

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await announcementService.getByClass(classId);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load announcements');
    }
  }, [classId]);

  const fetchExtractionWorkspace = useCallback(async () => {
    try {
      const [extractionsRes, libraryRes] = await Promise.all([
        extractionService.listByClass(classId),
        fileService.getAll(),
      ]);
      setExtractions(Array.isArray(extractionsRes.data) ? extractionsRes.data : []);
      setLibraryFiles(Array.isArray(libraryRes.data) ? libraryRes.data : []);
    } catch {
      toast.error('Failed to load extraction workspace');
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
    fetchClassRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEffect(() => {
    fetchLessons().catch(() => {
      toast.error('Failed to load lessons');
    });
  }, [fetchLessons]);

  useEffect(() => {
    setLessonOrderDirty(false);
    setDraggedLessonId(null);
  }, [lessonPage, lessonPageSize, lessonStatusFilter]);

  useEffect(() => {
    if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
    if (activeTab === 'extraction') {
      fetchExtractionWorkspace();
    }
  }, [activeTab, fetchAnnouncements, fetchExtractionWorkspace]);

  const handleCreateLesson = async () => {
    if (!lessonTitle.trim()) return;
    try {
      await lessonService.create({ title: lessonTitle, description: lessonDesc, classId });
      toast.success('Lesson created');
      setShowCreateLesson(false);
      setLessonTitle('');
      setLessonDesc('');
      await fetchLessons(lessonPage);
    } catch {
      toast.error('Failed to create lesson');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await lessonService.delete(id);
      toast.success('Lesson deleted');
      setSelectedLessonIds((prev) => prev.filter((lessonId) => lessonId !== id));
      const response = await fetchLessons(lessonPage);
      if (response.count === 0 && lessonPage > 1) {
        setLessonPage((prev) => prev - 1);
      }
    } catch {
      toast.error('Failed to delete lesson');
    }
  };

  const handlePublishLesson = async (lessonId: string) => {
    try {
      await lessonService.publish(lessonId);
      toast.success('Lesson published');
      await fetchLessons(lessonPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to publish lesson'));
    }
  };

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessonIds((current) =>
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId],
    );
  };

  const handleSelectVisibleLessons = () => {
    const visibleLessonIds = sortedLessons.map((lesson) => lesson.id);
    setSelectedLessonIds((current) => {
      const currentSet = new Set(current);
      const nextSet = new Set(current);
      const shouldSelect = visibleLessonIds.some((id) => !currentSet.has(id));

      for (const lessonId of visibleLessonIds) {
        if (shouldSelect) {
          nextSet.add(lessonId);
        } else {
          nextSet.delete(lessonId);
        }
      }

      return Array.from(nextSet);
    });
  };

  const handleSelectAllFilteredLessons = async () => {
    try {
      setBulkLessonAction('selecting-all');
      const response = await lessonService.getByClass(classId, {
        includeBlocks: false,
        page: 1,
        pageSize: 5000,
        status: lessonStatusFilter,
      });
      setSelectedLessonIds(response.data.map((lesson) => lesson.id));
      toast.success(`Selected ${response.data.length} lesson(s)`);
    } catch {
      toast.error('Failed to select all filtered lessons');
    } finally {
      setBulkLessonAction(null);
    }
  };

  const clearLessonSelection = () => {
    setSelectedLessonIds([]);
  };

  const handleBulkLessonDraftState = async (isDraft: boolean) => {
    if (selectedLessonIds.length === 0) return;

    try {
      setBulkLessonAction(isDraft ? 'unpublish' : 'publish');
      await lessonService.bulkUpdateDraftState(classId, {
        lessonIds: selectedLessonIds,
        isDraft,
      });
      toast.success(
        isDraft
          ? `Unpublished ${selectedLessonIds.length} lesson(s)`
          : `Published ${selectedLessonIds.length} lesson(s)`,
      );
      clearLessonSelection();
      await fetchLessons(lessonPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update lessons'));
    } finally {
      setBulkLessonAction(null);
    }
  };

  const handleBulkDeleteLessons = async () => {
    if (selectedLessonIds.length === 0) return;
    if (
      !confirm(`Delete ${selectedLessonIds.length} selected lesson(s)? This cannot be undone.`)
    ) {
      return;
    }

    try {
      setBulkLessonAction('delete');
      await lessonService.bulkDelete(classId, {
        lessonIds: selectedLessonIds,
      });
      toast.success(`Deleted ${selectedLessonIds.length} lesson(s)`);
      clearLessonSelection();
      const response = await fetchLessons(lessonPage);
      if (response.count === 0 && lessonPage > 1) {
        setLessonPage((prev) => prev - 1);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete lessons'));
    } finally {
      setBulkLessonAction(null);
    }
  };

  const handleLessonPageChange = (nextPage: number) => {
    setLessonPage(Math.min(Math.max(nextPage, 1), lessonTotalPages));
  };

  const handleLessonPageSizeChange = (value: string) => {
    setLessonPageSize(Number.parseInt(value, 10));
    setLessonPage(1);
  };

  const handleLessonStatusFilterChange = (value: LessonStatusFilter) => {
    setLessonStatusFilter(value);
    setLessonPage(1);
    setLessonOrderDirty(false);
    clearLessonSelection();
  };

  const handleLessonDragStart = (lessonId: string) => {
    if (!canReorderLessons) return;
    setDraggedLessonId(lessonId);
  };

  const handleLessonDrop = (targetLessonId: string) => {
    if (!canReorderLessons || !draggedLessonId || draggedLessonId === targetLessonId) {
      setDraggedLessonId(null);
      return;
    }

    setLessons((current) => {
      const ordered = [...current].sort((a, b) => a.order - b.order);
      const fromIndex = ordered.findIndex((lesson) => lesson.id === draggedLessonId);
      const toIndex = ordered.findIndex((lesson) => lesson.id === targetLessonId);

      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      const reordered = moveItem(ordered, fromIndex, toIndex);
      const pageStart = (lessonPage - 1) * lessonPageSize;

      return reordered.map((lesson, index) => ({
        ...lesson,
        order: pageStart + index + 1,
      }));
    });

    setLessonOrderDirty(true);
    setDraggedLessonId(null);
  };

  const handleSaveLessonOrder = async () => {
    if (!lessonOrderDirty || sortedLessons.length === 0) return;

    try {
      setSavingLessonOrder(true);
      await lessonService.reorderByClass(classId, {
        lessons: sortedLessons.map((lesson) => ({
          id: lesson.id,
          order: lesson.order,
        })),
      });
      toast.success('Lesson order updated');
      setLessonOrderDirty(false);
      await fetchLessons(lessonPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to reorder lessons'));
    } finally {
      setSavingLessonOrder(false);
    }
  };

  const handleResetLessonOrder = async () => {
    try {
      await fetchLessons(lessonPage);
      setLessonOrderDirty(false);
      setDraggedLessonId(null);
    } catch {
      toast.error('Failed to reset lesson order');
    }
  };

  const handleCreateAssessment = async () => {
    try {
      const res = await assessmentService.create({ title: 'Untitled Assessment', classId });
      toast.success('Assessment created — redirecting to editor');
      router.push(`/dashboard/teacher/assessments/${res.data.id}/edit`);
    } catch {
      toast.error('Failed to create assessment');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Delete this assessment?')) return;
    try {
      await assessmentService.delete(id);
      toast.success('Assessment deleted');
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Failed to delete assessment');
    }
  };

  const toggleSelection = (current: string[], value: string) =>
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

  const handleReindexClass = async () => {
    try {
      setReindexing(true);
      const res = await aiService.reindexClass(classId);
      toast.success(`Indexed ${res.data.chunksIndexed} content chunk(s)`);
    } catch {
      toast.error('Failed to reindex class content');
    } finally {
      setReindexing(false);
    }
  };

  const handleGenerateQuizDraft = async () => {
    const questionCount = Number(quizQuestionCount);
    if (!Number.isFinite(questionCount) || questionCount < 1) {
      toast.error('Question count must be at least 1');
      return;
    }

    const payload: GenerateQuizDraftDto = {
      classId,
      title: quizTitle.trim() || undefined,
      teacherNote: quizTeacherNote.trim() || undefined,
      questionCount,
      questionType: quizQuestionType,
      assessmentType: 'quiz',
      passingScore: 60,
      feedbackLevel: quizFeedbackLevel,
      classRecordCategory:
        assessmentCategoryTab === 'drafts' ? 'written_work' : assessmentCategoryTab,
      lessonIds: quizSourceLessonIds.length > 0 ? quizSourceLessonIds : undefined,
      extractionIds: quizSourceExtractionIds.length > 0 ? quizSourceExtractionIds : undefined,
    };

    try {
      setGeneratingQuiz(true);
      const res = await aiService.generateQuizDraft(payload);
      toast.success(`AI draft created with ${res.data.questionsCreated} question(s)`);
      setShowQuizGenerator(false);
      setQuizTitle('');
      setQuizTeacherNote('');
      setQuizQuestionCount('5');
      setQuizQuestionType('multiple_choice');
      setQuizFeedbackLevel('standard');
      setQuizSourceLessonIds([]);
      setQuizSourceExtractionIds([]);
      await fetchData();
      router.push(`/dashboard/teacher/assessments/${res.data.assessmentId}/edit`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to generate AI draft quiz'));
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student?')) return;
    try {
      await classService.unenrollStudent(classId, studentId);
      toast.success('Student removed');
      setEnrollments((prev) => prev.filter((e) => e.studentId !== studentId));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove student'));
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    try {
      await announcementService.create(classId, { title: annTitle, content: annContent });
      toast.success('Announcement created');
      setShowCreateAnnouncement(false);
      setAnnTitle('');
      setAnnContent('');
      const res = await announcementService.getByClass(classId);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to create announcement');
    }
  };

  // ── Class Record handlers ─────────────────────────────────────────────────

  const fetchClassRecords = useCallback(async () => {
    try {
      const res = await classRecordService.getByClass(classId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      if (records.length > 0 && !selectedRecord) {
        setSelectedRecord(records[0]);
      } else if (records.length === 0) {
        setSelectedRecord(null);
        setSpreadsheet(null);
      }
    } catch {
      toast.error('Failed to load class records');
    }
  }, [classId, selectedRecord]);

  const fetchSpreadsheet = useCallback(async () => {
    if (!selectedRecord) {
      setSpreadsheet(null);
      return;
    }
    try {
      const res = await classRecordService.getSpreadsheet(selectedRecord.id);
      setSpreadsheet(res.data);
    } catch {
      toast.error('Failed to load spreadsheet');
      setSpreadsheet(null);
    }
  }, [selectedRecord]);

  useEffect(() => { fetchSpreadsheet(); }, [fetchSpreadsheet]);

  const handleGenerateQuarter = async (quarter: GradingPeriod) => {
    try {
      setGeneratingQuarter(true);
      await classRecordService.generate({ classId, gradingPeriod: quarter });
      toast.success(`Class record for ${quarter} generated`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 409) {
        toast.info(`${quarter} record already exists — loading it now`);
      } else {
        toast.error(axiosErr?.response?.data?.message || 'Failed to generate class record');
        return;
      }
    } finally {
      setGeneratingQuarter(false);
    }
    // Refresh and auto-select the newly created/existing record
    try {
      const res = await classRecordService.getByClass(classId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      const target = records.find((r) => r.gradingPeriod === quarter) ?? records[0] ?? null;
      setSelectedRecord(target);
    } catch {
      toast.error('Failed to reload records');
    }
  };

  const handleFinalizeRecord = async () => {
    if (!selectedRecord || !confirm('Finalize this quarter? This cannot be undone.')) return;
    try {
      await classRecordService.finalize(selectedRecord.id);
      toast.success('Quarter finalized');
      const res = await classRecordService.getByClass(classId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      const updated = records.find((r) => r.id === selectedRecord.id) ?? null;
      setSelectedRecord(updated);
    } catch {
      toast.error('Failed to finalize');
    }
  };

  const handleCellClick = (itemId: string, studentId: string, currentScore: number | null) => {
    if (selectedRecord?.status !== 'draft') return;
    setEditingCell({ itemId, studentId });
    setEditValue(currentScore != null ? String(currentScore) : '');
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const score = parseFloat(editValue);
    if (isNaN(score) || score < 0) {
      toast.error('Invalid score');
      setEditingCell(null);
      return;
    }
    try {
      await classRecordService.recordScore(editingCell.itemId, {
        studentId: editingCell.studentId,
        score,
      });
      setEditingCell(null);
      fetchSpreadsheet();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || 'Failed to save score');
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellSave();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const handleSyncItem = async (itemId: string) => {
    try {
      setSyncingItemId(itemId);
      const res = await classRecordService.syncScores(itemId);
      const synced =
        typeof res.data === 'object' && res.data !== null && 'synced' in res.data
          ? Number((res.data as { synced?: number }).synced ?? 0)
          : 0;
      toast.success(`Synced ${synced} score(s) from assessment`);
      fetchSpreadsheet();
    } catch {
      toast.error('Failed to sync scores');
    } finally {
      setSyncingItemId(null);
    }
  };

  // ── Extract Module ────────────────────────────────────────────────────────

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
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">← Back</Button>
        <h1 className="text-2xl font-bold">{classItem.subjectName} ({classItem.subjectCode})</h1>
        <p className="text-muted-foreground">
          {classItem.section?.name} • Grade {classItem.section?.gradeLevel} • {enrollments.length} students
        </p>
      </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="extraction">Extraction</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="class-record">Class Record</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4 mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
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
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="all">All lessons</option>
                    <option value="draft">Draft only</option>
                    <option value="published">Published only</option>
                  </select>
                  <select
                    value={String(lessonPageSize)}
                    onChange={(e) => handleLessonPageSizeChange(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {LESSON_PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => setShowCreateLesson(true)}>+ New Lesson</Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-slate-50/80 p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectVisibleLessons}
                      disabled={sortedLessons.length === 0}
                    >
                      {allVisibleLessonsSelected ? 'Clear Page' : 'Select Page'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllFilteredLessons}
                      disabled={lessonTotal === 0 || bulkLessonAction === 'selecting-all'}
                    >
                      {bulkLessonAction === 'selecting-all' ? 'Selecting...' : 'Select All Filtered'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearLessonSelection}
                      disabled={selectedLessonIds.length === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleBulkLessonDraftState(false)}
                      disabled={selectedLessonIds.length === 0 || bulkLessonAction !== null}
                    >
                      {bulkLessonAction === 'publish' ? 'Publishing...' : 'Publish Selected'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBulkLessonDraftState(true)}
                      disabled={selectedLessonIds.length === 0 || bulkLessonAction !== null}
                    >
                      {bulkLessonAction === 'unpublish' ? 'Unpublishing...' : 'Unpublish Selected'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
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
                <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Drag lessons by the handle to change the order shown to students.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetLessonOrder}
                      disabled={!lessonOrderDirty || savingLessonOrder}
                    >
                      Reset Order
                    </Button>
                    <Button
                      size="sm"
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

          {sortedLessons.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No lessons in this view yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {sortedLessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className={cn(
                    'border-slate-200 shadow-sm transition',
                    selectedLessonIdSet.has(lesson.id) && 'ring-2 ring-primary/40',
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
                  <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLessonIdSet.has(lesson.id)}
                        onChange={() => toggleLessonSelection(lesson.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <button
                        type="button"
                        className={cn(
                          'mt-0.5 rounded-md border p-2 text-slate-500 transition',
                          canReorderLessons
                            ? 'cursor-grab hover:bg-slate-50 active:cursor-grabbing'
                            : 'cursor-not-allowed opacity-50',
                        )}
                        disabled={!canReorderLessons}
                        onMouseDown={() => handleLessonDragStart(lesson.id)}
                        aria-label={`Reorder ${lesson.title}`}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{lesson.title}</p>
                          <Badge variant={lesson.isDraft ? 'secondary' : 'default'}>
                            {lesson.isDraft ? 'Draft' : 'Published'}
                          </Badge>
                          <Badge variant="outline">Order #{lesson.order}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {getDescription(lesson.description)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!lesson.isDraft ? null : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePublishLesson(lesson.id)}
                          disabled={bulkLessonAction !== null}
                        >
                          Publish
                        </Button>
                      )}
                      <Link href={`/dashboard/teacher/lessons/${lesson.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteLesson(lesson.id)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {lessonPage} of {lessonTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLessonPageChange(lessonPage - 1)}
                      disabled={lessonPage <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
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
            <Card className="overflow-hidden border-red-100 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.1),_transparent_40%),linear-gradient(135deg,#ffffff_0%,#fff8f5_100%)]">
              <CardHeader>
                <CardTitle className="text-xl">Extraction Workspace</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload a new PDF for this class or reuse one from Nexora Library. Completed extractions stay here for review and lesson drafting.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border bg-white/80 p-4">
                  <Label>Upload a fresh module PDF</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setExtractFile(e.target.files?.[0] || null)}
                  />
                  <Button onClick={handleExtractModule} disabled={!extractFile || extracting}>
                    {extracting ? 'Uploading & Extracting...' : 'Start New Extraction'}
                  </Button>
                </div>
                <div className="space-y-3 rounded-2xl border bg-white/80 p-4">
                  <Label>Pick an existing library PDF</Label>
                  <select
                    value={selectedLibraryFileId}
                    onChange={(e) => setSelectedLibraryFileId(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select from Nexora Library</option>
                    {libraryFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.originalName} {file.scope === 'general' ? '• General' : '• My Library'}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => selectedLibraryFileId && queueExtraction(selectedLibraryFileId)}
                    disabled={!selectedLibraryFileId || extracting}
                  >
                    Use Selected PDF
                  </Button>
                  <Button
                    variant="secondary"
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
                          {ext.structuredContent?.lessons?.length ?? 0} lesson(s) • {new Date(ext.createdAt).toLocaleString()}
                        </p>
                        {ext.errorMessage && (
                          <p className="text-sm text-red-600">{ext.errorMessage}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/extractions/${ext.id}`)}>
                          Review
                        </Button>
                        {!ext.isApplied && ext.extractionStatus !== 'applied' && (
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={async () => {
                              try {
                                await extractionService.delete(ext.id);
                                toast.success('Extraction deleted');
                                fetchData();
                              } catch {
                                toast.error('Failed to delete extraction');
                              }
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
          <Card className="border-muted">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{assessments.length} assessments</p>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border p-0.5">
                    <Button
                      size="sm"
                      variant={assessmentViewMode === 'list' ? 'default' : 'ghost'}
                      className="h-8"
                      onClick={() => setAssessmentViewMode('list')}
                    >
                      <List className="mr-1 h-4 w-4" /> List
                    </Button>
                    <Button
                      size="sm"
                      variant={assessmentViewMode === 'grid' ? 'default' : 'ghost'}
                      className="h-8"
                      onClick={() => setAssessmentViewMode('grid')}
                    >
                      <LayoutGrid className="mr-1 h-4 w-4" /> Grid
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssessmentSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="h-8"
                  >
                    <ArrowUpDown className="mr-1 h-4 w-4" />
                    {assessmentSortOrder === 'asc' ? 'Date: Nearest' : 'Date: Latest'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      fetchExtractionWorkspace();
                      setShowQuizGenerator(true);
                    }}
                  >
                    AI Draft Quiz
                  </Button>
                  <Button size="sm" onClick={handleCreateAssessment}>+ New Assessment</Button>
                </div>
              </div>

              <Tabs value={assessmentCategoryTab} onValueChange={(value) => setAssessmentCategoryTab(value as 'written_work' | 'performance_task' | 'quarterly_assessment' | 'drafts')}>
                <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
                  {ASSESSMENT_CATEGORIES.map((category) => (
                    <TabsTrigger key={category.value} value={category.value}>
                      {category.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {Object.keys(categorizedAssessments).length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No assessments in this category yet.
              </CardContent>
            </Card>
          ) : (
            Object.entries(categorizedAssessments).map(([dateHeader, groupedAssessments]) => (
              <section key={dateHeader} className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{dateHeader}</h3>
                  <span className="text-xs text-muted-foreground">{groupedAssessments.length} item(s)</span>
                </div>

                <div className={assessmentViewMode === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
                  {groupedAssessments.map((assessment, index) => {
                    const categoryStyle = assessment.classRecordCategory === 'written_work'
                      ? 'border-l-4 border-l-blue-500'
                      : assessment.classRecordCategory === 'performance_task'
                        ? 'border-l-4 border-l-emerald-500'
                        : 'border-l-4 border-l-violet-500';

                    return (
                      <motion.div
                        key={assessment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.2 }}
                      >
                        <Card className={`group ${categoryStyle} transition-shadow hover:shadow-md`}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold leading-tight truncate">{assessment.title}</p>
                                <p className="text-xs capitalize text-muted-foreground mt-1">{assessment.type.replace(/_/g, ' ')}</p>
                              </div>
                              <Badge variant={assessment.isPublished ? 'default' : 'secondary'}>
                                {assessment.isPublished ? 'Published' : 'Draft'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <p>Points: <span className="font-medium text-foreground">{assessment.totalPoints ?? 0}</span></p>
                              <p>Questions: <span className="font-medium text-foreground">{assessment.questions?.length ?? 0}</span></p>
                              <p>Passing: <span className="font-medium text-foreground">{assessment.passingScore ?? 60}%</span></p>
                              
                              <p className="col-span-2">
                                Due Date:{' '}
                                <span className="font-medium text-foreground">
                                  {assessment.dueDate
                                    ? new Date(assessment.dueDate).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })
                                    : '—'}
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Link href={`/dashboard/teacher/assessments/${assessment.id}`}>
                                <Button variant="outline" size="sm">View</Button>
                              </Link>
                              <Link href={`/dashboard/teacher/assessments/${assessment.id}/edit`}>
                                <Button variant="outline" size="sm">Edit</Button>
                              </Link>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteAssessment(assessment.id)}>
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
            ))
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{announcements.length} announcements</p>
            <Button size="sm" onClick={() => setShowCreateAnnouncement(true)}>+ New Announcement</Button>
          </div>
          {announcements.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <Card key={ann.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{ann.title}</p>
                      {ann.isPinned && <Badge variant="secondary">📌 Pinned</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{ann.content}</p>
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
            {/* Quarter selector */}
            <div className="flex gap-2 items-center flex-wrap">
              {QUARTERS.map((q) => {
                const record = classRecords.find((r) => r.gradingPeriod === q);
                if (record) {
                  return (
                    <Button
                      key={q}
                      variant={selectedRecord?.id === record.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedRecord(record)}
                    >
                      {q}
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {record.status}
                      </Badge>
                    </Button>
                  );
                }
                return (
                  <Button
                    key={q}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateQuarter(q)}
                    disabled={generatingQuarter}
                  >
                    + {q}
                  </Button>
                );
              })}
            </div>

            {!selectedRecord && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No class record yet. Click a quarter button above to generate one.
                </CardContent>
              </Card>
            )}

            {/* Spreadsheet Header Info */}
            {spreadsheet && (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quarter: </span>
                        <strong>{spreadsheet.header.quarter}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Grade &amp; Section: </span>
                        <strong>
                          {spreadsheet.header.gradeLevel && `Grade ${spreadsheet.header.gradeLevel} - `}
                          {spreadsheet.header.section || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subject: </span>
                        <strong>{spreadsheet.header.subject || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teacher: </span>
                        <strong>{spreadsheet.header.teacher || '—'}</strong>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      {selectedRecord?.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={handleFinalizeRecord}>
                          Finalize Quarter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Spreadsheet Grid */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/70">
                            <th
                              className="sticky left-0 z-20 bg-muted/70 border px-2 py-1.5 text-left font-semibold min-w-[180px]"
                              rowSpan={3}
                            >
                              Learner&apos;s Name
                            </th>
                            {spreadsheet.categories.map((cat) => (
                              <th
                                key={cat.id}
                                colSpan={cat.items.length + 3}
                                className="border px-2 py-1.5 text-center font-semibold bg-muted/50"
                              >
                                {cat.name} ({cat.weight}%)
                              </th>
                            ))}
                            <th colSpan={2} className="border px-2 py-1.5 text-center font-semibold bg-muted/50">
                              Grades
                            </th>
                          </tr>
                          <tr className="bg-muted/40">
                            {spreadsheet.categories.map((cat) => (
                              <Fragment key={`header-${cat.id}`}>
                                {cat.items.map((item) => (
                                  <th key={item.id} className="border px-1.5 py-1 text-center font-medium min-w-[50px]">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span>{item.title}</span>
                                      {item.assessmentId && selectedRecord?.status === 'draft' && (
                                        <button
                                          title="Sync scores from assessment"
                                          onClick={() => handleSyncItem(item.id)}
                                          disabled={syncingItemId === item.id}
                                          className="text-[9px] text-indigo-500 hover:text-indigo-700 disabled:opacity-50 leading-none"
                                        >
                                          {syncingItemId === item.id ? '⟳' : '⇄ sync'}
                                        </button>
                                      )}
                                    </div>
                                  </th>
                                ))}
                                <th key={`${cat.id}-total`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[50px]">Total</th>
                                <th key={`${cat.id}-ps`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[40px]">PS</th>
                                <th key={`${cat.id}-ws`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[40px]">WS</th>
                              </Fragment>
                            ))}
                            <th className="border px-1.5 py-1 text-center font-medium bg-yellow-50 min-w-[50px]">IG</th>
                            <th className="border px-1.5 py-1 text-center font-medium bg-green-50 min-w-[50px]">QG</th>
                          </tr>
                          <tr className="bg-amber-50/50">
                            {spreadsheet.categories.map((cat) => (
                              <Fragment key={`hps-${cat.id}`}>
                                {cat.items.map((item) => (
                                  <td key={`hps-${item.id}`} className="border px-1.5 py-1 text-center font-semibold text-amber-700">
                                    {item.hps ?? ''}
                                  </td>
                                ))}
                                <td key={`hps-total-${cat.id}`} className="border px-1.5 py-1 text-center font-semibold text-amber-700">
                                  {cat.items.reduce((s, i) => s + (i.hps || 0), 0) || ''}
                                </td>
                                <td key={`hps-ps-${cat.id}`} className="border px-1.5 py-1 text-center">—</td>
                                <td key={`hps-ws-${cat.id}`} className="border px-1.5 py-1 text-center">—</td>
                              </Fragment>
                            ))}
                            <td className="border px-1.5 py-1 text-center">—</td>
                            <td className="border px-1.5 py-1 text-center">—</td>
                          </tr>
                        </thead>
                        <tbody>
                          {spreadsheet.students.map((student) => (
                            <tr key={student.studentId} className="hover:bg-muted/20">
                              <td className="sticky left-0 z-10 bg-white border px-2 py-1.5 font-medium whitespace-nowrap">
                                {student.lastName}, {student.firstName}
                              </td>
                              {spreadsheet.categories.map((cat, catIdx) => {
                                const catData = student.categories[catIdx];
                                return (
                                  <Fragment key={`${student.studentId}-${cat.id}`}>
                                    {cat.items.map((item, itemIdx) => {
                                      const score = catData?.scores[itemIdx];
                                      const isEditing =
                                        editingCell?.itemId === item.id &&
                                        editingCell?.studentId === student.studentId;
                                      return (
                                        <td
                                          key={`${student.studentId}-${item.id}`}
                                          className={`border px-1 py-0.5 text-center cursor-pointer hover:bg-blue-50 ${
                                            item.assessmentId ? 'bg-indigo-50/30' : ''
                                          }`}
                                          onClick={() =>
                                            handleCellClick(item.id, student.studentId, score ?? null)
                                          }
                                        >
                                          {isEditing ? (
                                            <Input
                                              ref={editRef}
                                              type="number"
                                              min={0}
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onBlur={handleCellSave}
                                              onKeyDown={handleCellKeyDown}
                                              className="h-6 w-14 text-xs text-center p-0 border-0 focus-visible:ring-1"
                                            />
                                          ) : (
                                            <span className={score == null ? 'text-muted-foreground' : ''}>
                                              {score ?? ''}
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td key={`${student.studentId}-total-${cat.id}`} className="border px-1 py-0.5 text-center font-medium bg-blue-50/50">
                                      {catData?.total != null ? catData.total.toFixed(1) : ''}
                                    </td>
                                    <td key={`${student.studentId}-ps-${cat.id}`} className="border px-1 py-0.5 text-center bg-blue-50/50">
                                      {catData?.ps != null ? catData.ps.toFixed(1) : ''}
                                    </td>
                                    <td key={`${student.studentId}-ws-${cat.id}`} className="border px-1 py-0.5 text-center bg-blue-50/50">
                                      {catData?.ws != null ? catData.ws.toFixed(2) : ''}
                                    </td>
                                  </Fragment>
                                );
                              })}
                              <td className="border px-1 py-0.5 text-center font-medium bg-yellow-50/50">
                                {student.initialGrade != null ? student.initialGrade.toFixed(2) : ''}
                              </td>
                              <td
                                className={`border px-1 py-0.5 text-center font-bold ${
                                  student.quarterlyGrade != null
                                    ? student.quarterlyGrade >= 75
                                      ? 'text-green-700 bg-green-50'
                                      : 'text-red-700 bg-red-50'
                                    : ''
                                }`}
                              >
                                {student.quarterlyGrade != null ? student.quarterlyGrade : ''}
                              </td>
                            </tr>
                          ))}
                          {spreadsheet.students.length === 0 && (
                            <tr>
                              <td
                                colSpan={
                                  1 +
                                  spreadsheet.categories.reduce((s, c) => s + c.items.length + 3, 0) +
                                  2
                                }
                                className="px-4 py-8 text-center text-muted-foreground"
                              >
                                No students enrolled in this class.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{enrollments.length} students</p>
            <Button size="sm" onClick={() => router.push(`/dashboard/teacher/classes/${classId}/students/add`)}>+ Add Student</Button>
          </div>
          {enrollments.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No students enrolled.</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e) => (
                    <TableRow key={e.id}>
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
                      <TableCell className="text-muted-foreground">{e.student?.profile?.lrn || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/teacher/classes/${classId}/students/${e.studentId}`)}>
                            View Profile
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleRemoveStudent(e.studentId)}>Remove</Button>
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

      {/* Create Lesson Modal */}
      <Dialog open={showCreateLesson} onOpenChange={setShowCreateLesson}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lesson</DialogTitle>
            <DialogDescription>
              Add a lesson title and optional summary before opening the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Lesson title" /></div>
            <div><Label>Description (optional)</Label><Textarea value={lessonDesc} onChange={(e) => setLessonDesc(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLesson(false)}>Cancel</Button>
            <Button onClick={handleCreateLesson} disabled={!lessonTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Assessment Modal removed — create-and-redirect flow instead */}

      <Dialog open={showQuizGenerator} onOpenChange={setShowQuizGenerator}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate AI Draft Quiz</DialogTitle>
            <DialogDescription>
              Create an unpublished draft from indexed lessons and extraction content, then review it in the existing assessment editor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label>Draft title</Label>
                <Input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Optional assessment title"
                />
              </div>

              <div>
                <Label>Teacher note</Label>
                <Textarea
                  value={quizTeacherNote}
                  onChange={(e) => setQuizTeacherNote(e.target.value)}
                  placeholder="Optional focus area, difficulty, or instructions for the generator"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Question count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={quizQuestionCount}
                    onChange={(e) => setQuizQuestionCount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Question type</Label>
                  <select
                    value={quizQuestionType}
                    onChange={(e) => setQuizQuestionType(e.target.value as QuestionType)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="multiple_select">Multiple select</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short answer</option>
                  </select>
                </div>
                <div>
                  <Label>Feedback level</Label>
                  <select
                    value={quizFeedbackLevel}
                    onChange={(e) => setQuizFeedbackLevel(e.target.value as FeedbackLevel)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="standard">Standard</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Source lessons</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave blank to let retrieval use all indexed published content.
                </p>
                <div className="mt-3 max-h-40 space-y-2 overflow-auto">
                  {lessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No lessons available.</p>
                  ) : (
                    lessons.map((lesson) => (
                      <label key={lesson.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={quizSourceLessonIds.includes(lesson.id)}
                          onChange={() =>
                            setQuizSourceLessonIds((prev) => toggleSelection(prev, lesson.id))
                          }
                        />
                        <span>{lesson.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Source extractions</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use this when you want to draft from extracted modules that are still under review.
                </p>
                <div className="mt-3 max-h-40 space-y-2 overflow-auto">
                  {extractions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No extraction runs available.</p>
                  ) : (
                    extractions.map((extraction) => (
                      <label key={extraction.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={quizSourceExtractionIds.includes(extraction.id)}
                          onChange={() =>
                            setQuizSourceExtractionIds((prev) =>
                              toggleSelection(prev, extraction.id),
                            )
                          }
                        />
                        <span>
                          {extraction.originalName || extraction.structuredContent?.title || 'Extraction'}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuizGenerator(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateQuizDraft} disabled={generatingQuiz}>
              {generatingQuiz ? 'Generating...' : 'Generate Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Announcement Modal */}
      <Dialog open={showCreateAnnouncement} onOpenChange={setShowCreateAnnouncement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Post a class announcement for enrolled students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement title" /></div>
            <div><Label>Content</Label><Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Announcement content" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAnnouncement(false)}>Cancel</Button>
            <Button onClick={handleCreateAnnouncement} disabled={!annTitle.trim() || !annContent.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
