'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { fileService } from '@/services/file-service';
import { moduleService } from '@/services/module-service';
import type { UploadedFile } from '@/types/file';
import type { ClassModule, ModuleItem, ModuleSection } from '@/types/module';
import './file-editor.css';

function toParamValue(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] || '';
  return input || '';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function TeacherModuleFileEditorPage() {
  const params = useParams();
  const router = useRouter();
  const classId = toParamValue(params.id);
  const moduleId = toParamValue(params.moduleId);
  const fileId = toParamValue(params.fileId);

  const [loading, setLoading] = useState(true);
  const [fileRecord, setFileRecord] = useState<UploadedFile | null>(null);
  const [moduleRecord, setModuleRecord] = useState<ClassModule | null>(null);
  const [sectionRecord, setSectionRecord] = useState<ModuleSection | null>(null);
  const [itemRecord, setItemRecord] = useState<ModuleItem | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const fetchData = useCallback(async () => {
    if (!classId || !moduleId || !fileId) return;

    try {
      setLoading(true);
      const [fileResponse, moduleResponse] = await Promise.all([
        fileService.getById(fileId),
        moduleService.getByClass(classId),
      ]);
      const resolvedModule = moduleResponse.data.find((entry) => entry.id === moduleId) || null;
      const resolvedSection =
        resolvedModule?.sections.find((section) => section.items.some((item) => item.fileId === fileId)) || null;
      const resolvedItem = resolvedSection?.items.find((item) => item.fileId === fileId) || null;

      setFileRecord(fileResponse.data);
      setNameDraft(fileResponse.data.originalName || '');
      setModuleRecord(resolvedModule);
      setSectionRecord(resolvedSection);
      setItemRecord(resolvedItem);
    } catch {
      setFileRecord(null);
      setModuleRecord(null);
      setSectionRecord(null);
      setItemRecord(null);
      toast.error('Unable to load module file details');
    } finally {
      setLoading(false);
    }
  }, [classId, fileId, moduleId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const backHref = useMemo(
    () => `/dashboard/teacher/classes/${classId}/modules/${moduleId}`,
    [classId, moduleId],
  );

  const handleDownload = async () => {
    if (!fileRecord) return;
    try {
      const blob = await fileService.download(fileRecord.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileRecord.originalName || 'module-file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Unable to download file');
    }
  };

  const handleSaveName = async () => {
    if (!fileRecord || savingName) return;
    const nextName = nameDraft.trim();
    if (!nextName) {
      toast.error('File name is required');
      return;
    }
    try {
      setSavingName(true);
      const response = await fileService.update(fileRecord.id, { originalName: nextName });
      setFileRecord(response.data);
      setNameDraft(response.data.originalName);
      toast.success('File name updated');
    } catch {
      toast.error('Unable to update file name');
    } finally {
      setSavingName(false);
    }
  };

  const handleReplace = async (nextFile: File) => {
    if (!itemRecord || !sectionRecord || !fileRecord || replacing) return;

    if (nextFile.type !== 'application/pdf') {
      toast.error('Only PDF replacement is supported for now');
      return;
    }

    try {
      setReplacing(true);
      const uploaded = await fileService.upload(nextFile, {
        classId,
        scope: 'private',
      });

      await moduleService.attachItem(sectionRecord.id, {
        itemType: 'file',
        fileId: uploaded.data.id,
        isVisible: itemRecord.isVisible,
        isRequired: itemRecord.isRequired,
        metadata: {
          ...(itemRecord.metadata || {}),
          fileSubtype:
            (itemRecord.metadata as Record<string, unknown> | null | undefined)?.fileSubtype || 'pdf',
        },
      });

      const refreshed = await moduleService.getByClass(classId);
      const refreshedModule = refreshed.data.find((entry) => entry.id === moduleId);
      const refreshedSection = refreshedModule?.sections.find((entry) => entry.id === sectionRecord.id);
      const newItem = refreshedSection?.items.find((entry) => entry.fileId === uploaded.data.id);
      if (!refreshedSection || !newItem) {
        throw new Error('Unable to resolve replacement file item');
      }

      const reordered = refreshedSection.items
        .map((entry) => entry.id)
        .filter((entryId) => entryId !== itemRecord.id);
      const oldIndex = refreshedSection.items.findIndex((entry) => entry.id === itemRecord.id);
      const insertIndex = oldIndex < 0 ? 0 : Math.min(oldIndex, reordered.length);
      reordered.splice(insertIndex, 0, newItem.id);

      await moduleService.reorderItems(
        refreshedSection.id,
        reordered.map((entryId, index) => ({ id: entryId, order: index + 1 })),
      );
      await moduleService.detachItem(itemRecord.id);

      toast.success('PDF block replaced');
      router.replace(
        `/dashboard/teacher/classes/${classId}/modules/${moduleId}/files/${uploaded.data.id}`,
      );
      await fetchData();
    } catch {
      toast.error('Unable to replace file block');
    } finally {
      setReplacing(false);
    }
  };

  const confirmRemove = () => {
    if (!itemRecord) {
      toast.error('Module item is missing for this file');
      return;
    }

    setConfirmation({
      title: 'Remove file block?',
      description: 'This removes the file block from the module section.',
      tone: 'danger',
      confirmLabel: 'Remove Block',
      details: 'The underlying file stays in your library unless deleted separately.',
      onConfirm: async () => {
        await moduleService.detachItem(itemRecord.id);
        toast.success('File block removed');
        router.push(backHref);
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    );
  }

  if (!fileRecord) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        File not found.
      </div>
    );
  }

  return (
    <div className="teacher-module-file space-y-4">
      <header className="teacher-module-file__hero">
        <Link href={backHref} className="teacher-module-file__back">
          <ArrowLeft className="h-4 w-4" />
          Back to Module
        </Link>
        <div className="teacher-module-file__hero-main">
          <span className="teacher-module-file__icon">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1>{fileRecord.originalName}</h1>
            <p>
              {moduleRecord?.title || 'Module'} - {sectionRecord?.title || 'Section'}
            </p>
          </div>
        </div>
      </header>

      <section className="teacher-module-file__panel">
        <div className="teacher-module-file__head">
          <div>
            <h2>File Details</h2>
            <p>Manage this module PDF block and keep resource naming consistent.</p>
          </div>
          <div className="teacher-module-file__actions">
            <Button type="button" variant="outline" onClick={() => void handleDownload()}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button type="button" variant="outline" onClick={() => confirmRemove()}>
              <Trash2 className="h-4 w-4" />
              Remove Block
            </Button>
          </div>
        </div>

        <div className="teacher-module-file__meta-grid">
          <article>
            <span>Type</span>
            <strong>{fileRecord.mimeType || 'application/pdf'}</strong>
          </article>
          <article>
            <span>Size</span>
            <strong>{formatBytes(fileRecord.sizeBytes || 0)}</strong>
          </article>
          <article>
            <span>Uploaded</span>
            <strong>{new Date(fileRecord.uploadedAt).toLocaleString()}</strong>
          </article>
          <article>
            <span>Scope</span>
            <strong>{fileRecord.scope}</strong>
          </article>
        </div>

        <div className="teacher-module-file__editor-grid">
          <div className="teacher-module-file__field">
            <label htmlFor="module-file-name">Display Name</label>
            <Input
              id="module-file-name"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={160}
            />
          </div>
          <Button
            type="button"
            className="teacher-module-file__save"
            onClick={() => void handleSaveName()}
            disabled={savingName}
          >
            <Save className="h-4 w-4" />
            {savingName ? 'Saving...' : 'Save Name'}
          </Button>
        </div>

        <div className="teacher-module-file__replace">
          <h3>Replace PDF</h3>
          <p>Upload a new PDF and keep this block in the same module position.</p>
          <label className="teacher-module-file__upload">
            <Upload className="h-4 w-4" />
            {replacing ? 'Replacing...' : 'Upload Replacement PDF'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={replacing}
              onChange={(event) => {
                const nextFile = event.target.files?.[0];
                if (nextFile) void handleReplace(nextFile);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </section>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
