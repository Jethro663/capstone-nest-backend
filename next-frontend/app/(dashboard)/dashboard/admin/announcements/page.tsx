'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { BellRing, Megaphone, Pin, School2 } from 'lucide-react';
import { announcementService } from '@/services/announcement-service';
import { classService } from '@/services/class-service';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
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

export default function AdminAnnouncementsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await classService.getAll();
        setClasses(res.data?.data || []);
      } catch {}
      setLoading(false);
    };
    fetchClasses();
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!selectedClassId) { setAnnouncements([]); return; }
    try {
      const res = await announcementService.getByClass(selectedClassId);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAnnouncements([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAnnouncements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchAnnouncements]);

  const selectedClass = useMemo(
    () => classes.find((entry) => entry.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const handleCreate = async () => {
    if (!selectedClassId || !title.trim() || !content.trim()) return;
    try {
      await announcementService.create(selectedClassId, { title, content });
      toast.success('Announcement created');
      setShowCreate(false);
      setTitle('');
      setContent('');
      fetchAnnouncements();
    } catch {
      toast.error('Failed to create announcement');
    }
  };

  const handleDelete = (announcement: Announcement) => {
    setConfirmation({
      title: 'Delete announcement?',
      description: 'This removes the bulletin item from the selected class immediately.',
      confirmLabel: 'Delete Announcement',
      tone: 'danger',
      details: (
        <p className="text-sm">
          <span className="font-black text-[var(--student-text-strong)]">{announcement.title}</span>
          {' '}will be deleted for {selectedClass?.subjectName ?? 'this class'}.
        </p>
      ),
      onConfirm: async () => {
        try {
          await announcementService.delete(selectedClassId, announcement.id);
          toast.success('Announcement deleted');
          setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
        } catch {
          toast.error('Failed to delete');
        }
      },
    });
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-56 rounded-[1.9rem]" /><Skeleton className="h-64 rounded-[1.7rem]" /></div>;
  }

  return (
    <AdminPageShell
      badge="Admin Announcements"
      title="Platform Announcements"
      description="Manage class announcements in a more presentable bulletin workspace, while keeping the same create and delete flows behind the scenes."
      actions={(
        <>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="admin-select min-w-[18rem] text-sm font-semibold">
            <option value="">Select a class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.subjectName} — {c.section?.name}</option>
            ))}
          </select>
          <Button size="sm" className="admin-button-solid rounded-xl px-4 font-black" disabled={!selectedClassId} onClick={() => setShowCreate(true)}>
            New Announcement
          </Button>
        </>
      )}
      stats={(
        <>
          <AdminStatCard label="Classes" value={classes.length} caption="Available for announcement posting" icon={School2} accent="emerald" />
          <AdminStatCard label="Visible Posts" value={announcements.length} caption={selectedClass ? `For ${selectedClass.subjectName}` : 'Select a class to load posts'} icon={BellRing} accent="sky" />
          <AdminStatCard label="Pinned" value={announcements.filter((a) => a.isPinned).length} caption="Pinned posts stay prominent" icon={Pin} accent="amber" />
          <AdminStatCard label="Posting Flow" value={selectedClassId ? 'Ready' : 'Waiting'} caption={selectedClassId ? 'Class selected for posting' : 'Choose a class first'} icon={Megaphone} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Admin Bulletin Board" description="Announcements now read like a cleaner bulletin surface instead of a plain list of cards.">
        {!selectedClassId ? (
          <AdminEmptyState title="Select a class to begin" description="Choose a class above to load its announcements and open the posting dialog." />
        ) : announcements.length === 0 ? (
          <AdminEmptyState title="No announcements for this class yet" description="Create the first post and it will appear here in the upgraded bulletin layout." action={<Button className="admin-button-solid rounded-xl px-4 font-black" onClick={() => setShowCreate(true)}>Create Announcement</Button>} />
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="admin-grid-card">
                <div className="admin-grid-card__accent" />
                <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {ann.isPinned ? (
                        <Badge variant="outline" className="px-2 py-0 text-[10px] font-black">
                          <Pin className="mr-1 h-3 w-3" />
                          PINNED
                        </Badge>
                      ) : null}
                      <span className="admin-chip">{new Date(ann.createdAt!).toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black text-[var(--admin-text-strong)]">{ann.title}</p>
                      <p className="max-w-3xl text-sm leading-6 text-[var(--admin-text-muted)]">{ann.content}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(ann)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input" /></div>
            <div><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="admin-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="admin-button-solid rounded-xl font-black" onClick={handleCreate} disabled={!title.trim() || !content.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </AdminPageShell>
  );
}
