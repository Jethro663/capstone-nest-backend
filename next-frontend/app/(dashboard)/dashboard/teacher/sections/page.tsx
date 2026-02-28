'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { sectionService } from '@/services/section-service';
import { Card, CardContent } from '@/components/ui/card';
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
      const res = await sectionService.getMy();
      setSections(res.data || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
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
      )}
    </div>
  );
}
