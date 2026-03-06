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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion, CreateQuestionDto, UpdateQuestionDto } from '@/types/assessment';
import type { ClassRecordCategory } from '@/types/assessment';

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

/* ── Main page component ────────────────────────────── */
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

  /* ── RENDER ────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 pb-24">
      {/* ════ Top bar ════ */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings((s) => !s)}>
            ⚙ Settings
          </Button>
          <Button
            variant={assessment.isPublished ? 'secondary' : 'default'}
            size="sm"
            onClick={handleTogglePublish}
          >
            {assessment.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* ════ Title & Description (Forms-like header card) ════ */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-5 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveSettings}
            placeholder="Untitled assessment"
            className="text-2xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSaveSettings}
            placeholder="Assessment description (optional)"
            className="text-sm text-muted-foreground border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
            <span>Total: <strong className="text-foreground">{totalPoints} pts</strong></span>
            <span>Questions: <strong className="text-foreground">{questions.length}</strong></span>
            <span>Passing: <strong className="text-foreground">{assessment.passingScore ?? 60}%</strong></span>
            <Badge variant={assessment.isPublished ? 'default' : 'secondary'} className="ml-auto">
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ════ Tabbed Settings Panel ════ */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-5 space-y-4">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="timing">Timing &amp; Attempts</TabsTrigger>
                    <TabsTrigger value="grading">Grading &amp; Feedback</TabsTrigger>
                  </TabsList>

                  {/* ── General Tab ── */}
                  <TabsContent value="general" className="mt-4">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
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
                    </motion.div>
                  </TabsContent>

                  {/* ── Timing & Attempts Tab ── */}
                  <TabsContent value="timing" className="mt-4">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-xs">Due Date</Label>
                        <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                      </div>

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
                    </motion.div>
                  </TabsContent>

                  {/* ── Grading & Feedback Tab ── */}
                  <TabsContent value="grading" className="mt-4">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
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
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5"
                        >
                          <Label className="text-xs">Feedback Delay (hours)</Label>
                          <Input type="number" min={0} value={feedbackDelayHours} onChange={(e) => setFeedbackDelayHours(Number(e.target.value))} />
                        </motion.div>
                      )}
                    </motion.div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ Question Cards (inline, Forms-style) ════ */}
      {questions.map((q, i) => {
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
                  {q.options.sort((a, b) => a.order - b.order).map((opt) => (
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

      {/* ════ Add Question Bar ════ */}
      {!addingType && (
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
