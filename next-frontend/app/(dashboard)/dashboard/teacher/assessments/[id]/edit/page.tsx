'use client';

import { useCallback, useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  GripVertical,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { assessmentService } from '@/services/assessment-service';
import { classRecordService } from '@/services/class-record-service';
import type {
  Assessment,
  AssessmentClassRecordPlacement,
  AssessmentQuestion,
  AssessmentPlacementMode,
  ClassRecordCategory,
  CreateQuestionDto,
  QuestionAnalyticsResponse,
  RubricCriterion,
} from '@/types/assessment';
import type { ClassRecordSlotOverview, ClassRecordSlotOverviewCategory } from '@/types/class-record';
import type { AssessmentType, FeedbackLevel, GradingPeriod, QuestionType } from '@/utils/constants';
import './assessment-editor.css';

type RightTab = 'settings' | 'rubric' | 'analytics';
type Availability = 'given' | 'draft';
type ShowResultMode = 'immediate' | 'scheduled';

type QuestionDraft = {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  isRequired: boolean;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    order: number;
  }>;
  isNew?: boolean;
};

const PANE_STORAGE_PREFIX = 'teacher-assessment-editor-panes';

const QUESTION_TILES: Array<{ label: string; value: QuestionType; icon: typeof List }> = [
  { label: 'Multiple', value: 'multiple_choice', icon: List },
  { label: 'Identification', value: 'short_answer', icon: Type },
  { label: 'Essay', value: 'fill_blank', icon: Type },
  { label: 'File', value: 'dropdown', icon: List },
  { label: 'Matching', value: 'multiple_select', icon: List },
];

const QUESTION_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  multiple_select: 'Multiple Select',
  true_false: 'True / False',
  short_answer: 'Identification',
  fill_blank: 'Essay',
  dropdown: 'Dropdown',
};

const QUESTION_TYPE_ICONS: Record<QuestionType, typeof List> = {
  multiple_choice: List,
  multiple_select: List,
  true_false: List,
  short_answer: Type,
  fill_blank: Type,
  dropdown: List,
};

const ASSESSMENT_TYPE_TABS: Array<{ value: AssessmentType; label: string }> = [
  { value: 'quiz', label: 'Question Assessment' },
  { value: 'file_upload', label: 'File Upload Assessment' },
];

const FILE_UPLOAD_TYPE_GROUPS = [
  {
    key: 'documents',
    label: 'Documents',
    extensions: ['pdf', 'docx', 'txt', 'rtf'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
  },
  {
    key: 'images',
    label: 'Images',
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  {
    key: 'spreadsheets',
    label: 'Spreadsheets',
    extensions: ['xls', 'xlsx', 'csv'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },
] as const;

function toParamValue(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] || '';
  return input || '';
}

function createTempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function supportsOptions(type: QuestionType) {
  return (
    type === 'multiple_choice' ||
    type === 'multiple_select' ||
    type === 'true_false' ||
    type === 'dropdown'
  );
}

function defaultOptionsForType(type: QuestionType) {
  if (type === 'true_false') {
    return [
      { id: createTempId(), text: 'True', isCorrect: true, order: 1 },
      { id: createTempId(), text: 'False', isCorrect: false, order: 2 },
    ];
  }
  return [
    { id: createTempId(), text: '', isCorrect: false, order: 1 },
    { id: createTempId(), text: '', isCorrect: false, order: 2 },
  ];
}

function normalizeQuestion(question: AssessmentQuestion): QuestionDraft {
  return {
    id: question.id,
    type: question.type,
    content: question.content || '',
    points: question.points || 1,
    isRequired: question.isRequired ?? true,
    options: (question.options || []).map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
      order: option.order,
    })),
  };
}

function getQuestionPreview(question: QuestionDraft) {
  const trimmed = question.content.trim();
  if (!trimmed) return 'Untitled question';
  return trimmed.length > 58 ? `${trimmed.slice(0, 58)}...` : trimmed;
}

function getPaneStorageKey(assessmentId: string) {
  return `${PANE_STORAGE_PREFIX}:${assessmentId}`;
}

function getDefaultUploadExtensions() {
  return FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.extensions]);
}

function getDefaultUploadMimeTypes() {
  return FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.mimeTypes]);
}

function toDateInputValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateInputValue(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isDesktopPanesEnabled() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1201px)').matches;
}

export default function AssessmentEditorPage() {
  const params = useParams();
  const assessmentId = toParamValue(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [dropTargetQuestionId, setDropTargetQuestionId] = useState<string | null>(null);
  const [isReorderingQuestions, setIsReorderingQuestions] = useState(false);

  const [rightTab, setRightTab] = useState<RightTab>('settings');
  const [availability, setAvailability] = useState<Availability>('draft');
  const [showResultMode, setShowResultMode] = useState<ShowResultMode>('immediate');

  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz');
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>('30');
  const [dueDate, setDueDate] = useState('');
  const [feedbackLevel, setFeedbackLevel] = useState<FeedbackLevel>('immediate');
  const [feedbackDelayHours, setFeedbackDelayHours] = useState(0);

  const [category, setCategory] = useState<ClassRecordCategory>('written_work');
  const [quarter, setQuarter] = useState<GradingPeriod | ''>('');
  const [placementMode, setPlacementMode] = useState<AssessmentPlacementMode>('automatic');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotOverview, setSlotOverview] = useState<ClassRecordSlotOverview | null>(null);
  const [slotOverviewLoading, setSlotOverviewLoading] = useState(false);
  const [slotOverviewError, setSlotOverviewError] = useState<string | null>(null);

  const [closeWhenDue, setCloseWhenDue] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [timedQuestionsEnabled, setTimedQuestionsEnabled] = useState(false);
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState<string>('');
  const [strictMode, setStrictMode] = useState(false);

  const [fileUploadInstructions, setFileUploadInstructions] = useState('');
  const [allowedUploadExtensions, setAllowedUploadExtensions] = useState<string[]>(getDefaultUploadExtensions);
  const [allowedUploadMimeTypes, setAllowedUploadMimeTypes] = useState<string[]>(getDefaultUploadMimeTypes);
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = useState<number>(100 * 1024 * 1024);
  const [teacherAttachmentFile, setTeacherAttachmentFile] =
    useState<Assessment['teacherAttachmentFile'] | null>(null);
  const [uploadingTeacherAttachment, setUploadingTeacherAttachment] = useState(false);

  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [analytics, setAnalytics] = useState<QuestionAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [desktopPanesEnabled, setDesktopPanesEnabled] = useState(false);
  const [leftPaneCollapsed, setLeftPaneCollapsed] = useState(false);
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);

  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const fetchAssessment = useCallback(async () => {
    if (!assessmentId) return;
    try {
      setLoading(true);
      const response = await assessmentService.getById(assessmentId);
      const data = response.data;
      const normalizedQuestions = (data.questions || [])
        .sort((a, b) => a.order - b.order)
        .map(normalizeQuestion);

      setAssessment(data);
      setTitle(data.title || '');
      setQuestions(normalizedQuestions);
      setSelectedQuestionId(normalizedQuestions[0]?.id || null);
      setDeletedQuestionIds([]);

      setAvailability(data.isPublished ? 'given' : 'draft');
      setShowResultMode(data.feedbackLevel === 'immediate' ? 'immediate' : 'scheduled');

      setAssessmentType((data.type as AssessmentType) || 'quiz');
      setPassingScore(data.passingScore ?? 60);
      setMaxAttempts(data.maxAttempts ?? 1);
      setTimeLimitMinutes(
        data.timeLimitMinutes === null || data.timeLimitMinutes === undefined
          ? '30'
          : String(data.timeLimitMinutes),
      );
      setDueDate(toDateInputValue(data.dueDate));
      setFeedbackLevel((data.feedbackLevel as FeedbackLevel) || 'immediate');
      setFeedbackDelayHours(data.feedbackDelayHours ?? 0);

      setCategory(data.classRecordCategory || 'written_work');
      setQuarter((data.quarter as GradingPeriod) || '');
      const placement: AssessmentClassRecordPlacement | null | undefined = data.classRecordPlacement;
      setPlacementMode((placement?.placementMode as AssessmentPlacementMode) || 'automatic');
      setSelectedSlotId(placement?.itemId ?? null);

      setCloseWhenDue(data.closeWhenDue ?? false);
      setRandomizeQuestions(data.randomizeQuestions ?? false);
      setTimedQuestionsEnabled(data.timedQuestionsEnabled ?? false);
      setQuestionTimeLimitSeconds(
        data.questionTimeLimitSeconds === null || data.questionTimeLimitSeconds === undefined
          ? ''
          : String(data.questionTimeLimitSeconds),
      );
      setStrictMode(data.strictMode ?? false);

      setFileUploadInstructions(data.fileUploadInstructions || '');
      setAllowedUploadExtensions(
        data.allowedUploadExtensions && data.allowedUploadExtensions.length > 0
          ? data.allowedUploadExtensions
          : getDefaultUploadExtensions(),
      );
      setAllowedUploadMimeTypes(
        data.allowedUploadMimeTypes && data.allowedUploadMimeTypes.length > 0
          ? data.allowedUploadMimeTypes
          : getDefaultUploadMimeTypes(),
      );
      setMaxUploadSizeBytes(data.maxUploadSizeBytes ?? 100 * 1024 * 1024);
      setTeacherAttachmentFile(data.teacherAttachmentFile || null);

      setRubricCriteria(data.rubricCriteria || []);
      setAnalytics(null);
      setSlotOverview(null);
      setSlotOverviewError(null);
    } catch {
      toast.error('Unable to load assessment');
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void fetchAssessment();
  }, [fetchAssessment]);

  useEffect(() => {
    const apply = () => {
      setDesktopPanesEnabled(isDesktopPanesEnabled());
    };
    apply();
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    if (!assessmentId || typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(getPaneStorageKey(assessmentId));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { leftCollapsed?: boolean; rightCollapsed?: boolean };
      setLeftPaneCollapsed(parsed.leftCollapsed === true);
      setRightPaneCollapsed(parsed.rightCollapsed === true);
    } catch {
      setLeftPaneCollapsed(false);
      setRightPaneCollapsed(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (!assessmentId || typeof window === 'undefined') return;
    window.localStorage.setItem(
      getPaneStorageKey(assessmentId),
      JSON.stringify({
        leftCollapsed: leftPaneCollapsed,
        rightCollapsed: rightPaneCollapsed,
      }),
    );
  }, [assessmentId, leftPaneCollapsed, rightPaneCollapsed]);

  useEffect(() => {
    if (rightTab !== 'analytics' || !assessmentId) return;
    let cancelled = false;
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await assessmentService.getQuestionAnalytics(assessmentId);
        if (!cancelled) {
          setAnalytics(response.data);
        }
      } catch {
        if (!cancelled) {
          setAnalytics(null);
          toast.error('Unable to load analytics');
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    };
    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, rightTab]);

  useEffect(() => {
    if (!advancedOpen || !assessment?.classId || !category || !quarter) {
      setSlotOverview(null);
      setSlotOverviewError(null);
      return;
    }

    let cancelled = false;
    const loadSlots = async () => {
      try {
        setSlotOverviewLoading(true);
        setSlotOverviewError(null);
        const response = await classRecordService.getSlotOverview(
          assessment.classId,
          quarter,
          assessmentId || undefined,
        );
        if (cancelled) return;
        setSlotOverview(response.data);
      } catch {
        if (!cancelled) {
          setSlotOverview(null);
          setSlotOverviewError('Unable to load class record slots.');
        }
      } finally {
        if (!cancelled) {
          setSlotOverviewLoading(false);
        }
      }
    };
    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [advancedOpen, assessment?.classId, assessmentId, category, quarter]);

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) || null,
    [questions, selectedQuestionId],
  );

  const totalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions],
  );

  const selectedCategorySlots = useMemo<ClassRecordSlotOverviewCategory | null>(() => {
    if (!slotOverview) return null;
    return slotOverview.categories.find((entry) => entry.key === category) || null;
  }, [category, slotOverview]);

  const effectiveLeftCollapsed = desktopPanesEnabled ? leftPaneCollapsed : false;
  const effectiveRightCollapsed = desktopPanesEnabled ? rightPaneCollapsed : false;

  const updateQuestion = (
    questionId: string,
    updater: (question: QuestionDraft) => QuestionDraft,
  ) => {
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? updater(question) : question)),
    );
  };

  const handleAddQuestion = (type: QuestionType) => {
    if (assessmentType === 'file_upload') {
      toast.info('Switch to Question Assessment mode to add questions.');
      return;
    }
    const question: QuestionDraft = {
      id: createTempId(),
      type,
      content: '',
      points: 5,
      isRequired: true,
      options: supportsOptions(type) ? defaultOptionsForType(type) : [],
      isNew: true,
    };
    setQuestions((current) => [...current, question]);
    setSelectedQuestionId(question.id);
  };

  const handleDuplicateQuestion = (questionId: string) => {
    setQuestions((current) => {
      const sourceIndex = current.findIndex((question) => question.id === questionId);
      if (sourceIndex === -1) return current;
      const source = current[sourceIndex];
      const duplicate: QuestionDraft = {
        ...source,
        id: createTempId(),
        isNew: true,
        options: source.options.map((option, index) => ({
          ...option,
          id: createTempId(),
          order: index + 1,
        })),
      };
      const next = current.slice();
      next.splice(sourceIndex + 1, 0, duplicate);
      setSelectedQuestionId(duplicate.id);
      return next;
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    setConfirmation({
      title: 'Delete question?',
      description: 'This question will be removed from the assessment.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        setQuestions((current) => {
          const remaining = current.filter((question) => question.id !== questionId);
          setSelectedQuestionId((selected) =>
            selected === questionId ? (remaining[0]?.id ?? null) : selected,
          );
          return remaining;
        });
        if (!questionId.startsWith('temp-')) {
          setDeletedQuestionIds((current) => [...current, questionId]);
        }
      },
    });
  };

  const persistQuestionOrder = async (nextQuestions: QuestionDraft[], previousQuestions: QuestionDraft[]) => {
    try {
      setIsReorderingQuestions(true);
      await Promise.all(
        nextQuestions.map((question, index) => {
          if (question.id.startsWith('temp-')) return Promise.resolve();
          return assessmentService.updateQuestion(question.id, { order: index + 1 });
        }),
      );
      toast.success('Question order saved');
    } catch {
      setQuestions(previousQuestions);
      toast.error('Unable to save question order. Reverted to previous order.');
    } finally {
      setIsReorderingQuestions(false);
    }
  };

  const handleQuestionDragStart = (
    event: ReactDragEvent<HTMLElement>,
    questionId: string,
  ) => {
    if (assessmentType === 'file_upload') {
      event.preventDefault();
      return;
    }
    setDraggingQuestionId(questionId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', questionId);
  };

  const handleQuestionDragOver = (
    event: ReactDragEvent<HTMLElement>,
    questionId: string,
  ) => {
    if (!draggingQuestionId || draggingQuestionId === questionId || assessmentType === 'file_upload') return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetQuestionId(questionId);
  };

  const handleQuestionDrop = async (
    event: ReactDragEvent<HTMLElement>,
    targetQuestionId: string,
  ) => {
    event.preventDefault();
    if (assessmentType === 'file_upload') return;

    const sourceQuestionId = draggingQuestionId || event.dataTransfer.getData('text/plain');
    setDraggingQuestionId(null);
    setDropTargetQuestionId(null);
    if (!sourceQuestionId || sourceQuestionId === targetQuestionId) return;

    const sourceIndex = questions.findIndex((question) => question.id === sourceQuestionId);
    const targetIndex = questions.findIndex((question) => question.id === targetQuestionId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const previousQuestions = questions;
    const reordered = questions.slice();
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setQuestions(reordered);
    await persistQuestionOrder(reordered, previousQuestions);
  };

  const syncQuestions = async () => {
    if (!assessment) return;

    for (const questionId of deletedQuestionIds) {
      await assessmentService.deleteQuestion(questionId);
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const payload: Omit<CreateQuestionDto, 'assessmentId'> = {
        type: question.type,
        content: question.content.trim(),
        points: Number(question.points) || 1,
        order: index + 1,
        isRequired: question.isRequired,
        options: supportsOptions(question.type)
          ? question.options
              .map((option, optionIndex) => ({
                text: option.text.trim(),
                isCorrect: option.isCorrect,
                order: optionIndex + 1,
              }))
              .filter((option) => option.text)
          : [],
      };

      if (!payload.content) {
        throw new Error(`Question ${index + 1} is empty`);
      }

      if (supportsOptions(question.type)) {
        if ((payload.options?.length || 0) < 2) {
          throw new Error(`Question ${index + 1} needs at least two answer choices`);
        }
        if (!payload.options?.some((option) => option.isCorrect)) {
          throw new Error(`Question ${index + 1} needs at least one correct answer`);
        }
      }

      if (question.isNew || question.id.startsWith('temp-')) {
        await assessmentService.createQuestion({
          assessmentId: assessment.id,
          ...payload,
        });
      } else {
        await assessmentService.updateQuestion(question.id, payload);
      }
    }
  };

  const handleTeacherAttachmentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!assessment) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setUploadingTeacherAttachment(true);
      const response = await assessmentService.uploadTeacherAttachment(assessment.id, file);
      setTeacherAttachmentFile(response.data);
      toast.success('Reference file uploaded');
    } catch {
      toast.error('Unable to upload reference file');
    } finally {
      setUploadingTeacherAttachment(false);
    }
  };

  const handleSave = async () => {
    if (!assessment || saving) return;
    if (!title.trim()) {
      toast.error('Assessment title is required');
      return;
    }

    if (assessmentType !== 'file_upload' && questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    if (assessmentType === 'file_upload' && !fileUploadInstructions.trim()) {
      toast.error('File upload instructions are required');
      return;
    }

    if (assessmentType === 'file_upload' && allowedUploadExtensions.length === 0) {
      toast.error('Select at least one allowed file type');
      return;
    }

    if ((category && !quarter) || (!category && quarter)) {
      toast.error('Select both class record category and quarter');
      return;
    }

    if (placementMode === 'manual' && category && quarter && !selectedSlotId) {
      toast.error('Select a class record slot for manual placement');
      return;
    }

    try {
      setSaving(true);

      await assessmentService.update(assessment.id, {
        title: title.trim(),
        type: assessmentType,
        passingScore,
        maxAttempts,
        timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        dueDate: fromDateInputValue(dueDate),
        closeWhenDue,
        randomizeQuestions,
        timedQuestionsEnabled,
        questionTimeLimitSeconds:
          timedQuestionsEnabled && questionTimeLimitSeconds
            ? Number(questionTimeLimitSeconds)
            : null,
        strictMode,
        feedbackLevel,
        feedbackDelayHours: feedbackLevel === 'immediate' ? 0 : feedbackDelayHours,
        classRecordCategory: category || undefined,
        quarter: quarter || undefined,
        classRecordItemId:
          category && quarter
            ? placementMode === 'manual'
              ? selectedSlotId || null
              : null
            : null,
        fileUploadInstructions:
          assessmentType === 'file_upload' ? fileUploadInstructions : undefined,
        teacherAttachmentFileId:
          assessmentType === 'file_upload' ? teacherAttachmentFile?.id ?? null : null,
        allowedUploadExtensions:
          assessmentType === 'file_upload' ? allowedUploadExtensions : undefined,
        allowedUploadMimeTypes:
          assessmentType === 'file_upload' ? allowedUploadMimeTypes : undefined,
        maxUploadSizeBytes:
          assessmentType === 'file_upload' ? maxUploadSizeBytes : undefined,
        isPublished: availability === 'given',
      });

      if (assessmentType !== 'file_upload') {
        await syncQuestions();
      }

      toast.success('Assessment saved');
      await fetchAssessment();
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Unable to save assessment';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRubric = async () => {
    if (!assessment) return;
    try {
      const normalized = rubricCriteria
        .map((criterion, index) => ({
          id: criterion.id?.trim() || `criterion-${index + 1}`,
          title: criterion.title.trim(),
          description: criterion.description?.trim() || undefined,
          points: Number(criterion.points) || 0,
        }))
        .filter((criterion) => criterion.title);

      if (normalized.length === 0) {
        toast.error('Add at least one rubric criterion');
        return;
      }

      const response = await assessmentService.reviewRubric(assessment.id, normalized);
      setRubricCriteria(response.data.rubricCriteria || []);
      toast.success('Rubric saved');
    } catch {
      toast.error('Unable to save rubric');
    }
  };

  const toggleGroup = (groupKey: (typeof FILE_UPLOAD_TYPE_GROUPS)[number]['key']) => {
    const group = FILE_UPLOAD_TYPE_GROUPS.find((entry) => entry.key === groupKey);
    if (!group) return;
    const extensions = group.extensions as readonly string[];
    const mimeTypes = group.mimeTypes as readonly string[];
    const fullyEnabled = extensions.every((ext) => allowedUploadExtensions.includes(ext));
    if (fullyEnabled) {
      setAllowedUploadExtensions((current) =>
        current.filter((ext) => !extensions.includes(ext)),
      );
      setAllowedUploadMimeTypes((current) =>
        current.filter((mime) => !mimeTypes.includes(mime)),
      );
      return;
    }
    setAllowedUploadExtensions((current) => Array.from(new Set([...current, ...extensions])));
    setAllowedUploadMimeTypes((current) => Array.from(new Set([...current, ...mimeTypes])));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[42rem] rounded-xl" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Assessment not found.
      </div>
    );
  }

  const backHref = assessment.classId
    ? `/dashboard/teacher/classes/${assessment.classId}?view=assignments`
    : '/dashboard/teacher/assessments';

  return (
    <div className="assessment-editor">
      <header className="assessment-editor__header">
        <div className="assessment-editor__title">
          <Link href={backHref} className="assessment-editor__back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="assessment-editor__title-input"
          />
          <div className="assessment-editor__mode-switch">
            {ASSESSMENT_TYPE_TABS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                data-active={assessmentType === entry.value}
                onClick={() => {
                  setAssessmentType(entry.value);
                  if (entry.value === 'file_upload') {
                    toast.info('File Upload mode enabled. Questions are preserved but hidden.');
                  }
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="assessment-editor__header-actions">
          <Button
            type="button"
            variant="outline"
            className="assessment-editor__draft-btn"
            onClick={() => setAvailability((current) => (current === 'given' ? 'draft' : 'given'))}
          >
            <Eye className="h-4 w-4" />
            {availability === 'given' ? 'Given' : 'Draft'}
          </Button>
          <Button
            type="button"
            className="assessment-editor__save-btn"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <section
        className="assessment-editor__workspace"
        style={{
          gridTemplateColumns: `${effectiveLeftCollapsed ? '3.25rem' : '18.75rem'} minmax(0, 1fr) ${
            effectiveRightCollapsed ? '3.25rem' : '20rem'
          }`,
        }}
      >
        <aside className="assessment-editor__left" data-collapsed={effectiveLeftCollapsed}>
          {effectiveLeftCollapsed ? (
            <button
              type="button"
              className="assessment-editor__pane-expand"
              onClick={() => setLeftPaneCollapsed(false)}
              aria-label="Expand question panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <div className="assessment-editor__left-head">
                <span>
                  QUESTIONS ({questions.length})
                  {isReorderingQuestions ? (
                    <span className="assessment-editor__left-saving">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving order...
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="assessment-editor__pane-collapse"
                  onClick={() => {
                    if (!desktopPanesEnabled) return;
                    setLeftPaneCollapsed(true);
                  }}
                  aria-label="Collapse question panel"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="assessment-editor__question-list">
                {questions.map((question, index) => (
                  <article
                    key={question.id}
                    className="assessment-editor__question-item"
                    data-active={selectedQuestionId === question.id}
                    data-dragging={draggingQuestionId === question.id}
                    data-drop-target={dropTargetQuestionId === question.id}
                    draggable={assessmentType !== 'file_upload'}
                    onDragStart={(event) => handleQuestionDragStart(event, question.id)}
                    onDragOver={(event) => handleQuestionDragOver(event, question.id)}
                    onDrop={(event) => void handleQuestionDrop(event, question.id)}
                    onDragEnd={() => {
                      setDraggingQuestionId(null);
                      setDropTargetQuestionId(null);
                    }}
                  >
                    <button
                      type="button"
                      className="assessment-editor__question-main"
                      onClick={() => setSelectedQuestionId(question.id)}
                    >
                      <div className="assessment-editor__question-rail">
                        <GripVertical className="h-3.5 w-3.5" />
                        <div className="assessment-editor__question-index-wrap">
                          <span className="assessment-editor__question-index">Q{index + 1}</span>
                          {(() => {
                            const Icon = QUESTION_TYPE_ICONS[question.type];
                            return <Icon className="h-3.5 w-3.5" />;
                          })()}
                        </div>
                      </div>
                      <div className="assessment-editor__question-preview">
                        <p>{getQuestionPreview(question)}</p>
                      </div>
                    </button>

                    <div className="assessment-editor__question-tail">
                      <span className="assessment-editor__question-points">{question.points}pt</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="assessment-editor__question-menu"
                            aria-label={`Actions for question ${index + 1}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onSelect={() => handleDuplicateQuestion(question.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-700"
                            onSelect={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                ))}
              </div>

              <div className="assessment-editor__left-foot">
                <p>ADD QUESTION</p>
                <div className="assessment-editor__tile-grid">
                  {QUESTION_TILES.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <button
                        key={tile.label}
                        type="button"
                        className="assessment-editor__tile-btn"
                        onClick={() => handleAddQuestion(tile.value)}
                        disabled={assessmentType === 'file_upload'}
                      >
                        <Icon className="h-4 w-4" />
                        {tile.label}
                      </button>
                    );
                  })}
                </div>
                {assessmentType === 'file_upload' ? (
                  <p className="assessment-editor__left-note">
                    Questions are preserved in File Upload mode and editable again when you switch back.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </aside>

        <main className="assessment-editor__center">
          {assessmentType === 'file_upload' ? (
            <article className="assessment-editor__card assessment-editor__file-mode">
              <div className="assessment-editor__file-mode-head">
                <h3>File Upload Assessment</h3>
                <p>
                  Students submit files instead of answering question cards. Existing questions are kept for
                  future mode switches.
                </p>
              </div>

              <div className="assessment-editor__field">
                <label>Upload Instructions</label>
                <Textarea
                  value={fileUploadInstructions}
                  onChange={(event) => setFileUploadInstructions(event.target.value)}
                  className="assessment-editor__question-text"
                  placeholder="Explain what students must upload and how they should format it."
                />
              </div>

              <div className="assessment-editor__file-groups">
                {FILE_UPLOAD_TYPE_GROUPS.map((group) => {
                  const enabled = group.extensions.every((ext) => allowedUploadExtensions.includes(ext));
                  return (
                    <label key={group.key} className="assessment-editor__file-group" data-active={enabled}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleGroup(group.key)}
                      />
                      <span>{group.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="assessment-editor__field">
                <label>Maximum upload size (MB)</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={Math.round(maxUploadSizeBytes / (1024 * 1024))}
                  onChange={(event) => {
                    const mb = Number(event.target.value) || 1;
                    setMaxUploadSizeBytes(Math.min(Math.max(mb, 1), 100) * 1024 * 1024);
                  }}
                />
              </div>

              <div className="assessment-editor__file-attachment">
                <div>
                  <p>Teacher Reference File</p>
                  <span>Optional file students can preview while submitting.</span>
                </div>
                <label className="assessment-editor__upload-btn">
                  <Upload className="h-4 w-4" />
                  {uploadingTeacherAttachment ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleTeacherAttachmentUpload}
                    disabled={uploadingTeacherAttachment}
                  />
                </label>
              </div>

              {teacherAttachmentFile ? (
                <div className="assessment-editor__attachment-card">
                  <div>
                    <strong>{teacherAttachmentFile.originalName}</strong>
                    <p>{Math.round(teacherAttachmentFile.sizeBytes / 1024)} KB</p>
                  </div>
                  <div className="assessment-editor__attachment-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void assessmentService.downloadTeacherAttachment(
                          assessment.id,
                          teacherAttachmentFile.originalName,
                        )
                      }
                    >
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-rose-600"
                      onClick={() => setTeacherAttachmentFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          ) : !selectedQuestion ? (
            <div className="assessment-editor__empty">Select a question or add a new one.</div>
          ) : (
            <>
              <article className="assessment-editor__card">
                <div className="assessment-editor__card-top">
                  <span className="assessment-editor__type-chip">
                    <List className="h-3.5 w-3.5" />
                    {QUESTION_LABELS[selectedQuestion.type]}
                  </span>
                  <div className="assessment-editor__card-meta">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedQuestion.isRequired}
                        onChange={(event) =>
                          updateQuestion(selectedQuestion.id, (question) => ({
                            ...question,
                            isRequired: event.target.checked,
                          }))
                        }
                      />
                      Required
                    </label>
                    <Input
                      type="number"
                      min={1}
                      className="assessment-editor__point-input"
                      value={selectedQuestion.points}
                      onChange={(event) =>
                        updateQuestion(selectedQuestion.id, (question) => ({
                          ...question,
                          points: Number(event.target.value) || 1,
                        }))
                      }
                    />
                    <span>pts</span>
                  </div>
                </div>

                <Textarea
                  value={selectedQuestion.content}
                  onChange={(event) =>
                    updateQuestion(selectedQuestion.id, (question) => ({
                      ...question,
                      content: event.target.value,
                    }))
                  }
                  className="assessment-editor__question-text"
                  placeholder="Type question..."
                />
              </article>

              <article className="assessment-editor__card">
                <div className="assessment-editor__answer-head">
                  <h3>Answer Choices</h3>
                </div>

                {supportsOptions(selectedQuestion.type) ? (
                  <div className="assessment-editor__choices">
                    {selectedQuestion.options.map((option, optionIndex) => (
                      <div
                        key={option.id}
                        className="assessment-editor__choice-row"
                        data-correct={option.isCorrect}
                      >
                        <button
                          type="button"
                          className="assessment-editor__choice-check"
                          onClick={() =>
                            updateQuestion(selectedQuestion.id, (question) => ({
                              ...question,
                              options: question.options.map((entry, entryIndex) => ({
                                ...entry,
                                isCorrect:
                                  question.type === 'multiple_select'
                                    ? entryIndex === optionIndex
                                      ? !entry.isCorrect
                                      : entry.isCorrect
                                    : entryIndex === optionIndex,
                              })),
                            }))
                          }
                        >
                          {option.isCorrect ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                        <Input
                          value={option.text}
                          onChange={(event) =>
                            updateQuestion(selectedQuestion.id, (question) => ({
                              ...question,
                              options: question.options.map((entry, entryIndex) =>
                                entryIndex === optionIndex
                                  ? { ...entry, text: event.target.value }
                                  : entry,
                              ),
                            }))
                          }
                          className="assessment-editor__choice-input"
                        />
                        <button
                          type="button"
                          className="assessment-editor__choice-delete"
                          onClick={() =>
                            updateQuestion(selectedQuestion.id, (question) => ({
                              ...question,
                              options:
                                question.options.length <= 2
                                  ? question.options
                                  : question.options.filter((_, entryIndex) => entryIndex !== optionIndex),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="assessment-editor__add-choice"
                      onClick={() =>
                        updateQuestion(selectedQuestion.id, (question) => ({
                          ...question,
                          options: [
                            ...question.options,
                            {
                              id: createTempId(),
                              text: '',
                              isCorrect: false,
                              order: question.options.length + 1,
                            },
                          ],
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add Choice
                    </button>
                    <p className="assessment-editor__choice-note">
                      Click the circle to mark the correct answer.
                    </p>
                  </div>
                ) : (
                  <div className="assessment-editor__short-answer-note">
                    This question type uses text response and has no choice list.
                  </div>
                )}
              </article>
            </>
          )}
        </main>

        <aside className="assessment-editor__right" data-collapsed={effectiveRightCollapsed}>
          {effectiveRightCollapsed ? (
            <button
              type="button"
              className="assessment-editor__pane-expand"
              onClick={() => setRightPaneCollapsed(false)}
              aria-label="Expand settings panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <>
              <div className="assessment-editor__right-top">
                <nav className="assessment-editor__right-tabs">
                  {(['settings', 'rubric', 'analytics'] as RightTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      data-active={rightTab === tab}
                      onClick={() => setRightTab(tab)}
                    >
                      {tab[0].toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>
                <button
                  type="button"
                  className="assessment-editor__pane-collapse"
                  onClick={() => {
                    if (!desktopPanesEnabled) return;
                    setRightPaneCollapsed(true);
                  }}
                  aria-label="Collapse settings panel"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {rightTab === 'settings' ? (
                <div className="assessment-editor__right-body">
                  <div className="assessment-editor__field">
                    <label>Assessment Category</label>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value as ClassRecordCategory)}
                    >
                      <option value="written_work">Written Work</option>
                      <option value="performance_task">Performance Task</option>
                      <option value="quarterly_assessment">Quarterly Assessment</option>
                    </select>
                  </div>

                  <div className="assessment-editor__field">
                    <label>Time Limit (minutes)</label>
                    <Input
                      type="number"
                      min={1}
                      value={timeLimitMinutes}
                      onChange={(event) => setTimeLimitMinutes(event.target.value)}
                    />
                  </div>

                  <div className="assessment-editor__field">
                    <label>Show Results</label>
                    <label className="assessment-editor__radio">
                      <input
                        type="radio"
                        checked={showResultMode === 'immediate'}
                        onChange={() => {
                          setShowResultMode('immediate');
                          setFeedbackLevel('immediate');
                        }}
                      />
                      Immediately After Submit
                    </label>
                    <label className="assessment-editor__radio">
                      <input
                        type="radio"
                        checked={showResultMode === 'scheduled'}
                        onChange={() => {
                          setShowResultMode('scheduled');
                          if (feedbackLevel === 'immediate') setFeedbackLevel('standard');
                        }}
                      />
                      Scheduled Release
                    </label>
                  </div>

                  <div className="assessment-editor__field">
                    <label>Availability</label>
                    <div className="assessment-editor__availability">
                      <button
                        type="button"
                        data-active={availability === 'given'}
                        onClick={() => setAvailability('given')}
                      >
                        Given
                      </button>
                      <button
                        type="button"
                        data-active={availability === 'draft'}
                        onClick={() => setAvailability('draft')}
                      >
                        Draft
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="assessment-editor__advanced-btn"
                    onClick={() => setAdvancedOpen(true)}
                  >
                    Open Advanced Settings
                  </button>

                  <div className="assessment-editor__summary">
                    Total: <strong>{totalPoints} points</strong> - {questions.length} questions
                  </div>
                </div>
              ) : null}

              {rightTab === 'rubric' ? (
                <div className="assessment-editor__right-body">
                  <div className="assessment-editor__rubric-list">
                    {rubricCriteria.length === 0 ? (
                      <p className="assessment-editor__empty-small">No rubric criteria yet.</p>
                    ) : (
                      rubricCriteria.map((criterion, index) => (
                        <div key={criterion.id || index} className="assessment-editor__rubric-row">
                          <Input
                            value={criterion.title}
                            onChange={(event) =>
                              setRubricCriteria((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, title: event.target.value } : entry,
                                ),
                              )
                            }
                            placeholder="Criterion title"
                          />
                          <Input
                            type="number"
                            min={0}
                            value={criterion.points}
                            onChange={(event) =>
                              setRubricCriteria((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, points: Number(event.target.value) || 0 }
                                    : entry,
                                ),
                              )
                            }
                            placeholder="Points"
                          />
                          <button
                            type="button"
                            className="assessment-editor__choice-delete"
                            onClick={() =>
                              setRubricCriteria((current) =>
                                current.filter((_, entryIndex) => entryIndex !== index),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="assessment-editor__rubric-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setRubricCriteria((current) => [
                          ...current,
                          { id: createTempId(), title: '', points: 1, description: '' },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add Row
                    </Button>
                    <Button type="button" onClick={() => void handleSaveRubric()}>
                      <Save className="h-4 w-4" />
                      Save Rubric
                    </Button>
                  </div>
                </div>
              ) : null}

              {rightTab === 'analytics' ? (
                <div className="assessment-editor__right-body">
                  {analyticsLoading ? (
                    <Skeleton className="h-24 rounded-xl" />
                  ) : analytics ? (
                    <div className="assessment-editor__analytics">
                      <p>
                        Total Responses: <strong>{analytics.totalResponses || 0}</strong>
                      </p>
                      <p>
                        Total Attempts: <strong>{analytics.totalAttempts || 0}</strong>
                      </p>
                      <div className="assessment-editor__analytics-list">
                        {analytics.questions.map((entry) => (
                          <article key={entry.questionId}>
                            <h4>{entry.content || 'Untitled question'}</h4>
                            <p>
                              Correct: {Math.round(entry.correctPercent || 0)}% - Avg:{' '}
                              {entry.averagePoints.toFixed(1)} pts
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="assessment-editor__empty-small">No analytics data yet.</p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </aside>
      </section>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="assessment-editor__advanced-dialog">
          <DialogHeader>
            <DialogTitle>Advanced Settings</DialogTitle>
            <DialogDescription>
              Configure delivery behavior, scoring constraints, class record mapping, and security policies.
            </DialogDescription>
          </DialogHeader>

          <div className="assessment-editor__advanced-grid">
            <section className="assessment-editor__advanced-section">
              <h4>Delivery & Timing</h4>
              <div className="assessment-editor__field">
                <label>Due Date</label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
              <div className="assessment-editor__field">
                <label>Time Limit (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  value={timeLimitMinutes}
                  onChange={(event) => setTimeLimitMinutes(event.target.value)}
                />
              </div>
              <label className="assessment-editor__checkbox-row">
                <input
                  type="checkbox"
                  checked={closeWhenDue}
                  onChange={(event) => setCloseWhenDue(event.target.checked)}
                />
                Close assessment when due date passes
              </label>
            </section>

            <section className="assessment-editor__advanced-section">
              <h4>Attempt Rules</h4>
              <div className="assessment-editor__field">
                <label>Passing Score (%)</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={passingScore}
                  onChange={(event) => setPassingScore(Number(event.target.value) || 1)}
                />
              </div>
              <div className="assessment-editor__field">
                <label>Max Attempts</label>
                <Input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(event) => setMaxAttempts(Number(event.target.value) || 1)}
                />
              </div>
              <label className="assessment-editor__checkbox-row">
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={(event) => setRandomizeQuestions(event.target.checked)}
                />
                Randomize questions and options per student
              </label>
              <label className="assessment-editor__checkbox-row">
                <input
                  type="checkbox"
                  checked={timedQuestionsEnabled}
                  onChange={(event) => {
                    setTimedQuestionsEnabled(event.target.checked);
                    if (!event.target.checked) setQuestionTimeLimitSeconds('');
                  }}
                />
                Enable per-question timer
              </label>
              {timedQuestionsEnabled ? (
                <div className="assessment-editor__field">
                  <label>Question Time (seconds)</label>
                  <Input
                    type="number"
                    min={5}
                    value={questionTimeLimitSeconds}
                    onChange={(event) => setQuestionTimeLimitSeconds(event.target.value)}
                  />
                </div>
              ) : null}
              <label className="assessment-editor__checkbox-row">
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(event) => setStrictMode(event.target.checked)}
                />
                Strict no-return policy for previous questions
              </label>
            </section>

            <section className="assessment-editor__advanced-section">
              <h4>Feedback Strategy</h4>
              <div className="assessment-editor__field">
                <label>Feedback Level</label>
                <select
                  value={feedbackLevel}
                  onChange={(event) => {
                    const next = event.target.value as FeedbackLevel;
                    setFeedbackLevel(next);
                    setShowResultMode(next === 'immediate' ? 'immediate' : 'scheduled');
                  }}
                >
                  <option value="immediate">Immediate</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
              {feedbackLevel !== 'immediate' ? (
                <div className="assessment-editor__field">
                  <label>Feedback Delay (hours)</label>
                  <Input
                    type="number"
                    min={0}
                    value={feedbackDelayHours}
                    onChange={(event) => setFeedbackDelayHours(Number(event.target.value) || 0)}
                  />
                </div>
              ) : null}
            </section>

            <section className="assessment-editor__advanced-section assessment-editor__advanced-section--wide">
              <h4>Class Record Placement</h4>
              <div className="assessment-editor__advanced-inline">
                <div className="assessment-editor__field">
                  <label>Category</label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ClassRecordCategory)}
                  >
                    <option value="written_work">Written Work</option>
                    <option value="performance_task">Performance Task</option>
                    <option value="quarterly_assessment">Quarterly Assessment</option>
                  </select>
                </div>
                <div className="assessment-editor__field">
                  <label>Quarter</label>
                  <select
                    value={quarter}
                    onChange={(event) => setQuarter(event.target.value as GradingPeriod)}
                  >
                    <option value="">Select quarter</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              </div>

              <div className="assessment-editor__placement-toggle">
                <button
                  type="button"
                  data-active={placementMode === 'automatic'}
                  onClick={() => setPlacementMode('automatic')}
                >
                  Automatic slot
                </button>
                <button
                  type="button"
                  data-active={placementMode === 'manual'}
                  onClick={() => setPlacementMode('manual')}
                >
                  Manual slot
                </button>
              </div>

              {!quarter ? (
                <p className="assessment-editor__empty-small">
                  Pick a quarter to view available class record positions.
                </p>
              ) : slotOverviewLoading ? (
                <p className="assessment-editor__empty-small">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading slot overview...
                </p>
              ) : slotOverviewError ? (
                <p className="assessment-editor__empty-small">{slotOverviewError}</p>
              ) : selectedCategorySlots ? (
                <div className="assessment-editor__slots-grid">
                  {selectedCategorySlots.slots.map((slot) => (
                    <button
                      key={slot.itemId}
                      type="button"
                      className="assessment-editor__slot-card"
                      data-active={selectedSlotId === slot.itemId}
                      disabled={placementMode !== 'manual' || !slot.isSelectable}
                      onClick={() => {
                        if (placementMode !== 'manual' || !slot.isSelectable) return;
                        setSelectedSlotId(slot.itemId);
                      }}
                    >
                      <strong>{slot.title}</strong>
                      <span>HPS {slot.maxScore}</span>
                      <small>Status: {slot.status.replace('_', ' ')}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="assessment-editor__empty-small">No slots found for selected category.</p>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdvancedOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
