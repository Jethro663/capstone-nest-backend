'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion, CreateQuestionDto } from '@/types/assessment';
import type { ClassRecordCategory } from '@/types/assessment';

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

/* ── Question type metadata ─────────────────────────── */
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
  {
    key: 'documents',
    label: 'Documents',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
    ],
  },
  {
    key: 'slides',
    label: 'Slides',
    extensions: ['ppt', 'pptx', 'odp'],
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ],
  },
  {
    key: 'spreadsheets',
    label: 'Spreadsheets',
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.oasis.opendocument.spreadsheet',
    ],
  },
  {
    key: 'images',
    label: 'Images',
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
] as const;

const FILE_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024;

/* ── Main page component ────────────────────────────── */
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
  const [editorTab, setEditorTab] = useState<'questions' | 'fileUpload' | 'settings'>('questions');
  const [lastAssessmentType, setLastAssessmentType] = useState<string>('quiz');
  const [classRecordCategory, setClassRecordCategory] = useState<string>('');
  const [quarter, setQuarter] = useState<string>('');
  const [closeWhenDue, setCloseWhenDue] = useState(true);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [timedQuestionsEnabled, setTimedQuestionsEnabled] = useState(false);
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState<number | ''>('');
  const [strictMode, setStrictMode] = useState(false);
  const [fileUploadInstructions, setFileUploadInstructions] = useState('');
  const [allowedUploadExtensions, setAllowedUploadExtensions] = useState<string[]>([]);
  const [allowedUploadMimeTypes, setAllowedUploadMimeTypes] = useState<string[]>([]);
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = useState<number>(FILE_UPLOAD_LIMIT_BYTES);
  const [teacherAttachmentFile, setTeacherAttachmentFile] = useState<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  } | null>(null);
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
      setCloseWhenDue(a.closeWhenDue ?? true);
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
          : FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.mimeTypes]),
      );
      setMaxUploadSizeBytes(a.maxUploadSizeBytes ?? FILE_UPLOAD_LIMIT_BYTES);
      setTeacherAttachmentFile(a.teacherAttachmentFile || null);
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
        closeWhenDue: a.closeWhenDue ?? true,
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
            : FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.mimeTypes]).sort(),
        maxUploadSizeBytes: a.maxUploadSizeBytes ?? FILE_UPLOAD_LIMIT_BYTES,
        teacherAttachmentFileId: a.teacherAttachmentFileId || '',
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
  };

  const hasPendingChanges =
    (savedMeta ? JSON.stringify(currentMeta) !== JSON.stringify(savedMeta) : false) ||
    JSON.stringify(normalizeQuestions(questions)) !== JSON.stringify(normalizeQuestions(savedQuestions));

  const isGroupSelected = (groupKey: string) => {
    const group = FILE_UPLOAD_TYPE_GROUPS.find((entry) => entry.key === groupKey);
    if (!group) return false;
    return group.extensions.every((ext) => allowedUploadExtensions.includes(ext));
  };

  const toggleFileGroup = (groupKey: string, checked: boolean) => {
    const group = FILE_UPLOAD_TYPE_GROUPS.find((entry) => entry.key === groupKey);
    if (!group) return;

    if (checked) {
      setAllowedUploadExtensions((prev) => Array.from(new Set([...prev, ...group.extensions])));
      setAllowedUploadMimeTypes((prev) => Array.from(new Set([...prev, ...group.mimeTypes])));
      return;
    }

    setAllowedUploadExtensions((prev) => prev.filter((ext) => !(group.extensions as readonly string[]).includes(ext)));
    setAllowedUploadMimeTypes((prev) => prev.filter((mime) => !(group.mimeTypes as readonly string[]).includes(mime)));
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

  const switchToFileUploadMode = () => {
    setAssessmentType('file_upload');
    setEditorTab('fileUpload');
    toast.success('Switched to File Upload mode');
  };

  const switchToAssessmentMode = () => {
    setAssessmentType(lastAssessmentType === 'file_upload' ? 'quiz' : lastAssessmentType);
    setEditorTab('questions');
    toast.success('Switched to Assessment mode');
  };

  const handleUpdateAssessment = async () => {
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

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingQId === id) cancelDraft();
    toast.success('Question staged for removal');
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

  /* ── RENDER ────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 pb-24">
      {/* ════ Top bar ════ */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5 bg-background">
            <Button
              type="button"
              size="sm"
              variant={assessmentType === 'file_upload' ? 'outline' : 'default'}
              className="h-8 rounded-sm"
              onClick={switchToAssessmentMode}
            >
              Assessment Mode
            </Button>
            <Button
              type="button"
              size="sm"
              variant={assessmentType === 'file_upload' ? 'default' : 'outline'}
              className="h-8 rounded-sm"
              onClick={switchToFileUploadMode}
            >
              File Upload Mode
            </Button>
          </div>
          <Button size="sm" onClick={handleUpdateAssessment} disabled={!hasPendingChanges || saving}>
            {saving ? 'Updating…' : 'Update Assessment'}
          </Button>
          <Button
            variant={assessment.isPublished ? 'secondary' : 'default'}
            size="sm"
            onClick={handleTogglePublish}
            disabled={saving}
          >
            {assessment.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <Tabs value={editorTab} onValueChange={(value) => setEditorTab(value as 'questions' | 'fileUpload' | 'settings')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value={assessmentType === 'file_upload' ? 'fileUpload' : 'questions'}>
            {assessmentType === 'file_upload' ? 'File Upload' : 'Questions'}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ════ Title & Description (Forms-like header card) ════ */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-5 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled assessment"
            className="text-2xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Assessment description (optional)"
            className="text-sm text-muted-foreground border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
            <span>Total: <strong className="text-foreground">{totalPoints} pts</strong></span>
            <span>Questions: <strong className="text-foreground">{questions.length}</strong></span>
            <span>Passing: <strong className="text-foreground">{passingScore}%</strong></span>
            <Badge variant={assessment.isPublished ? 'default' : 'secondary'} className="ml-auto">
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {editorTab === 'settings' && (
        <Card>
          <CardContent className="p-5 space-y-6">
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold">Deadline (required first)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date &amp; Time</Label>
                  <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Close assessment automatically at due date</Label>
                  <label className="flex items-center gap-2 h-10 rounded-md border px-3 text-sm">
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

            <div className="rounded-lg border p-4 space-y-4">
              <p className="text-sm font-semibold">Delivery &amp; Anti-cheat</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Randomize questions and options per student</Label>
                <label className="flex items-center gap-2 h-10 rounded-md border px-3 text-sm">
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
                <label className="flex items-center gap-2 h-10 rounded-md border px-3 text-sm">
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
                  <Input
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
                <label className="flex items-center gap-2 h-10 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                  />
                  Students must answer current question before moving next and cannot go back
                </label>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <p className="text-sm font-semibold">General</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assessmentType !== 'file_upload' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={assessmentType}
                      onChange={(e) => setAssessmentType(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    >
                      <option value="quiz">Quiz</option>
                      <option value="exam">Exam</option>
                      <option value="assignment">Assignment</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Class Record Category</Label>
                  <select
                    value={classRecordCategory}
                    onChange={(e) => setClassRecordCategory(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
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
                    onChange={(e) => setQuarter(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  >
                    <option value="">None</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <p className="text-sm font-semibold">Attempts &amp; Feedback</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Attempts</Label>
                  <Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Passing Score (%)</Label>
                  <Input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Feedback Level</Label>
                  <select
                    value={feedbackLevel}
                    onChange={(e) => setFeedbackLevel(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="standard">Standard</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                {feedbackLevel !== 'immediate' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Feedback Delay (hours)</Label>
                    <Input type="number" min={0} value={feedbackDelayHours} onChange={(e) => setFeedbackDelayHours(Number(e.target.value))} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleUpdateAssessment} disabled={!hasPendingChanges || saving}>
                {saving ? 'Updating…' : 'Update Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editorTab === 'fileUpload' && assessmentType === 'file_upload' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <p className="text-sm font-semibold">File Upload Assessment</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Instruction for students</Label>
                <Textarea
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
                {teacherAttachmentFile && (
                  <p className="text-xs text-muted-foreground">
                    {(teacherAttachmentFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {teacherAttachmentFile.mimeType}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleUpdateAssessment} disabled={!hasPendingChanges || saving}>
                {saving ? 'Updating…' : 'Update Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════ Question Cards (inline, Forms-style) ════ */}
      {editorTab === 'questions' && assessmentType === 'file_upload' && (
        <Card>
          <CardContent className="p-5 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">File upload mode enabled</p>
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
          <Card key={q.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => startEditQuestion(q)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">Q{i + 1}</span>
                  <Badge variant="secondary" className="text-[10px]">{q.type.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); startEditQuestion(q); }}>Edit</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}>Delete</Button>
                </div>
              </div>
              <p className="font-medium text-sm">{q.content}</p>
              {q.imageUrl && (
                <div className="mt-2">
                  <img
                    src={q.imageUrl}
                    alt="Question image"
                    className="max-h-40 rounded-md border object-contain"
                  />
                </div>
              )}
              {q.options && q.options.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm">
                  {[...q.options].sort((a, b) => a.order - b.order).map((opt) => (
                    <li key={opt.id} className={`pl-3 flex items-center gap-1.5 ${opt.isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                      <span className="w-3">{opt.isCorrect ? '✓' : '○'}</span>{opt.text}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ════ New question being added (inline card at bottom) ════ */}
      {editorTab === 'questions' && assessmentType !== 'file_upload' && addingType && draftQuestion && (
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

      {/* ════ Add Question Bar ════ */}
      {editorTab === 'questions' && assessmentType !== 'file_upload' && !addingType && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Add question</p>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map((t) => (
                <Button key={t.value} variant="outline" size="sm" className="text-xs" onClick={() => startAddQuestion(t.value)}>
                  + {t.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Inline question editing card ────────────────────── */
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
    <Card className="border-primary shadow-md">
      <CardContent className="p-5 space-y-4">
        {/* header */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">Q{index + 1}</span>
          <Badge variant="secondary" className="text-[10px]">{draft.type.replace(/_/g, ' ')}</Badge>
        </div>

        {/* question text */}
        <Textarea
          value={draft.content}
          onChange={(e) => setField('content', e.target.value)}
          placeholder="Type your question here…"
          rows={2}
          className="text-sm"
          autoFocus
        />

        {/* image preview + upload */}
        {draft.imageUrl && (
          <div className="relative group/img inline-block">
            <img
              src={draft.imageUrl}
              alt="Question image"
              className="max-h-48 rounded-md border object-contain"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1 h-6 px-2 text-xs opacity-0 group-hover/img:opacity-100 transition-opacity"
              onClick={() => setField('imageUrl', '')}
            >
              ✕
            </Button>
          </div>
        )}
        {questionId && (
          <div>
            <Label htmlFor={`img-${questionId}`} className="text-xs cursor-pointer inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              📷 {draft.imageUrl ? 'Replace image' : 'Add image'}
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
            <Input type="number" min={0} value={draft.points} onChange={(e) => setField('points', Number(e.target.value))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Explanation (optional)</Label>
            <Input value={draft.explanation} onChange={(e) => setField('explanation', e.target.value)} placeholder="Shown after grading" className="h-8 text-sm" />
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
                  className="flex-1 h-8 text-sm"
                />
                {draft.type !== 'true_false' && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={removeOption.bind(null, i)}>✕</Button>
                )}
              </div>
            ))}
            {draft.type !== 'true_false' && (
              <Button variant="outline" size="sm" className="text-xs" onClick={addOption}>+ Add option</Button>
            )}
          </div>
        )}

        <Separator />

        {/* actions */}
        <div className="flex items-center justify-between">
          <div>
            {onDelete && (
              <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={onDelete}>Delete question</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={!draft.content.trim()}>Save</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
