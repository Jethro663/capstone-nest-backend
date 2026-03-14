'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { sectionService } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ClassItem, StudentMasterlistItem } from '@/types/class';
import type { Section } from '@/types/section';
import { GRADE_LEVELS } from '@/utils/constants';

const PAGE_SIZE = 20;

export default function TeacherAddStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [gradeLevel, setGradeLevel] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<StudentMasterlistItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedEligibleCount = useMemo(
    () => students.filter((student) => selectedIds.includes(student.id) && student.isEligible).length,
    [selectedIds, students],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
      setSelectedIds([]);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchClass = useCallback(async () => {
    const classRes = await classService.getById(classId);
    setClassItem(classRes.data);
    const defaultGrade = classRes.data.section?.gradeLevel || classRes.data.subjectGradeLevel || '';
    setGradeLevel(defaultGrade);
  }, [classId]);

  const fetchSections = useCallback(async (targetGradeLevel: string) => {
    if (!targetGradeLevel) {
      setSections([]);
      return;
    }
    const res = await sectionService.getAll({ gradeLevel: targetGradeLevel, page: 1, limit: 100 });
    setSections(res.data || []);
  }, []);

  const fetchStudents = useCallback(async () => {
    if (!gradeLevel) return;
    try {
      setLoading(true);
      const res = await classService.getStudentsMasterlist(classId, {
        gradeLevel,
        sectionId: sectionId || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setStudents(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [classId, gradeLevel, page, search, sectionId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchClass();
      } catch {
        toast.error('Failed to load class');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchClass]);

  useEffect(() => {
    if (!gradeLevel) return;
    fetchSections(gradeLevel);
    setSectionId('');
    setPage(1);
    setSelectedIds([]);
  }, [gradeLevel, fetchSections]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleToggleStudent = (student: StudentMasterlistItem) => {
    if (!student.isEligible) return;
    setSelectedIds((prev) =>
      prev.includes(student.id)
        ? prev.filter((id) => id !== student.id)
        : [...prev, student.id],
    );
  };

  const handleAddSelected = async () => {
    const eligibleIds = selectedIds.filter((id) => students.some((student) => student.id === id && student.isEligible));
    if (eligibleIds.length === 0) {
      toast.error('Select at least one eligible student');
      return;
    }

    try {
      setSubmitting(true);
      await Promise.all(
        eligibleIds.map((studentId) => classService.enrollStudent(classId, { studentId })),
      );
      toast.success(`Added ${eligibleIds.length} student(s)`);
      router.push(`/dashboard/teacher/classes/${classId}`);
    } catch {
      toast.error('Failed to add one or more students');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher/classes/${classId}`)} className="mb-2">
          ← Back to Class
        </Button>
        <h1 className="text-2xl font-bold">Add Students</h1>
        <p className="text-muted-foreground">
          {classItem?.subjectName} ({classItem?.subjectCode}) • {classItem?.section?.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Students</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Grade Level</Label>
            <select
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select grade level</option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Section</Label>
            <select
              value={sectionId}
              onChange={(event) => {
                setSectionId(event.target.value);
                setPage(1);
                setSelectedIds([]);
              }}
              disabled={!gradeLevel}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">All sections in selected grade</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Search (Name or LRN)</Label>
            <Input
              placeholder="Search by student name or LRN"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Masterlist</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{total} total</Badge>
            <Badge>{selectedEligibleCount} selected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Students outside this class section or grade stay visible but are disabled for validation.
          </p>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found for current filters.</p>
          ) : (
            students.map((student) => {
              const isSelected = selectedIds.includes(student.id);
              const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase() || 'S';

              return (
                <label
                  key={student.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    student.isEligible ? 'cursor-pointer hover:bg-muted/30' : 'opacity-60 bg-muted/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!student.isEligible}
                    onChange={() => handleToggleStudent(student)}
                    className="mt-3"
                  />

                  <Avatar className="h-10 w-10 border">
                    {student.profilePicture ? <AvatarImage src={student.profilePicture} alt={`${student.firstName || ''} ${student.lastName || ''}`} /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <Badge variant="outline">Grade {student.gradeLevel || '—'}</Badge>
                      <Badge variant="outline">{student.section?.name || 'No section'}</Badge>
                      {!student.isEligible && student.disabledReason && (
                        <Badge variant="secondary">{student.disabledReason}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-xs text-muted-foreground">LRN: {student.lrn || '—'}</p>
                  </div>
                </label>
              );
            })
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1));
                  setSelectedIds([]);
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((current) => current + 1);
                  setSelectedIds([]);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-3">
          <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/classes/${classId}`)}>
            Cancel
          </Button>
          <Button onClick={handleAddSelected} disabled={submitting || selectedEligibleCount === 0}>
            {submitting ? 'Adding...' : `Add ${selectedEligibleCount} Student(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
