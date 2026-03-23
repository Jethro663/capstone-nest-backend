'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Megaphone, Pin, Sparkles } from 'lucide-react';
import { announcementService } from '@/services/announcement-service';
import { classService } from '@/services/class-service';
import { useAuth } from '@/providers/AuthProvider';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
 
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { toast } from 'sonner';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

export default function TeacherAnnouncementsPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.id) return;

      try {
        const response = await classService.getByTeacher(user.id);
        setClasses(response.data || []);
      } catch {
        setClasses([]);
      }

      setLoading(false);
    };

    fetchClasses();
  }, [user?.id]);

  const fetchAnnouncements = useCallback(async () => {
    if (!selectedClassId) {
      setAnnouncements([]);
      return;
    }

    try {
      const response = await announcementService.getByClass(selectedClassId);
      setAnnouncements(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAnnouncements([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    const run = async () => {
      await fetchAnnouncements();
    };

    void run();
  }, [fetchAnnouncements]);

  const selectedClass = useMemo(
    () => classes.find((course) => course.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setTitle(announcement.title);
    setContent(announcement.content);
    setShowCreate(true);
  };

  const resetDialog = () => {
    setShowCreate(false);
    setEditingAnnouncementId(null);
    setTitle('');
    setContent('');
  };

  const handleSave = async () => {
 
    if (!selectedClassId || !title.trim() || !content.trim()) return;

    try {
      if (editingAnnouncementId) {
        await announcementService.update(selectedClassId, editingAnnouncementId, {
          title,
          content,
        });
        toast.success('Announcement updated');
      } else {
        await announcementService.create(selectedClassId, { title, content });
        toast.success('Announcement posted');
      }

      resetDialog();
 
      fetchAnnouncements();
    } catch {
      toast.error('Failed to create announcement');
    }
  };

  const handleDelete = (announcement: Announcement) => {
    setConfirmation({
      title: 'Delete announcement?',
      description: 'This removes the post from the class bulletin board for students immediately.',
      confirmLabel: 'Delete Announcement',
      tone: 'danger',
      details: (
        <p className="text-sm">
          <span className="font-black text-[var(--student-text-strong)]">{announcement.title}</span>
          {' '}will be removed from {selectedClass?.subjectName ?? 'this class'}.
        </p>
      ),
      onConfirm: async () => {
        try {
          await announcementService.delete(selectedClassId, announcement.id);
          toast.success('Deleted');
          setAnnouncements((prev) => prev.filter((entry) => entry.id !== announcement.id));
        } catch {
          toast.error('Failed to delete');
        }
      },
    });
  };

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
      badge="Teacher Announcements"
      title="Class Updates That Feel Easier to Manage"
      description="Choose a class, post clearly, and keep important updates visible in a calmer bulletin-style workspace."
      actions={(
        <>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select min-w-[18rem] text-sm font-semibold"
          >
            <option value="">Select a class...</option>
            {classes.map((course) => (
              <option key={course.id} value={course.id}>
                {course.subjectName} â€” {course.section?.name}
              </option>
            ))}
          </select>
          <Button
            className="teacher-button-solid rounded-xl px-4 font-black"
            disabled={!selectedClassId}
            onClick={() => {
              setEditingAnnouncementId(null);
              setTitle('');
              setContent('');
              setShowCreate(true);
            }}
          >
            New Announcement
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Classes"
            value={classes.length}
            caption="Available for announcement posting"
            icon={Megaphone}
            accent="sky"
          />
          <TeacherStatCard
            label="Visible Posts"
            value={announcements.length}
            caption={selectedClass ? `For ${selectedClass.subjectName}` : 'Select a class to view posts'}
            icon={BellRing}
            accent="teal"
          />
          <TeacherStatCard
            label="Pinned"
            value={announcements.filter((announcement) => announcement.isPinned).length}
            caption="Pinned items stay visually prominent"
            icon={Pin}
            accent="amber"
          />
          <TeacherStatCard
            label="Posting Flow"
            value={selectedClassId ? 'Ready' : 'Waiting'}
            caption={selectedClassId ? 'Class selected for posting' : 'Choose a class first'}
            icon={Sparkles}
            accent="rose"
          />
        </>
      )}
    >
      <TeacherSectionCard
        title="Bulletin Board"
        description="Announcements are grouped by class and styled to surface the title, message, pinned status, and quick actions more clearly."
      >
        {!selectedClassId ? (
          <TeacherEmptyState
            title="Select a class to begin"
            description="Choose one of your classes above to load its announcements and open the posting dialog."
          />
        ) : announcements.length === 0 ? (
          <TeacherEmptyState
            title="No announcements for this class yet"
            description="Your first post for this class will appear here as a more polished bulletin card once it is created."
            action={(
              <Button
                className="teacher-button-solid rounded-xl px-4 font-black"
                onClick={() => {
                  setEditingAnnouncementId(null);
                  setTitle('');
                  setContent('');
                  setShowCreate(true);
                }}
              >
                Create First Announcement
              </Button>
            )}
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`teacher-announcement-card ${announcement.isPinned ? 'teacher-announcement-card--pinned' : ''}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {announcement.isPinned ? (
                        <Badge variant="outline" className="teacher-badge px-2 py-0 text-[10px] font-black">
                          <Pin className="mr-1 h-3 w-3" />
                          PINNED
                        </Badge>
                      ) : null}
                      <span className="teacher-dashboard-chip">
                        {new Date(announcement.createdAt || '').toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xl font-black tracking-tight text-[var(--teacher-text-strong)]">
                        {announcement.title}
                      </p>
                      <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[var(--teacher-text-muted)]">
                        {announcement.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={() => handleEdit(announcement)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDelete(announcement)}
                    >
                      Delete
                    </Button>
                  </div>
 
                </div>
              </div>
            ))}
          </div>
        )}
      </TeacherSectionCard>

      <Dialog open={showCreate} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="rounded-[1.8rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-[var(--teacher-text-strong)]">
              {editingAnnouncementId ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
          </DialogHeader>

 
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="teacher-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Content</Label>
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={5}
                className="teacher-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={resetDialog}>
              Cancel
            </Button>
            <Button
              className="teacher-button-solid rounded-xl font-black"
              onClick={handleSave}
              disabled={!title.trim() || !content.trim()}
            >
              {editingAnnouncementId ? 'Save Changes' : 'Post Announcement'}
            </Button>
 
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </TeacherPageShell>
  );
}

