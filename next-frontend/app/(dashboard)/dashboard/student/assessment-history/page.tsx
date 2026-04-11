'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, Search } from 'lucide-react';
import { profileService } from '@/services/profile-service';
import type { AcademicAssessmentAttempt } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 15;

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StudentAssessmentHistoryPage() {
  const [rows, setRows] = useState<AcademicAssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await profileService.getAssessmentHistory({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          submission: 'all',
        });
        if (!mounted) return;
        setRows(response.data || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [page, search]);

  const statusSummary = useMemo(() => {
    const submitted = rows.filter((entry) => entry.isSubmitted).length;
    const inProgress = rows.length - submitted;
    return { submitted, inProgress };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">Student Records</p>
          <h1 className="text-2xl font-black text-[var(--student-text-strong)]">Assessment History</h1>
          <p className="text-sm text-[var(--student-text-muted)]">Review your latest attempts across classes and terms.</p>
        </div>
        <Link href="/dashboard/student/profile">
          <Button variant="outline" className="student-button-outline rounded-xl font-black">
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl border-[var(--student-outline)]">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--student-text-muted)]" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by assessment or class"
              className="student-profile-input pl-10"
            />
          </div>
          <Badge className="h-10 rounded-full bg-sky-100 px-4 py-0 text-sky-700">Submitted: {statusSummary.submitted}</Badge>
          <Badge className="h-10 rounded-full bg-amber-100 px-4 py-0 text-amber-700">In Progress: {statusSummary.inProgress}</Badge>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[var(--student-outline)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-black text-[var(--student-text-strong)]">
            <History className="h-4 w-4 text-[var(--student-accent)]" />
            Attempt Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--student-text-muted)]">
              No assessment attempts found.
            </p>
          ) : (
            rows.map((row) => (
              <article key={row.id} className="rounded-xl border border-[var(--student-outline)] bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-[var(--student-text-strong)]">
                      {row.assessment?.title || 'Assessment'}
                    </p>
                    <p className="text-sm text-[var(--student-text-muted)]">
                      {row.assessment?.class?.subjectName || 'Class'} ({row.assessment?.class?.subjectCode || '--'}) • Attempt #{row.attemptNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`rounded-full px-3 py-1 text-xs font-bold ${row.isSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {row.isSubmitted ? 'Submitted' : 'In Progress'}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold">
                      Score: {row.score ?? '--'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--student-text-muted)]">
                  <span>Started: {formatDate((row as { startedAt?: string }).startedAt)}</span>
                  <span>Submitted: {formatDate(row.submittedAt)}</span>
                  <span>Due: {formatDate(row.assessment?.dueDate)}</span>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between border-t border-[var(--student-outline)] pt-3">
        <p className="text-xs text-[var(--student-text-muted)]">
          Showing page {page} of {totalPages} • {total} total attempts
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
