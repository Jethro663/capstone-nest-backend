'use client';

import { useState, useEffect } from 'react';
import {
  FileUp,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { AdminPageShell, AdminSectionCard, AdminStatCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { classRecordService } from '@/services/class-record-service';
import type {
  TransmutationBand,
  TransmutationTableRecord,
  TransmutationPreviewResult as PreviewPayload,
} from '@/types/class-record';

export default function AdminClassRecordTransmutationPage() {
  const [activeTable, setActiveTable] = useState<TransmutationTableRecord | null>(null);
  const [historyTables, setHistoryTables] = useState<TransmutationTableRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resActive, resAll] = await Promise.all([
        classRecordService.getActiveTransmutationTable().catch(() => null),
        classRecordService.getAllTransmutationTables().catch(() => null),
      ]);

      if (resActive?.data) {
        setActiveTable(resActive.data);
      }
      if (resAll?.data) {
        setHistoryTables(resAll.data || []);
      }
    } catch (err) {
      console.error('Failed to load transmutation tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleUploadAndPreview(file);
    }
  };

  const handleCancelPreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
    setSelectedFile(null);
    const fileInput = document.getElementById('transmutation-pdf-input') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const handleUploadAndPreview = async (file: File) => {
    setUploading(true);
    setStatusMessage(null);
    try {
      const res = await classRecordService.previewTransmutationTable(file);
      if (!res.success || !res.data) {
        throw new Error('Failed to parse transmutation table PDF');
      }

      setPreviewData(res.data);
      setPreviewOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err.message || 'Error processing PDF file.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmAndApply = async () => {
    if (!previewData) return;
    setApplying(true);
    try {
      const res = await classRecordService.applyTransmutationTable({
        title: previewData.title,
        description: `Uploaded from ${previewData.filename}`,
        bands: previewData.bands,
      });

      if (!res.success) {
        throw new Error('Failed to activate new transmutation table');
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully applied "${previewData.title}" system-wide! All class records now use this computation.`,
      });

      setPreviewOpen(false);
      setPreviewData(null);
      setSelectedFile(null);
      await fetchData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err.message || 'Failed to apply transmutation table.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setApplying(false);
    }
  };

  const handleReactivateTable = async (id: string, title: string) => {
    setApplying(true);
    try {
      const res = await classRecordService.activateTransmutationTable(id);
      if (!res.success) throw new Error('Failed to reactivate table');

      setStatusMessage({
        type: 'success',
        text: `Successfully reactivated "${title}" system-wide!`,
      });
      await fetchData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err.message || 'Failed to reactivate table.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setApplying(false);
    }
  };

  const filteredBands = (activeTable?.bands || []).filter((band) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const range = `${band.minInitialGrade} ${band.maxInitialGrade ?? ''} ${band.transmutedGrade}`;
    return range.toLowerCase().includes(q);
  });

  return (
    <AdminPageShell
      badge="Academic Grading Standard"
      title="Class Record Transmutation Settings"
      description="Upload adaptive transmutation tables (PDF/Text) to update initial-to-quarterly grade conversions system-wide across all subjects."
      actions={
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Table
        </Button>
      }
      stats={
        <>
          <AdminStatCard
            label="Active Table"
            value={activeTable?.isSystemDefault ? 'DepEd Default' : 'Custom Active'}
            caption={activeTable?.title || 'System Default'}
            accent="emerald"
          />
          <AdminStatCard
            label="Total Ranges"
            value={`${activeTable?.bands?.length ?? 41} Bands`}
            caption="0.00% to 100.00% initial grade scale"
            accent="sky"
          />
          <AdminStatCard
            label="Passing Baseline"
            value="75 Transmuted"
            caption="Minimum passing mark for quarterly grade"
            accent="amber"
          />
          <AdminStatCard
            label="System Protection"
            value="Active Sync"
            caption="Applies dynamically to all class records"
            accent="rose"
          />
        </>
      }
    >
      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-medium shadow-sm transition-all ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStatusMessage(null)} className="h-7 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Upload Box Card */}
        <div className="md:col-span-5 space-y-6">
          <AdminSectionCard
            title="Upload Transmutation Table"
            description="Upload a PDF file containing initial grade ranges. The system will extract and let you preview before applying."
          >
            <div className="space-y-4">
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 text-center transition-colors hover:border-rose-500 hover:bg-rose-50/30">
                <input
                  id="transmutation-pdf-input"
                  type="file"
                  accept=".pdf,.txt,.csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                  {uploading ? <RefreshCw className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  {uploading ? 'Parsing PDF contents...' : 'Click or drop PDF table file here'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Supports PDF, CSV, or TXT formats</p>
              </div>

              {/* Sample Files Links */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-rose-500" />
                  Test Sample Files
                </p>
                <div className="flex flex-col gap-2 text-xs">
                  <a
                    href="/transmutation_table_new.pdf"
                    download="transmutation_table_new.pdf"
                    className="inline-flex items-center gap-1.5 text-rose-700 hover:text-rose-900 font-semibold hover:underline"
                  >
                    📄 Download New Transmutation Sample (PDF)
                  </a>
                  <a
                    href="/transmutation_table_old.pdf"
                    download="transmutation_table_old.pdf"
                    className="inline-flex items-center gap-1.5 text-rose-700 hover:text-rose-900 font-semibold hover:underline"
                  >
                    📄 Download Old DepEd Sample (PDF)
                  </a>
                </div>
              </div>

              {/* System Safeguard Notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Adaptive Calculation Sync</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Activating a new table updates grade conversions system-wide for all classes and subjects without affecting raw scores.
                </p>
              </div>
            </div>
          </AdminSectionCard>
        </div>

        {/* Active Transmutation Table Display Card */}
        <div className="md:col-span-7 space-y-6">
          <AdminSectionCard
            title="Active Transmutation Table"
            description={activeTable?.title || 'DepEd Order No. 8 s. 2015 Transmutation Table'}
            action={
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search range..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs bg-white border-slate-300"
                />
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs">
                  Active System Standard
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  {filteredBands.length} ranges shown
                </span>
              </div>

              {/* High Contrast Light Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden max-h-[420px] overflow-y-auto shadow-inner">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Initial Grade Range</th>
                      <th className="px-4 py-3">Transmuted Grade</th>
                      <th className="px-4 py-3 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                          Loading active transmutation bands...
                        </td>
                      </tr>
                    ) : filteredBands.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                          No matching range found.
                        </td>
                      </tr>
                    ) : (
                      filteredBands.map((band, idx) => {
                        const rangeStr =
                          band.minInitialGrade === band.maxInitialGrade
                            ? `${band.minInitialGrade.toFixed(2)}%`
                            : `${band.minInitialGrade.toFixed(2)}% – ${band.maxInitialGrade ? band.maxInitialGrade.toFixed(2) : '100'}%`;
                        const isPassing = band.transmutedGrade >= 75;

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{rangeStr}</td>
                            <td className="px-4 py-2.5 font-extrabold text-sm text-slate-900">
                              {band.transmutedGrade}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  isPassing
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isPassing ? 'Passed' : 'For Intervention'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </AdminSectionCard>
        </div>
      </div>

      {/* History Tables Section */}
      {historyTables.length > 0 && (
        <AdminSectionCard
          title="Transmutation Table Presets & History"
          description="Previously loaded transmutation tables that can be reactivated system-wide."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {historyTables.map((tbl) => (
              <div
                key={tbl.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  tbl.isActive
                    ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-900">{tbl.title}</p>
                    {tbl.isActive && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{tbl.description || 'Custom table'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bands: {tbl.bands.length} | Created: {new Date(tbl.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {!tbl.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReactivateTable(tbl.id, tbl.title)}
                    disabled={applying}
                    className="h-8 text-xs border-slate-300 hover:bg-slate-100 font-semibold"
                  >
                    Activate
                  </Button>
                )}
              </div>
            ))}
          </div>
        </AdminSectionCard>
      )}

      {/* Roster-Import Style Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleCancelPreview(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-white border-slate-200 text-slate-900 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Eye className="h-5 w-5 text-rose-600" />
              Transmutation Table Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Review extracted grade conversion bands from <strong className="text-slate-900">{previewData?.filename}</strong> before applying system-wide.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">{previewData.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{previewData.validationMessage}</p>
                </div>
                <Badge
                  className={
                    previewData.isValid
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                      : 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
                  }
                >
                  {previewData.bandCount} Ranges Extracted
                </Badge>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">Initial Grade Range</th>
                      <th className="px-4 py-3">Transmuted Grade</th>
                      <th className="px-4 py-3 text-right">Passing Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                    {previewData.bands.map((band, idx) => {
                      const rangeStr =
                        band.minInitialGrade === band.maxInitialGrade
                          ? `${band.minInitialGrade.toFixed(2)}%`
                          : `${band.minInitialGrade.toFixed(2)}% – ${band.maxInitialGrade ? band.maxInitialGrade.toFixed(2) : '100'}%`;
                      const isPassing = band.transmutedGrade >= 75;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{rangeStr}</td>
                          <td className="px-4 py-2.5 font-extrabold text-sm text-slate-900">
                            {band.transmutedGrade}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isPassing
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {isPassing ? 'Passed' : 'For Intervention'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-200 pt-4 flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={handleCancelPreview}
              disabled={applying}
              className="border-slate-300 hover:bg-slate-100 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndApply}
              disabled={applying || !previewData}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 rounded-xl"
            >
              {applying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Applying System-Wide...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm & Apply System-Wide
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
