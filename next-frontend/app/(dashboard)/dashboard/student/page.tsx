'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import { getDescription, getTeacherName } from '@/utils/helpers';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const classRes = await classService.getByStudent(user.id);
      const enrolledClasses = classRes.data || [];
      setClasses(enrolledClasses);

      const [lessonResults, assessmentResults] = await Promise.all([
        Promise.all(enrolledClasses.slice(0, 6).map((c) => lessonService.getByClass(c.id).catch(() => ({ data: [] as Lesson[] })))),
        Promise.all(enrolledClasses.slice(0, 6).map((c) => assessmentService.getByClass(c.id).catch(() => ({ data: [] as Assessment[] })))),
      ]);

      setLessons(lessonResults.flatMap((r) => r.data || []));
      setAssessments(assessmentResults.flatMap((r) => r.data || []));
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const profileIncomplete = !user?.firstName || !user?.lastName;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold">
            🎓 Welcome back, {user?.firstName || 'Student'}!
          </h1>
          <p className="mt-1 text-blue-100">Student ID: {user?.id?.slice(0, 8)}</p>
        </CardContent>
      </Card>

      {/* Profile completion */}
      {profileIncomplete && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-red-800">Profile Incomplete</p>
              <p className="text-sm text-red-600">Complete your profile to access all features.</p>
            </div>
            <Link href="/complete-profile">
              <Button variant="destructive" size="sm">Complete Now</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Classes</p>
            <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Lessons</p>
            <p className="text-3xl font-bold text-purple-600">{lessons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Assessments</p>
            <p className="text-3xl font-bold text-orange-600">{assessments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Your Classes */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Your Classes</h2>
        {classes.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No classes enrolled yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.slice(0, 6).map((cls) => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{cls.subjectName || cls.className || cls.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{getTeacherName(cls.teacher)}</p>
                  <Link href={`/dashboard/student/classes/${cls.id}`}>
                    <Button variant="link" className="mt-2 p-0 h-auto text-sm">View →</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Lessons */}
      {lessons.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent Lessons</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {lessons.slice(0, 4).map((lesson) => (
              <Card key={lesson.id}>
                <CardContent className="p-4">
                  <p className="font-medium">{lesson.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {getDescription(lesson.description)}
                  </p>
                  <Link href={`/dashboard/student/lessons/${lesson.id}`}>
                    <Button variant="link" className="mt-2 p-0 h-auto text-sm">Open →</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Assessments */}
      {assessments.filter((a) => a.isPublished).length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Pending Assessments</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {assessments
              .filter((a) => a.isPublished)
              .slice(0, 4)
              .map((assessment, i) => {
                const typeColor = assessment.type === 'exam'
                  ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                  : assessment.type === 'assignment'
                    ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20'
                    : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
                const typeIcon = assessment.type === 'exam' ? '📝' : assessment.type === 'assignment' ? '📋' : '❓';
                const isPastDue = assessment.dueDate && new Date(assessment.dueDate) < new Date();

                return (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    <Card className={`border-l-4 ${typeColor} hover:shadow-lg transition-all duration-200 h-full`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{typeIcon}</span>
                          <p className="font-semibold truncate flex-1">{assessment.title}</p>
                          <Badge variant="secondary" className="capitalize shrink-0">{assessment.type}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {getDescription(assessment.description)}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          {assessment.dueDate && (
                            <p className={`text-xs ${isPastDue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                              {isPastDue ? 'Past due' : 'Due'}: {new Date(assessment.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          <Link href={`/dashboard/student/assessments/${assessment.id}`}>
                            <Button size="sm">Start</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
