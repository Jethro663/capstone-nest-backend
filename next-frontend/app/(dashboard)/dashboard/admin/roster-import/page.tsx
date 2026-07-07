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
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SpreadsheetPreviewRow = {
  rowNumber: number;
  cells: string[];
};

type SpreadsheetPreviewSheet = {
  name: string;
  rowCount: number;
  columnCount: number;
  rows: SpreadsheetPreviewRow[];
};

type SpreadsheetFilePreview = {
  fileName: string;
  fileSizeLabel: string;
  sheets: SpreadsheetPreviewSheet[];
};

function formatFileSize(bytes: number): string {
  return `${Math.max(bytes / 1_048_576, 0.01).toFixed(2)} MB`;
}

function formatFileLabel(file: File | null): string {
  if (!file) return 'Drop your CSV/Excel file here';
  return `${file.name} (${formatFileSize(file.size)})`;
}

function getColumnLabel(columnIndex: number): string {
  let label = '';
  let current = columnIndex;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

function cleanSpreadsheetText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatSpreadsheetCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value !== 'object') return cleanSpreadsheetText(value);
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return cleanSpreadsheetText(record.text);
  if ('result' in record) return formatSpreadsheetCellValue(record.result);
  if (Array.isArray(record.richText)) {
    return record.richText
      .map((part) => cleanSpreadsheetText((part as { text?: unknown }).text))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof record.hyperlink === 'string' && typeof record.text === 'string') return cleanSpreadsheetText(record.text);
  if (typeof record.error === 'string') return record.error;
  return Object.values(record)
    .map((entry) => (typeof entry === 'object' ? '' : cleanSpreadsheetText(entry)))
    .filter(Boolean)
    .join(' ');
}

function rowHasPreviewValue(cells: string[]): boolean {
  return cells.some((cell) => cell.trim().length > 0);
}

function normalizePreviewSheet(name: string, rows: SpreadsheetPreviewRow[]): SpreadsheetPreviewSheet {
  const columnCount = Math.max(...rows.map((row) => row.cells.length), 0);
  return {
    name,
    rowCount: rows.length,
    columnCount,
    rows: rows.map((row) => ({
      rowNumber: row.rowNumber,
      cells: Array.from({ length: columnCount }, (_, index) => row.cells[index] ?? ''),
    })),
  };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [[]];
  let currentCell = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      rows[rows.length - 1].push(cleanSpreadsheetText(currentCell));
      currentCell = '';
      continue;
    }
    const charCode = char.charCodeAt(0);
    const nextCharCode = nextChar?.charCodeAt(0);
    if ((charCode === 10 || charCode === 13) && !inQuotes) {
      if (charCode === 13 && nextCharCode === 10) index += 1;
      rows[rows.length - 1].push(cleanSpreadsheetText(currentCell));
      rows.push([]);
      currentCell = '';
      continue;
    }
    currentCell += char;
  }
  rows[rows.length - 1].push(cleanSpreadsheetText(currentCell));
  return rows;
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file text'));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read workbook'));
    reader.readAsArrayBuffer(file);
  });
}

function getFilePreviewKind(file: File): 'csv' | 'xlsx' | 'unsupported' {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || file.type.includes('csv')) return 'csv';
  if (extension === 'xlsx' || file.type.includes('spreadsheetml')) return 'xlsx';
  return 'unsupported';
}

async function createSpreadsheetFilePreview(file: File): Promise<SpreadsheetFilePreview> {
  const kind = getFilePreviewKind(file);
  if (kind === 'csv') {
    const rows = parseCsvRows(await readFileAsText(file))
      .map((cells, index) => ({ rowNumber: index + 1, cells }))
      .filter((row) => rowHasPreviewValue(row.cells));
    return {
      fileName: file.name,
      fileSizeLabel: formatFileSize(file.size),
      sheets: [normalizePreviewSheet(file.name.replace(/\.[^.]+$/, '') || 'CSV Preview', rows)],
    };
  }
  if (kind !== 'xlsx') {
    throw new Error('The file remains attached for upload, but browser preview supports CSV and .xlsx files only. Convert old .xls files to .xlsx if you need a table preview first.');
  }
  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFileAsArrayBuffer(file));
  const sheets = workbook.worksheets.map((worksheet) => {
    const rows: SpreadsheetPreviewRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cellCount = Math.max(row.cellCount, row.actualCellCount);
      const cells = Array.from({ length: cellCount }, (_, index) => formatSpreadsheetCellValue(row.getCell(index + 1).value));
      if (rowHasPreviewValue(cells)) rows.push({ rowNumber, cells });
    });
    return normalizePreviewSheet(worksheet.name, rows);
  });
  return {
    fileName: file.name,
    fileSizeLabel: formatFileSize(file.size),
    sheets: sheets.length > 0 ? sheets : [normalizePreviewSheet('Sheet 1', [])],
  };
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
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<SpreadsheetFilePreview | null>(null);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const [filePreviewError, setFilePreviewError] = useState<string | null>(null);
  const [activePreviewSheetIndex, setActivePreviewSheetIndex] = useState(0);
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
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
    setSelectedFile(null);
    setFilePreview(null);
    setFilePreviewError(null);
    setFilePreviewLoading(false);
    setActivePreviewSheetIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileAttached = useCallback(async (file: File | null) => {
    previewRequestRef.current += 1;
    const requestId = previewRequestRef.current;
    setSelectedFile(file);
    setPreview(null);
    setFilePreview(null);
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
  }, []);

  const handleUploadPreview = async () => {
    if (!sectionId || !selectedFile) {
      toast.error('Select a target section and a file first.');
      return;
    }

    try {
      setUploading(true);
      const response = await rosterImportService.preview(sectionId, selectedFile);
      const previewData = response.data;
      setPreview(previewData);

      const validRows =
        (previewData?.summary?.registeredCount ?? 0) +
        (previewData?.summary?.pendingCount ?? 0);
      if (validRows <= 0) {
        toast.error('No valid rows found in the file. Please check the template and try again.');
        return;
      }

      setCommitting(true);
      await rosterImportService.commit(sectionId, {
        sectionId,
        enrolledRows: previewData.registered.map((row) => ({
          userId: row.userId,
          name: row.name,
          lrn: row.lrn,
          email: row.email,
        })),
        pendingRows: previewData.pending.map((row) => ({
          name: row.name,
          lrn: row.lrn,
          email: row.email,
        })),
      });

      toast.success(`Roster uploaded successfully. ${validRows} account(s) processed.`);
      setPreview(null);
      clearSelectedFile();
      fetchPending();
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast.error(message ?? 'Failed to import roster file.');
    } finally {
      setUploading(false);
      setCommitting(false);
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
      toast.success('Roster uploaded successfully. Import committed.');
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
              if (file) void handleFileAttached(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
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
                    <p className="mt-1 text-xs text-[#8ba0bf]">Showing every non-empty row and cell detected in the spreadsheet before upload.</p>
                  </div>
                </div>
                <Badge variant="secondary">{filePreview.sheets.length} sheet{filePreview.sheets.length === 1 ? '' : 's'}</Badge>
              </div>
              {filePreview.sheets.length > 1 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {filePreview.sheets.map((sheet, index) => (
                    <Button key={sheet.name} type="button" size="sm" variant={index === activePreviewSheetIndex ? 'default' : 'outline'} onClick={() => setActivePreviewSheetIndex(index)}>
                      {sheet.name}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#6f83a3]">
                <span className="rounded-full bg-[#f1f6ff] px-3 py-1">Sheet: {activeFilePreviewSheet.name}</span>
                <span className="rounded-full bg-[#f1f6ff] px-3 py-1">Rows: {activeFilePreviewSheet.rowCount}</span>
                <span className="rounded-full bg-[#f1f6ff] px-3 py-1">Columns: {activeFilePreviewSheet.columnCount}</span>
              </div>
              {activeFilePreviewSheet.rows.length > 0 ? (
                <div className="admin-table-shell mt-4 max-h-[24rem] overflow-auto">
                  <Table>
                    <TableHeader className="admin-table-head">
                      <TableRow>
                        <TableHead>Row</TableHead>
                        {Array.from({ length: activeFilePreviewSheet.columnCount }, (_, index) => (
                          <TableHead key={`preview-head-${index}`}>{getColumnLabel(index + 1)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeFilePreviewSheet.rows.map((row) => (
                        <TableRow key={`${activeFilePreviewSheet.name}-${row.rowNumber}`}>
                          <TableCell className="font-bold text-[#6f83a3]">{row.rowNumber}</TableCell>
                          {row.cells.map((cell, index) => (
                            <TableCell key={`${row.rowNumber}-${index}`} className="whitespace-pre-wrap text-xs text-[#24364f]">
                              {cell || '-'}
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
            onClick={handleUploadPreview}
            disabled={!sectionId || !selectedFile || uploading || committing}
          >
            <Upload className="h-4 w-4" />
            {uploading || committing ? 'Importing...' : 'Upload & Import'}
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
                    <TableCell><Badge variant="secondary">To Create</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.reason || 'Will auto-create active student account'}</TableCell>
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
