'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fileService } from '@/services/file-service';
import type { LibraryGradeLevel, LibrarySubjectKey, UploadedFile } from '@/types/file';

interface LibraryFilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: UploadedFile) => void;
  subjectKey?: LibrarySubjectKey;
  gradeLevel?: LibraryGradeLevel;
}

type PickerScope = 'general' | 'private';

export function LibraryFilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  subjectKey,
  gradeLevel,
}: LibraryFilePickerDialogProps) {
  const [scope, setScope] = useState<PickerScope>('general');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fileService.getAll({
          scope,
          teacherVisible: scope === 'general' ? true : undefined,
          subjectKey: scope === 'general' ? subjectKey : undefined,
          gradeLevel: scope === 'general' ? gradeLevel : undefined,
          search: search.trim() || undefined,
          page: 1,
          limit: 20,
        });
        if (!cancelled) {
          setFiles(response.data);
        }
      } catch {
        if (!cancelled) {
          setFiles([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [gradeLevel, open, scope, search, subjectKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose from Library</DialogTitle>
          <DialogDescription>
            Attach an existing General Module or a file from My Library instead of uploading a new PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={scope === 'general' ? 'default' : 'outline'}
              onClick={() => setScope('general')}
            >
              General Modules
            </Button>
            <Button
              type="button"
              variant={scope === 'private' ? 'default' : 'outline'}
              onClick={() => setScope('private')}
            >
              My Library
            </Button>
          </div>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search library files"
            aria-label="Search library files"
          />

          {loading ? (
            <p className="text-sm text-slate-500">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-slate-500">No files available in this library view.</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  aria-label={`Use ${file.originalName}`}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => {
                    onSelect(file);
                    onOpenChange(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{file.originalName}</span>
                    <span className="block text-xs text-slate-500">
                      {file.scope === 'general' ? 'General Module' : 'My Library'}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-slate-700">Use {file.originalName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
