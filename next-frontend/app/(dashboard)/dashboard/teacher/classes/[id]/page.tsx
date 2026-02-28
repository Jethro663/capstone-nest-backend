'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getDescription } from '@/utils/helpers';
import type { ClassItem, Enrollment } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import type { User } from '@/types/user';
import type { Announcement } from '@/types/announcement';

export default function TeacherClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Form states
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDesc, setAssessmentDesc] = useState('');
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'exam' | 'assignment'>('quiz');
  const [totalPoints, setTotalPoints] = useState(100);
  const [passingScore, setPassingScore] = useState(60);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, lessonsRes, assessmentsRes, enrollmentsRes, announcementsRes] = await Promise.all([
        classService.getById(classId),
        lessonService.getByClass(classId),
        assessmentService.getByClass(classId),
        classService.getEnrollments(classId),
        announcementService.getByClass(classId).catch(() => ({ data: [] as Announcement[] })),
      ]);
      setClassItem(classRes.data);
      setLessons(lessonsRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);
    } catch {
      toast.error('Failed to load class details');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateLesson = async () => {
    if (!lessonTitle.trim()) return;
    try {
      await lessonService.create({ title: lessonTitle, description: lessonDesc, classId });
      toast.success('Lesson created');
      setShowCreateLesson(false);
      setLessonTitle('');
      setLessonDesc('');
      const res = await lessonService.getByClass(classId);
      setLessons(res.data || []);
    } catch {
      toast.error('Failed to create lesson');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await lessonService.delete(id);
      toast.success('Lesson deleted');
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch {
      toast.error('Failed to delete lesson');
    }
  };

  const handleCreateAssessment = async () => {
    if (!assessmentTitle.trim()) return;
    try {
      await assessmentService.create({
        title: assessmentTitle,
        description: assessmentDesc,
        classId,
        type: assessmentType,
        totalPoints,
        passingScore,
      });
      toast.success('Assessment created');
      setShowCreateAssessment(false);
      setAssessmentTitle('');
      setAssessmentDesc('');
      const res = await assessmentService.getByClass(classId);
      setAssessments(res.data || []);
    } catch {
      toast.error('Failed to create assessment');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Delete this assessment?')) return;
    try {
      await assessmentService.delete(id);
      toast.success('Assessment deleted');
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Failed to delete assessment');
    }
  };

  const handleOpenAddStudents = async () => {
    try {
      const res = await classService.getCandidates(classId);
      setCandidates(res.data || []);
      setSelectedStudents([]);
      setShowAddStudents(true);
    } catch {
      toast.error('Failed to load candidates');
    }
  };

  const handleAddStudents = async () => {
    try {
      for (const studentId of selectedStudents) {
        await classService.enrollStudent(classId, { studentId });
      }
      toast.success(`Added ${selectedStudents.length} student(s)`);
      setShowAddStudents(false);
      const res = await classService.getEnrollments(classId);
      setEnrollments(res.data || []);
    } catch {
      toast.error('Failed to add students');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student?')) return;
    try {
      await classService.unenrollStudent(classId, studentId);
      toast.success('Student removed');
      setEnrollments((prev) => prev.filter((e) => e.studentId !== studentId));
    } catch {
      toast.error('Failed to remove student');
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    try {
      await announcementService.create(classId, { title: annTitle, content: annContent });
      toast.success('Announcement created');
      setShowCreateAnnouncement(false);
      setAnnTitle('');
      setAnnContent('');
      const res = await announcementService.getByClass(classId);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to create announcement');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!classItem) return <p className="text-muted-foreground">Class not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">← Back</Button>
        <h1 className="text-2xl font-bold">{classItem.subjectName} ({classItem.subjectCode})</h1>
        <p className="text-muted-foreground">
          {classItem.section?.name} • Grade {classItem.section?.gradeLevel} • {enrollments.length} students
        </p>
      </div>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{lessons.length} lessons</p>
            <Button size="sm" onClick={() => setShowCreateLesson(true)}>+ New Lesson</Button>
          </div>
          {lessons.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No lessons yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {lessons.sort((a, b) => a.order - b.order).map((lesson) => (
                <Card key={lesson.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lesson.title}</p>
                        <Badge variant={lesson.isDraft ? 'secondary' : 'default'}>
                          {lesson.isDraft ? 'Draft' : 'Published'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{getDescription(lesson.description)}</p>
                      <p className="text-xs text-muted-foreground">{lesson.contentBlocks?.length ?? 0} blocks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/teacher/lessons/${lesson.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteLesson(lesson.id)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{assessments.length} assessments</p>
            <Button size="sm" onClick={() => setShowCreateAssessment(true)}>+ New Assessment</Button>
          </div>
          {assessments.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No assessments yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {assessments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{a.title}</p>
                        <Badge variant={a.isPublished ? 'default' : 'secondary'}>
                          {a.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        <Badge variant="outline">{a.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.totalPoints} pts • Passing: {a.passingScore}% • {a.questions?.length ?? 0} questions
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/teacher/assessments/${a.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteAssessment(a.id)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{announcements.length} announcements</p>
            <Button size="sm" onClick={() => setShowCreateAnnouncement(true)}>+ New Announcement</Button>
          </div>
          {announcements.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <Card key={ann.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{ann.title}</p>
                      {ann.isPinned && <Badge variant="secondary">📌 Pinned</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{ann.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(ann.createdAt!).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Gradebook Tab */}
        <TabsContent value="gradebook" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                <Link href={`/dashboard/teacher/gradebook?classId=${classId}`} className="text-blue-600 hover:underline">
                  Open Gradebook →
                </Link>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{enrollments.length} students</p>
            <Button size="sm" onClick={handleOpenAddStudents}>+ Add Student</Button>
          </div>
          {enrollments.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No students enrolled.</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.student?.firstName} {e.student?.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{e.student?.email}</TableCell>
                      <TableCell className="text-muted-foreground">{e.student?.lrn || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveStudent(e.studentId)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Lesson Modal */}
      <Dialog open={showCreateLesson} onOpenChange={setShowCreateLesson}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Lesson</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Lesson title" /></div>
            <div><Label>Description (optional)</Label><Textarea value={lessonDesc} onChange={(e) => setLessonDesc(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLesson(false)}>Cancel</Button>
            <Button onClick={handleCreateLesson} disabled={!lessonTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Assessment Modal */}
      <Dialog open={showCreateAssessment} onOpenChange={setShowCreateAssessment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} placeholder="Assessment title" /></div>
            <div><Label>Description</Label><Textarea value={assessmentDesc} onChange={(e) => setAssessmentDesc(e.target.value)} placeholder="Brief description" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as 'quiz' | 'exam' | 'assignment')} className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="quiz">Quiz</option>
                  <option value="exam">Exam</option>
                  <option value="assignment">Assignment</option>
                </select>
              </div>
              <div><Label>Total Points</Label><Input type="number" value={totalPoints} onChange={(e) => setTotalPoints(Number(e.target.value))} /></div>
            </div>
            <div><Label>Passing Score (%)</Label><Input type="number" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAssessment(false)}>Cancel</Button>
            <Button onClick={handleCreateAssessment} disabled={!assessmentTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Students Modal */}
      <Dialog open={showAddStudents} onOpenChange={setShowAddStudents}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Students</DialogTitle></DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No candidates available.</p>
            ) : (
              candidates.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.id)}
                    onChange={() => {
                      setSelectedStudents((prev) =>
                        prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                      );
                    }}
                  />
                  <span className="text-sm">{s.firstName} {s.lastName} — {s.email}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStudents(false)}>Cancel</Button>
            <Button onClick={handleAddStudents} disabled={selectedStudents.length === 0}>
              Add {selectedStudents.length} Student(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Announcement Modal */}
      <Dialog open={showCreateAnnouncement} onOpenChange={setShowCreateAnnouncement}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement title" /></div>
            <div><Label>Content</Label><Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Announcement content" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAnnouncement(false)}>Cancel</Button>
            <Button onClick={handleCreateAnnouncement} disabled={!annTitle.trim() || !annContent.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
