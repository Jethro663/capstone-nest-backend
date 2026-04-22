'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  FileText,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { AssessmentQuestionEditor } from '@/features/assessment-composer/AssessmentQuestionEditor';
import {
  createAssessmentComposerQuestion,
  deleteAssessmentComposerQuestion,
  duplicateAssessmentComposerQuestion,
  reorderAssessmentComposerQuestions,
} from '@/features/assessment-composer/reducer';
import {
  ASSESSMENT_COMPOSER_LABELS,
  ASSESSMENT_COMPOSER_QUESTION_TYPES,
} from '@/features/assessment-composer/question-config';
import type { AssessmentComposerQuestionDraft as QuestionDraft } from '@/features/assessment-composer/types';
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
  UpdateQuestionDto,
} from '@/types/assessment';
import type { ClassRecordSlotOverview, ClassRecordSlotOverviewCategory } from '@/types/class-record';
import type { AssessmentType, FeedbackLevel, GradingPeriod, QuestionType } from '@/utils/constants';
import './assessment-editor.css';

type RightTab = 'settings' | 'rubric' | 'analytics';
type Availability = 'given' | 'draft';
type ShowResultMode = 'immediate' | 'scheduled';
type AssessmentComposerSaveState = 'saved' | 'saving' | 'dirty' | 'error';

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

const FILL_BLANK_CASE_SENSITIVE_TAG = 'fill_blank:smart_case_sensitive';
const FILL_BLANK_EXPERIMENTAL_SMART_TAG = 'fill_blank:experimental_smart_match';
const FILL_BLANK_META_TAG_PREFIX = 'fill_blank:';

function normalizeConceptTags(rawConceptTags: unknown): string[] {
  if (!Array.isArray(rawConceptTags)) return [];
  return rawConceptTags
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function parseFillBlankSettings(conceptTags: string[]) {
  return {
    fillBlankSmartCaseInsensitive: !conceptTags.includes(FILL_BLANK_CASE_SENSITIVE_TAG),
    fillBlankExperimentalSmartMatch: conceptTags.includes(FILL_BLANK_EXPERIMENTAL_SMART_TAG),
  };
}

function buildFillBlankConceptTags(
  conceptTags: string[],
  fillBlankSmartCaseInsensitive: boolean,
  fillBlankExperimentalSmartMatch: boolean,
) {
  const passthroughTags = conceptTags.filter((tag) => !tag.startsWith(FILL_BLANK_META_TAG_PREFIX));
  if (!fillBlankSmartCaseInsensitive) {
    passthroughTags.push(FILL_BLANK_CASE_SENSITIVE_TAG);
  }
  if (fillBlankExperimentalSmartMatch) {
    passthroughTags.push(FILL_BLANK_EXPERIMENTAL_SMART_TAG);
  }
  return passthroughTags;
}

function normalizeQuestion(question: AssessmentQuestion): QuestionDraft {
  const conceptTags = normalizeConceptTags(
    (question as AssessmentQuestion & { conceptTags?: unknown }).conceptTags,
  );
  const fillBlankSettings = parseFillBlankSettings(conceptTags);
  return {
    id: question.id,
    type: question.type,
    content: question.content || '',
    points: question.points || 1,
    isRequired: question.isRequired ?? true,
    explanation: question.explanation || '',
    imageUrl: question.imageUrl || '',
    conceptTags,
    fillBlankSmartCaseInsensitive: fillBlankSettings.fillBlankSmartCaseInsensitive,
    fillBlankExperimentalSmartMatch: fillBlankSettings.fillBlankExperimentalSmartMatch,
    options: (question.options || []).map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
      order: option.order,
    })),
  };
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

function stripTitleFromSerializedDraft(serializedDraft: string) {
  try {
    const parsed = JSON.parse(serializedDraft) as Record<string, unknown>;
    delete parsed.title;
    return JSON.stringify(parsed);
  } catch {
    return serializedDraft;
  }
}

export default function AssessmentEditorPage() {
  const params = useParams();
  const assessmentId = toParamValue(params.id);
  const initializedDraftRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const lastSavedTitleRef = useRef('');
  const latestSerializedDraftRef = useRef('');
  const latestTitleRef = useRef('');
  const titleAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [saveState, setSaveState] = useState<AssessmentComposerSaveState>('saved');
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [insertAfterQuestionIndex, setInsertAfterQuestionIndex] = useState<number | null>(null);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [dropTargetQuestionId, setDropTargetQuestionId] = useState<string | null>(null);
  const [hideFloatingAdd, setHideFloatingAdd] = useState(false);
  const questionListBottomRef = useRef<HTMLDivElement | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);

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
      lastSavedTitleRef.current = data.title || '';
      setDescription(data.description || '');
      setQuestions(normalizedQuestions);
      setSelectedQuestionId(normalizedQuestions[0]?.id || null);
      setDeletedQuestionIds([]);
      setPreviewEnabled(false);

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
      initializedDraftRef.current = false;
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

  const serializedDraft = useMemo(
    () =>
      JSON.stringify({
        title,
        description,
        questions,
        availability,
        assessmentType,
        passingScore,
        maxAttempts,
        timeLimitMinutes,
        dueDate,
        feedbackLevel,
        feedbackDelayHours,
        category,
        quarter,
        placementMode,
        selectedSlotId,
        closeWhenDue,
        randomizeQuestions,
        timedQuestionsEnabled,
        questionTimeLimitSeconds,
        strictMode,
        fileUploadInstructions,
        allowedUploadExtensions,
        allowedUploadMimeTypes,
        maxUploadSizeBytes,
        teacherAttachmentFileId: teacherAttachmentFile?.id ?? null,
        rubricCriteria,
      }),
    [
      allowedUploadExtensions,
      allowedUploadMimeTypes,
      assessmentType,
      availability,
      category,
      closeWhenDue,
      description,
      dueDate,
      feedbackDelayHours,
      feedbackLevel,
      fileUploadInstructions,
      maxAttempts,
      maxUploadSizeBytes,
      passingScore,
      placementMode,
      quarter,
      questionTimeLimitSeconds,
      questions,
      randomizeQuestions,
      rubricCriteria,
      selectedSlotId,
      strictMode,
      teacherAttachmentFile,
      timedQuestionsEnabled,
      timeLimitMinutes,
      title,
    ],
  );

  useEffect(() => {
    latestSerializedDraftRef.current = serializedDraft;
  }, [serializedDraft]);

  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    if (loading) return;

    if (!initializedDraftRef.current) {
      initializedDraftRef.current = true;
      lastSavedFingerprintRef.current = serializedDraft;
      setSaveState('saved');
      return;
    }

    if (serializedDraft !== lastSavedFingerprintRef.current) {
      setSaveState((current) => (current === 'saving' ? current : 'dirty'));
    }
  }, [loading, serializedDraft]);

  const autoSaveTitle = useCallback(
    async (nextTitle: string) => {
      if (!assessment || !assessmentId || saving) return;
      if (assessment.isCoreTemplateAsset) return;
      try {
        setSaveState('saving');
        await assessmentService.update(assessment.id, { title: nextTitle });
        lastSavedTitleRef.current = nextTitle;
        setAssessment((current) => (current ? { ...current, title: nextTitle } : current));

        if (latestTitleRef.current.trim() !== nextTitle) {
          setSaveState('dirty');
          return;
        }

        const latestDraft = latestSerializedDraftRef.current;
        const lastSavedDraft = lastSavedFingerprintRef.current;

        if (
          lastSavedDraft &&
          stripTitleFromSerializedDraft(lastSavedDraft) === stripTitleFromSerializedDraft(latestDraft)
        ) {
          lastSavedFingerprintRef.current = latestDraft;
          setSaveState('saved');
          return;
        }

        setSaveState('dirty');
      } catch {
        setSaveState('error');
        toast.error('Unable to auto-save assessment title');
      }
    },
    [assessment, assessmentId, saving],
  );

  useEffect(() => {
    if (!assessment || loading || saving || !initializedDraftRef.current) return;
    const nextTitle = title.trim();
    const lastSavedTitle = lastSavedTitleRef.current.trim();

    if (!nextTitle || nextTitle === lastSavedTitle) return;

    if (titleAutosaveTimerRef.current) {
      clearTimeout(titleAutosaveTimerRef.current);
    }

    titleAutosaveTimerRef.current = setTimeout(() => {
      void autoSaveTitle(nextTitle);
    }, 5000);

    return () => {
      if (titleAutosaveTimerRef.current) {
        clearTimeout(titleAutosaveTimerRef.current);
        titleAutosaveTimerRef.current = null;
      }
    };
  }, [assessment, autoSaveTitle, loading, saving, title]);

  useEffect(() => {
    if (assessmentType !== 'file_upload' && rightTab === 'rubric') {
      setRightTab('settings');
    }
  }, [assessmentType, rightTab]);

  useEffect(() => {
    const observerTarget = questionListBottomRef.current;
    if (!observerTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setHideFloatingAdd(Boolean(entries[0]?.isIntersecting));
      },
      { root: null, threshold: 0.12 },
    );
    observer.observe(observerTarget);
    return () => observer.disconnect();
  }, [questions.length, previewEnabled, assessmentType]);

  const totalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions],
  );

  const selectedCategorySlots = useMemo<ClassRecordSlotOverviewCategory | null>(() => {
    if (!slotOverview) return null;
    return slotOverview.categories.find((entry) => entry.key === category) || null;
  }, [category, slotOverview]);

  const handleAddQuestion = (type: QuestionType, afterIndex: number | null = null) => {
    if (assessmentType === 'file_upload') {
      toast.info('Switch to Question Assessment mode to add questions.');
      return;
    }
    const question = createAssessmentComposerQuestion(type, questions.length + 1);
    setQuestions((current) => {
      const insertAt = afterIndex === null ? current.length : Math.min(afterIndex + 1, current.length);
      const next = current.slice();
      next.splice(insertAt, 0, question);
      return next;
    });
    setSelectedQuestionId(question.id);
    setAddQuestionDialogOpen(false);
    setInsertAfterQuestionIndex(null);
  };

  const openQuestionTypeDialog = (afterIndex: number | null = null) => {
    setInsertAfterQuestionIndex(afterIndex);
    setAddQuestionDialogOpen(true);
  };

  const handleQuestionDrop = (targetQuestionId: string) => {
    const sourceQuestionId = draggingQuestionId;
    setDraggingQuestionId(null);
    setDropTargetQuestionId(null);
    if (!sourceQuestionId || sourceQuestionId === targetQuestionId) return;

    const fromIndex = questions.findIndex((question) => question.id === sourceQuestionId);
    const toIndex = questions.findIndex((question) => question.id === targetQuestionId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    setQuestions((current) => reorderAssessmentComposerQuestions(current, fromIndex, toIndex));
  };

  const openPanelTab = (tab: RightTab) => {
    setRightTab(tab);
    setPanelOpen(true);
  };

  const handleDuplicateQuestion = (questionId: string) => {
    setQuestions((current) => {
      const sourceIndex = current.findIndex((question) => question.id === questionId);
      if (sourceIndex === -1) return current;
      const duplicate = duplicateAssessmentComposerQuestion(current[sourceIndex]);
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
        const nextState = deleteAssessmentComposerQuestion(questions, questionId, selectedQuestionId);
        setQuestions(nextState.questions);
        setSelectedQuestionId(nextState.nextSelectedQuestionId);
        if (!questionId.startsWith('temp-')) {
          setDeletedQuestionIds((current) => [...current, questionId]);
        }
      },
    });
  };

  const syncQuestions = async () => {
    if (!assessment) return;

    for (const questionId of deletedQuestionIds) {
      await assessmentService.deleteQuestion(questionId);
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const content = question.content.trim();
      const points = Number(question.points);
      const isFillBlank = question.type === 'fill_blank';

      const fillBlankAnswerOptions = isFillBlank
        ? question.options
            .map((option) => option.text.trim())
            .filter((answer) => answer.length > 0)
            .map((answer, answerIndex) => ({
              text: answer,
              isCorrect: true,
              order: answerIndex + 1,
            }))
        : [];

      const options = supportsOptions(question.type)
        ? question.options.map((option, optionIndex) => ({
            text: option.text.trim(),
            isCorrect: option.isCorrect,
            order: optionIndex + 1,
          }))
        : fillBlankAnswerOptions;

      const conceptTags = isFillBlank
        ? buildFillBlankConceptTags(
            question.conceptTags,
            question.fillBlankSmartCaseInsensitive,
            question.fillBlankExperimentalSmartMatch,
          )
        : question.conceptTags.filter((tag) => !tag.startsWith(FILL_BLANK_META_TAG_PREFIX));

      if (!content) {
        throw new Error(`Question ${index + 1} is empty`);
      }

      if (!Number.isInteger(points) || points < 1) {
        throw new Error(`Question ${index + 1} needs valid points`);
      }

      if (isFillBlank) {
        if (options.length === 0) {
          throw new Error(`Question ${index + 1} needs at least one correct answer`);
        }
      } else if (supportsOptions(question.type)) {
        if (options.some((option) => !option.text)) {
          throw new Error(`Question ${index + 1} has empty answer choices`);
        }
        if (options.some((option) => typeof option.isCorrect !== 'boolean')) {
          throw new Error(`Question ${index + 1} has invalid answer choices`);
        }
        if (options.length < 2) {
          throw new Error(`Question ${index + 1} needs at least two answer choices`);
        }
        if (!options.some((option) => option.isCorrect)) {
          throw new Error(`Question ${index + 1} needs at least one correct answer`);
        }
      }

      const updatePayload: UpdateQuestionDto = {
        content,
        points,
        order: index + 1,
        isRequired: question.isRequired,
        explanation: question.explanation || undefined,
        imageUrl: question.imageUrl || undefined,
        conceptTags,
        options,
      };

      if (question.isNew || question.id.startsWith('temp-')) {
        const createPayload: CreateQuestionDto = {
          assessmentId: assessment.id,
          type: question.type,
          content,
          points,
          order: index + 1,
          isRequired: question.isRequired,
          explanation: question.explanation || undefined,
          imageUrl: question.imageUrl || undefined,
          conceptTags,
          options,
        };
        await assessmentService.createQuestion(createPayload);
      } else {
        await assessmentService.updateQuestion(question.id, updatePayload);
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
    const isCoreTemplateAssessment = Boolean(assessment.isCoreTemplateAsset);

    if (!isCoreTemplateAssessment && assessmentType !== 'file_upload' && questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    if (
      !isCoreTemplateAssessment &&
      assessmentType === 'file_upload' &&
      !fileUploadInstructions.trim()
    ) {
      toast.error('File upload instructions are required');
      return;
    }

    if (
      !isCoreTemplateAssessment &&
      assessmentType === 'file_upload' &&
      allowedUploadExtensions.length === 0
    ) {
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
      setSaveState('saving');

      const classRecordPlacementPayload = {
        classRecordCategory: category || undefined,
        quarter: quarter || undefined,
        classRecordItemId:
          category && quarter
            ? placementMode === 'manual'
              ? selectedSlotId || null
              : null
            : null,
      };

      if (isCoreTemplateAssessment) {
        await assessmentService.update(assessment.id, classRecordPlacementPayload);
      } else {
        await assessmentService.update(assessment.id, {
          title: title.trim(),
          description: description.trim() || undefined,
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
          ...classRecordPlacementPayload,
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
      }

      if (!isCoreTemplateAssessment && assessmentType !== 'file_upload') {
        await syncQuestions();
      }

      toast.success('Assessment saved');
      await fetchAssessment();
      lastSavedFingerprintRef.current = serializedDraft;
      lastSavedTitleRef.current = title.trim();
      setSaveState('saved');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Unable to save assessment';
      setSaveState('error');
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

  const assessmentTypeSwitcher = (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Assessment format</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ASSESSMENT_TYPE_TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
              assessmentType === entry.value
                ? 'border-sky-300 bg-sky-50 text-sky-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
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
  );

  const settingsContent = (
    <div className="space-y-5">
      {assessmentTypeSwitcher}

      <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
        <div>
          <p className="text-sm font-black text-slate-900">Core settings</p>
          <p className="text-sm text-slate-500">Set grading, visibility, and delivery defaults.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Assessment Category
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ClassRecordCategory)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800"
          >
            <option value="written_work">Written Work</option>
            <option value="performance_task">Performance Task</option>
            <option value="quarterly_assessment">Quarterly Assessment</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Time Limit (minutes)
          </label>
          <Input
            type="number"
            min={1}
            value={timeLimitMinutes}
            onChange={(event) => setTimeLimitMinutes(event.target.value)}
            className="h-11 rounded-2xl border-slate-200 bg-slate-50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Show Results
          </label>
          <div className="grid gap-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-2xl"
          onClick={() => setAdvancedOpen(true)}
        >
          Open Advanced Settings
        </Button>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Total: <strong>{totalPoints} points</strong> across {questions.length} questions
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Notes
          </label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            className="rounded-2xl"
            placeholder="Add notes or instructions for this assessment."
            minHeight={170}
          />
        </div>
      </div>
    </div>
  );

  const rubricContent = (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
      <div>
        <p className="text-sm font-black text-slate-900">Rubric rows</p>
        <p className="text-sm text-slate-500">Use this for file uploads or scored performance tasks.</p>
      </div>

      <div className="space-y-3">
        {rubricCriteria.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No rubric criteria yet.
          </p>
        ) : (
          rubricCriteria.map((criterion, index) => (
            <div
              key={criterion.id || index}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
            >
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
                className="h-11 rounded-2xl border-slate-200 bg-white"
              />
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_92px_auto]">
                <Input
                  value={criterion.description || ''}
                  onChange={(event) =>
                    setRubricCriteria((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, description: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="Description"
                  className="h-11 rounded-2xl border-slate-200 bg-white"
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
                  className="h-11 rounded-2xl border-slate-200 bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() =>
                    setRubricCriteria((current) =>
                      current.filter((_, entryIndex) => entryIndex !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl"
          onClick={() =>
            setRubricCriteria((current) => [
              ...current,
              { id: createTempId(), title: '', points: 1, description: '' },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Row
        </Button>
        <Button type="button" className="rounded-2xl" onClick={() => void handleSaveRubric()}>
          Save Rubric
        </Button>
      </div>
    </div>
  );

  const analyticsContent = analyticsLoading ? (
    <Skeleton className="h-24 rounded-xl" />
  ) : analytics ? (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
      <div>
        <p className="text-sm font-black text-slate-900">Assessment analytics</p>
        <p className="text-sm text-slate-500">Review response trends without leaving the composer.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Total Responses: <strong>{analytics.totalResponses || 0}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Total Attempts: <strong>{analytics.totalAttempts || 0}</strong>
        </div>
      </div>

      <div className="space-y-3">
        {analytics.questions.map((entry) => (
          <article
            key={entry.questionId}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4"
          >
            <h4 className="text-sm font-semibold text-slate-900">
              {entry.content || 'Untitled question'}
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Correct: {Math.round(entry.correctPercent || 0)}% | Avg:{' '}
              {entry.averagePoints.toFixed(1)} pts
            </p>
          </article>
        ))}
      </div>
    </div>
  ) : (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
      No analytics data yet.
    </p>
  );

  const controlPanelContent = (
    <div className="space-y-5">
      {rightTab === 'settings' ? settingsContent : null}
      {rightTab === 'rubric' ? rubricContent : null}
      {rightTab === 'analytics' ? analyticsContent : null}
    </div>
  );

  const saveStateMeta: { label: string; className: string } = (() => {
    if (saveState === 'saving') {
      return { label: 'Saving', className: 'border-amber-200 bg-amber-50 text-amber-700' };
    }
    if (saveState === 'dirty') {
      return { label: 'Unsaved', className: 'border-slate-200 bg-slate-100 text-slate-700' };
    }
    if (saveState === 'error') {
      return { label: 'Retry needed', className: 'border-rose-200 bg-rose-50 text-rose-700' };
    }
    return { label: 'Saved', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  })();

  const rubricDisabled = assessmentType !== 'file_upload';

  return (
    <div className="assessment-editor mx-auto max-w-[1220px] px-4 pb-10 pt-3 lg:px-6">
      <header className="sticky top-3 z-30 rounded-[1.9rem] border border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.28)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
                return;
              }
              window.location.assign(backHref);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to assessments
          </Button>
          <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${saveStateMeta.className}`}>
            {saveStateMeta.label}
          </span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-12 min-w-[260px] flex-1 rounded-2xl border-slate-200 bg-slate-50 px-4 text-xl font-black"
            placeholder="Untitled assessment"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className={`rounded-2xl ${
              panelOpen && rightTab === 'settings' ? 'border-slate-900 bg-slate-900 text-white' : ''
            }`}
            onClick={() => openPanelTab('settings')}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={rubricDisabled}
            className={`rounded-2xl ${
              panelOpen && rightTab === 'rubric' ? 'border-slate-900 bg-slate-900 text-white' : ''
            } ${rubricDisabled ? 'cursor-not-allowed opacity-55' : ''}`}
            onClick={() => {
              if (rubricDisabled) return;
              openPanelTab('rubric');
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Rubric
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`rounded-2xl ${
              panelOpen && rightTab === 'analytics' ? 'border-slate-900 bg-slate-900 text-white' : ''
            }`}
            onClick={() => openPanelTab('analytics')}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPreviewEnabled((current) => !current)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {previewEnabled ? 'Back to edit' : 'Preview'}
          </Button>
          <Button
            type="button"
            className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {!saving ? <Save className="mr-2 h-4 w-4" /> : null}
            Save now
          </Button>
        </div>
      </header>

      <main className="mt-5 space-y-4">
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
              <RichTextEditor
                value={fileUploadInstructions}
                onChange={setFileUploadInstructions}
                className="assessment-editor__question-text"
                placeholder="Explain what students must upload and how they should format it."
                minHeight={190}
              />
            </div>

            <div className="assessment-editor__file-groups">
              {FILE_UPLOAD_TYPE_GROUPS.map((group) => {
                const enabled = group.extensions.every((ext) => allowedUploadExtensions.includes(ext));
                return (
                  <label key={group.key} className="assessment-editor__file-group" data-active={enabled}>
                    <input type="checkbox" checked={enabled} onChange={() => toggleGroup(group.key)} />
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
        ) : previewEnabled ? (
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500">
                No questions yet. Add one to preview the learner flow.
              </div>
            ) : (
              questions.map((question, index) => (
                <article
                  key={question.id}
                  className="rounded-[1.6rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Question {index + 1}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
                      {ASSESSMENT_COMPOSER_LABELS[question.type]}
                    </span>
                    <span className="text-sm text-slate-500">
                      {question.points} pts {question.isRequired ? '| Required' : '| Optional'}
                    </span>
                  </div>

                  <RichTextRenderer
                    html={question.content || '<p>Untitled question</p>'}
                    className="mt-4 text-base font-semibold leading-7 text-slate-900"
                  />
                </article>
              ))
            )}
          </div>
        ) : questions.length === 0 ? (
          <div className="space-y-4 rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.25)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Quick start with</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ASSESSMENT_COMPOSER_QUESTION_TYPES.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => handleAddQuestion(entry.type)}
                    className="flex min-h-[84px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50/70"
                  >
                    <span className="rounded-xl bg-white p-2 text-sky-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{entry.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => {
              const isSelected = selectedQuestionId === question.id;
              const isLastQuestion = index === questions.length - 1;
              return (
                <div key={question.id} className="group space-y-2">
                  <article
                    draggable
                    onClick={() => setSelectedQuestionId(question.id)}
                    onDragStart={(event) => {
                      setDraggingQuestionId(question.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', question.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggingQuestionId && draggingQuestionId !== question.id) {
                        setDropTargetQuestionId(question.id);
                      }
                    }}
                    onDrop={() => handleQuestionDrop(question.id)}
                    onDragEnd={() => {
                      setDraggingQuestionId(null);
                      setDropTargetQuestionId(null);
                    }}
                    className={`rounded-[1.5rem] border bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.28)] ${
                      dropTargetQuestionId === question.id
                        ? 'border-emerald-300'
                        : isSelected
                          ? 'border-sky-300'
                          : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="flex cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500"
                          aria-label={`Drag to reorder question ${index + 1}`}
                        >
                          <GripVertical className="h-4 w-4" />
                          Q{index + 1}
                        </button>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
                          {ASSESSMENT_COMPOSER_LABELS[question.type]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDuplicateQuestion(question.id);
                          }}
                        >
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteQuestion(question.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      {isSelected ? (
                        <AssessmentQuestionEditor
                          question={question}
                          questions={questions}
                          onQuestionsChange={setQuestions}
                        />
                      ) : (
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                          <RichTextRenderer
                            html={question.content || '<p>Untitled question</p>'}
                            className="text-base font-semibold leading-7 text-slate-900"
                          />
                          {supportsOptions(question.type) && question.options.length > 0 ? (
                            <div className="space-y-2">
                              {question.options.map((option) => (
                                <div
                                  key={option.id}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                  {option.text || 'Untitled option'}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </article>

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openQuestionTypeDialog(index)}
                      className={`h-10 min-w-14 rounded-full border-sky-200 bg-white/95 px-4 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.42)] transition hover:scale-[1.03] hover:border-sky-300 hover:bg-sky-50 ${
                        isLastQuestion
                          ? ''
                          : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div ref={questionListBottomRef} className="h-2" />
          </div>
        )}
      </main>

      {assessmentType !== 'file_upload' && questions.length > 0 && !hideFloatingAdd ? (
        <Button
          type="button"
          onClick={() => openQuestionTypeDialog(null)}
          className="fixed bottom-5 right-5 z-30 h-10 w-10 rounded-full p-0 shadow-[0_20px_36px_-20px_rgba(15,23,42,0.45)]"
        >
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}

      <Dialog
        open={addQuestionDialogOpen}
        onOpenChange={(open) => {
          setAddQuestionDialogOpen(open);
          if (!open) setInsertAfterQuestionIndex(null);
        }}
      >
        <DialogContent className="max-w-4xl rounded-3xl border-slate-200 p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-xl font-black text-slate-900">Add Question</DialogTitle>
            <DialogDescription className="text-slate-500">
              Choose the next question type for this assessment.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ASSESSMENT_COMPOSER_QUESTION_TYPES.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={`${entry.type}-dialog`}
                    type="button"
                    onClick={() => handleAddQuestion(entry.type, insertAfterQuestionIndex)}
                    className="flex min-h-[84px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50/70"
                  >
                    <span className="rounded-xl bg-white p-2 text-sky-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{entry.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-black"
              onClick={() => {
                setAddQuestionDialogOpen(false);
                setInsertAfterQuestionIndex(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={`fixed inset-0 z-40 transition ${panelOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Close panel"
          className={`absolute inset-0 bg-slate-900/35 transition-opacity duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setPanelOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-[440px] border-l border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_28px_54px_-36px_rgba(15,23,42,0.42)] transition-transform duration-300 ${
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">
              {rightTab[0].toUpperCase() + rightTab.slice(1)}
            </h3>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[calc(100%-56px)] overflow-y-auto pr-1">
            {controlPanelContent}
          </div>
        </aside>
      </div>

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
