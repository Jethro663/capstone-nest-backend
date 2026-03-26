'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ClipboardList, FileUp, School2, Users } from 'lucide-react';
import { rosterImportService, type RosterImportPreview, type PendingImportRow, type CommitStudentRow, type CommitPendingRow } from '@/services/roster-import-service';
import { sectionService } from '@/services/section-service';
import type { Section } from '@/types/section';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function RosterImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [pending, setPending] = useState<PendingImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    sectionService.getAll().then((res) => setSections(res.data || [])).catch(() => {});
  }, []);

  const fetchPending = useCallback(async () => {
    if (!sectionId) { setPending([]); return; }
    try {
      setLoading(true);
      const res = await rosterImportService.getPending(sectionId);
      setPending(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !sectionId) {
      toast.error('Select a section and file first');
      return;
    }
    try {
      setUploading(true);
      const res = await rosterImportService.preview(sectionId, file);
      setPreview(res.data);
      toast.success('File uploaded & previewed');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!sectionId || !preview) return;
    try {
      setCommitting(true);
      const registered: CommitStudentRow[] = preview.registered.map((r) => ({ userId: r.userId, lrn: r.lrn }));
      const pendingRows: CommitPendingRow[] = preview.pending.map((p) => ({ email: p.email, firstName: p.firstName, lastName: p.lastName, lrn: p.lrn }));
      await rosterImportService.commit(sectionId, { registered, pending: pendingRows });
      toast.success('Roster import committed');
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchPending();
    } catch {
      toast.error('Failed to commit import');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <AdminPageShell
      badge="Admin Roster Import"
      title="Roster Import"
      description="Upload a roster file, preview the match results, and resolve pending rows from one admin import flow."
      stats={(
        <>
          <AdminStatCard label="Sections" value={sections.length} caption="Available for roster import" icon={School2} accent="emerald" />
          <AdminStatCard label="Preview Rows" value={(preview?.registered.length ?? 0) + (preview?.pending.length ?? 0) + (preview?.errors.length ?? 0)} caption="Loaded in the current preview" icon={ClipboardList} accent="sky" />
          <AdminStatCard label="Pending Rows" value={pending.length} caption="Waiting for section resolution" icon={Users} accent="amber" />
          <AdminStatCard label="Import State" value={sectionId ? 'Ready' : 'Waiting'} caption={sectionId ? 'Section selected for import' : 'Choose a section first'} icon={FileUp} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Upload and Preview" description="Choose a section, upload your file, and move into preview without the old plain utility card.">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label>Section</Label>
            <select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPreview(null); }} className="admin-select w-full text-sm font-semibold">
              <option value="">Select a section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (Grade {s.gradeLevel})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Roster File</Label>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="admin-input w-full rounded-2xl px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <Button className="admin-button-solid rounded-xl px-4 font-black" onClick={handleUpload} disabled={uploading || !sectionId}>
              {uploading ? 'Uploading...' : 'Upload & Preview'}
            </Button>
          </div>
        </div>
      </AdminSectionCard>

      {preview ? (
        <AdminSectionCard
          title={`Preview — ${preview.sectionMatch.name} (Grade ${preview.sectionMatch.gradeLevel})`}
          description="Review the import results before committing. The import logic itself is unchanged."
          action={(
            <div className="admin-controls">
              <Badge variant="default">{preview.summary.registered} registered</Badge>
              <Badge variant="secondary">{preview.summary.pending} pending</Badge>
              {preview.summary.errors > 0 ? <Badge variant="destructive">{preview.summary.errors} errors</Badge> : null}
              <Button size="sm" className="admin-button-solid rounded-xl font-black" onClick={handleCommit} disabled={committing || preview.summary.registered + preview.summary.pending === 0}>
                {committing ? 'Committing...' : 'Commit Import'}
              </Button>
            </div>
          )}
        >
          <div className="admin-table-shell max-h-[32rem] overflow-auto">
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>LRN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.registered.map((r) => (
                  <TableRow key={`reg-${r.rowNumber}`}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell>{r.firstName} {r.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell>{r.lrn || '—'}</TableCell>
                    <TableCell><Badge variant="default">Registered</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.status}</TableCell>
                  </TableRow>
                ))}
                {preview.pending.map((p) => (
                  <TableRow key={`pen-${p.rowNumber}`}>
                    <TableCell>{p.rowNumber}</TableCell>
                    <TableCell>{p.firstName} {p.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell>{p.lrn || '—'}</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.reason}</TableCell>
                  </TableRow>
                ))}
                {preview.errors.map((e) => (
                  <TableRow key={`err-${e.rowNumber}`} className="bg-rose-50/60">
                    <TableCell>{e.rowNumber}</TableCell>
                    <TableCell colSpan={2} className="text-muted-foreground">{e.email || '—'}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell><Badge variant="destructive">Error</Badge></TableCell>
                    <TableCell className="text-xs text-rose-600">{e.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AdminSectionCard>
      ) : null}

      <AdminSectionCard title="Pending Import Rows" description="Keep track of unresolved import rows for the selected section in a stronger queue panel.">
        {!sectionId ? (
          <AdminEmptyState title="Select a section to view pending rows" description="The pending queue will load here as soon as a section is selected." />
        ) : loading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : pending.length === 0 ? (
          <AdminEmptyState title="No pending import rows" description="This section does not currently have unresolved imported student rows." />
        ) : (
          <div className="admin-table-shell">
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>LRN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell>{p.lrn || '—'}</TableCell>
                    <TableCell><Badge variant={p.status === 'resolved' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
