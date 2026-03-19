'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutGrid, Users } from 'lucide-react';
import { sectionService } from '@/services/section-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Section } from '@/types/section';

export default function TeacherSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sectionService.getMy();
      setSections(res.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white shadow-xl">
        <CardContent className="grid gap-6 p-8 md:grid-cols-[1.4fr_0.8fr] md:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
              <LayoutGrid className="h-3.5 w-3.5" /> Advisory Sections
            </div>
            <h1 className="text-3xl font-black tracking-tight">My Sections</h1>
            <p className="max-w-2xl text-sm text-white/75">
              Keep roster work, advisory follow-ups, and grade-level context in one place. This view mirrors the stronger class dashboard treatment so your section pages feel like part of the same workflow.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Sections</p>
              <p className="mt-2 text-3xl font-black">{sections.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Students</p>
              <p className="mt-2 text-3xl font-black">
                {sections.reduce((total, section) => total + (section.studentCount ?? 0), 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold">No sections assigned</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Once a section is assigned to you, its roster and advisory workflows will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <Card key={section.id} className="overflow-hidden rounded-3xl border shadow-sm">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                    Grade {section.gradeLevel}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight">{section.name}</h2>
                  <p className="text-sm text-muted-foreground">{section.schoolYear}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Roster</p>
                    <p className="mt-2 text-2xl font-bold">{section.studentCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Year</p>
                    <p className="mt-2 text-lg font-bold">{section.schoolYear}</p>
                  </div>
                </div>

                <Link href={`/dashboard/teacher/sections/${section.id}/roster`}>
                  <Button className="w-full justify-between">
                    View Roster <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
