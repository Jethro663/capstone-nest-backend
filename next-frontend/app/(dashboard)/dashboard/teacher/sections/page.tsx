'use client';

<<<<<<< Updated upstream
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
=======
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutGrid, School2, Sparkles, Users } from 'lucide-react';
>>>>>>> Stashed changes
import { sectionService } from '@/services/section-service';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { Section } from '@/types/section';

export default function TeacherSectionsPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
<<<<<<< Updated upstream
      const res = await sectionService.getMy();
      setSections(res.data || []);
    } catch {
      // fail silently
=======
      const response = await sectionService.getMy();
      setSections(response.data || []);
>>>>>>> Stashed changes
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalStudents = useMemo(
    () => sections.reduce((total, section) => total + (section.studentCount ?? 0), 0),
    [sections],
  );

  if (loading) {
    return (
      <div className="space-y-6">
<<<<<<< Updated upstream
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
=======
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
>>>>>>> Stashed changes
        </div>
        <Skeleton className="h-[28rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Sections</h1>
        <p className="text-muted-foreground">Sections you are assigned to advise</p>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            You are not assigned to any section.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{section.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Grade {section.gradeLevel} • {section.schoolYear}
                    {section.studentCount !== undefined && ` • ${section.studentCount} students`}
                  </p>
                </div>
                <Link href={`/dashboard/teacher/sections/${section.id}/roster`}>
                  <Button variant="outline" size="sm">View Roster</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
=======
    <TeacherPageShell
      badge="Teacher Sections"
      title="Advisory Sections With Clearer Focus"
      description="Keep roster work, advisory context, and section-level visibility in one stronger teacher workspace with calmer panels and faster scanability."
      actions={(
        <Button className="teacher-button-solid rounded-xl px-4 font-black" onClick={fetchData}>
          Refresh Sections
        </Button>
>>>>>>> Stashed changes
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Sections"
            value={sections.length}
            caption={sections.length > 0 ? 'Assigned advisory spaces' : 'Waiting for section assignments'}
            icon={LayoutGrid}
            accent="sky"
          />
          <TeacherStatCard
            label="Students"
            value={totalStudents}
            caption="Across your current section list"
            icon={Users}
            accent="teal"
          />
          <TeacherStatCard
            label="Grade Levels"
            value={new Set(sections.map((section) => section.gradeLevel)).size}
            caption="Represented in your advisory load"
            icon={School2}
            accent="amber"
          />
          <TeacherStatCard
            label="Roster Flow"
            value={sections.length > 0 ? 'Ready' : 'Pending'}
            caption="Open any section to jump into roster work"
            icon={Sparkles}
            accent="rose"
          />
        </>
      )}
    >
      <TeacherSectionCard
        title="Section Panels"
        description="A more deliberate section grid that keeps grade, year, and roster actions easy to pick up at a glance."
      >
        {sections.length === 0 ? (
          <TeacherEmptyState
            title="No sections assigned"
            description="Once a section is assigned to you, its roster, grade context, and advisory work will appear here."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <div key={section.id} className="teacher-sections-card">
                <div className="teacher-sections-card__accent" />
                <div className="relative z-10 space-y-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="teacher-dashboard-chip">
                        <School2 className="h-4 w-4" />
                        Grade {section.gradeLevel}
                      </span>
                      <span className="teacher-dashboard-chip">{section.schoolYear}</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-[var(--teacher-text-strong)]">
                      {section.name}
                    </h2>
                    <p className="text-sm text-[var(--teacher-text-muted)]">
                      Advisory roster and learner details stay grouped here so you can move into section work faster.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="teacher-sections-card__metric">
                      <span>Roster</span>
                      <strong>{section.studentCount ?? 0}</strong>
                    </div>
                    <div className="teacher-sections-card__metric">
                      <span>School Year</span>
                      <strong>{section.schoolYear}</strong>
                    </div>
                  </div>

                  <Link href={`/dashboard/teacher/sections/${section.id}/roster`}>
                    <Button className="teacher-button-solid h-11 w-full justify-between rounded-2xl px-4 font-black">
                      View Roster
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
