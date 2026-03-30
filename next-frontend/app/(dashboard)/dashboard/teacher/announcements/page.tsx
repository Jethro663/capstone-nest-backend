'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Megaphone, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { announcementService } from '@/services/announcement-service';
import { classService } from '@/services/class-service';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { plainTextToRichHtml, sanitizeRichTextHtml } from '@/lib/rich-text';
import { toast } from 'sonner';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

function toTimestamp(value?: string) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function announcementContentToHtml(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return plainTextToRichHtml(trimmed);
}

export default function TeacherAnnouncementsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get('classId');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [showComposer, setShowComposer] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinningAnnouncementId, setPinningAnnouncementId] = useState<string | null>(null);
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

    void fetchClasses();
  }, [user?.id]);

  useEffect(() => {
    if (!initialClassId || selectedClassId) return;
    const exists = classes.some((classItem) => classItem.id === initialClassId);
    if (exists) {
      setSelectedClassId(initialClassId);
    }
  }, [classes, initialClassId, selectedClassId]);

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
    void fetchAnnouncements();
  }, [fetchAnnouncements]);

  const selectedClass = useMemo(
    () => classes.find((course) => course.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const sortedAnnouncements = useMemo(
    () =>
      [...announcements].sort((left, right) => {
        if (left.isPinned !== right.isPinned) {
          return Number(right.isPinned) - Number(left.isPinned);
        }
        return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
      }),
    [announcements],
  );

  const resetComposer = () => {
    setShowComposer(false);
    setEditingAnnouncementId(null);
    setTitle('');
    setContentHtml('');
    setPinned(false);
  };

  const openComposer = () => {
    setEditingAnnouncementId(null);
    setTitle('');
    setContentHtml('');
    setPinned(false);
    setShowComposer(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setTitle(announcement.title);
    setContentHtml(announcementContentToHtml(announcement.content));
    setPinned(Boolean(announcement.isPinned));
    setShowComposer(true);
  };

  const handleSave = async () => {
    const safeTitle = title.trim();
    const safeContent = sanitizeRichTextHtml(contentHtml).trim();
    if (!selectedClassId || !safeTitle || !safeContent || saving) return;

    try {
      setSaving(true);
      if (editingAnnouncementId) {
        await announcementService.update(selectedClassId, editingAnnouncementId, {
          title: safeTitle,
          content: safeContent,
          isPinned: pinned,
        });
        toast.success('Announcement updated');
      } else {
        await announcementService.create(selectedClassId, {
          title: safeTitle,
          content: safeContent,
          isPinned: pinned,
        });
        toast.success('Announcement posted');
      }

      resetComposer();
      await fetchAnnouncements();
    } catch {
      toast.error(editingAnnouncementId ? 'Failed to update announcement' : 'Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    if (!selectedClassId || pinningAnnouncementId) return;

    const nextPinned = !announcement.isPinned;
    try {
      setPinningAnnouncementId(announcement.id);
      await announcementService.update(selectedClassId, announcement.id, {
        isPinned: nextPinned,
      });
      setAnnouncements((prev) =>
        prev.map((entry) =>
          entry.id === announcement.id
            ? { ...entry, isPinned: nextPinned, updatedAt: new Date().toISOString() }
            : entry,
        ),
      );
      toast.success(nextPinned ? 'Announcement pinned' : 'Announcement unpinned');
    } catch {
      toast.error('Failed to update pin status');
    } finally {
      setPinningAnnouncementId(null);
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
          <span className="font-black text-[var(--teacher-text-strong)]">{announcement.title}</span>
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
      <div className="space-y-5">
        <Skeleton className="h-32 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-announcements-page space-y-5">
      <section className="teacher-announcements-header">
        <div className="teacher-announcements-header__copy">
          <span className="teacher-announcements-header__icon" aria-hidden="true">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <h1>Announcements</h1>
            <p>Post updates to your classes</p>
          </div>
        </div>
        <Button
          className="teacher-announcements-header__create"
          disabled={!selectedClassId}
          onClick={openComposer}
        >
          <Plus className="h-4 w-4" />
          Create Announcement
        </Button>
      </section>

      <section className="teacher-announcements-body">
        <div className="teacher-announcements-toolbar">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-announcements-select"
          >
            <option value="">All Classes</option>
            {classes.map((course) => (
              <option key={course.id} value={course.id}>
                {course.subjectName} - {course.section?.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedClassId ? (
          <div className="teacher-announcements-empty">
            <p>Select a class to load announcements.</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="teacher-announcements-empty">
            <div className="space-y-3">
              <p>No announcements for this class yet.</p>
              <Button className="teacher-announcements-header__create" onClick={openComposer}>
                Create First Announcement
              </Button>
            </div>
          </div>
        ) : (
          <div className="teacher-announcements-list">
            {sortedAnnouncements.map((announcement) => (
              <article
                key={announcement.id}
                className={`teacher-announcements-item ${announcement.isPinned ? 'teacher-announcements-item--pinned' : ''}`}
              >
                <div className="teacher-announcements-item__main">
                  <div className="teacher-announcements-item__title-row">
                    <h2>{announcement.title}</h2>
                    <div className="teacher-announcements-item__meta">
                      {announcement.isPinned ? (
                        <span className="teacher-announcements-item__pin-label">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </span>
                      ) : null}
                      <span>{new Date(announcement.createdAt || '').toLocaleDateString()}</span>
                      <span>{selectedClass?.subjectName}</span>
                    </div>
                  </div>
                  <RichTextRenderer
                    html={announcementContentToHtml(announcement.content)}
                    className="teacher-announcements-item__content"
                  />
                  <p className="teacher-announcements-item__author">
                    {announcement.author?.firstName || user?.firstName || 'Teacher'} {announcement.author?.lastName || user?.lastName || ''}
                  </p>
                </div>
                <div className="teacher-announcements-item__actions">
                  <Button
                    variant="outline"
                    size="sm"
                    className="teacher-announcements-action"
                    onClick={() => void handleTogglePin(announcement)}
                    disabled={pinningAnnouncementId === announcement.id}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {announcement.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="teacher-announcements-action"
                    onClick={() => handleEdit(announcement)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="teacher-announcements-action teacher-announcements-action--danger"
                    onClick={() => handleDelete(announcement)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={showComposer} onOpenChange={(open) => !open && resetComposer()}>
        <DialogContent className="teacher-announcements-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-[var(--teacher-text-strong)]">
              {editingAnnouncementId ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[var(--teacher-text-strong)]">Title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="teacher-input"
                placeholder="Quarter 3 Exams Schedule"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[var(--teacher-text-strong)]">Content</Label>
              <RichTextEditor
                value={contentHtml}
                onChange={setContentHtml}
                placeholder="Write announcement content..."
                minHeight={170}
              />
            </div>

            <label className="teacher-announcements-dialog__pin-toggle">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(event) => setPinned(event.target.checked)}
              />
              Pin this announcement
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" className="teacher-button-outline rounded-lg font-bold" onClick={resetComposer}>
              Cancel
            </Button>
            <Button
              className="teacher-button-solid rounded-lg font-bold"
              onClick={() => void handleSave()}
              disabled={!title.trim() || !sanitizeRichTextHtml(contentHtml).trim() || saving}
            >
              {saving ? (editingAnnouncementId ? 'Saving...' : 'Posting...') : (editingAnnouncementId ? 'Save Changes' : 'Post Announcement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
