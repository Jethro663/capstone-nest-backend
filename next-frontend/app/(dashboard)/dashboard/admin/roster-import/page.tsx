'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  rosterImportService,
  type PendingImportRow,
  type RosterImportPreview,
  type RosterParsedName,
} from '@/services/roster-import-service';
import { sectionService } from '@/services/section-service';
import type { Section } from '@/types/section';
import { downloadRosterImportTemplate } from '@/lib/roster-import-template';
import {
  createSpreadsheetFilePreview,
  createSpreadsheetPreviewUpload,
  getSpreadsheetColumnLabel,
  updateSpreadsheetPreviewCell,
  type SpreadsheetFilePreview,
} from '@/lib/roster-import-preview';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function formatFileSize(bytes: number): string {
  return `${Math.max(bytes / 1_048_576, 0.01).toFixed(2)} MB`;
}

function formatFileLabel(file: File | null): string {
  if (!file) return 'Drop your CSV/Excel file here';
  return `${file.name} (${formatFileSize(file.size)})`;
}

function formatRosterName(name: RosterParsedName): string {
  return [name.firstName, name.middleName, name.lastName].filter(Boolean).join(' ');
}

function importHistoryRowName(row: PendingImportRow): string {
  return [row.firstName, row.middleInitial, row.lastName].filter(Boolean).join(' ');
}

function getApiErrorMessage(error: unknown): string | null {
  const maybeError = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = maybeError?.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }
  if (typeof maybeError?.message === 'string' && maybeError.message.trim().length > 0) {
    return maybeError.message;
  }
  return null;
}

export default function RosterImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRequestRef = useRef(0);
  const validationRequestRef = useRef(0);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<SpreadsheetFilePreview | null>(null);
  const [filePreviewDirty, setFilePreviewDirty] = useState(false);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const [filePreviewError, setFilePreviewError] = useState<string | null>(null);
  const [activePreviewSheetIndex, setActivePreviewSheetIndex] = useState(0);
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [activateNewAccounts, setActivateNewAccounts] = useState(false);
  const [activationAcknowledged, setActivationAcknowledged] = useState(false);
  const [pending, setPending] = useState<PendingImportRow[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const selectedSection = sections.find((section) => section.id === sectionId) ?? null;
  const activeFilePreviewSheet = filePreview?.sheets[activePreviewSheetIndex] ?? filePreview?.sheets[0] ?? null;

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

  const clearSelectedFile = useCallback(() => {
    previewRequestRef.current += 1;
    validationRequestRef.current += 1;
    setSelectedFile(null);
    setFilePreview(null);
    setFilePreviewDirty(false);
    setPreview(null);
    setActivateNewAccounts(false);
    setActivationAcknowledged(false);
    setFilePreviewError(null);
    setFilePreviewLoading(false);
    setActivePreviewSheetIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileAttached = useCallback(async (file: File | null) => {
    if (
      file &&
      filePreviewDirty &&
      !window.confirm('Discard your roster edits and attach a different file?')
    ) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    previewRequestRef.current += 1;
    validationRequestRef.current += 1;
    const requestId = previewRequestRef.current;
    setSelectedFile(file);
    setPreview(null);
    setActivateNewAccounts(false);
    setActivationAcknowledged(false);
    setFilePreview(null);
    setFilePreviewDirty(false);
    setFilePreviewError(null);
    setActivePreviewSheetIndex(0);
    if (!file) return;
    try {
      setFilePreviewLoading(true);
      const parsedPreview = await createSpreadsheetFilePreview(file);
      if (previewRequestRef.current !== requestId) return;
      setFilePreview(parsedPreview);
      toast.success(`${file.name} is attached and ready for preview.`);
    } catch (error) {
      if (previewRequestRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : 'Unable to preview the attached spreadsheet.';
      setFilePreviewError(message);
      toast.error(message);
    } finally {
      if (previewRequestRef.current === requestId) setFilePreviewLoading(false);
    }
  }, [filePreviewDirty]);

  const handlePreviewCellChange = useCallback((
    sheetIndex: number,
    rowNumber: number,
    columnIndex: number,
    value: string,
  ) => {
    validationRequestRef.current += 1;
    setFilePreview((current) =>
      current
        ? updateSpreadsheetPreviewCell(
          current,
          sheetIndex,
          rowNumber,
          columnIndex,
          value,
        )
        : current,
    );
    setFilePreviewDirty(true);
    setPreview(null);
  }, []);

  const handleDiscardFile = useCallback(() => {
    if (
      filePreviewDirty &&
      !window.confirm('Discard your roster edits and remove this file?')
    ) {
      return;
    }
    clearSelectedFile();
  }, [clearSelectedFile, filePreviewDirty]);

  const handleValidatePreview = async () => {
    if (!sectionId || !filePreview) {
      toast.error('Select a target section and a file first.');
      return;
    }

    const requestId = validationRequestRef.current + 1;
    validationRequestRef.current = requestId;
    try {
      setUploading(true);
      setPreview(null);
      const editedFile = await createSpreadsheetPreviewUpload(filePreview);
      const response = await rosterImportService.preview(sectionId, editedFile);
      if (validationRequestRef.current !== requestId) return;
      const previewData = response.data;
      setPreview(previewData);

      const validRows =
        (previewData?.summary?.registeredCount ?? 0) +
        (previewData?.summary?.pendingCount ?? 0);
      if (validRows <= 0) {
        toast.error('No valid rows found in the file. Please check the template and try again.');
        return;
      }
      toast.success(`Roster validated. Review ${validRows} valid row(s) before committing.`);
    } catch (error) {
      if (validationRequestRef.current !== requestId) return;
      const message = getApiErrorMessage(error);
      toast.error(message ?? 'Failed to validate roster file.');
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!sectionId || !preview) return;
    if (activateNewAccounts && !activationAcknowledged) {
      toast.error('Confirm the new account activation choice before committing.');
      return;
    }

    try {
      setCommitting(true);
      await rosterImportService.commit(sectionId, {
        sectionId,
        skipVerification: activateNewAccounts,
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
      toast.success(activateNewAccounts
        ? 'Roster committed. New accounts are active; temporary password delivery has been requested.'
        : 'Roster uploaded successfully. Import committed.');
      setPreview(null);
      clearSelectedFile();
      fetchPending();
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast.error(message ?? 'Failed to commit roster import.');
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedSection) {
      toast.error('Select a target section before downloading the template.');
      return;
    }

    try {
      setDownloadingTemplate(true);
      await downloadRosterImportTemplate(selectedSection);
      toast.success('Roster template downloaded.');
    } catch {
      toast.error('Failed to create the roster template.');
    } finally {
      setDownloadingTemplate(false);
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
              disabled={uploading || committing}
              onChange={(event) => {
                validationRequestRef.current += 1;
                setSectionId(event.target.value);
                setPreview(null);
                setActivateNewAccounts(false);
                setActivationAcknowledged(false);
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
            aria-disabled={uploading || committing}
            onClick={() => {
              if (!uploading && !committing) fileInputRef.current?.click();
            }}
            onKeyDown={(event) => {
              if (!uploading && !committing && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (uploading || committing) return;
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFileAttached(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={uploading || committing}
              className="hidden"
              onChange={(event) => void handleFileAttached(event.target.files?.[0] ?? null)}
            />
            <div className="admin-roster-dropzone-copy">
              <Upload className="h-8 w-8 text-[#b4c2d6]" />
              <p className="font-semibold text-[#4c6388]">{formatFileLabel(selectedFile)}</p>
              <p className="text-sm text-[#9fb0c9]">or click to browse</p>
            </div>
          </div>

          {filePreviewLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#9fb5d6] bg-[#f4f8ff] px-4 py-3 text-sm font-semibold text-[#4c6388]" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading the attached file for preview...
            </div>
          ) : null}

          {filePreviewError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {filePreviewError}
            </div>
          ) : null}

          {filePreview && activeFilePreviewSheet ? (
            <div className="rounded-3xl border border-[#d8e3f4] bg-white/90 p-4 shadow-[0_18px_45px_rgba(79,111,157,0.12)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#eef5ff] p-3 text-[#1f5fbf]">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#24364f]">Attached file preview</p>
                    <p className="text-xs font-semibold text-[#6f83a3]">{filePreview.fileName} - {filePreview.fileSizeLabel}</p>
                    <p className="mt-1 text-xs text-[#8ba0bf]">Edit the import-source cells, then validate the draft before committing it.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{filePreview.sheets.length} sheet{filePreview.sheets.length === 1 ? '' : 's'}</Badge>
                  <Button type="button" size="sm" variant="outline" onClick={handleDiscardFile} disabled={uploading || committing}>
                    Remove file
                  </Button>
                </div>
              </div>
              {filePreview.sheets.length > 1 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {filePreview.sheets.map((sheet, index) => (
                    <Button key={sheet.name} type="button" size="sm" variant={index === activePreviewSheetIndex ? 'default' : 'outline'} onClick={() => setActivePreviewSheetIndex(index)} disabled={uploading || committing}>
                      {sheet.name} · {index === 0 ? 'Import source' : 'Reference only'}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#6f83a3]">
                <span className="rounded-full bg-[#f1f6ff] px-3 py-1">Sheet: {activeFilePreviewSheet.name}</span>
                <span className="rounded-full bg-[#f1f6ff] px-3 py-1">
                  {activePreviewSheetIndex === 0 ? 'Import source' : 'Reference only'}
                </span>
                <span className="rounded-full bg-[#f1f6ff] px-3 py-1">Rows: {activeFilePreviewSheet.rowCount}</span>
                <span className="rounded-full bg-[#f1f6ff] px-3 py-1">Columns: {activeFilePreviewSheet.columnCount}</span>
              </div>
              {activePreviewSheetIndex > 0 ? (
                <p className="mt-3 text-xs font-semibold text-amber-800">
                  Only the first worksheet is imported. This sheet is shown for reference and cannot be edited here.
                </p>
              ) : null}
              {activeFilePreviewSheet.rows.length > 0 ? (
                <div className="admin-table-shell mt-4 max-h-[24rem] overflow-auto">
                  <Table>
                    <TableHeader className="admin-table-head">
                      <TableRow>
                        <TableHead>Row</TableHead>
                        {Array.from({ length: activeFilePreviewSheet.columnCount }, (_, index) => (
                          <TableHead key={`preview-head-${index}`}>{getSpreadsheetColumnLabel(index + 1)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeFilePreviewSheet.rows.map((row) => (
                        <TableRow key={`${activeFilePreviewSheet.name}-${row.rowNumber}`}>
                          <TableCell className="font-bold text-[#6f83a3]">{row.rowNumber}</TableCell>
                          {row.cells.map((cell, index) => (
                            <TableCell key={`${row.rowNumber}-${index}`} className="min-w-40 p-2 text-xs text-[#24364f]">
                              {activePreviewSheetIndex === 0 ? (
                                <input
                                  aria-label={`${activeFilePreviewSheet.name}, row ${row.rowNumber}, column ${getSpreadsheetColumnLabel(index + 1)}`}
                                  className="h-9 w-full rounded-lg border border-[#cbd8eb] bg-white px-2 text-xs text-[#24364f] outline-none focus:border-[#1f5fbf] focus:ring-2 focus:ring-[#dbeafe]"
                                  value={cell}
                                  disabled={uploading || committing}
                                  onChange={(event) => handlePreviewCellChange(
                                    activePreviewSheetIndex,
                                    row.rowNumber,
                                    index,
                                    event.target.value,
                                  )}
                                />
                              ) : (
                                <span className="whitespace-pre-wrap">{cell || '-'}</span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <AdminEmptyState title="No visible spreadsheet rows" description="The attached file was read, but no non-empty rows were detected for preview." />
              )}
            </div>
          ) : null}

          <Button
            className="admin-roster-upload-button"
            onClick={handleValidatePreview}
            disabled={!sectionId || !filePreview || uploading || committing}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Validating...' : 'Validate roster'}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="admin-button-outline rounded-xl font-black"
            onClick={handleDownloadTemplate}
            disabled={!selectedSection || downloadingTemplate}
          >
            <Download className="h-4 w-4" />
            {downloadingTemplate ? 'Creating Template...' : 'Download Excel Template'}
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
              <Badge variant="secondary">{preview.summary.pendingCount} to create</Badge>
              {preview.summary.errorCount > 0 ? <Badge variant="destructive">{preview.summary.errorCount} errors</Badge> : null}
              <Button
                size="sm"
                className="admin-button-solid rounded-xl font-black"
                onClick={handleCommit}
                disabled={uploading || committing || (activateNewAccounts && !activationAcknowledged) || preview.summary.registeredCount + preview.summary.pendingCount === 0}
              >
                {committing ? 'Committing...' : 'Commit Import'}
              </Button>
            </div>
          )}
        >
          {preview.summary.pendingCount > 0 ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">New account activation</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Standard: {preview.summary.pendingCount} new account{preview.summary.pendingCount === 1 ? '' : 's'} {preview.summary.pendingCount === 1 ? 'receives' : 'receive'} an OTP and {preview.summary.pendingCount === 1 ? 'stays' : 'stay'} pending until verification.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={activateNewAccounts}
                  onClick={() => {
                    setActivateNewAccounts((current) => !current);
                    setActivationAcknowledged(false);
                  }}
                  disabled={committing}
                >
                  {activateNewAccounts ? 'Skip verification: On' : 'Enable skip verification'}
                </Button>
              </div>
              {activateNewAccounts ? (
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={activationAcknowledged}
                    onChange={(event) => setActivationAcknowledged(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-red-600"
                  />
                  <span>
                    I confirm {preview.summary.pendingCount === 1 ? 'this new account' : `these ${preview.summary.pendingCount} new accounts`} should be active immediately. Nexora will not verify mailbox ownership by OTP; it will attempt to email temporary passwords to the listed addresses. Existing accounts will not be reactivated.
                  </span>
                </label>
              ) : null}
            </div>
          ) : null}
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
                    <TableCell><Badge variant="secondary">{activateNewAccounts ? 'Active after import' : 'Pending verification'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.reason || 'New student account'}</TableCell>
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
        <AdminSectionCard title="Import History" description="Recent students imported through roster import for the selected section.">
          {loadingPending ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : pending.length === 0 ? (
            <AdminEmptyState
              title="No import history yet"
              description="Imported students will appear here after a successful roster commit."
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
                      <TableCell>{importHistoryRowName(row)}</TableCell>
                      <TableCell>{row.email || row.rosterEmail || '-'}</TableCell>
                      <TableCell>{row.lrn || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={row.resolvedAt || row.status === 'resolved' ? 'default' : 'secondary'}>
                          {row.status || (row.resolvedAt ? 'imported' : 'unresolved')}
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
        <AdminSectionCard title="Import History" description="Select a section to load recent roster imports.">
          <AdminEmptyState
            title="Select a section to view import history"
            description="Recent roster import records will appear after selecting a section."
          />
        </AdminSectionCard>
      )}
    </AdminPageShell>
  );
}
