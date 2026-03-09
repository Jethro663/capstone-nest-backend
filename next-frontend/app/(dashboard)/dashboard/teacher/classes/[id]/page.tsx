'use client';

import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { extractionService } from '@/services/extraction-service';
import { fileService } from '@/services/file-service';
import { classRecordService } from '@/services/class-record-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { getDescription } from '@/utils/helpers';
import type { ClassItem, Enrollment } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import type { User } from '@/types/user';
import type { Announcement } from '@/types/announcement';
import type { Extraction } from '@/types/extraction';
import type { ClassRecord, SpreadsheetData } from '@/types/class-record';
import type { GradingPeriod } from '@/utils/constants';
import type { UploadedFile } from '@/types/file';

const QUARTERS: GradingPeriod[] = ['Q1', 'Q2', 'Q3', 'Q4'];

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
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Extract module states
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<UploadedFile[]>([]);
  const [selectedLibraryFileId, setSelectedLibraryFileId] = useState('');

  // Class record state
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [generatingQuarter, setGeneratingQuarter] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string; studentId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // Form states
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [activeTab, setActiveTab] = useState('lessons');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, lessonsRes, assessmentsRes, enrollmentsRes] = await Promise.all([
        classService.getById(classId),
        lessonService.getByClass(classId),
        assessmentService.getByClass(classId),
        classService.getEnrollments(classId),
      ]);
      setClassItem(classRes.data);
      setLessons(lessonsRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
    } catch {
      toast.error('Failed to load class details');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await announcementService.getByClass(classId);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load announcements');
    }
  }, [classId]);

  const fetchExtractionWorkspace = useCallback(async () => {
    try {
      const [extractionsRes, libraryRes] = await Promise.all([
        extractionService.listByClass(classId),
        fileService.getAll(),
      ]);
      setExtractions(Array.isArray(extractionsRes.data) ? extractionsRes.data : []);
      setLibraryFiles(Array.isArray(libraryRes.data) ? libraryRes.data : []);
    } catch {
      toast.error('Failed to load extraction workspace');
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
    fetchClassRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEffect(() => {
    if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
    if (activeTab === 'extraction') {
      fetchExtractionWorkspace();
    }
  }, [activeTab, fetchAnnouncements, fetchExtractionWorkspace]);

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
    try {
      const res = await assessmentService.create({ title: 'Untitled Assessment', classId });
      toast.success('Assessment created — redirecting to editor');
      router.push(`/dashboard/teacher/assessments/${res.data.id}/edit`);
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove student'));
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

  // ── Class Record handlers ─────────────────────────────────────────────────

  const fetchClassRecords = useCallback(async () => {
    try {
      const res = await classRecordService.getByClass(classId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      if (records.length > 0 && !selectedRecord) {
        setSelectedRecord(records[0]);
      } else if (records.length === 0) {
        setSelectedRecord(null);
        setSpreadsheet(null);
      }
    } catch {
      toast.error('Failed to load class records');
    }
  }, [classId, selectedRecord]);

  const fetchSpreadsheet = useCallback(async () => {
    if (!selectedRecord) {
      setSpreadsheet(null);
      return;
    }
    try {
      const res = await classRecordService.getSpreadsheet(selectedRecord.id);
      setSpreadsheet(res.data);
    } catch {
      toast.error('Failed to load spreadsheet');
      setSpreadsheet(null);
    }
  }, [selectedRecord]);

  useEffect(() => { fetchSpreadsheet(); }, [fetchSpreadsheet]);

  const handleGenerateQuarter = async (quarter: GradingPeriod) => {
    try {
      setGeneratingQuarter(true);
      await classRecordService.generate({ classId, gradingPeriod: quarter });
      toast.success(`Class record for ${quarter} generated`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.info(`${quarter} record already exists — loading it now`);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to generate class record');
        return;
      }
    } finally {
      setGeneratingQuarter(false);
    }
    // Refresh and auto-select the newly created/existing record
    try {
      const res = await classRecordService.getByClass(classId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      const target = records.find((r) => r.gradingPeriod === quarter) ?? records[0] ?? null;
      setSelectedRecord(target);
    } catch {
      toast.error('Failed to reload records');
    }
  };

  const handleFinalizeRecord = async () => {
    if (!selectedRecord || !confirm('Finalize this quarter? This cannot be undone.')) return;
    try {
      await classRecordService.finalize(selectedRecord.id);
      toast.success('Quarter finalized');
      const res = await classRecordService.getByClass(classId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      const updated = records.find((r) => r.id === selectedRecord.id) ?? null;
      setSelectedRecord(updated);
    } catch {
      toast.error('Failed to finalize');
    }
  };

  const handleCellClick = (itemId: string, studentId: string, currentScore: number | null) => {
    if (selectedRecord?.status !== 'draft') return;
    setEditingCell({ itemId, studentId });
    setEditValue(currentScore != null ? String(currentScore) : '');
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const score = parseFloat(editValue);
    if (isNaN(score) || score < 0) {
      toast.error('Invalid score');
      setEditingCell(null);
      return;
    }
    try {
      await classRecordService.recordScore(editingCell.itemId, {
        studentId: editingCell.studentId,
        score,
      });
      setEditingCell(null);
      fetchSpreadsheet();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save score');
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellSave();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const handleSyncItem = async (itemId: string) => {
    try {
      setSyncingItemId(itemId);
      const res = await classRecordService.syncScores(itemId);
      const synced = (res.data as any)?.synced ?? 0;
      toast.success(`Synced ${synced} score(s) from assessment`);
      fetchSpreadsheet();
    } catch {
      toast.error('Failed to sync scores');
    } finally {
      setSyncingItemId(null);
    }
  };

  // ── Extract Module ────────────────────────────────────────────────────────

  const queueExtraction = async (fileId: string) => {
    setExtracting(true);
    try {
      const extractRes = await extractionService.extractModule({ fileId });
      toast.success('Extraction queued! Redirecting to review page...');
      setExtractFile(null);
      setSelectedLibraryFileId('');
      router.push(`/dashboard/teacher/extractions/${extractRes.data.extractionId}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg =
        axiosErr?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        'Failed to start extraction';
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractModule = async () => {
    if (!extractFile) return;
    setExtracting(true);
    try {
      const uploadRes = await fileService.upload(extractFile, { classId });
      setLibraryFiles((prev) => [uploadRes.data, ...prev]);
      await queueExtraction(uploadRes.data.id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message ||
          (err instanceof Error ? err.message : null) ||
          'Failed to start extraction',
      );
      setExtracting(false);
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="extraction">Extraction</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="class-record">Class Record</TabsTrigger>
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

        <TabsContent value="extraction" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="overflow-hidden border-red-100 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.1),_transparent_40%),linear-gradient(135deg,#ffffff_0%,#fff8f5_100%)]">
              <CardHeader>
                <CardTitle className="text-xl">Extraction Workspace</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload a new PDF for this class or reuse one from Nexora Library. Completed extractions stay here for review and lesson drafting.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border bg-white/80 p-4">
                  <Label>Upload a fresh module PDF</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setExtractFile(e.target.files?.[0] || null)}
                  />
                  <Button onClick={handleExtractModule} disabled={!extractFile || extracting}>
                    {extracting ? 'Uploading & Extracting...' : 'Start New Extraction'}
                  </Button>
                </div>
                <div className="space-y-3 rounded-2xl border bg-white/80 p-4">
                  <Label>Pick an existing library PDF</Label>
                  <select
                    value={selectedLibraryFileId}
                    onChange={(e) => setSelectedLibraryFileId(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select from Nexora Library</option>
                    {libraryFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.originalName} {file.scope === 'general' ? '• General' : '• My Library'}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => selectedLibraryFileId && queueExtraction(selectedLibraryFileId)}
                    disabled={!selectedLibraryFileId || extracting}
                  >
                    Use Selected PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold">Extraction Queue</p>
                  <p className="text-sm text-muted-foreground">
                    {extractions.length} extraction run(s) for this class
                  </p>
                </div>
              </div>

              {extractions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No extraction history yet. Start with a PDF upload or choose a library file above.
                  </CardContent>
                </Card>
              ) : (
                extractions.map((ext) => (
                  <Card key={ext.id} className="border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={
                            ext.extractionStatus === 'completed' || ext.extractionStatus === 'applied'
                              ? 'default'
                              : ext.extractionStatus === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }>
                            {ext.extractionStatus}
                          </Badge>
                          <span className="text-sm font-medium">
                            {ext.originalName || ext.structuredContent?.title || 'PDF extraction'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ext.structuredContent?.lessons?.length ?? 0} lesson(s) • {new Date(ext.createdAt).toLocaleString()}
                        </p>
                        {ext.errorMessage && (
                          <p className="text-sm text-red-600">{ext.errorMessage}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/extractions/${ext.id}`)}>
                          Review
                        </Button>
                        {!ext.isApplied && ext.extractionStatus !== 'applied' && (
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={async () => {
                              try {
                                await extractionService.delete(ext.id);
                                toast.success('Extraction deleted');
                                fetchData();
                              } catch {
                                toast.error('Failed to delete extraction');
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{assessments.length} assessments</p>
            <Button size="sm" onClick={handleCreateAssessment}>+ New Assessment</Button>
          </div>
          {assessments.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No assessments yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {assessments.map((a, i) => {
                const typeColor = a.type === 'exam'
                  ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                  : a.type === 'assignment'
                    ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20'
                    : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
                const typeIcon = a.type === 'exam' ? '📝' : a.type === 'assignment' ? '📋' : '❓';
                const isPastDue = a.dueDate && new Date(a.dueDate) < new Date();

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    <Card className={`border-l-4 ${typeColor} hover:shadow-lg transition-all duration-200 group`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{typeIcon}</span>
                              <h4 className="font-semibold truncate">{a.title}</h4>
                              <Badge variant={a.isPublished ? 'default' : 'secondary'} className="shrink-0">
                                {a.isPublished ? 'Published' : 'Draft'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                              <span className="capitalize font-medium">{a.type}</span>
                              <span>{a.totalPoints} pts</span>
                              <span>Passing: {a.passingScore}%</span>
                              <span>{a.questions?.length ?? 0} questions</span>
                              {a.dueDate && (
                                <span className={isPastDue ? 'text-red-500 font-medium' : ''}>
                                  {isPastDue ? 'Past due' : 'Due'}: {new Date(a.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Link href={`/dashboard/teacher/assessments/${a.id}`}>
                              <Button variant="outline" size="sm">View</Button>
                            </Link>
                            <Link href={`/dashboard/teacher/assessments/${a.id}/edit`}>
                              <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteAssessment(a.id)}>Delete</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
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

        {/* Class Record Tab */}
        <TabsContent value="class-record" className="space-y-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Quarter selector */}
            <div className="flex gap-2 items-center flex-wrap">
              {QUARTERS.map((q) => {
                const record = classRecords.find((r) => r.gradingPeriod === q);
                if (record) {
                  return (
                    <Button
                      key={q}
                      variant={selectedRecord?.id === record.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedRecord(record)}
                    >
                      {q}
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {record.status}
                      </Badge>
                    </Button>
                  );
                }
                return (
                  <Button
                    key={q}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateQuarter(q)}
                    disabled={generatingQuarter}
                  >
                    + {q}
                  </Button>
                );
              })}
            </div>

            {!selectedRecord && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No class record yet. Click a quarter button above to generate one.
                </CardContent>
              </Card>
            )}

            {/* Spreadsheet Header Info */}
            {spreadsheet && (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quarter: </span>
                        <strong>{spreadsheet.header.quarter}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Grade &amp; Section: </span>
                        <strong>
                          {spreadsheet.header.gradeLevel && `Grade ${spreadsheet.header.gradeLevel} - `}
                          {spreadsheet.header.section || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subject: </span>
                        <strong>{spreadsheet.header.subject || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teacher: </span>
                        <strong>{spreadsheet.header.teacher || '—'}</strong>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      {selectedRecord?.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={handleFinalizeRecord}>
                          Finalize Quarter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Spreadsheet Grid */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/70">
                            <th
                              className="sticky left-0 z-20 bg-muted/70 border px-2 py-1.5 text-left font-semibold min-w-[180px]"
                              rowSpan={3}
                            >
                              Learner&apos;s Name
                            </th>
                            {spreadsheet.categories.map((cat) => (
                              <th
                                key={cat.id}
                                colSpan={cat.items.length + 3}
                                className="border px-2 py-1.5 text-center font-semibold bg-muted/50"
                              >
                                {cat.name} ({cat.weight}%)
                              </th>
                            ))}
                            <th colSpan={2} className="border px-2 py-1.5 text-center font-semibold bg-muted/50">
                              Grades
                            </th>
                          </tr>
                          <tr className="bg-muted/40">
                            {spreadsheet.categories.map((cat) => (
                              <Fragment key={`header-${cat.id}`}>
                                {cat.items.map((item) => (
                                  <th key={item.id} className="border px-1.5 py-1 text-center font-medium min-w-[50px]">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span>{item.title}</span>
                                      {item.assessmentId && selectedRecord?.status === 'draft' && (
                                        <button
                                          title="Sync scores from assessment"
                                          onClick={() => handleSyncItem(item.id)}
                                          disabled={syncingItemId === item.id}
                                          className="text-[9px] text-indigo-500 hover:text-indigo-700 disabled:opacity-50 leading-none"
                                        >
                                          {syncingItemId === item.id ? '⟳' : '⇄ sync'}
                                        </button>
                                      )}
                                    </div>
                                  </th>
                                ))}
                                <th key={`${cat.id}-total`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[50px]">Total</th>
                                <th key={`${cat.id}-ps`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[40px]">PS</th>
                                <th key={`${cat.id}-ws`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[40px]">WS</th>
                              </Fragment>
                            ))}
                            <th className="border px-1.5 py-1 text-center font-medium bg-yellow-50 min-w-[50px]">IG</th>
                            <th className="border px-1.5 py-1 text-center font-medium bg-green-50 min-w-[50px]">QG</th>
                          </tr>
                          <tr className="bg-amber-50/50">
                            {spreadsheet.categories.map((cat) => (
                              <Fragment key={`hps-${cat.id}`}>
                                {cat.items.map((item) => (
                                  <td key={`hps-${item.id}`} className="border px-1.5 py-1 text-center font-semibold text-amber-700">
                                    {item.hps ?? ''}
                                  </td>
                                ))}
                                <td key={`hps-total-${cat.id}`} className="border px-1.5 py-1 text-center font-semibold text-amber-700">
                                  {cat.items.reduce((s, i) => s + (i.hps || 0), 0) || ''}
                                </td>
                                <td key={`hps-ps-${cat.id}`} className="border px-1.5 py-1 text-center">—</td>
                                <td key={`hps-ws-${cat.id}`} className="border px-1.5 py-1 text-center">—</td>
                              </Fragment>
                            ))}
                            <td className="border px-1.5 py-1 text-center">—</td>
                            <td className="border px-1.5 py-1 text-center">—</td>
                          </tr>
                        </thead>
                        <tbody>
                          {spreadsheet.students.map((student) => (
                            <tr key={student.studentId} className="hover:bg-muted/20">
                              <td className="sticky left-0 z-10 bg-white border px-2 py-1.5 font-medium whitespace-nowrap">
                                {student.lastName}, {student.firstName}
                              </td>
                              {spreadsheet.categories.map((cat, catIdx) => {
                                const catData = student.categories[catIdx];
                                return (
                                  <Fragment key={`${student.studentId}-${cat.id}`}>
                                    {cat.items.map((item, itemIdx) => {
                                      const score = catData?.scores[itemIdx];
                                      const isEditing =
                                        editingCell?.itemId === item.id &&
                                        editingCell?.studentId === student.studentId;
                                      return (
                                        <td
                                          key={`${student.studentId}-${item.id}`}
                                          className={`border px-1 py-0.5 text-center cursor-pointer hover:bg-blue-50 ${
                                            item.assessmentId ? 'bg-indigo-50/30' : ''
                                          }`}
                                          onClick={() =>
                                            handleCellClick(item.id, student.studentId, score ?? null)
                                          }
                                        >
                                          {isEditing ? (
                                            <Input
                                              ref={editRef}
                                              type="number"
                                              min={0}
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onBlur={handleCellSave}
                                              onKeyDown={handleCellKeyDown}
                                              className="h-6 w-14 text-xs text-center p-0 border-0 focus-visible:ring-1"
                                            />
                                          ) : (
                                            <span className={score == null ? 'text-muted-foreground' : ''}>
                                              {score ?? ''}
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td key={`${student.studentId}-total-${cat.id}`} className="border px-1 py-0.5 text-center font-medium bg-blue-50/50">
                                      {catData?.total != null ? catData.total.toFixed(1) : ''}
                                    </td>
                                    <td key={`${student.studentId}-ps-${cat.id}`} className="border px-1 py-0.5 text-center bg-blue-50/50">
                                      {catData?.ps != null ? catData.ps.toFixed(1) : ''}
                                    </td>
                                    <td key={`${student.studentId}-ws-${cat.id}`} className="border px-1 py-0.5 text-center bg-blue-50/50">
                                      {catData?.ws != null ? catData.ws.toFixed(2) : ''}
                                    </td>
                                  </Fragment>
                                );
                              })}
                              <td className="border px-1 py-0.5 text-center font-medium bg-yellow-50/50">
                                {student.initialGrade != null ? student.initialGrade.toFixed(2) : ''}
                              </td>
                              <td
                                className={`border px-1 py-0.5 text-center font-bold ${
                                  student.quarterlyGrade != null
                                    ? student.quarterlyGrade >= 75
                                      ? 'text-green-700 bg-green-50'
                                      : 'text-red-700 bg-red-50'
                                    : ''
                                }`}
                              >
                                {student.quarterlyGrade != null ? student.quarterlyGrade : ''}
                              </td>
                            </tr>
                          ))}
                          {spreadsheet.students.length === 0 && (
                            <tr>
                              <td
                                colSpan={
                                  1 +
                                  spreadsheet.categories.reduce((s, c) => s + c.items.length + 3, 0) +
                                  2
                                }
                                className="px-4 py-8 text-center text-muted-foreground"
                              >
                                No students enrolled in this class.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
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
          <DialogHeader>
            <DialogTitle>Create Lesson</DialogTitle>
            <DialogDescription>
              Add a lesson title and optional summary before opening the editor.
            </DialogDescription>
          </DialogHeader>
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

      {/* Create Assessment Modal removed — create-and-redirect flow instead */}

      {/* Add Students Modal */}
      <Dialog open={showAddStudents} onOpenChange={setShowAddStudents}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Students</DialogTitle>
            <DialogDescription>
              Enroll students who already belong to this class section.
            </DialogDescription>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Post a class announcement for enrolled students.
            </DialogDescription>
          </DialogHeader>
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
