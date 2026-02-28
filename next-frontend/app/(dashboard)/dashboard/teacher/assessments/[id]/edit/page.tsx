'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion, CreateQuestionDto } from '@/types/assessment';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'dropdown', label: 'Dropdown' },
];

const OPTION_TYPES = ['multiple_choice', 'multiple_select', 'true_false', 'dropdown'];

export default function AssessmentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [qContent, setQContent] = useState('');
  const [qType, setQType] = useState<string>('multiple_choice');
  const [qPoints, setQPoints] = useState(1);
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState<{ text: string; isCorrect: boolean; order: number }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getById(assessmentId);
      setAssessment(res.data);
      setQuestions((res.data.questions || []).sort((a, b) => a.order - b.order));
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTogglePublish = async () => {
    if (!assessment) return;
    try {
      await assessmentService.update(assessmentId, { isPublished: !assessment.isPublished });
      setAssessment((prev) => prev ? { ...prev, isPublished: !prev.isPublished } : prev);
      toast.success(assessment.isPublished ? 'Assessment unpublished' : 'Assessment published');
    } catch {
      toast.error('Failed to toggle publish');
    }
  };

  const resetForm = () => {
    setQContent('');
    setQType('multiple_choice');
    setQPoints(1);
    setQExplanation('');
    setQOptions([]);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (q: AssessmentQuestion) => {
    setEditingId(q.id);
    setQContent(q.content);
    setQType(q.type);
    setQPoints(q.points);
    setQExplanation(q.explanation || '');
    setQOptions(q.options?.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })) || []);
    setShowModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!qContent.trim()) return;
    try {
      if (editingId) {
        const res = await assessmentService.updateQuestion(editingId, {
          content: qContent,
          points: qPoints,
          explanation: qExplanation || undefined,
          options: OPTION_TYPES.includes(qType) ? qOptions : undefined,
        });
        setQuestions((prev) => prev.map((q) => (q.id === editingId ? res.data : q)));
        toast.success('Question updated');
      } else {
        const dto: CreateQuestionDto = {
          assessmentId,
          type: qType as CreateQuestionDto['type'],
          content: qContent,
          points: qPoints,
          order: questions.length + 1,
          explanation: qExplanation || undefined,
          options: OPTION_TYPES.includes(qType) ? qOptions : undefined,
        };
        const res = await assessmentService.createQuestion(dto);
        setQuestions((prev) => [...prev, res.data]);
        toast.success('Question added');
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Failed to save question');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await assessmentService.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const addOption = () => {
    setQOptions((prev) => [...prev, { text: '', isCorrect: false, order: prev.length + 1 }]);
  };

  const removeOption = (idx: number) => {
    setQOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!assessment) return <p className="text-muted-foreground">Assessment not found.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">← Back</Button>
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          <p className="text-muted-foreground">Edit questions and answers</p>
        </div>
        <Button
          variant={assessment.isPublished ? 'secondary' : 'default'}
          onClick={handleTogglePublish}
        >
          {assessment.isPublished ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          <div><p className="text-muted-foreground">Type</p><p className="font-medium">{assessment.type}</p></div>
          <div><p className="text-muted-foreground">Points</p><p className="font-medium">{assessment.totalPoints}</p></div>
          <div><p className="text-muted-foreground">Passing</p><p className="font-medium">{assessment.passingScore}%</p></div>
          <div><p className="text-muted-foreground">Status</p>
            <Badge variant={assessment.isPublished ? 'default' : 'secondary'}>
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{questions.length} Questions</CardTitle>
            <Button size="sm" onClick={handleOpenCreate}>+ Add Question</Button>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No questions yet.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Q{i + 1}</Badge>
                      <Badge variant="secondary">{q.type.replace('_', ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">{q.points} pts</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(q)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteQuestion(q.id)}>Delete</Button>
                    </div>
                  </div>
                  <p className="font-medium">{q.content}</p>
                  {q.options && q.options.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {q.options.sort((a, b) => a.order - b.order).map((opt) => (
                        <li key={opt.id} className={`pl-4 ${opt.isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                          {opt.isCorrect ? '✓' : '○'} {opt.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Question</Label><Textarea value={qContent} onChange={(e) => setQContent(e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <select value={qType} onChange={(e) => setQType(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" disabled={!!editingId}>
                  {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><Label>Points</Label><Input type="number" value={qPoints} onChange={(e) => setQPoints(Number(e.target.value))} min={1} /></div>
            </div>
            <div><Label>Explanation (optional)</Label><Textarea value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} rows={2} /></div>
            {OPTION_TYPES.includes(qType) && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2 mt-2">
                  {qOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={() => {
                          setQOptions((prev) =>
                            prev.map((o, idx) => (idx === i ? { ...o, isCorrect: !o.isCorrect } : o)),
                          );
                        }}
                        title="Mark as correct"
                      />
                      <Input
                        value={opt.text}
                        onChange={(e) =>
                          setQOptions((prev) =>
                            prev.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o)),
                          )
                        }
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeOption(i)}>✕</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOption}>+ Add Option</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={!qContent.trim()}>{editingId ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
