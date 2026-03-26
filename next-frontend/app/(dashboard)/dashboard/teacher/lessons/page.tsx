'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';

type LessonWithClass = Lesson & {
  classLabel: string;
};

function formatDate(value?: string) {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function TeacherLessonsPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<LessonWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const classesRes = await classService.getByTeacher(user.id, 'active');
      const activeClasses = classesRes.data || [];
      setClasses(activeClasses);

      if (activeClasses.length === 0) {
        setLessons([]);
        return;
      }

      const lessonResponses = await Promise.all(
        activeClasses.map(async (course) => {
          const response = await lessonService.getByClass(course.id, {
            order: 'desc',
          });

          const classLabel = `${course.subjectCode} - ${course.subjectName}`;
          return (response.data || []).map((lesson) => ({
            ...lesson,
            classLabel,
          }));
        }),
      );

      const merged = lessonResponses
        .flat()
        .sort((left, right) => {
          const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
          const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
          return rightTime - leftTime;
        });

      setLessons(merged);
    } catch {
      setClasses([]);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesClass = selectedClassId === 'all' || lesson.classId === selectedClassId;
      const needle = search.trim().toLowerCase();
      const matchesSearch =
        needle.length === 0 ||
        lesson.title.toLowerCase().includes(needle) ||
        lesson.classLabel.toLowerCase().includes(needle) ||
        (lesson.description || '').toLowerCase().includes(needle);

      return matchesClass && matchesSearch;
    });
  }, [lessons, search, selectedClassId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
        <Skeleton className="h-[24rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Teacher Lessons"
      title="Lessons Across Your Teaching Space"
      description="Review recent lesson work from every active class in one place, then jump straight into editing the lesson that needs attention."
      actions={(
        <>
          <Link href="/dashboard/teacher">
            <Button variant="outline" className="teacher-button-outline rounded-xl px-4 font-black">
              Back to Dashboard
            </Button>
          </Link>
          <Button className="teacher-button-solid rounded-xl px-4 font-black" onClick={fetchData}>
            Refresh Lessons
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Active Classes"
            value={classes.length}
            caption="Available for lesson browsing"
            icon={BookOpen}
            accent="sky"
          />
          <TeacherStatCard
            label="Visible Lessons"
            value={filteredLessons.length}
            caption={selectedClassId === 'all' ? 'Across all active classes' : 'In the selected class'}
            icon={Sparkles}
            accent="teal"
          />
          <TeacherStatCard
            label="Draft Lessons"
            value={filteredLessons.filter((lesson) => lesson.isDraft).length}
            caption="Still hidden from students"
            icon={CalendarDays}
            accent="amber"
          />
          <TeacherStatCard
            label="Published Lessons"
            value={filteredLessons.filter((lesson) => !lesson.isDraft).length}
            caption="Ready for learners"
            icon={Search}
            accent="rose"
          />
        </>
      )}
    >
      <TeacherSectionCard
        title="Lesson Filters"
        description="Filter by class or search by lesson title before opening a lesson editor."
      >
        <div className="grid gap-4 md:grid-cols-[minmax(14rem,18rem)_1fr]">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select text-sm font-semibold"
          >
            <option value="all">All active classes</option>
            {classes.map((course) => (
              <option key={course.id} value={course.id}>
                {course.subjectCode} - {course.subjectName}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--teacher-text-muted)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search lessons by title or class"
              className="teacher-input pl-10"
            />
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Lesson Index"
        description="Open a lesson editor directly from the lesson list."
      >
        {classes.length === 0 ? (
          <TeacherEmptyState
            title="No classes assigned yet"
            description="Lessons are class-scoped, so they will appear here once at least one active class is assigned to your teacher account."
          />
        ) : filteredLessons.length === 0 ? (
          <TeacherEmptyState
            title="No lessons match this view"
            description="Try a different class filter or search term, or create lessons from a class workspace first."
          />
        ) : (
          <div className="space-y-4">
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="teacher-soft-panel flex flex-col gap-4 rounded-[1.4rem] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-black text-[var(--teacher-text-strong)]">{lesson.title}</p>
                    <Badge variant="outline" className="teacher-button-outline rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase">
                      {lesson.isDraft ? 'Draft' : 'Published'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--teacher-text-muted)]">{lesson.classLabel}</p>
                  <p className="text-xs text-[var(--teacher-text-muted)]">
                    Updated {formatDate(lesson.updatedAt || lesson.createdAt)}
                  </p>
                </div>
                <Link href={`/dashboard/teacher/lessons/${lesson.id}/edit`}>
                  <Button variant="outline" className="teacher-button-outline rounded-xl px-4 font-black">
                    Open Lesson
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
