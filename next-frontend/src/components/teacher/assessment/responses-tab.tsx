'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import type {
  Assessment,
  AssessmentStats,
  QuestionAnalyticsResponse,
  QuestionAnalytics,
  SubmissionsResponse,
} from '@/types/assessment';

interface ResponsesTabProps {
  assessment: Assessment;
  stats: AssessmentStats | null;
  analytics: QuestionAnalyticsResponse | null;
  submissions: SubmissionsResponse | null;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  multiple_select: 'Multiple Select',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  fill_blank: 'Fill in the Blank',
  dropdown: 'Dropdown',
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function ResponsesTab({ assessment, stats, analytics, submissions }: ResponsesTabProps) {
  const totalStudents = submissions?.summary?.total ?? 0;
  const submittedStudents = (submissions?.summary?.turnedIn ?? 0) + (submissions?.summary?.returned ?? 0);
  const completionRate = totalStudents > 0
    ? Math.round((submittedStudents / totalStudents) * 100)
    : 0;
  const totalAttempts = analytics?.totalAttempts ?? analytics?.totalResponses ?? stats?.submittedAttempts ?? 0;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Completion',
            value: `${completionRate}%`,
            sub: totalStudents > 0
              ? `${submittedStudents} of ${totalStudents} students submitted · ${totalAttempts} attempt${totalAttempts !== 1 ? 's' : ''}`
              : 'No students',
            gradient: 'from-blue-500 to-blue-600',
          },
          {
            label: 'Average Score',
            value: `${stats?.averageScore ?? 0}%`,
            sub: `${stats?.highestScore ?? 0}% high · ${stats?.lowestScore ?? 0}% low`,
            gradient: 'from-emerald-500 to-emerald-600',
          },
          {
            label: 'Pass Rate',
            value: `${stats?.passRate ?? 0}%`,
            sub: `Passing: ${assessment.passingScore ?? 60}%`,
            gradient: 'from-violet-500 to-violet-600',
          },
          {
            label: 'Avg Time',
            value: stats?.averageTimeSeconds ? formatTime(stats.averageTimeSeconds) : '—',
            sub: assessment.timeLimitMinutes ? `Limit: ${assessment.timeLimitMinutes}m` : 'No time limit',
            gradient: 'from-amber-500 to-amber-600',
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
          >
            <Card className="overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold mt-0.5">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Per-Question Analytics */}
      {analytics && analytics.questions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Question Breakdown</h3>
          {analytics.questions.map((q, qi) => (
            <motion.div
              key={q.questionId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + qi * 0.04, duration: 0.3 }}
            >
              <QuestionCard question={q} index={qi} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No responses yet. Analytics will appear once students submit their answers.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuestionCard({
  question: q,
  index,
}: {
  question: QuestionAnalytics;
  index: number;
}) {
  const isOptionType = q.options.length > 0;
  const isTextType = ['short_answer', 'fill_blank'].includes(q.type);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-muted-foreground">Q{index + 1}</span>
              <Badge variant="outline" className="text-[11px]">
                {QUESTION_TYPE_LABELS[q.type] ?? q.type}
              </Badge>
              <Badge variant="secondary" className="text-[11px]">{q.points} pt{q.points !== 1 ? 's' : ''}</Badge>
            </div>
            <p className="font-medium">{q.content}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg font-bold ${q.correctPercent >= 70 ? 'text-emerald-600' : q.correctPercent >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
              {q.correctPercent}%
            </p>
            <p className="text-xs text-muted-foreground">correct</p>
          </div>
        </div>

        {/* Option Bar Chart */}
        {isOptionType && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div key={opt.optionId} className="flex items-center gap-3">
                <div className="w-5 flex justify-center">
                  {opt.isCorrect ? (
                    <span className="text-emerald-600 text-sm font-bold">✓</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">○</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm truncate">{opt.text}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {opt.selectionCount} ({opt.selectionPercent}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${opt.selectionPercent}%` }}
                      transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text Answers */}
        {isTextType && q.textAnswers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Student Answers ({q.textAnswers.length})</p>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {groupTextAnswers(q.textAnswers).map(([answer, count]) => (
                <div key={answer} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5 text-sm">
                  <span className="truncate">{answer}</span>
                  {count > 1 && (
                    <Badge variant="secondary" className="text-[11px] ml-2 shrink-0">×{count}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-1 border-t">
          {q.totalResponses} response{q.totalResponses !== 1 ? 's' : ''} · Avg {q.averagePoints} / {q.points} pts
        </div>
      </CardContent>
    </Card>
  );
}

function groupTextAnswers(answers: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const a of answers) {
    const normalized = a.trim();
    if (normalized) map.set(normalized, (map.get(normalized) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
