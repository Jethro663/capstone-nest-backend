'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  rosterImportService,
  type PendingImportRow,
  type RosterImportPreview,
  type RosterParsedName,
} from '@/services/roster-import-service';
import { sectionService } from '@/services/section-service';
import type { Section } from '@/types/section';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function formatFileLabel(file: File | null): string {
  if (!file) return 'Drop your CSV/Excel file here';
  return `${file.name} (${Math.max(file.size / 1_048_576, 0.01).toFixed(2)} MB)`;
}

function formatRosterName(name: RosterParsedName): string {
  return [name.firstName, name.middleInitial, name.lastName].filter(Boolean).join(' ');
}

function pendingRowName(row: PendingImportRow): string {
  return [row.firstName, row.middleInitial, row.lastName].filter(Boolean).join(' ');
}

export default function RosterImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [pending, setPending] = useState<PendingImportRow[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    sectionService
      .getAll()
      .then((response) => setSections(Array.isArray(response.data) ? response.data : []))
      .catch(() => setSections([]));
  }, []);

  const fetchPending = useCallback(async () => {
    if (!sectionId) {
      setPending([]);
      return;
    }
    try {
      setLoadingPending(true);
      const response = await rosterImportService.getPending(sectionId);
      setPending(response.data ?? []);
    } catch {
      setPending([]);
    } finally {
      setLoadingPending(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleUploadPreview = async () => {
    if (!sectionId || !selectedFile) {
      toast.error('Select a target section and a file first.');
      return;
    }

    try {
      setUploading(true);
      const response = await rosterImportService.preview(sectionId, selectedFile);
      setPreview(response.data);
      toast.success('Roster file uploaded and preview generated.');
    } catch {
      toast.error('Failed to upload and preview roster file.');
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!sectionId || !preview) return;

    try {
      setCommitting(true);
      await rosterImportService.commit(sectionId, {
        sectionId,
        enrolledRows: preview.registered.map((row) => ({
          userId: row.userId,
          name: row.name,
          lrn: row.lrn,
          email: row.email,
        })),
        pendingRows: preview.pending.map((row) => ({
          name: row.name,
          lrn: row.lrn,
          email: row.email,
        })),
      });
      toast.success('Roster import committed.');
      setPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchPending();
    } catch {
      toast.error('Failed to commit roster import.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <AdminPageShell
      badge="Admin Roster Import"
      title="Roster Import"
      description="Bulk import students from CSV/Excel files"
      icon={FileUp}
    >
      <AdminSectionCard title="Upload Roster File" description="Upload and preview a roster before committing section enrollment updates.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roster-target-section" className="admin-profile-label">
              Target Section
            </Label>
            <select
              id="roster-target-section"
              value={sectionId}
              onChange={(event) => {
                setSectionId(event.target.value);
                setPreview(null);
              }}
              className="admin-select w-full"
            >
              <option value="">Select a section...</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} (Grade {section.gradeLevel})
                </option>
              ))}
            </select>
          </div>

          <div
            className="admin-roster-dropzone"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) setSelectedFile(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <div className="admin-roster-dropzone-copy">
              <Upload className="h-8 w-8 text-[#b4c2d6]" />
              <p className="font-semibold text-[#4c6388]">{formatFileLabel(selectedFile)}</p>
              <p className="text-sm text-[#9fb0c9]">or click to browse</p>
            </div>
          </div>

          <Button
            className="admin-roster-upload-button"
            onClick={handleUploadPreview}
            disabled={!sectionId || !selectedFile || uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload & Preview'}
          </Button>
        </div>
      </AdminSectionCard>

      {preview ? (
        <AdminSectionCard
          title={`Preview - ${preview.sectionMatch.foundSection.name} (Grade ${preview.sectionMatch.foundSection.gradeLevel})`}
          description="Review file parsing results before final commit."
          action={(
            <div className="admin-controls">
              <Badge variant="default">{preview.summary.registeredCount} registered</Badge>
              <Badge variant="secondary">{preview.summary.pendingCount} pending</Badge>
              {preview.summary.errorCount > 0 ? <Badge variant="destructive">{preview.summary.errorCount} errors</Badge> : null}
              <Button
                size="sm"
                className="admin-button-solid rounded-xl font-black"
                onClick={handleCommit}
                disabled={committing || preview.summary.registeredCount + preview.summary.pendingCount === 0}
              >
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
                {preview.registered.map((row) => (
                  <TableRow key={`registered-${row.rowNumber}`}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{formatRosterName(row.name)}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.lrn || '-'}</TableCell>
                    <TableCell><Badge variant="default">Registered</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.status || (row.alreadyEnrolled ? 'Already enrolled' : 'Matched existing user')}
                    </TableCell>
                  </TableRow>
                ))}
                {preview.pending.map((row) => (
                  <TableRow key={`pending-${row.rowNumber}`}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{formatRosterName(row.name)}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.lrn || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.reason || 'Pending account match'}</TableCell>
                  </TableRow>
                ))}
                {preview.errors.map((row) => (
                  <TableRow key={`error-${row.rowNumber}`} className="bg-rose-50/60">
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell colSpan={2}>{row.email || row.rawData?.join(' | ') || '-'}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell><Badge variant="destructive">Error</Badge></TableCell>
                    <TableCell className="text-xs text-rose-600">{row.issues.join(', ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AdminSectionCard>
      ) : null}

      {sectionId ? (
        <AdminSectionCard title="Pending Import Rows" description="Rows waiting to be resolved for the selected section.">
          {loadingPending ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : pending.length === 0 ? (
            <AdminEmptyState
              title="No pending import rows"
              description="This section currently has no unresolved imported student rows."
            />
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
                  {pending.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{pendingRowName(row)}</TableCell>
                      <TableCell>{row.email || row.rosterEmail || '-'}</TableCell>
                      <TableCell>{row.lrn || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={row.resolvedAt || row.status === 'resolved' ? 'default' : 'secondary'}>
                          {row.status || (row.resolvedAt ? 'resolved' : 'pending')}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(row.createdAt || row.importedAt || Date.now()).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </AdminSectionCard>
      ) : (
        <AdminSectionCard title="Pending Import Rows" description="Select a section to load unresolved rows.">
          <AdminEmptyState
            title="Select a section to view pending rows"
            description="Pending import rows will appear after selecting a section."
          />
        </AdminSectionCard>
      )}
    </AdminPageShell>
  );
}
