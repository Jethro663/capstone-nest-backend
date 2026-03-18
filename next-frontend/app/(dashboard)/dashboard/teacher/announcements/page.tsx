'use client';

import { useEffect, useState, useCallback } from 'react';
import { announcementService } from '@/services/announcement-service';
import { classService } from '@/services/class-service';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.id) return;
      try {
        const res = await classService.getByTeacher(user.id);
        setClasses(res.data || []);
      } catch {}
      setLoading(false);
    };
    fetchClasses();
  }, [user?.id]);

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
    const run = async () => {
      await fetchAnnouncements();
    };
    void run();
  }, [fetchAnnouncements]);

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
      toast.error(editingAnnouncementId ? 'Failed to update announcement' : 'Failed to create announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementService.delete(selectedClassId, id);
      toast.success('Deleted');
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-muted-foreground">Post announcements for your classes</p>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm min-w-[250px]"
        >
          <option value="">Select a class...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.subjectName} — {c.section?.name}</option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!selectedClassId}
          onClick={() => {
            setEditingAnnouncementId(null);
            setTitle('');
            setContent('');
            setShowCreate(true);
          }}
        >
          + New Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {selectedClassId ? 'No announcements for this class.' : 'Select a class to view announcements.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <Card key={ann.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{ann.title}</p>
                    {ann.isPinned && <Badge variant="secondary">📌 Pinned</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(ann)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(ann.id)}>Delete</Button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{ann.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(ann.createdAt!).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAnnouncementId ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
              {editingAnnouncementId ? 'Save Changes' : 'Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
