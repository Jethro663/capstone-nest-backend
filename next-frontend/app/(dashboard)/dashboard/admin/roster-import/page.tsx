'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { rosterImportService, type RosterImportPreview, type PendingImportRow, type CommitStudentRow, type CommitPendingRow } from '@/services/roster-import-service';
import { sectionService } from '@/services/section-service';
import type { Section } from '@/types/section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      const registered: CommitStudentRow[] = preview.registered.map((r) => ({
        userId: r.userId,
        lrn: r.lrn,
      }));
      const pendingRows: CommitPendingRow[] = preview.pending.map((p) => ({
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        lrn: p.lrn,
      }));
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roster Import</h1>
        <p className="text-muted-foreground">Upload a CSV file to bulk-import students into a section</p>
      </div>

      {/* Section selector + Upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upload File</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Section</Label>
            <select
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); setPreview(null); }}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select a section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (Grade {s.gradeLevel})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="text-sm" />
            <Button onClick={handleUpload} disabled={uploading || !sectionId}>
              {uploading ? 'Uploading...' : 'Upload & Preview'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Preview — {preview.sectionMatch.name} (Grade {preview.sectionMatch.gradeLevel})
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="default">{preview.summary.registered} registered</Badge>
                <Badge variant="secondary">{preview.summary.pending} pending</Badge>
                {preview.summary.errors > 0 && <Badge variant="destructive">{preview.summary.errors} errors</Badge>}
                <Button size="sm" onClick={handleCommit} disabled={committing || preview.summary.registered + preview.summary.pending === 0}>
                  {committing ? 'Committing...' : 'Commit Import'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
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
                    <TableRow key={`err-${e.rowNumber}`} className="bg-red-50">
                      <TableCell>{e.rowNumber}</TableCell>
                      <TableCell colSpan={2} className="text-muted-foreground">{e.email || '—'}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell><Badge variant="destructive">Error</Badge></TableCell>
                      <TableCell className="text-xs text-red-600">{e.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending rows for selected section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pending Import Rows</CardTitle></CardHeader>
        <CardContent>
          {!sectionId ? (
            <p className="text-sm text-muted-foreground text-center py-4">Select a section to view pending rows.</p>
          ) : loading ? (
            <Skeleton className="h-24 rounded" />
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending import rows for this section.</p>
          ) : (
            <Table>
              <TableHeader>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
