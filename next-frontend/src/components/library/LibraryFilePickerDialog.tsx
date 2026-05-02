'use client';

import { useEffect, useState } from 'react';
import { BookOpen, FileText, FolderOpen, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fileService } from '@/services/file-service';
import type { LibraryFileKind, LibraryGradeLevel, LibrarySubjectKey, UploadedFile } from '@/types/file';
import './library-file-picker-dialog.css';

interface LibraryFilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: UploadedFile) => void;
  subjectKey?: LibrarySubjectKey;
  gradeLevel?: LibraryGradeLevel;
  allowedKinds?: LibraryFileKind[];
  title?: string;
  description?: string;
}

type PickerScope = 'general' | 'private';

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileDescription(file: UploadedFile) {
  const meta = [
    file.scope === 'general' ? 'General Module' : 'My Library',
    file.mimeType === 'application/pdf' ? 'PDF resource' : 'Library file',
    formatFileSize(file.sizeBytes),
  ];

  if (file.gradeLevel) {
    meta.push(`Grade ${file.gradeLevel}`);
  }
  if (file.subjectKey) {
    meta.push(String(file.subjectKey).replace(/_/g, ' '));
  }

  return meta.join(' | ');
}

export function LibraryFilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  subjectKey,
  gradeLevel,
  allowedKinds,
  title = 'Choose from Library',
  description = 'Attach an existing General Module or a file from My Library instead of uploading a new PDF.',
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
          const nextFiles = allowedKinds?.length
            ? response.data.filter((file) => file.fileKind && allowedKinds.includes(file.fileKind))
            : response.data;
          setFiles(nextFiles);
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
  }, [allowedKinds, gradeLevel, open, scope, search, subjectKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="teacher-library-picker__content">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="teacher-library-picker__body">
          <div className="teacher-library-picker__scope-grid">
            {[
              {
                value: 'general' as const,
                label: 'General Modules',
                description: 'Shared teacher-ready PDFs filtered for this class.',
                icon: BookOpen,
              },
              {
                value: 'private' as const,
                label: 'My Library',
                description: 'Your uploaded files and private references.',
                icon: FolderOpen,
              },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="teacher-library-picker__scope"
                  data-active={scope === option.value}
                  onClick={() => setScope(option.value)}
                >
                  <span className="teacher-library-picker__scope-icon" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="teacher-library-picker__scope-copy">
                    <strong>{option.label}</strong>
                    <span className="teacher-library-picker__scope-description">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <label className="teacher-library-picker__search">
            <Search className="h-4 w-4" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search library files"
              aria-label="Search library files"
              className="teacher-library-picker__search-input"
            />
          </label>

          {loading ? (
            <p className="teacher-library-picker__state">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="teacher-library-picker__state">No files available in this library view.</p>
          ) : (
            <div className="teacher-library-picker__results">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  aria-label={`Use ${file.originalName}`}
                  className="teacher-library-picker__file"
                  onClick={() => {
                    onSelect(file);
                    onOpenChange(false);
                  }}
                >
                  <span className="teacher-library-picker__file-main">
                    <span className="teacher-library-picker__file-icon" aria-hidden="true">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="teacher-library-picker__file-copy">
                      <span className="teacher-library-picker__file-name">{file.originalName}</span>
                      <span className="teacher-library-picker__file-description">
                        {getFileDescription(file)}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
