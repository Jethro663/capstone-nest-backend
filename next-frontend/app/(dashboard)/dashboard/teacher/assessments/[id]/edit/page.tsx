'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileCog, Gauge, Save, Send } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { classRecordService } from '@/services/class-record-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { toast } from 'sonner';
import type {
  Assessment,
  AssessmentPlacementMode,
  AssessmentQuestion,
  CreateQuestionDto,
  RubricCriterion,
  ClassRecordCategory,
} from '@/types/assessment';
import type { ClassRecordSlotOverview } from '@/types/class-record';
import type { GradingPeriod } from '@/utils/constants';
import { TeacherPageShell, TeacherSectionCard, TeacherStatCard } from '@/components/teacher/TeacherPageShell';
import { cn } from '@/utils/cn';

/* â”€â”€ Question type metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'dropdown', label: 'Dropdown' },
] as const;

const OPTION_QUESTION_TYPES = ['multiple_choice', 'multiple_select', 'true_false', 'dropdown'];
const FILE_UPLOAD_TYPE_GROUPS = [
  { key: 'documents', label: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
  { key: 'images', label: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
  { key: 'spreadsheets', label: 'Spreadsheets', extensions: ['xls', 'xlsx', 'csv'] },
] as const;

const CLASS_RECORD_CATEGORY_LABELS: Record<ClassRecordCategory, string> = {
  written_work: 'Written Work',
  performance_task: 'Performance Task',
  quarterly_assessment: 'Quarterly Assessment',
};

type LocalQuestion = AssessmentQuestion & { isNew?: boolean };

function normalizeQuestions(questions: LocalQuestion[]) {
  return questions
    .map((question, index) => ({
      id: question.id,
      type: question.type,
      content: question.content,
      points: question.points,
      order: index + 1,
      isRequired: question.isRequired ?? true,
      explanation: question.explanation || '',
      imageUrl: question.imageUrl || '',
      options: (question.options || [])
        .map((option, optionIndex) => ({
          text: option.text,
          isCorrect: option.isCorrect,
          order: optionIndex + 1,
        }))
        .sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);
}

/* â”€â”€ Main page component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function AssessmentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  /* ---------- state ---------- */
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<LocalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Header fields (inline-editable)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Settings
  const [assessmentType, setAssessmentType] = useState<string>('quiz');
  const [passingScore, setPassingScore] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [feedbackLevel, setFeedbackLevel] = useState<string>('immediate');
  const [feedbackDelayHours, setFeedbackDelayHours] = useState<number>(0);
  const [lastAssessmentType, setLastAssessmentType] = useState<string>('quiz');
  const [classRecordCategory, setClassRecordCategory] = useState<ClassRecordCategory | ''>('');
  const [quarter, setQuarter] = useState<GradingPeriod | ''>('');
  const [placementMode, setPlacementMode] = useState<AssessmentPlacementMode>('automatic');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotOverview, setSlotOverview] = useState<ClassRecordSlotOverview | null>(null);
  const [slotOverviewLoading, setSlotOverviewLoading] = useState(false);
  const [slotOverviewError, setSlotOverviewError] = useState<string | null>(null);
  const [showSlotPreview, setShowSlotPreview] = useState(true);
  const [editorTab, setEditorTab] = useState<'questions' | 'fileUpload' | 'settings'>('settings');
  const [closeWhenDue, setCloseWhenDue] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [timedQuestionsEnabled, setTimedQuestionsEnabled] = useState(false);
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState<number | ''>('');
  const [strictMode, setStrictMode] = useState(false);
  const [fileUploadInstructions, setFileUploadInstructions] = useState('');
  const [allowedUploadExtensions, setAllowedUploadExtensions] = useState<string[]>([]);
  const [allowedUploadMimeTypes, setAllowedUploadMimeTypes] = useState<string[]>([]);
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = useState<number>(100 * 1024 * 1024);
  const [rubricParseStatus, setRubricParseStatus] = useState<Assessment['rubricParseStatus']>(null);
  const [rubricUploading, setRubricUploading] = useState(false);
  const [rubricSaving, setRubricSaving] = useState(false);
  const [rubricSourceFile, setRubricSourceFile] = useState<Assessment['rubricSourceFile'] | null>(null);
  const [teacherAttachmentFile, setTeacherAttachmentFile] = useState<Assessment['teacherAttachmentFile'] | null>(null);
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [savedMeta, setSavedMeta] = useState<{
    title: string;
    description: string;
    type: string;
    passingScore: number;
    maxAttempts: number;
    timeLimitMinutes: number | '';
    dueDate: string;
    feedbackLevel: string;
    feedbackDelayHours: number;
    classRecordCategory: string;
    quarter: string;
    closeWhenDue: boolean;
    randomizeQuestions: boolean;
    timedQuestionsEnabled: boolean;
    questionTimeLimitSeconds: number | '';
    strictMode: boolean;
    fileUploadInstructions: string;
    allowedUploadExtensions: string[];
    allowedUploadMimeTypes: string[];
    maxUploadSizeBytes: number;
    teacherAttachmentFileId: string;
    placementMode: AssessmentPlacementMode;
    selectedSlotId: string;
  } | null>(null);

  // Inline editing for questions
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<{
    content: string;
    type: string;
    points: number;
    explanation: string;
    imageUrl: string;
    options: { text: string; isCorrect: boolean; order: number }[];
  } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  /* ---------- fetch ---------- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getById(assessmentId);
      const a = res.data;
      setAssessment(a);
      setTitle(a.title);
      setDescription(a.description || '');
      setAssessmentType(a.type || 'quiz');
      setPassingScore(a.passingScore ?? 60);
      setMaxAttempts(a.maxAttempts ?? 1);
      setTimeLimitMinutes(a.timeLimitMinutes ?? '');
      setDueDate(a.dueDate ? a.dueDate.slice(0, 16) : '');
      setFeedbackLevel(a.feedbackLevel || 'immediate');
      setFeedbackDelayHours(a.feedbackDelayHours ?? 0);
      setClassRecordCategory(a.classRecordCategory || '');
      setQuarter(a.quarter || '');
      setCloseWhenDue(a.closeWhenDue ?? false);
      setRandomizeQuestions(a.randomizeQuestions ?? false);
      setTimedQuestionsEnabled(a.timedQuestionsEnabled ?? false);
      setQuestionTimeLimitSeconds(a.questionTimeLimitSeconds ?? '');
      setStrictMode(a.strictMode ?? false);
      setFileUploadInstructions(a.fileUploadInstructions || '');
      setAllowedUploadExtensions(
        a.allowedUploadExtensions && a.allowedUploadExtensions.length > 0
          ? a.allowedUploadExtensions
          : FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.extensions]),
      );
      setAllowedUploadMimeTypes(
        a.allowedUploadMimeTypes && a.allowedUploadMimeTypes.length > 0
          ? a.allowedUploadMimeTypes
          : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
      );
      setMaxUploadSizeBytes(a.maxUploadSizeBytes ?? 100 * 1024 * 1024);
      setTeacherAttachmentFile(a.teacherAttachmentFile || null);
      setRubricSourceFile(a.rubricSourceFile || null);
      setRubricCriteria(a.rubricCriteria || []);
      setRubricParseStatus(a.rubricParseStatus ?? null);
      setPlacementMode(a.classRecordPlacement?.placementMode || 'automatic');
      setSelectedSlotId(a.classRecordPlacement?.itemId ?? null);
      const normalizedQuestions = (a.questions || [])
        .map((question) => ({
          ...question,
          options: [...(question.options || [])].sort((x, y) => x.order - y.order),
        }))
        .sort((x, y) => x.order - y.order);
      setQuestions(normalizedQuestions);
      setSavedQuestions(normalizedQuestions);
      setSavedMeta({
        title: a.title,
        description: a.description || '',
        type: a.type || 'quiz',
        passingScore: a.passingScore ?? 60,
        maxAttempts: a.maxAttempts ?? 1,
        timeLimitMinutes: a.timeLimitMinutes ?? '',
        dueDate: a.dueDate ? a.dueDate.slice(0, 16) : '',
        feedbackLevel: a.feedbackLevel || 'immediate',
        feedbackDelayHours: a.feedbackDelayHours ?? 0,
        classRecordCategory: a.classRecordCategory || '',
        quarter: a.quarter || '',
        closeWhenDue: a.closeWhenDue ?? false,
        randomizeQuestions: a.randomizeQuestions ?? false,
        timedQuestionsEnabled: a.timedQuestionsEnabled ?? false,
        questionTimeLimitSeconds: a.questionTimeLimitSeconds ?? '',
        strictMode: a.strictMode ?? false,
        fileUploadInstructions: a.fileUploadInstructions || '',
        allowedUploadExtensions:
          a.allowedUploadExtensions && a.allowedUploadExtensions.length > 0
            ? [...a.allowedUploadExtensions].sort()
            : FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.extensions]).sort(),
        allowedUploadMimeTypes:
          a.allowedUploadMimeTypes && a.allowedUploadMimeTypes.length > 0
            ? [...a.allowedUploadMimeTypes].sort()
            : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].sort(),
        maxUploadSizeBytes: a.maxUploadSizeBytes ?? 100 * 1024 * 1024,
        teacherAttachmentFileId: a.teacherAttachmentFileId || '',
        placementMode: a.classRecordPlacement?.placementMode || 'automatic',
        selectedSlotId: a.classRecordPlacement?.itemId || '',
      });
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (assessmentType !== 'file_upload') {
      setLastAssessmentType(assessmentType);
    }
    if (assessmentType === 'file_upload' && editorTab === 'questions') {
      setEditorTab('fileUpload');
    }
    if (assessmentType !== 'file_upload' && editorTab === 'fileUpload') {
      setEditorTab('questions');
    }
  }, [assessmentType, editorTab]);

  useEffect(() => {
    let cancelled = false;

    const loadSlotOverview = async () => {
      if (!assessment?.classId || !classRecordCategory || !quarter) {
        setSlotOverview(null);
        setSlotOverviewError(null);
        return;
      }

      try {
        setSlotOverviewLoading(true);
        setSlotOverviewError(null);
        const res = await classRecordService.getSlotOverview(
          assessment.classId,
          quarter,
          assessmentId,
        );

        if (cancelled) return;

        setSlotOverview(res.data);
        const existingPlacementItemId =
          assessment.classRecordPlacement?.gradingPeriod === quarter &&
          assessment.classRecordPlacement?.category === classRecordCategory
            ? assessment.classRecordPlacement.itemId
            : null;
        setSelectedSlotId((current) => {
          if (!current) {
            return existingPlacementItemId;
          }

          const slotExists = res.data.categories.some((category) =>
            category.slots.some((slot) => slot.itemId === current),
          );

          return slotExists ? current : existingPlacementItemId;
        });
      } catch (error: unknown) {
        const slotError = error as { response?: { data?: { message?: string } } };
        if (cancelled) return;
        setSlotOverview(null);
        setSlotOverviewError(
          slotError?.response?.data?.message || 'Failed to load class record slots',
        );
      } finally {
        if (!cancelled) {
          setSlotOverviewLoading(false);
        }
      }
    };

    void loadSlotOverview();

    return () => {
      cancelled = true;
    };
  }, [
    assessment?.classId,
    assessment?.classRecordPlacement?.itemId,
    assessmentId,
    classRecordCategory,
    quarter,
  ]);

  /* ---------- computed ---------- */
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const currentMeta = {
    title,
    description,
    type: assessmentType,
    passingScore,
    maxAttempts,
    timeLimitMinutes,
    dueDate,
    feedbackLevel,
    feedbackDelayHours,
    classRecordCategory,
    quarter,
    closeWhenDue,
    randomizeQuestions,
    timedQuestionsEnabled,
    questionTimeLimitSeconds,
    strictMode,
    fileUploadInstructions,
    allowedUploadExtensions: [...allowedUploadExtensions].sort(),
    allowedUploadMimeTypes: [...allowedUploadMimeTypes].sort(),
    maxUploadSizeBytes,
    teacherAttachmentFileId: teacherAttachmentFile?.id || '',
    placementMode,
    selectedSlotId: selectedSlotId || '',
  };
  const hasPendingChanges =
    (savedMeta ? JSON.stringify(currentMeta) !== JSON.stringify(savedMeta) : false) ||
    JSON.stringify(normalizeQuestions(questions)) !== JSON.stringify(normalizeQuestions(savedQuestions));
  const activePlacementItemId =
    placementMode === 'manual'
      ? selectedSlotId
      : assessment?.classRecordPlacement?.gradingPeriod === quarter &&
          assessment?.classRecordPlacement?.category === classRecordCategory
        ? assessment.classRecordPlacement.itemId
        : null;
  const currentClassRecordCategoryLabel = classRecordCategory
    ? CLASS_RECORD_CATEGORY_LABELS[classRecordCategory as ClassRecordCategory]
    : CLASS_RECORD_CATEGORY_LABELS.written_work;
  const selectedCategorySlots = slotOverview?.categories.find(
    (category) => category.key === classRecordCategory,
  );

  const isGroupSelected = (groupKey: string) => {
    const group = FILE_UPLOAD_TYPE_GROUPS.find((entry) => entry.key === groupKey);
    if (!group) return false;
    return group.extensions.every((ext) => allowedUploadExtensions.includes(ext));
  };
  const toggleFileGroup = (groupKey: string, checked: boolean) => {
    const group = FILE_UPLOAD_TYPE_GROUPS.find((entry) => entry.key === groupKey);
    if (!group) return;
    const mimeTypes = group.key === 'documents'
      ? ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      : group.key === 'images'
        ? ['image/png', 'image/jpeg']
        : ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];

    if (checked) {
      setAllowedUploadExtensions((prev) => Array.from(new Set([...prev, ...group.extensions])));
      setAllowedUploadMimeTypes((prev) => Array.from(new Set([...prev, ...mimeTypes])));
      return;
    }

    setAllowedUploadExtensions((prev) => prev.filter((ext) => !(group.extensions as readonly string[]).includes(ext)));
    setAllowedUploadMimeTypes((prev) => prev.filter((mime) => !mimeTypes.includes(mime)));
  };

  const handleTeacherAttachmentUpload = async (file: File) => {
    try {
      const res = await assessmentService.uploadTeacherAttachment(assessmentId, file);
      setTeacherAttachmentFile(res.data);
      toast.success('Reference file uploaded');
    } catch {
      toast.error('Failed to upload reference file');
    }
  };

  const handleRubricUpload = async (file: File) => {
    try {
      setRubricUploading(true);
      const res = await assessmentService.uploadRubricSource(assessmentId, file);
      setRubricSourceFile(res.data.file);
      setRubricCriteria(res.data.rubricCriteria || []);
      setRubricParseStatus((res.data.rubricParseStatus as Assessment['rubricParseStatus']) ?? null);
      toast.success(
        res.data.rubricParseStatus === 'failed'
          ? 'Rubric file uploaded but could not be parsed automatically'
          : 'Rubric uploaded and parsed',
      );
    } catch {
      toast.error('Failed to upload rubric');
    } finally {
      setRubricUploading(false);
    }
  };

  const addRubricCriterion = () => {
    setRubricCriteria((current) => [
      ...current,
      { id: crypto.randomUUID(), title: '', description: '', points: 1 },
    ]);
  };

  const handleRubricCriterionChange = (
    index: number,
    field: 'title' | 'description' | 'points',
    value: string | number,
  ) => {
    setRubricCriteria((current) => current.map((criterion, criterionIndex) => {
      if (criterionIndex !== index) {
        return criterion;
      }
      return {
        ...criterion,
        [field]: field === 'points' ? Number(value) : value,
      };
    }));
  };

  const removeRubricCriterion = (index: number) => {
    setRubricCriteria((current) => current.filter((_, criterionIndex) => criterionIndex !== index));
  };

  const handleSaveRubricReview = async () => {
    try {
      setRubricSaving(true);
      const normalized = rubricCriteria
        .map((criterion, index) => ({
          ...criterion,
          id: criterion.id?.trim() || `criterion-${index + 1}`,
          title: criterion.title.trim(),
          description: criterion.description?.trim() || undefined,
          points: Number(criterion.points || 0),
        }))
        .filter((criterion) => criterion.title.length > 0);

      if (normalized.length === 0) {
        toast.error('Add at least one rubric criterion before saving');
        return;
      }

      const res = await assessmentService.reviewRubric(assessmentId, normalized);
      setRubricCriteria(res.data.rubricCriteria || []);
      setRubricParseStatus(res.data.rubricParseStatus ?? 'reviewed');
      toast.success('Rubric review saved');
    } catch {
      toast.error('Failed to save rubric review');
    } finally {
      setRubricSaving(false);
    }
  };

  const switchToAssessmentMode = () => {
    setAssessmentType(lastAssessmentType === 'file_upload' ? 'quiz' : lastAssessmentType);
    setEditorTab('questions');
    toast.success('Switched to Assessment mode');
  };

  const switchToFileUploadMode = () => {
    setAssessmentType('file_upload');
    setEditorTab('fileUpload');
    toast.success('Switched to File Upload mode');
  };

  /* ---------- save assessment metadata ---------- */
  const handleUpdateAssessment = async () => {
    if (placementMode === 'manual' && classRecordCategory && quarter && !selectedSlotId) {
      toast.error('Pick an open class record slot first');
      return;
    }
    if (assessmentType === 'file_upload') {
      if (!fileUploadInstructions.trim()) {
        toast.error('Instruction is required for file upload assessments');
        return;
      }
      if (allowedUploadExtensions.length === 0 || allowedUploadMimeTypes.length === 0) {
        toast.error('Please select at least one allowed file type group');
        return;
      }
    }

    setSaving(true);
    try {
      const assessmentRes = await assessmentService.update(assessmentId, {
        title,
        description: description || undefined,
        type: assessmentType as Assessment['type'],
        passingScore,
        maxAttempts,
        timeLimitMinutes: timeLimitMinutes === '' ? null : Number(timeLimitMinutes),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        closeWhenDue,
        randomizeQuestions,
        timedQuestionsEnabled,
        questionTimeLimitSeconds:
          timedQuestionsEnabled && questionTimeLimitSeconds !== ''
            ? Number(questionTimeLimitSeconds)
            : null,
        strictMode,
        feedbackLevel: feedbackLevel as Assessment['feedbackLevel'],
        feedbackDelayHours,
        classRecordCategory: (classRecordCategory || undefined) as ClassRecordCategory | undefined,
        quarter: (quarter || undefined) as Assessment['quarter'],
        fileUploadInstructions: assessmentType === 'file_upload' ? fileUploadInstructions : undefined,
        teacherAttachmentFileId: assessmentType === 'file_upload' ? teacherAttachmentFile?.id ?? null : null,
        allowedUploadExtensions: assessmentType === 'file_upload' ? allowedUploadExtensions : undefined,
        allowedUploadMimeTypes: assessmentType === 'file_upload' ? allowedUploadMimeTypes : undefined,
        maxUploadSizeBytes: assessmentType === 'file_upload' ? maxUploadSizeBytes : undefined,
        classRecordItemId:
          classRecordCategory && quarter
            ? placementMode === 'manual'
              ? selectedSlotId
              : null
            : null,
      });

      if (assessmentType !== 'file_upload') {
        const deletedQuestions = savedQuestions.filter(
          (savedQuestion) => !questions.some((currentQuestion) => currentQuestion.id === savedQuestion.id),
        );
        for (const question of deletedQuestions) {
          if (!question.id.startsWith('temp-')) {
            await assessmentService.deleteQuestion(question.id);
          }
        }

        for (let index = 0; index < questions.length; index += 1) {
          const question = questions[index];
          const options = OPTION_QUESTION_TYPES.includes(question.type)
            ? (question.options || []).map((option, optionIndex) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                order: optionIndex + 1,
              }))
            : undefined;

          if (question.id.startsWith('temp-') || question.isNew) {
            await assessmentService.createQuestion({
              assessmentId,
              type: question.type as CreateQuestionDto['type'],
              content: question.content,
              points: question.points,
              order: index + 1,
              explanation: question.explanation || undefined,
              imageUrl: question.imageUrl || undefined,
              options,
            });
          } else {
            await assessmentService.updateQuestion(question.id, {
              content: question.content,
              points: question.points,
              order: index + 1,
              explanation: question.explanation || undefined,
              imageUrl: question.imageUrl || undefined,
              options,
            });
          }
        }
      }

      setAssessment(assessmentRes.data);
      await fetchData();
      toast.success('Assessment updated');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || 'Failed to update assessment');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- publish / unpublish ---------- */
  const handleTogglePublish = async () => {
    if (!assessment) return;
    if (hasPendingChanges) {
      toast.info('Click Update Assessment first to apply pending changes.');
      return;
    }
    try {
      const res = await assessmentService.update(assessmentId, { isPublished: !assessment.isPublished });
      setAssessment(res.data);
      toast.success(assessment.isPublished ? 'Assessment unpublished' : 'Assessment published');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: string[]; message?: string } } };
      const data = axiosErr?.response?.data;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        toast.error(errors.join('. '));
      } else {
        toast.error(data?.message || 'Failed to toggle publish');
      }
    }
  };

  /* ---------- question CRUD (inline) ---------- */
  const startAddQuestion = (type: string) => {
    setEditingQId(null);
    setAddingType(type);
    const defaultOptions =
      type === 'true_false'
        ? [
            { text: 'True', isCorrect: true, order: 1 },
            { text: 'False', isCorrect: false, order: 2 },
          ]
        : OPTION_QUESTION_TYPES.includes(type)
          ? [
              { text: '', isCorrect: false, order: 1 },
              { text: '', isCorrect: false, order: 2 },
            ]
          : [];
    setDraftQuestion({ content: '', type, points: 1, explanation: '', imageUrl: '', options: defaultOptions });
  };

  const startEditQuestion = (q: AssessmentQuestion) => {
    setAddingType(null);
    setEditingQId(q.id);
    setDraftQuestion({
      content: q.content,
      type: q.type,
      points: q.points,
      explanation: q.explanation || '',
      imageUrl: q.imageUrl || '',
      options: q.options?.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })) || [],
    });
  };

  const cancelDraft = () => {
    setAddingType(null);
    setEditingQId(null);
    setDraftQuestion(null);
  };

  const handleSaveQuestion = async () => {
    if (!draftQuestion || !draftQuestion.content.trim()) { toast.error('Question text is required'); return; }
    const d = draftQuestion;
    if (editingQId) {
      setQuestions((prev) => prev.map((question) => {
        if (question.id !== editingQId) return question;
        return {
          ...question,
          content: d.content,
          points: d.points,
          explanation: d.explanation || undefined,
          imageUrl: d.imageUrl || undefined,
          options: OPTION_QUESTION_TYPES.includes(d.type)
            ? d.options.map((option, optionIndex) => ({
                id: `${question.id}-opt-${optionIndex}`,
                text: option.text,
                isCorrect: option.isCorrect,
                order: optionIndex + 1,
              }))
            : [],
        };
      }));
      toast.success('Question staged');
    } else {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const stagedQuestion: LocalQuestion = {
        id: tempId,
        assessmentId,
        type: d.type as AssessmentQuestion['type'],
        content: d.content,
        points: d.points,
        order: questions.length + 1,
        isRequired: true,
        explanation: d.explanation || undefined,
        imageUrl: d.imageUrl || undefined,
        options: OPTION_QUESTION_TYPES.includes(d.type)
          ? d.options.map((option, optionIndex) => ({
              id: `${tempId}-opt-${optionIndex}`,
              text: option.text,
              isCorrect: option.isCorrect,
              order: optionIndex + 1,
            }))
          : [],
        isNew: true,
      };
      setQuestions((prev) => [...prev, stagedQuestion]);
      toast.success('Question staged');
    }
    cancelDraft();
  };

  const handleDeleteQuestion = (id: string) => {
    setConfirmation({
      title: 'Delete question?',
      description: 'This question will be removed from the assessment and point totals will refresh afterward.',
      confirmLabel: 'Delete Question',
      tone: 'danger',
      onConfirm: async () => {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        if (editingQId === id) cancelDraft();
        toast.success('Question staged for removal');
      },
    });
  };

  const handleImageUpload = async (questionId: string, file: File) => {
    if (questionId.startsWith('temp-')) {
      toast.info('Please click Update Assessment first before uploading an image for a new question.');
      return;
    }
    try {
      const res = await assessmentService.uploadQuestionImage(questionId, file);
      setDraftQuestion((prev) => prev ? { ...prev, imageUrl: res.data.imageUrl } : prev);
      setQuestions((prev) => prev.map((q) => q.id === questionId ? { ...q, imageUrl: res.data.imageUrl } : q));
      toast.success('Image uploaded (click Update Assessment to keep other staged changes)');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  /* ---------- draft helpers ---------- */
  const setDraftField = <K extends keyof NonNullable<typeof draftQuestion>>(key: K, val: NonNullable<typeof draftQuestion>[K]) => {
    setDraftQuestion((prev) => prev ? { ...prev, [key]: val } : prev);
  };

  const addOption = () => {
    if (!draftQuestion) return;
    setDraftQuestion((prev) =>
      prev ? { ...prev, options: [...prev.options, { text: '', isCorrect: false, order: prev.options.length + 1 }] } : prev,
    );
  };

  const removeOption = (idx: number) => {
    setDraftQuestion((prev) =>
      prev ? { ...prev, options: prev.options.filter((_, i) => i !== idx) } : prev,
    );
  };

  const toggleOptionCorrect = (idx: number) => {
    if (!draftQuestion) return;
    setDraftQuestion((prev) => {
      if (!prev) return prev;
      // For single-select types, uncheck others
      if (['multiple_choice', 'true_false', 'dropdown'].includes(prev.type)) {
        return { ...prev, options: prev.options.map((o, i) => ({ ...o, isCorrect: i === idx })) };
      }
      // For multi-select, toggle
      return { ...prev, options: prev.options.map((o, i) => i === idx ? { ...o, isCorrect: !o.isCorrect } : o) };
    });
  };

  /* ---------- loading / error ---------- */
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!assessment) return <p className="text-muted-foreground p-6">Assessment not found.</p>;

  /* â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <>
      <TeacherPageShell
      className="mx-auto max-w-6xl"
      badge="Assessment Editor"
      title={title || assessment.title || 'Assessment Draft'}
      description="Shape instructions, questions, file rules, and publishing controls from one teacher-themed editor."
      actions={(
        <>
          <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl font-black" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            size="sm"
            className="teacher-button-solid rounded-xl font-black"
            onClick={handleUpdateAssessment}
            disabled={!hasPendingChanges || saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Updatingâ€¦' : 'Update Assessment'}
          </Button>
          <Button
            size="sm"
            className={assessment.isPublished ? 'teacher-button-outline rounded-xl font-black' : 'teacher-button-solid rounded-xl font-black'}
            onClick={handleTogglePublish}
            disabled={saving}
          >
            <Send className="h-4 w-4" />
            {assessment.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard label="Questions" value={questions.length} caption="Cards currently in this assessment" icon={ClipboardList} accent="sky" />
          <TeacherStatCard label="Total Points" value={totalPoints} caption="Calculated from all question weights" icon={Gauge} accent="teal" />
          <TeacherStatCard label="Passing Score" value={`${passingScore}%`} caption="Current threshold for success" icon={Gauge} accent="amber" />
          <TeacherStatCard label="Mode" value={assessmentType === 'file_upload' ? 'File Upload' : 'Assessment'} caption={assessment.isPublished ? 'Published and live' : 'Draft editing mode'} icon={FileCog} accent="rose" />
        </>
      )}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <TeacherSectionCard
        title="Assessment Controls"
        description="Switch between delivery modes, move around the editor, and keep the assessment aligned with the current teacher theme."
      >
        <div className="space-y-4">
          <div className="flex max-w-full flex-wrap gap-2 rounded-2xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-1">
            <Button
              type="button"
              size="sm"
              variant={assessmentType === 'file_upload' ? 'outline' : 'default'}
              className={cn('h-9 rounded-xl font-black', assessmentType === 'file_upload' ? 'teacher-button-outline' : 'teacher-button-solid')}
              onClick={switchToAssessmentMode}
            >
              Assessment Mode
            </Button>
            <Button
              type="button"
              size="sm"
              variant={assessmentType === 'file_upload' ? 'default' : 'outline'}
              className={cn('h-9 rounded-xl font-black', assessmentType === 'file_upload' ? 'teacher-button-solid' : 'teacher-button-outline')}
              onClick={switchToFileUploadMode}
            >
              File Upload Mode
            </Button>
          </div>

          <Tabs value={editorTab} onValueChange={(value) => setEditorTab(value as 'questions' | 'fileUpload' | 'settings')}>
            <TabsList className="teacher-tab-list grid w-full grid-cols-2">
              <TabsTrigger className="teacher-tab rounded-xl font-black" value={assessmentType === 'file_upload' ? 'fileUpload' : 'questions'}>
                {assessmentType === 'file_upload' ? 'File Upload' : 'Questions'}
              </TabsTrigger>
              <TabsTrigger className="teacher-tab rounded-xl font-black" value="settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </TeacherSectionCard>

 
      {/* â•â•â•â• Title & Description (Forms-like header card) â•â•â•â• */}
      <Card className="teacher-card-panel overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface)] shadow-[var(--teacher-shadow-soft)]">
        <CardContent className="space-y-4 p-6 md:p-7">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled assessment"
            className="teacher-input rounded-none border-0 border-b border-[var(--teacher-outline-strong)] bg-transparent px-0 text-3xl font-black text-[var(--teacher-text-strong)] focus-visible:border-[var(--teacher-accent)] focus-visible:ring-0"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Assessment description (optional)"
            className="teacher-input rounded-none border-0 border-b border-[var(--teacher-outline-strong)] bg-transparent px-0 text-sm text-[var(--teacher-text-muted)] focus-visible:border-[var(--teacher-accent)] focus-visible:ring-0"
          />
          <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-[var(--teacher-text-muted)]">
            <span>Total: <strong className="text-[var(--teacher-text-strong)]">{totalPoints} pts</strong></span>
            <span>Questions: <strong className="text-[var(--teacher-text-strong)]">{questions.length}</strong></span>
            <span>Passing: <strong className="text-[var(--teacher-text-strong)]">{passingScore}%</strong></span>
            <Badge variant={assessment.isPublished ? 'default' : 'secondary'} className={cn('ml-auto', assessment.isPublished ? 'border border-[var(--teacher-accent)]/35 bg-[var(--teacher-accent)]/12 text-[var(--teacher-accent-strong)]' : 'border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] text-[var(--teacher-text-muted)]')}>
 
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {editorTab === 'settings' && (
        <Card className="teacher-card-panel overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface)] shadow-[var(--teacher-shadow-soft)]">
          <CardContent className="p-5 space-y-6">
            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] p-5 space-y-3">
              <p className="text-sm font-semibold">Deadline (required first)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date &amp; Time</Label>
                  <Input className="teacher-input" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Close assessment automatically at due date</Label>
                  <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface)] px-3 text-sm text-[var(--teacher-text-strong)]">
                    <input
                      type="checkbox"
                      checked={closeWhenDue}
                      onChange={(e) => setCloseWhenDue(e.target.checked)}
                    />
                    Block new attempts after due date
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] p-5 space-y-4">
              <p className="text-sm font-semibold">Delivery &amp; Anti-cheat</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Randomize questions and options per student</Label>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface)] px-3 text-sm text-[var(--teacher-text-strong)]">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  />
                  Enable randomized order for each student attempt
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timed questions</Label>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface)] px-3 text-sm text-[var(--teacher-text-strong)]">
                  <input
                    type="checkbox"
                    checked={timedQuestionsEnabled}
                    onChange={(e) => {
                      setTimedQuestionsEnabled(e.target.checked);
                      if (!e.target.checked) setQuestionTimeLimitSeconds('');
                    }}
                  />
                  Enable timer per question
                </label>
              </div>
              {timedQuestionsEnabled && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Seconds per question</Label>
                  <Input className="teacher-input" 
                    type="number"
                    min={5}
                    value={questionTimeLimitSeconds}
                    onChange={(e) =>
                      setQuestionTimeLimitSeconds(
                        e.target.value === '' ? '' : Number(e.target.value),
                      )
                    }
                    placeholder="e.g. 30"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Strict mode</Label>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface)] px-3 text-sm text-[var(--teacher-text-strong)]">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                  />
                  Students must answer current question before moving next and cannot go back
                </label>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Class Record Placement</p>
                  <p className="text-xs text-[var(--teacher-text-muted)]">
                    Choose where this assessment should appear in the quarter workbook before students start producing record data.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="teacher-button-outline rounded-xl font-black"
                  disabled={!classRecordCategory || !quarter}
                  onClick={() => setShowSlotPreview((current) => !current)}
                >
                  {showSlotPreview ? 'Hide Slot Preview' : 'Open Slot Preview'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Class Record Category</Label>
                  <select
                    value={classRecordCategory}
                    onChange={(e) => {
                      setClassRecordCategory(e.target.value as ClassRecordCategory | '');
                      setSelectedSlotId(null);
                    }}
                    className="teacher-select w-full"
                  >
                    <option value="">None</option>
                    <option value="written_work">Written Work</option>
                    <option value="performance_task">Performance Task</option>
                    <option value="quarterly_assessment">Quarterly Assessment</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quarter</Label>
                  <select
                    value={quarter}
                    onChange={(e) => {
                      setQuarter(e.target.value as GradingPeriod | '');
                      setSelectedSlotId(null);
                    }}
                    className="teacher-select w-full"
                  >
                    <option value="">None</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlacementMode('automatic')}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition',
                    placementMode === 'automatic'
                      ? 'border-[var(--teacher-accent)] bg-[var(--teacher-accent)]/10 text-[var(--teacher-accent-strong)]'
                      : 'border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface)] text-[var(--teacher-text-strong)] hover:border-[var(--teacher-accent)]/60',
                  )}
                >
                  <p className="text-sm font-black">Automatic</p>
                  <p className="mt-1 text-xs text-[inherit] opacity-80">
                    Reserve the first open slot in {currentClassRecordCategoryLabel}.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPlacementMode('manual')}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition',
                    placementMode === 'manual'
                      ? 'border-[var(--teacher-accent)] bg-[var(--teacher-accent)]/10 text-[var(--teacher-accent-strong)]'
                      : 'border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface)] text-[var(--teacher-text-strong)] hover:border-[var(--teacher-accent)]/60',
                  )}
                >
                  <p className="text-sm font-black">Pick a slot</p>
                  <p className="mt-1 text-xs text-[inherit] opacity-80">
                    Open the header-only workbook preview and choose a specific empty slot yourself.
                  </p>
                </button>
              </div>

              {!classRecordCategory || !quarter ? (
                <div className="rounded-xl border border-dashed border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] px-4 py-3 text-sm text-[var(--teacher-text-muted)]">
                  Select a class record category and quarter to inspect the workbook slots.
                </div>
              ) : slotOverviewLoading ? (
                <div className="rounded-xl border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] px-4 py-4 text-sm text-[var(--teacher-text-muted)]">
                  Loading class record slots...
                </div>
              ) : slotOverviewError ? (
                <div className="rounded-xl border border-[var(--teacher-warning)]/40 bg-[var(--teacher-warning)]/10 px-4 py-4 space-y-3 text-sm text-[var(--teacher-warning-foreground)]">
                  <p className="font-semibold">This assessment cannot be placed yet.</p>
                  <p>{slotOverviewError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="teacher-button-outline rounded-xl font-black"
                    onClick={() => router.push('/dashboard/teacher/class-record')}
                  >
                    Open Class Record Workspace
                  </Button>
                </div>
              ) : showSlotPreview && slotOverview ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--teacher-text-muted)]">
                    <span>
                      Workbook {slotOverview.gradingPeriod} • {slotOverview.status.toUpperCase()}
                    </span>
                    <span>
                      {placementMode === 'automatic'
                        ? 'Automatic mode will keep or reserve the first open slot in the selected category.'
                        : 'Manual mode only allows open slots or the slot already reserved for this assessment.'}
                    </span>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {slotOverview.categories.map((category) => (
                      <div
                        key={category.id}
                        className={cn(
                          'rounded-2xl border p-4 space-y-3',
                          category.key === classRecordCategory
                            ? 'border-[var(--teacher-accent)] bg-[var(--teacher-surface)]'
                            : 'border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-[var(--teacher-text-strong)]">
                              {category.label}
                            </p>
                            <p className="text-[11px] text-[var(--teacher-text-muted)]">
                              {category.slots.filter((slot) => slot.status !== 'empty').length} of {category.slots.length} slots occupied
                            </p>
                          </div>
                          {category.key === classRecordCategory && (
                            <Badge variant="secondary">Selected Category</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {category.slots.map((slot) => {
                            const isSelected = activePlacementItemId === slot.itemId;
                            const canChoose =
                              placementMode === 'manual' &&
                              category.key === classRecordCategory &&
                              slot.isSelectable;

                            return (
                              <button
                                key={slot.itemId}
                                type="button"
                                disabled={!canChoose}
                                onClick={() => setSelectedSlotId(slot.itemId)}
                                className={cn(
                                  'rounded-xl border px-3 py-3 text-left transition',
                                  isSelected
                                    ? 'border-[var(--teacher-accent)] bg-[var(--teacher-accent)]/10 text-[var(--teacher-accent-strong)]'
                                    : slot.status === 'empty'
                                      ? 'border-[var(--teacher-success)]/40 bg-[var(--teacher-success)]/10 text-[var(--teacher-success-foreground)]'
                                      : slot.status === 'manual'
                                        ? 'border-[var(--teacher-warning)]/40 bg-[var(--teacher-warning)]/10 text-[var(--teacher-warning-foreground)]'
                                        : 'border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface)] text-[var(--teacher-text-strong)]',
                                  !canChoose && 'cursor-not-allowed opacity-70',
                                )}
                                title={
                                  slot.status === 'linked_other'
                                    ? 'This slot is already reserved by another assessment.'
                                    : slot.status === 'manual'
                                      ? 'This slot already has manual class-record data.'
                                      : slot.isSelectable
                                        ? 'Click to use this slot.'
                                        : 'Switch to Pick a slot mode to choose manually.'
                                }
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-black">{slot.title}</span>
                                  <span className="text-[10px] uppercase tracking-[0.2em]">
                                    {slot.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs opacity-80">HPS {slot.maxScore || 0}</p>
                                <p className="mt-1 text-[11px] opacity-80">
                                  {slot.assessmentTitle
                                    ? slot.assessmentTitle
                                    : slot.scoreCount > 0
                                      ? `${slot.scoreCount} learner score(s) recorded`
                                      : slot.maxScore > 0
                                        ? 'Manual slot already prepared'
                                        : 'Open slot'}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        {category.key === classRecordCategory && placementMode === 'manual' && (
                          <p className="text-[11px] text-[var(--teacher-text-muted)]">
                            Only open slots or this assessment&apos;s current reserved slot can be selected.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {placementMode === 'manual' && selectedCategorySlots && !selectedSlotId ? (
                    <p className="text-xs text-amber-200">
                      Choose one open {selectedCategorySlots.label.toLowerCase()} slot before saving.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] p-5 space-y-4">
              <p className="text-sm font-semibold">General</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assessmentType !== 'file_upload' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={assessmentType}
                      onChange={(e) => setAssessmentType(e.target.value)}
                      className="teacher-select w-full"
                    >
                      <option value="quiz">Quiz</option>
                      <option value="exam">Exam</option>
                      <option value="assignment">Assignment</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] p-5 space-y-4">
              <p className="text-sm font-semibold">Attempts &amp; Feedback</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Time Limit (minutes)</Label>
                  <Input className="teacher-input" 
                    type="number"
                    min={1}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Attempts</Label>
                  <Input className="teacher-input"  type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Passing Score (%)</Label>
                  <Input className="teacher-input"  type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Feedback Level</Label>
                  <select
                    value={feedbackLevel}
                    onChange={(e) => setFeedbackLevel(e.target.value)}
                    className="teacher-select w-full"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="standard">Standard</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                {feedbackLevel !== 'immediate' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Feedback Delay (hours)</Label>
                    <Input className="teacher-input"  type="number" min={0} value={feedbackDelayHours} onChange={(e) => setFeedbackDelayHours(Number(e.target.value))} />
                  </div>
                )}
              </div>
            </div>

            {assessmentType === 'file_upload' && (
              <>
                <Separator />

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Rubric review workflow</p>
                      <p className="text-xs text-muted-foreground">
                        Upload PDF, DOCX, or TXT criteria, then review the parsed rubric before students use it.
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {rubricParseStatus || 'not attached'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center justify-center rounded-md border px-3 h-9 text-sm cursor-pointer hover:bg-muted transition-colors">
                      {rubricUploading ? 'Uploading...' : 'Upload rubric'}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleRubricUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {rubricSourceFile && (
                      <span className="text-xs text-muted-foreground">
                        {rubricSourceFile.originalName}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Reviewed rubric criteria</p>
                      <Button type="button" size="sm" variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={addRubricCriterion}>
                        Add Criterion
                      </Button>
                    </div>

                    {rubricCriteria.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No rubric criteria yet. Upload a rubric or add criteria manually.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {rubricCriteria.map((criterion, index) => (
                          <div key={`${criterion.id}-${index}`} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.3fr_1fr_120px_auto]">
                            <Input className="teacher-input" 
                              value={criterion.title}
                              onChange={(e) => handleRubricCriterionChange(index, 'title', e.target.value)}
                              placeholder="Criterion title"
                            />
                            <Input className="teacher-input" 
                              value={criterion.description || ''}
                              onChange={(e) => handleRubricCriterionChange(index, 'description', e.target.value)}
                              placeholder="Optional description"
                            />
                            <Input className="teacher-input" 
                              type="number"
                              min={0}
                              value={criterion.points}
                              onChange={(e) => handleRubricCriterionChange(index, 'points', Number(e.target.value))}
                              placeholder="Points"
                            />
                            <Button type="button" size="sm" variant="ghost" className="teacher-button-danger rounded-xl font-black" onClick={() => removeRubricCriterion(index)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button type="button" size="sm" className="teacher-button-solid rounded-xl font-black" onClick={() => void handleSaveRubricReview()} disabled={rubricSaving}>
                        {rubricSaving ? 'Saving...' : 'Save Rubric Review'}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button size="sm" className="teacher-button-solid rounded-xl font-black" onClick={handleUpdateAssessment} disabled={!hasPendingChanges || saving}>
                {saving ? 'Updatingâ€¦' : 'Update Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editorTab === 'fileUpload' && assessmentType === 'file_upload' && (
        <Card className="teacher-card-panel overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface)] shadow-[var(--teacher-shadow-soft)]">
          <CardContent className="p-5 space-y-4">
            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[var(--teacher-surface-soft)] p-5 space-y-4">
              <p className="text-sm font-semibold">File Upload Assessment</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Instruction for students</Label>
                <Textarea className="teacher-input" 
                  value={fileUploadInstructions}
                  onChange={(e) => setFileUploadInstructions(e.target.value)}
                  rows={4}
                  placeholder="Add clear instructions for student file submission"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Allowed file type groups</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FILE_UPLOAD_TYPE_GROUPS.map((group) => (
                    <label key={group.key} className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isGroupSelected(group.key)}
                        onChange={(e) => toggleFileGroup(group.key, e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{group.label}</span>
                        <span className="block text-xs text-muted-foreground">.{group.extensions.join(', .')}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Student file size limit</Label>
                <div className="h-10 rounded-md border px-3 text-sm flex items-center">
                  {(maxUploadSizeBytes / (1024 * 1024)).toFixed(0)} MB maximum per upload
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Optional reference file for students</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center justify-center rounded-md border px-3 h-9 text-sm cursor-pointer hover:bg-muted transition-colors">
                    Upload reference file
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleTeacherAttachmentUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {teacherAttachmentFile && (
                    <button
                      type="button"
                      onClick={() => void assessmentService.downloadTeacherAttachment(
                        assessmentId,
                        teacherAttachmentFile.originalName,
                      )}
                      className="text-sm underline underline-offset-2"
                    >
                      {teacherAttachmentFile.originalName}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" className="teacher-button-solid rounded-xl font-black" onClick={handleUpdateAssessment} disabled={!hasPendingChanges || saving}>
                {saving ? 'Updatingâ€¦' : 'Update Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* â•â•â•â• Question Cards (inline, Forms-style) â•â•â•â• */}
      {editorTab === 'questions' && assessmentType === 'file_upload' && (
        <Card className="teacher-card-panel overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface)] shadow-[var(--teacher-shadow-soft)]">
          <CardContent className="p-5 space-y-2 text-sm text-[var(--teacher-text-muted)]">
            <p className="font-medium text-[var(--teacher-text-strong)]">File upload mode enabled</p>
            <p>
              This assessment uses instruction + file submission instead of question cards.
              Configure all file-upload settings under the <strong>Settings</strong> tab.
            </p>
          </CardContent>
        </Card>
      )}

      {editorTab === 'questions' && assessmentType !== 'file_upload' && questions.map((q, i) => {
 
        const isEditing = editingQId === q.id;

        if (isEditing && draftQuestion) {
          return (
            <QuestionEditCard
              key={q.id}
              index={i}
              draft={draftQuestion}
              setField={setDraftField}
              addOption={addOption}
              removeOption={removeOption}
              toggleCorrect={toggleOptionCorrect}
              onSave={handleSaveQuestion}
              onCancel={cancelDraft}
              onDelete={() => handleDeleteQuestion(q.id)}
              questionId={q.id}
              onImageUpload={handleImageUpload}
            />
          );
        }

        return (
          <Card key={q.id} className="teacher-card-panel group cursor-pointer overflow-hidden rounded-[1.4rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--teacher-accent)]/35 hover:shadow-[var(--teacher-shadow-soft)]" onClick={() => startEditQuestion(q)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">Q{i + 1}</span>
                  <Badge variant="secondary" className="text-[10px]">{q.type.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="teacher-button-outline h-7 rounded-lg px-2 text-xs font-black" onClick={(e) => { e.stopPropagation(); startEditQuestion(q); }}>Edit</Button>
                  <Button variant="ghost" size="sm" className="teacher-button-danger h-7 rounded-lg px-2 text-xs font-black" onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}>Delete</Button>
                </div>
              </div>
              <p className="font-medium text-sm text-[var(--teacher-text-strong)]">{q.content}</p>
              {q.imageUrl && (
                <div className="mt-2">
                  <img
                    src={q.imageUrl}
                    alt="Question image"
                    className="max-h-40 rounded-md border border-[var(--teacher-outline-strong)] object-contain"
                  />
                </div>
              )}
              {q.options && q.options.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm">
                  {[...q.options].sort((a, b) => a.order - b.order).map((opt) => (
                    <li key={opt.id} className={`pl-3 flex items-center gap-1.5 ${opt.isCorrect ? 'text-[var(--teacher-accent-strong)] font-medium' : 'text-[var(--teacher-text-muted)]'}`}>
 
                      <span className="w-3">{opt.isCorrect ? 'âœ“' : 'â—‹'}</span>{opt.text}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* â•â•â•â• New question being added (inline card at bottom) â•â•â•â• */}
      {addingType && draftQuestion && (
        <QuestionEditCard
          index={questions.length}
          draft={draftQuestion}
          setField={setDraftField}
          addOption={addOption}
          removeOption={removeOption}
          toggleCorrect={toggleOptionCorrect}
          onSave={handleSaveQuestion}
          onCancel={cancelDraft}
        />
      )}

      {/* â•â•â•â• Add Question Bar â•â•â•â• */}
      {editorTab === 'questions' && assessmentType !== 'file_upload' && !addingType && (
        <Card className="overflow-hidden rounded-[1.6rem] border border-dashed border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)]">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--teacher-accent)]/14 text-[var(--teacher-accent-strong)]">+</div>
              <div>
                <p className="text-sm font-black text-[var(--teacher-text-strong)]">Add new question</p>
                <p className="text-xs text-[var(--teacher-text-muted)]">Pick a response type to add the next card.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
 
              {QUESTION_TYPES.map((t) => (
                <Button key={t.value} variant="outline" size="sm" className="teacher-button-outline h-16 justify-start rounded-2xl px-4 text-left text-sm font-black" onClick={() => startAddQuestion(t.value)}>
                  + {t.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
      </TeacherPageShell>
      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}

/* â”€â”€ Inline question editing card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function QuestionEditCard({
  index,
  draft,
  setField,
  addOption,
  removeOption,
  toggleCorrect,
  onSave,
  onCancel,
  onDelete,
  questionId,
  onImageUpload,
}: {
  index: number;
  draft: { content: string; type: string; points: number; explanation: string; imageUrl: string; options: { text: string; isCorrect: boolean; order: number }[] };
  setField: <K extends keyof typeof draft>(key: K, val: (typeof draft)[K]) => void;
  addOption: () => void;
  removeOption: (idx: number) => void;
  toggleCorrect: (idx: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  questionId?: string;
  onImageUpload?: (questionId: string, file: File) => void;
}) {
  const hasOptions = OPTION_QUESTION_TYPES.includes(draft.type);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && questionId && onImageUpload) {
      onImageUpload(questionId, file);
    }
    e.target.value = '';
  };

  return (
    <Card className="teacher-card-panel overflow-hidden rounded-[1.6rem] border border-[var(--teacher-accent)]/35 bg-[var(--teacher-surface)] shadow-[var(--teacher-shadow-soft)]">
      <CardContent className="p-5 space-y-4">
        {/* header */}
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-xs font-bold text-[var(--teacher-accent-strong)] bg-[var(--teacher-accent)]/10">Q{index + 1}</span>
          <Badge variant="secondary" className="border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-[10px] text-[var(--teacher-text-strong)]">{draft.type.replace(/_/g, ' ')}</Badge>
        </div>

        {/* question text */}
        <Textarea
          value={draft.content}
          onChange={(e) => setField('content', e.target.value)}
          placeholder="Type your question hereâ€¦"
          rows={2}
          className="teacher-input border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-sm text-[var(--teacher-text-strong)]"
          autoFocus
        />

        {/* image preview + upload */}
        {draft.imageUrl && (
          <div className="relative group/img inline-block">
            <img
              src={draft.imageUrl}
              alt="Question image"
              className="max-h-48 rounded-md border border-[var(--teacher-outline)] object-contain"
            />
            <Button
              variant="destructive"
              size="sm"
              className="teacher-button-danger absolute top-1 right-1 h-6 px-2 text-xs opacity-0 group-hover/img:opacity-100 transition-opacity"
              onClick={() => setField('imageUrl', '')}
            >
              âœ•
            </Button>
          </div>
        )}
        {questionId && (
          <div>
            <Label htmlFor={`img-${questionId}`} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--teacher-text-muted)] transition-colors hover:text-[var(--teacher-text-strong)]">
              ðŸ“· {draft.imageUrl ? 'Replace image' : 'Add image'}
            </Label>
            <input
              id={`img-${questionId}`}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* points + explanation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Points</Label>
            <Input type="number" min={0} value={draft.points} onChange={(e) => setField('points', Number(e.target.value))} className="teacher-input h-8 border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-sm text-[var(--teacher-text-strong)]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Explanation (optional)</Label>
            <Input value={draft.explanation} onChange={(e) => setField('explanation', e.target.value)} placeholder="Shown after grading" className="teacher-input h-8 border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-sm text-[var(--teacher-text-strong)]" />
          </div>
        </div>

        {/* options */}
        {hasOptions && (
          <div className="space-y-2">
            <Label className="text-xs">Options</Label>
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                {['multiple_choice', 'true_false', 'dropdown'].includes(draft.type) ? (
                  <input
                    type="radio"
                    name="correct-option"
                    checked={opt.isCorrect}
                    onChange={() => toggleCorrect(i)}
                  className="accent-primary"
                    title="Mark as correct"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={() => toggleCorrect(i)}
                  className="accent-primary"
                    title="Mark as correct"
                  />
                )}
                <Input
                  value={opt.text}
                  onChange={(e) => {
                    const newOpts = [...draft.options];
                    newOpts[i] = { ...newOpts[i], text: e.target.value };
                    setField('options', newOpts);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="teacher-input h-8 flex-1 border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-sm text-[var(--teacher-text-strong)]"
                />
                {draft.type !== 'true_false' && (
                  <Button variant="ghost" size="sm" className="teacher-button-danger h-7 rounded-lg px-2 font-black" onClick={removeOption.bind(null, i)}>âœ•</Button>
                )}
              </div>
            ))}
            {draft.type !== 'true_false' && (
              <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl text-xs font-black" onClick={addOption}>+ Add option</Button>
            )}
          </div>
        )}

        <Separator />

        {/* actions */}
        <div className="flex items-center justify-between">
          <div>
            {onDelete && (
              <Button variant="ghost" size="sm" className="teacher-button-danger rounded-xl text-xs font-black" onClick={onDelete}>Delete question</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl font-black" onClick={onCancel}>Cancel</Button>
            <Button size="sm" className="teacher-button-solid rounded-xl font-black" onClick={onSave} disabled={!draft.content.trim()}>Save</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

