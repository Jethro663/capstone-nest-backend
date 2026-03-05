'use client';

import { useState } from 'react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/helpers';
import { PreviewModal } from '@/components/teacher/assessment/preview-modal';
import type {
  Assessment,
  SubmissionsResponse,
  SubmissionStatus,
} from '@/types/assessment';

interface PostScoresTabProps {
  assessmentId: string;
  assessment: Assessment;
  submissions: SubmissionsResponse | null;
  onDataChanged: () => void;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; badgeColor: string }> = {
  not_started: { label: 'Not Started', color: 'text-gray-400', badgeColor: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', color: 'text-blue-500', badgeColor: 'bg-blue-100 text-blue-700' },
  turned_in: { label: 'Graded', color: 'text-amber-600', badgeColor: 'bg-amber-100 text-amber-700' },
  returned: { label: 'Posted', color: 'text-emerald-600', badgeColor: 'bg-emerald-100 text-emerald-700' },
};

export function PostScoresTab({ assessmentId, assessment, submissions, onDataChanged }: PostScoresTabProps) {
  const [returnAllOpen, setReturnAllOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [returning, setReturning] = useState(false);
  const [previewAttemptId, setPreviewAttemptId] = useState<string | null>(null);

  const allSubmissions = submissions?.submissions ?? [];
  const answered = allSubmissions.filter((s) => s.attempt?.isSubmitted);
  const notAnswered = allSubmissions.filter((s) => !s.attempt?.isSubmitted);
  const turnedInCount = allSubmissions.filter((s) => s.status === 'turned_in').length;
  const returnedCount = allSubmissions.filter((s) => s.status === 'returned').length;

  const handleReturnAll = async () => {
    try {
      setReturning(true);
      await assessmentService.returnAllGrades(assessmentId, feedback || undefined);
      toast.success('All grades posted to students');
      setReturnAllOpen(false);
      setFeedback('');
      onDataChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post grades');
    } finally {
      setReturning(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = allSubmissions.map((s) => ({
        'Student Name': `${s.lastName}, ${s.firstName}`,
        'Email': s.email ?? '',
        'Status': STATUS_CONFIG[s.status].label,
        'Score (%)': s.attempt?.score ?? '',
        'Points': s.attempt?.score != null ? Math.round(((s.attempt.score) / 100) * (assessment.totalPoints ?? 0)) : '',
        'Total Points': assessment.totalPoints ?? 0,
        'Time (seconds)': s.attempt?.timeSpentSeconds ?? '',
        'Submitted': s.attempt?.submittedAt ? formatDate(s.attempt.submittedAt) : '',
        'Feedback': s.attempt?.teacherFeedback ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-width columns
      const colWidths = Object.keys(rows[0] || {}).map((key) => {
        const maxLen = Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length));
        return { wch: Math.min(maxLen + 2, 40) };
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      const sheetName = (assessment.title || 'Assessment').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${assessment.title || 'assessment'}_scores.xlsx`);
      toast.success('Excel file downloaded');
    } catch {
      toast.error('Failed to export. Make sure xlsx is installed.');
    }
  };

  const total = allSubmissions.length;

  return (
    <div className="space-y-4">
      {/* Summary Progress Bar */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium">{returnedCount}</span> posted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-medium">{turnedInCount}</span> pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="font-medium">{notAnswered.length}</span> no submission
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                Export Excel
              </Button>
              {turnedInCount > 0 && (
                <Button size="sm" onClick={() => { setFeedback(''); setReturnAllOpen(true); }}>
                  Post All ({turnedInCount})
                </Button>
              )}
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: total > 0 ? `${(returnedCount / total) * 100}%` : '0%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            <motion.div
              className="h-full bg-amber-500"
              initial={{ width: 0 }}
              animate={{ width: total > 0 ? `${(turnedInCount / total) * 100}%` : '0%' }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Answered Students Section */}
      {answered.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Submitted ({answered.length})
          </h3>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Student</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Score</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Submitted</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {answered.map((sub, i) => (
                    <motion.tr
                      key={sub.studentId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-sm font-medium">
                        {sub.lastName}, {sub.firstName}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', STATUS_CONFIG[sub.status].badgeColor)}>
                          {STATUS_CONFIG[sub.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {sub.attempt?.score != null ? (
                          <span className={cn(
                            'font-semibold text-sm',
                            sub.attempt.score >= 70 ? 'text-emerald-600' : sub.attempt.score >= 40 ? 'text-amber-600' : 'text-red-500',
                          )}>
                            {sub.attempt.score}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                        {sub.attempt?.submittedAt ? formatDate(sub.attempt.submittedAt) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {sub.attempt?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setPreviewAttemptId(sub.attempt!.id)}
                          >
                            Preview
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Not Answered Students Section */}
      {notAnswered.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            No Submission ({notAnswered.length})
          </h3>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <tbody>
                  {notAnswered.map((sub, i) => (
                    <motion.tr
                      key={sub.studentId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {sub.lastName}, {sub.firstName}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', STATUS_CONFIG[sub.status].badgeColor)}>
                          {STATUS_CONFIG[sub.status].label}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {allSubmissions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students enrolled in this class.
          </CardContent>
        </Card>
      )}

      {/* Return All Dialog */}
      <Dialog open={returnAllOpen} onOpenChange={setReturnAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post All Grades</DialogTitle>
            <DialogDescription>
              Post grades for all {turnedInCount} unposted submission{turnedInCount !== 1 ? 's' : ''}.
              Students will be able to see their scores.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add feedback for all students (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnAllOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnAll} disabled={returning}>
              {returning ? 'Posting…' : `Post All (${turnedInCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <PreviewModal
        attemptId={previewAttemptId}
        open={!!previewAttemptId}
        onClose={() => setPreviewAttemptId(null)}
      />
    </div>
  );
}
