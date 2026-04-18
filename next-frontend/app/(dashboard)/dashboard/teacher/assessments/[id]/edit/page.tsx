'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Eye,
  Loader2,
  Plus,
  Trash2,
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
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import {
  AssessmentComposerShell,
  type AssessmentComposerSaveState,
} from '@/features/assessment-composer/AssessmentComposerShell';
import { AssessmentQuestionEditor } from '@/features/assessment-composer/AssessmentQuestionEditor';
import {
  createAssessmentComposerQuestion,
  deleteAssessmentComposerQuestion,
  duplicateAssessmentComposerQuestion,
  reorderAssessmentComposerQuestions,
} from '@/features/assessment-composer/reducer';
import { ASSESSMENT_COMPOSER_LABELS } from '@/features/assessment-composer/question-config';
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

function normalizeQuestion(question: AssessmentQuestion): QuestionDraft {
  return {
    id: question.id,
    type: question.type,
    content: question.content || '',
    points: question.points || 1,
    isRequired: question.isRequired ?? true,
    explanation: question.explanation || '',
    imageUrl: question.imageUrl || '',
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

export default function AssessmentEditorPage() {
  const params = useParams();
  const assessmentId = toParamValue(params.id);
  const initializedDraftRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [saveState, setSaveState] = useState<AssessmentComposerSaveState>('saved');
  const [previewEnabled, setPreviewEnabled] = useState(false);

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

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) || null,
    [questions, selectedQuestionId],
  );

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

  const totalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions],
  );

  const selectedCategorySlots = useMemo<ClassRecordSlotOverviewCategory | null>(() => {
    if (!slotOverview) return null;
    return slotOverview.categories.find((entry) => entry.key === category) || null;
  }, [category, slotOverview]);

  const handleAddQuestion = (type: QuestionType) => {
    if (assessmentType === 'file_upload') {
      toast.info('Switch to Question Assessment mode to add questions.');
      return;
    }
    const question = createAssessmentComposerQuestion(type, 5);
    setQuestions((current) => [...current, question]);
    setSelectedQuestionId(question.id);
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
      const options = supportsOptions(question.type)
        ? question.options.map((option, optionIndex) => ({
            text: option.text.trim(),
            isCorrect: option.isCorrect,
            order: optionIndex + 1,
          }))
        : [];

      if (!content) {
        throw new Error(`Question ${index + 1} is empty`);
      }

      if (!Number.isInteger(points) || points < 1) {
        throw new Error(`Question ${index + 1} needs valid points`);
      }

      if (supportsOptions(question.type)) {
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
      setSaveState('saving');

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
      lastSavedFingerprintRef.current = serializedDraft;
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

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Availability
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['given', 'draft'] as Availability[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  availability === mode
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
                onClick={() => setAvailability(mode)}
              >
                {mode === 'given' ? 'Given' : 'Draft'}
              </button>
            ))}
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

  const settingsPanel = (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-2">
        {(['settings', 'rubric', 'analytics'] as RightTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              rightTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
            onClick={() => setRightTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {rightTab === 'settings' ? settingsContent : null}
      {rightTab === 'rubric' ? rubricContent : null}
      {rightTab === 'analytics' ? analyticsContent : null}
    </div>
  );

  const centerContent =
    assessmentType === 'file_upload' ? (
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
        {assessmentTypeSwitcher}
        {questions.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500">
            No questions yet. Add one from the strip below to preview the learner flow.
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

              <p className="mt-4 text-base font-semibold leading-7 text-slate-900">
                {question.content || 'Untitled question'}
              </p>

              {question.imageUrl ? (
                <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={question.imageUrl} alt="" className="h-56 w-full object-cover" />
                </div>
              ) : null}

              {supportsOptions(question.type) ? (
                <div className="mt-4 space-y-3">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      {option.text || 'Untitled option'}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Learners answer this prompt with a written response.
                </div>
              )}

              {question.explanation ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Explanation preview: {question.explanation}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    ) : selectedQuestion ? (
      <div className="space-y-4">
        {assessmentTypeSwitcher}
        <AssessmentQuestionEditor
          question={selectedQuestion}
          questions={questions}
          onQuestionsChange={setQuestions}
        />
      </div>
    ) : (
      <div className="space-y-4">
        {assessmentTypeSwitcher}
        <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500">
          Select a question or add a new one.
        </div>
      </div>
    );

  return (
    <div className="assessment-editor">
      <AssessmentComposerShell
        backHref={backHref}
        backLabel="Back to assessments"
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        saveState={saveState}
        onSave={() => void handleSave()}
        saveDisabled={saving}
        previewEnabled={previewEnabled}
        onTogglePreview={() => setPreviewEnabled((current) => !current)}
        primaryAction={
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => setAvailability((current) => (current === 'given' ? 'draft' : 'given'))}
          >
            <Eye className="mr-2 h-4 w-4" />
            {availability === 'given' ? 'Given' : 'Draft'}
          </Button>
        }
        questions={questions}
        selectedQuestionId={selectedQuestionId}
        onSelectQuestion={setSelectedQuestionId}
        onDuplicateQuestion={handleDuplicateQuestion}
        onDeleteQuestion={handleDeleteQuestion}
        onAddQuestion={handleAddQuestion}
        onReorderQuestions={(fromIndex, toIndex) =>
          setQuestions((current) => reorderAssessmentComposerQuestions(current, fromIndex, toIndex))
        }
        leftFooterNote={
          assessmentType === 'file_upload'
            ? 'Questions are preserved in File Upload mode and editable again when you switch back.'
            : 'Use the rail to switch between questions, then refine the active card in the center canvas.'
        }
        center={centerContent}
        settingsPanel={settingsPanel}
      />

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
