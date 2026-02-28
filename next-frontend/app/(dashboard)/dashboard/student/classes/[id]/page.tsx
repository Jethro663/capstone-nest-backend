'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getDescription } from '@/utils/helpers';
import type { ClassItem } from '@/types/class';
import type { Lesson, LessonCompletion } from '@/types/lesson';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';

export default function StudentClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AssessmentAttempt[]>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, lessonsRes, completedRes, assessmentsRes, announcementsRes] = await Promise.all([
        classService.getById(classId),
        lessonService.getByClass(classId),
        lessonService.getCompletedByClass(classId).catch(() => ({ data: [] as LessonCompletion[] })),
        assessmentService.getByClass(classId),
        announcementService.getByClass(classId).catch(() => ({ data: [] as Announcement[] })),
      ]);

      setClassItem(classRes.data);
      setLessons(lessonsRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);

      const completionMap: Record<string, boolean> = {};
      (completedRes.data || []).forEach((c) => {
        completionMap[c.lessonId] = c.completed;
      });
      setCompletions(completionMap);

      // Fetch attempts for published assessments
      const published = (assessmentsRes.data || []).filter((a) => a.isPublished);
      const attemptResults = await Promise.all(
        published.map((a) =>
          assessmentService.getStudentAttempts(a.id).catch(() => ({ data: [] as AssessmentAttempt[] })),
        ),
      );
      const attemptsMap: Record<string, AssessmentAttempt[]> = {};
      published.forEach((a, i) => {
        attemptsMap[a.id] = attemptResults[i].data || [];
      });
      setAttempts(attemptsMap);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!classItem) {
    return <p className="text-muted-foreground">Class not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">{classItem.subjectName || classItem.className}</h1>
        <p className="text-muted-foreground">
          {classItem.section?.name} • Grade {classItem.section?.gradeLevel}
        </p>
      </div>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">{lessons.length} lessons</p>
          {lessons.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No lessons yet.</CardContent></Card>
          ) : (
            lessons
              .filter((l) => !l.isDraft)
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <Link key={lesson.id} href={`/dashboard/student/lessons/${lesson.id}?classId=${classId}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{lesson.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{getDescription(lesson.description)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {completions[lesson.id] && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">✓ Completed</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
          )}
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">{assessments.length} assessments</p>
          {assessments.filter((a) => a.isPublished).length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No assessments available.</CardContent></Card>
          ) : (
            assessments
              .filter((a) => a.isPublished)
              .map((assessment) => {
                const myAttempts = attempts[assessment.id] || [];
                const bestAttempt = myAttempts.length > 0
                  ? myAttempts.reduce((best, a) => ((a.score ?? 0) > (best.score ?? 0) ? a : best), myAttempts[0])
                  : null;

                return (
                  <Link key={assessment.id} href={`/dashboard/student/assessments/${assessment.id}?classId=${classId}`}>
                    <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{assessment.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">{getDescription(assessment.description)}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{assessment.type}</Badge>
                              {assessment.totalPoints && (
                                <span className="text-xs text-muted-foreground">{assessment.totalPoints} pts</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {bestAttempt ? (
                              <Badge variant={bestAttempt.passed ? 'default' : 'destructive'}>
                                {bestAttempt.passed ? 'PASSED' : 'FAILED'} — {bestAttempt.score}/{bestAttempt.totalPoints}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Started</Badge>
                            )}
                            {myAttempts.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">{myAttempts.length} attempt(s)</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-3 mt-4">
          {announcements.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
          ) : (
            announcements.map((ann) => (
              <Card key={ann.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{ann.title}</p>
                    {ann.isPinned && <Badge variant="secondary">📌 Pinned</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{ann.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ann.author?.firstName} {ann.author?.lastName} • {new Date(ann.createdAt!).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
