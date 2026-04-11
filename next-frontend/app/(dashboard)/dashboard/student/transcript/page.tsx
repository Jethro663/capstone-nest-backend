'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Search } from 'lucide-react';
import { profileService } from '@/services/profile-service';
import type { AcademicEnrollmentRow } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 15;

function formatDate(value?: string) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusChip(status: string) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'enrolled') return 'bg-sky-100 text-sky-700';
  return 'bg-amber-100 text-amber-700';
}

export default function StudentTranscriptPage() {
  const [rows, setRows] = useState<AcademicEnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

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
        const response = await profileService.getTranscript({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          status: 'all',
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

  const groupedBySchoolYear = useMemo(() => {
    return rows.reduce<Record<string, AcademicEnrollmentRow[]>>((acc, row) => {
      const schoolYear = row.class?.schoolYear || row.section?.schoolYear || 'Unknown School Year';
      if (!acc[schoolYear]) acc[schoolYear] = [];
      acc[schoolYear].push(row);
      return acc;
    }, {});
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">Student Records</p>
          <h1 className="text-2xl font-black text-[var(--student-text-strong)]">Subject Enrollment Transcript</h1>
          <p className="text-sm text-[var(--student-text-muted)]">Every class you have enrolled in, grouped by school year.</p>
        </div>
        <Link href="/dashboard/student/profile">
          <Button variant="outline" className="student-button-outline rounded-xl font-black">
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl border-[var(--student-outline)]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--student-text-muted)]" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by subject, section, or school year"
              className="student-profile-input pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="rounded-2xl border-[var(--student-outline)]">
          <CardContent className="p-8 text-center text-sm text-[var(--student-text-muted)]">
            No transcript rows found.
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedBySchoolYear).map(([schoolYear, schoolRows]) => (
          <Card key={schoolYear} className="rounded-2xl border-[var(--student-outline)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-black text-[var(--student-text-strong)]">
                <GraduationCap className="h-4 w-4 text-[var(--student-accent)]" />
                {schoolYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {schoolRows.map((row) => (
                <article key={row.id} className="rounded-xl border border-[var(--student-outline)] bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-[var(--student-text-strong)]">
                        {row.class?.subjectName || 'Unlinked Subject'} ({row.class?.subjectCode || '--'})
                      </p>
                      <p className="text-sm text-[var(--student-text-muted)]">
                        Grade {row.section?.gradeLevel || '--'} • {row.section?.name || 'No section'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusChip(row.status)}`}>
                        {row.status}
                      </Badge>
                      <span className="text-xs text-[var(--student-text-muted)]">{formatDate(row.enrolledAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex items-center justify-between border-t border-[var(--student-outline)] pt-3">
        <p className="text-xs text-[var(--student-text-muted)]">
          Showing page {page} of {totalPages} • {total} total rows
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
