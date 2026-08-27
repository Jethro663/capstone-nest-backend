'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Calendar, Hash, Megaphone, Pencil, Pin, Plus, Trash2, User2 } from 'lucide-react';
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
import { normalizeRichText, sanitizeRichTextHtml } from '@/lib/rich-text';
import { toast } from 'sonner';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

type AnnouncementViewFilter = 'all' | 'pinned';

const ANNOUNCEMENT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

function formatAnnouncementDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', ANNOUNCEMENT_DATE_OPTIONS);
}

function summarizeAnnouncement(content: string) {
  const text = normalizeRichText(content)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return 'Open this announcement to view the full class update.';
  }

  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function toTimestamp(value?: string) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export default function TeacherAnnouncementsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get('classId');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [latestCreatedAt, setLatestCreatedAt] = useState<string | null>(null);
  const [failedPage, setFailedPage] = useState<number | null>(null);
  const feedRequestId = useRef(0);

  const [showComposer, setShowComposer] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinningAnnouncementId, setPinningAnnouncementId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [viewFilter, setViewFilter] = useState<AnnouncementViewFilter>('all');

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

  const fetchAnnouncements = useCallback(async (page = 1, append = false) => {
    const requestId = ++feedRequestId.current;
    if (append) {
      setLoadingMore(true);
    } else {
      setFeedLoading(true);
    }
    try {
      const response = await announcementService.getTeacherFeed({
        page,
        limit: 20,
        ...(selectedClassId ? { classId: selectedClassId } : {}),
      });
      if (requestId !== feedRequestId.current) return;
      const incoming = Array.isArray(response.data.items) ? response.data.items : [];
      setAnnouncements((current) => {
        if (!append) return incoming;
        const byId = new Map(current.map((item) => [item.id, item]));
        incoming.forEach((item) => byId.set(item.id, item));
        return Array.from(byId.values());
      });
      setFeedPage(response.data.page);
      setTotalPages(response.data.totalPages);
      setTotalAnnouncements(response.data.total);
      setPinnedCount(response.data.pinnedTotal);
      setLatestCreatedAt(response.data.latestCreatedAt);
      setFailedPage(null);
    } catch {
      if (requestId !== feedRequestId.current) return;
      if (!append) {
        setAnnouncements([]);
        setTotalAnnouncements(0);
        setPinnedCount(0);
        setLatestCreatedAt(null);
      }
      setFailedPage(page);
    } finally {
      if (requestId === feedRequestId.current) {
        if (append) {
          setLoadingMore(false);
        } else {
          setFeedLoading(false);
        }
      }
    }
  }, [selectedClassId]);

  useEffect(() => {
    setAnnouncements([]);
    setFeedPage(1);
    setTotalPages(1);
    setFailedPage(null);
    void fetchAnnouncements(1, false);
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

  const filteredAnnouncements = useMemo(
    () =>
      sortedAnnouncements.filter((announcement) => {
        if (viewFilter === 'pinned' && !announcement.isPinned) return false;
        return true;
      }),
    [sortedAnnouncements, viewFilter],
  );

  const latestAnnouncementDate = latestCreatedAt
    ? formatAnnouncementDate(latestCreatedAt)
    : 'No posts yet';
  const hasActiveFilters = viewFilter !== 'all';

  const resetComposer = () => {
    setShowComposer(false);
    setEditingAnnouncementId(null);
    setEditingClassId(null);
    setTitle('');
    setContentHtml('');
    setPinned(false);
  };

  const openComposer = () => {
    setEditingAnnouncementId(null);
    setEditingClassId(null);
    setTitle('');
    setContentHtml('');
    setPinned(false);
    setShowComposer(true);
  };

  const handleEdit = (announcement: Announcement) => {
    if (announcement.canEdit !== true) {
      showProtectedAction(announcement, 'edited');
      return;
    }
    setEditingAnnouncementId(announcement.id);
    setEditingClassId(announcement.classId);
    setTitle(announcement.title);
    setContentHtml(normalizeRichText(announcement.content));
    setPinned(Boolean(announcement.isPinned));
    setShowComposer(true);
  };

  const handleSave = async () => {
    const safeTitle = title.trim();
    const safeContent = sanitizeRichTextHtml(contentHtml).trim();
    const targetClassId = editingAnnouncementId ? editingClassId : selectedClassId;
    if (!targetClassId || !safeTitle || !safeContent || saving) return;

    try {
      setSaving(true);
      if (editingAnnouncementId) {
        await announcementService.update(targetClassId, editingAnnouncementId, {
          title: safeTitle,
          content: safeContent,
          isPinned: pinned,
        });
        toast.success('Announcement updated');
      } else {
        await announcementService.create(targetClassId, {
          title: safeTitle,
          content: safeContent,
          isPinned: pinned,
        });
        toast.success('Announcement posted');
      }

      resetComposer();
      await fetchAnnouncements(1, false);
    } catch {
      toast.error(editingAnnouncementId ? 'Failed to update announcement' : 'Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    if (announcement.canEdit !== true) {
      showProtectedAction(announcement, 'changed');
      return;
    }
    if (pinningAnnouncementId) return;

    const nextPinned = !announcement.isPinned;
    try {
      setPinningAnnouncementId(announcement.id);
      await announcementService.update(announcement.classId, announcement.id, {
        isPinned: nextPinned,
      });
      setAnnouncements((prev) =>
        prev.map((entry) =>
          entry.id === announcement.id
            ? { ...entry, isPinned: nextPinned, updatedAt: new Date().toISOString() }
            : entry,
        ),
      );
      setPinnedCount((current) => Math.max(0, current + (nextPinned ? 1 : -1)));
      toast.success(nextPinned ? 'Announcement pinned' : 'Announcement unpinned');
    } catch {
      toast.error('Failed to update pin status');
    } finally {
      setPinningAnnouncementId(null);
    }
  };

  const handleDelete = (announcement: Announcement) => {
    if (announcement.canDelete !== true) {
      showProtectedAction(announcement, 'deleted');
      return;
    }
    const announcementClass = announcement.class ?? selectedClass;
    setConfirmation({
      title: 'Delete announcement?',
      description: 'This removes the post from the class bulletin board for students immediately.',
      confirmLabel: 'Delete Announcement',
      tone: 'danger',
      details: (
        <p className="text-sm">
          <span className="font-black text-[var(--teacher-text-strong)]">{announcement.title}</span>
          {' '}will be removed from {announcementClass?.subjectName ?? 'this class'}.
        </p>
      ),
      onConfirm: async () => {
        try {
          await announcementService.delete(announcement.classId, announcement.id);
          toast.success('Deleted');
          await fetchAnnouncements(1, false);
        } catch {
          toast.error('Failed to delete');
        }
      },
    });
  };

  function showProtectedAction(
    announcement: Announcement,
    action: 'edited' | 'changed' | 'deleted',
  ) {
    const message = announcement.restrictionReason === 'core_template'
      ? `This administrator-managed announcement cannot be ${action}.`
      : `Only the original author can have this announcement ${action}.`;
    toast.error(message);
  }

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
              <p>Keep class updates structured with fast scanning and side metadata.</p>
            </div>
          </div>
          <div className="teacher-announcements-header__actions">
            <Button
              className="teacher-announcements-header__create"
              disabled={!selectedClassId}
              onClick={openComposer}
            >
              <Plus className="h-4 w-4" />
              Create Announcement
            </Button>
          </div>
          <div className="teacher-announcements-header__stats">
            <article className="teacher-announcements-header__stat">
              <p>Total posts</p>
              <strong>{totalAnnouncements}</strong>
            </article>
            <article className="teacher-announcements-header__stat">
              <p>Pinned</p>
              <strong>{pinnedCount}</strong>
            </article>
            <article className="teacher-announcements-header__stat">
              <p>Latest</p>
              <strong>{latestAnnouncementDate}</strong>
            </article>
            <article className="teacher-announcements-header__stat">
              <p>Active class</p>
              <strong>{selectedClass?.subjectName || 'All Classes'}</strong>
            </article>
          </div>
        </section>

      <section className="teacher-announcements-body">
        <div className="teacher-announcements-toolbar">
          <p>
            Showing <strong>{filteredAnnouncements.length}</strong> of{' '}
            <strong>{totalAnnouncements}</strong> announcements.
          </p>

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

          <div className="teacher-announcements-toolbar__controls">
            <div
              className="teacher-announcements-toolbar__toggle-group"
              role="group"
              aria-label="Announcement visibility filter"
            >
              <button
                type="button"
                data-active={viewFilter === 'all'}
                onClick={() => setViewFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                data-active={viewFilter === 'pinned'}
                onClick={() => setViewFilter('pinned')}
              >
                <Pin className="h-3.5 w-3.5" />
                Pinned
              </button>
            </div>
          </div>
        </div>

        {feedLoading ? (
          <div className="teacher-announcements-empty">
            <p>Loading announcements...</p>
          </div>
        ) : failedPage === 1 ? (
          <div className="teacher-announcements-empty">
            <div className="space-y-3">
              <p>Announcements could not be loaded.</p>
              <Button onClick={() => void fetchAnnouncements(1, false)}>Retry</Button>
            </div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="teacher-announcements-empty">
            <div className="space-y-3">
              <p>
                {announcements.length === 0
                  ? selectedClassId
                    ? 'No announcements for this class yet.'
                    : 'No announcements across your classes yet.'
                  : hasActiveFilters
                    ? 'No announcements match your current filter.'
                    : 'No announcements for this class yet.'}
              </p>
              {hasActiveFilters ? (
                <Button className="teacher-announcements-header__create" onClick={() => setViewFilter('all')}>
                  Show all announcements
                </Button>
              ) : null}
              {selectedClassId ? (
                <Button className="teacher-announcements-header__create" onClick={openComposer}>
                  Create First Announcement
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="teacher-announcements-list">
            {filteredAnnouncements.map((announcement) => (
              <article
                key={announcement.id}
                className={`teacher-announcements-item ${announcement.isPinned ? 'teacher-announcements-item--pinned' : ''}`}
              >
                <div className="teacher-announcements-item__layout">
                  <div className="teacher-announcements-item__main">
                    <header className="teacher-announcements-item__headline">
                      <div className="teacher-announcements-item__headline-top">
                        <h2>{announcement.title}</h2>
                        {announcement.isPinned ? (
                          <span className="teacher-announcements-item__pin-label">
                            <Pin className="h-3.5 w-3.5" />
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="teacher-announcements-item__summary">
                        {summarizeAnnouncement(announcement.content)}
                      </p>
                    </header>

                    <section className="teacher-announcements-item__segment">
                      <p className="teacher-announcements-item__segment-label">Announcement details</p>
                      <RichTextRenderer
                        html={normalizeRichText(announcement.content)}
                        className="teacher-announcements-item__content"
                      />
                    </section>
                  </div>

                  <aside
                    className="teacher-announcements-item__side"
                    aria-label={`Announcement metadata for ${announcement.title}`}
                  >
                    <p className="teacher-announcements-item__side-title">Quick actions</p>
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

                    <p className="teacher-announcements-item__side-title">Quick details</p>
                    <dl className="teacher-announcements-item__facts">
                      <div className="teacher-announcements-item__fact">
                        <dt>
                          <Calendar className="h-3.5 w-3.5" />
                          Date
                        </dt>
                        <dd>{formatAnnouncementDate(announcement.createdAt)}</dd>
                      </div>
                      <div className="teacher-announcements-item__fact">
                        <dt>
                          <BookOpen className="h-3.5 w-3.5" />
                          Subject
                        </dt>
                        <dd>{announcement.class?.subjectName || selectedClass?.subjectName || 'Class announcement'}</dd>
                      </div>
                      <div className="teacher-announcements-item__fact">
                        <dt>
                          <Hash className="h-3.5 w-3.5" />
                          Subject code
                        </dt>
                        <dd>{announcement.class?.subjectCode || selectedClass?.subjectCode || 'Not set'}</dd>
                      </div>
                      <div className="teacher-announcements-item__fact">
                        <dt>
                          <User2 className="h-3.5 w-3.5" />
                          Section
                        </dt>
                        <dd>{announcement.class?.section?.name || selectedClass?.section?.name || 'Not set'}</dd>
                      </div>
                      <div className="teacher-announcements-item__fact">
                        <dt>
                          <User2 className="h-3.5 w-3.5" />
                          Posted by
                        </dt>
                        <dd>
                          {announcement.author
                            ? `${announcement.author.firstName} ${announcement.author.lastName}`
                            : `${user?.firstName || 'Teacher'} ${user?.lastName || ''}`}
                        </dd>
                      </div>
                    </dl>
                  </aside>
                </div>
              </article>
            ))}
            {failedPage && failedPage > 1 ? (
              <Button onClick={() => void fetchAnnouncements(failedPage, true)}>Retry loading more</Button>
            ) : feedPage < totalPages ? (
              <Button disabled={loadingMore} onClick={() => void fetchAnnouncements(feedPage + 1, true)}>
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            ) : null}
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
