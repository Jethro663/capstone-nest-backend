'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClassItem } from '@/types/class';

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'];

function getClassColor(code: string) {
  let hash = 0;
  for (let i = 0; i < (code || '').length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await classService.getByTeacher(user.id);
      setClasses(res.data || []);
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
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Classes</h1>
        <p className="text-muted-foreground">Manage your assigned classes</p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium">No classes assigned</p>
            <p className="text-sm text-muted-foreground">Contact your administrator to get classes assigned.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/dashboard/teacher/classes/${cls.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer h-full">
                <div className={`h-2 ${getClassColor(cls.subjectCode)}`} />
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold">{cls.subjectName} ({cls.subjectCode})</p>
                  <p className="text-sm text-muted-foreground">
                    {cls.section?.name} • Grade {cls.section?.gradeLevel || cls.subjectGradeLevel}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>👤 {cls.enrollmentCount ?? 0} students</span>
                    {cls.room && <span>🏫 {cls.room}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
