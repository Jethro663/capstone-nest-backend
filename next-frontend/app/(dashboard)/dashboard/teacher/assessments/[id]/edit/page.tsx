'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileCog, Gauge, Save, Send } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion, CreateQuestionDto, UpdateQuestionDto } from '@/types/assessment';
import type { ClassRecordCategory } from '@/types/assessment';
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

/* â”€â”€ Main page component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function AssessmentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  /* ---------- state ---------- */
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
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
  const [showSettings, setShowSettings] = useState(false);
  const [classRecordCategory, setClassRecordCategory] = useState<string>('');
  const [quarter, setQuarter] = useState<string>('');
  const [editorTab, setEditorTab] = useState<'questions' | 'fileUpload' | 'settings'>('settings');
  const [closeWhenDue, setCloseWhenDue] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [timedQuestionsEnabled, setTimedQuestionsEnabled] = useState(false);
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState<number | ''>('');
  const [strictMode, setStrictMode] = useState(false);
  const [fileUploadInstructions, setFileUploadInstructions] = useState('');
  const [rubricParseStatus, setRubricParseStatus] = useState<string | null>(null);
  const [rubricUploading, setRubricUploading] = useState(false);
  const [rubricSaving, setRubricSaving] = useState(false);
  const [rubricSourceFile, setRubricSourceFile] = useState<{ originalName: string } | null>(null);
  const [teacherAttachmentFile, setTeacherAttachmentFile] = useState<{ originalName: string } | null>(null);
  const [rubricCriteria, setRubricCriteria] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    points: number;
  }>>([]);
  const [allowedFileGroups, setAllowedFileGroups] = useState<string[]>(['documents']);
  const [maxUploadSizeBytes] = useState(10 * 1024 * 1024);

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
      setQuestions((a.questions || []).sort((x, y) => x.order - y.order));
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------- computed ---------- */
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const hasPendingChanges = true;
  const handleUpdateAssessment = () => handleSaveSettings();

  const isGroupSelected = (key: string) => allowedFileGroups.includes(key);
  const toggleFileGroup = (key: string, checked: boolean) => {
    setAllowedFileGroups((current) => (
      checked ? Array.from(new Set([...current, key])) : current.filter((entry) => entry !== key)
    ));
  };

  const handleTeacherAttachmentUpload = async (file: File) => {
    setTeacherAttachmentFile({ originalName: file.name });
    toast.success('Reference file attached');
  };

  const handleRubricUpload = async (file: File) => {
    setRubricUploading(true);
    try {
      setRubricSourceFile({ originalName: file.name });
      setRubricParseStatus('uploaded');
      toast.success('Rubric file attached');
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
      return { ...criterion, [field]: value };
    }));
  };

  const removeRubricCriterion = (index: number) => {
    setRubricCriteria((current) => current.filter((_, criterionIndex) => criterionIndex !== index));
  };

  const handleSaveRubricReview = async () => {
    setRubricSaving(true);
    try {
      setRubricParseStatus('reviewed');
      toast.success('Rubric review saved');
    } finally {
      setRubricSaving(false);
    }
  };

  const switchToAssessmentMode = () => {
    setAssessmentType('quiz');
    setEditorTab('questions');
  };

  const switchToFileUploadMode = () => {
    setAssessmentType('file_upload');
    setEditorTab('fileUpload');
  };

  /* ---------- save assessment metadata ---------- */
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await assessmentService.update(assessmentId, {
        title,
        description: description || undefined,
        type: assessmentType as Assessment['type'],
        passingScore,
        maxAttempts,
        timeLimitMinutes: timeLimitMinutes === '' ? null : Number(timeLimitMinutes),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        feedbackLevel: feedbackLevel as Assessment['feedbackLevel'],
        feedbackDelayHours,
        classRecordCategory: (classRecordCategory || undefined) as ClassRecordCategory | undefined,
        quarter: (quarter || undefined) as Assessment['quarter'],
      });
      setAssessment(res.data);
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- publish / unpublish ---------- */
  const handleTogglePublish = async () => {
    if (!assessment) return;
    try {
      const res = await assessmentService.update(assessmentId, { isPublished: !assessment.isPublished });
      setAssessment(res.data);
      toast.success(assessment.isPublished ? 'Assessment unpublished' : 'Assessment published');
    } catch (err: any) {
      const data = err?.response?.data;
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
    try {
      if (editingQId) {
        const dto: UpdateQuestionDto = {
          content: d.content,
          points: d.points,
          explanation: d.explanation || undefined,
          options: OPTION_QUESTION_TYPES.includes(d.type) ? d.options : undefined,
        };
        const res = await assessmentService.updateQuestion(editingQId, dto);
        setQuestions((prev) => prev.map((q) => (q.id === editingQId ? res.data : q)));
        toast.success('Question updated');
      } else {
        const dto: CreateQuestionDto = {
          assessmentId,
          type: d.type as CreateQuestionDto['type'],
          content: d.content,
          points: d.points,
          order: questions.length + 1,
          explanation: d.explanation || undefined,
          options: OPTION_QUESTION_TYPES.includes(d.type) ? d.options : undefined,
        };
        const res = await assessmentService.createQuestion(dto);
        setQuestions((prev) => [...prev, res.data]);
        toast.success('Question added');
      }
      cancelDraft();
      // Re-fetch to get updated totalPoints from backend
      const fresh = await assessmentService.getById(assessmentId);
      setAssessment(fresh.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await assessmentService.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (editingQId === id) cancelDraft();
      const fresh = await assessmentService.getById(assessmentId);
      setAssessment(fresh.data);
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const handleImageUpload = async (questionId: string, file: File) => {
    try {
      const res = await assessmentService.uploadQuestionImage(questionId, file);
      setDraftQuestion((prev) => prev ? { ...prev, imageUrl: res.data.imageUrl } : prev);
      setQuestions((prev) => prev.map((q) => q.id === questionId ? { ...q, imageUrl: res.data.imageUrl } : q));
      toast.success('Image uploaded');
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
      <Card className="overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(30,41,59,0.82))] shadow-[0_28px_60px_-40px_rgba(2,6,23,0.7)]">
        <CardContent className="space-y-4 p-6 md:p-7">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveSettings}
            placeholder="Untitled assessment"
            className="teacher-input rounded-none border-0 border-b border-[var(--teacher-outline-strong)] bg-transparent px-0 text-3xl font-black text-[var(--teacher-text-strong)] focus-visible:border-[var(--teacher-accent)] focus-visible:ring-0"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSaveSettings}
            placeholder="Assessment description (optional)"
            className="teacher-input rounded-none border-0 border-b border-[var(--teacher-outline-strong)] bg-transparent px-0 text-sm text-[var(--teacher-text-muted)] focus-visible:border-[var(--teacher-accent)] focus-visible:ring-0"
          />
          <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-[var(--teacher-text-muted)]">
            <span>Total: <strong className="text-[var(--teacher-text-strong)]">{totalPoints} pts</strong></span>
            <span>Questions: <strong className="text-[var(--teacher-text-strong)]">{questions.length}</strong></span>
            <span>Passing: <strong className="text-[var(--teacher-text-strong)]">{passingScore}%</strong></span>
            <Badge variant={assessment.isPublished ? 'default' : 'secondary'} className={cn('ml-auto', assessment.isPublished ? 'border border-emerald-400/30 bg-emerald-400/12 text-emerald-100' : 'border border-amber-400/30 bg-amber-400/12 text-amber-100')}>
 
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {editorTab === 'settings' && (
        <Card className="overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(30,41,59,0.82))] shadow-[0_28px_60px_-40px_rgba(2,6,23,0.7)]">
          <CardContent className="p-5 space-y-6">
            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.66)] p-5 space-y-3">
              <p className="text-sm font-semibold">Deadline (required first)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date &amp; Time</Label>
                  <Input className="teacher-input" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Close assessment automatically at due date</Label>
                  <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.7)] px-3 text-sm text-[var(--teacher-text-strong)]">
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

            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.66)] p-5 space-y-4">
              <p className="text-sm font-semibold">Delivery &amp; Anti-cheat</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Randomize questions and options per student</Label>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.7)] px-3 text-sm text-[var(--teacher-text-strong)]">
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
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.7)] px-3 text-sm text-[var(--teacher-text-strong)]">
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
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.7)] px-3 text-sm text-[var(--teacher-text-strong)]">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                  />
                  Students must answer current question before moving next and cannot go back
                </label>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.66)] p-5 space-y-4">
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Class Record Category</Label>
                  <select
                    value={classRecordCategory}
                    onChange={(e) => setClassRecordCategory(e.target.value)}
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
                    onChange={(e) => setQuarter(e.target.value)}
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
            </div>

            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.66)] p-5 space-y-4">
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
        <Card className="overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(30,41,59,0.82))] shadow-[0_28px_60px_-40px_rgba(2,6,23,0.7)]">
          <CardContent className="p-5 space-y-4">
            <div className="rounded-[1.4rem] border border-[var(--teacher-outline-strong)] bg-[rgba(8,18,33,0.66)] p-5 space-y-4">
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
        <Card className="overflow-hidden rounded-[1.6rem] border border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(30,41,59,0.82))] shadow-[0_28px_60px_-40px_rgba(2,6,23,0.7)]">
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
          <Card key={q.id} className="group cursor-pointer overflow-hidden rounded-[1.4rem] border border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(30,41,59,0.78))] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--teacher-accent)]/35 hover:shadow-[0_28px_60px_-36px_rgba(2,6,23,0.68)]" onClick={() => startEditQuestion(q)}>
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
                    <li key={opt.id} className={`pl-3 flex items-center gap-1.5 ${opt.isCorrect ? 'text-emerald-200 font-medium' : 'text-[var(--teacher-text-muted)]'}`}>
 
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
        <Card className="overflow-hidden rounded-[1.6rem] border border-dashed border-[var(--teacher-outline)] bg-[rgba(15,23,42,0.62)]">
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
    <Card className="overflow-hidden rounded-[1.6rem] border border-[var(--teacher-accent)]/35 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(30,41,59,0.84))] shadow-[0_30px_60px_-38px_rgba(2,6,23,0.72)]">
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

