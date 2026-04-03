'use client';

import { useMemo, useRef, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';
import type { LibraryWorkspaceController, LibraryMode } from '@/hooks/use-library-workspace';

interface LibraryWorkspaceViewProps {
  variant: 'teacher' | 'admin';
  workspace: LibraryWorkspaceController;
}

function onCardKeyDown(event: KeyboardEvent<HTMLElement>, onActivate: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function getModeLabel(mode: LibraryMode) {
  return mode === 'private' ? 'My Library' : 'General Modules';
}

export function LibraryWorkspaceView({ variant, workspace }: LibraryWorkspaceViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = variant === 'admin';

  const {
    mode,
    setMode,
    classes,
    folders,
    files,
    folderTrail,
    currentFolder,
    search,
    classFilter,
    uploadClassId,
    loading,
    uploading,
    createFolderOpen,
    renameState,
    confirmation,
    newFolderName,
    selectedUpload,
    setSearch,
    setClassFilter,
    setUploadClassId,
    setFolderTrail,
    setCreateFolderOpen,
    setRenameState,
    setConfirmation,
    setNewFolderName,
    setSelectedUpload,
    handlePreview,
    handleDownload,
    handleDeleteFile,
    handleDeleteFolder,
    handleCreateFolder,
    handleRenameSubmit,
    handlePublishToggle,
    handleUpload,
  } = workspace;

  const breadcrumb = useMemo(() => {
    return ['Library', ...folderTrail.map((folder) => folder.name)];
  }, [folderTrail]);

  return (
    <div className={cn('nexora-library', isAdmin ? 'nexora-library--admin' : 'nexora-library--teacher')}>
      <section className="nexora-library__header" aria-label="Library header">
        <div className="nexora-library__title-wrap">
          <div className="nexora-library__title-icon">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="nexora-library__title">Nexora Library</h1>
            <p className="nexora-library__subtitle">
              {isAdmin ? 'Manage teaching resources and shared modules' : 'Manage teaching resources and classroom modules'}
            </p>
          </div>
        </div>

        <div className="nexora-library__actions">
          <Button
            type="button"
            variant="outline"
            className="nexora-library__button nexora-library__button--ghost"
            onClick={() => setCreateFolderOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
          <Button
            type="button"
            className="nexora-library__button nexora-library__button--solid"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
          <input
            ref={fileInputRef}
            data-testid="library-upload-input"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(event) => setSelectedUpload(event.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      <section className="nexora-library__tabs" aria-label="Library scope tabs">
        <button
          type="button"
          className={cn('nexora-library__tab', mode === 'private' && 'is-active')}
          onClick={() => setMode('private')}
        >
          <Lock className="h-4 w-4" />
          My Library
        </button>
        <button
          type="button"
          className={cn('nexora-library__tab', mode === 'general' && 'is-active')}
          onClick={() => setMode('general')}
        >
          <Globe className="h-4 w-4" />
          General Modules
        </button>
      </section>

      <section className="nexora-library__filters" aria-label="Library controls">
        <div className="nexora-library__search">
          <Search className="h-4 w-4" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files..."
            className="nexora-library__search-input"
          />
        </div>

        <select
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          className="nexora-library__select"
          aria-label="Class filter"
        >
          <option value="">All Classes</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.subjectCode} - {item.subjectName}
            </option>
          ))}
        </select>

        {!isAdmin ? (
          <select
            value={uploadClassId}
            onChange={(event) => setUploadClassId(event.target.value)}
            className="nexora-library__select"
            aria-label="Upload class"
          >
            <option value="">Attach upload to class (optional)</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subjectCode} - {item.subjectName}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      {selectedUpload ? (
        <section className="nexora-library__upload-strip" aria-live="polite">
          <div>
            <p className="nexora-library__upload-label">Ready to upload</p>
            <p className="nexora-library__upload-file">{selectedUpload.name}</p>
          </div>
          <div className="nexora-library__upload-actions">
            <Button
              type="button"
              className="nexora-library__button nexora-library__button--solid"
              onClick={() => void handleUpload()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="nexora-library__button nexora-library__button--ghost"
              onClick={() => {
                setSelectedUpload(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <section className="nexora-library__breadcrumb" aria-label="Library breadcrumb">
        {breadcrumb.map((segment, index) => (
          <span key={`${segment}-${index}`} className="nexora-library__crumb-item">
            {index > 0 ? <ArrowRight className="h-3 w-3" /> : null}
            {index === 0 ? (
              <button type="button" onClick={() => setFolderTrail([])}>
                {segment}
              </button>
            ) : (
              <button type="button" onClick={() => setFolderTrail(folderTrail.slice(0, index))}>
                {segment}
              </button>
            )}
          </span>
        ))}
      </section>

      <section className="nexora-library__folder-grid" aria-label="Library folders">
        {loading ? (
          <div className="nexora-library__panel">Loading library contents...</div>
        ) : folders.length === 0 ? (
          <div className="nexora-library__panel nexora-library__panel--muted">No folders in this view yet.</div>
        ) : (
          folders.map((folder, index) => {
            const folderCount =
              typeof (folder as { fileCount?: number }).fileCount === 'number'
                ? (folder as { fileCount?: number }).fileCount
                : null;

            return (
              <motion.article
                key={folder.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: index * 0.02 }}
                className="nexora-library__folder-card"
                role="button"
                tabIndex={0}
                onClick={() => setFolderTrail((prev) => [...prev, folder])}
                onKeyDown={(event) =>
                  onCardKeyDown(event, () => setFolderTrail((prev) => [...prev, folder]))
                }
              >
                <div className="nexora-library__folder-icon">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="nexora-library__folder-name">{folder.name}</p>
                  <p className="nexora-library__folder-meta">
                    {folderCount === null ? 'Folder' : `${folderCount} files`}
                  </p>
                </div>
                <div className="nexora-library__folder-actions" onClick={(event) => event.stopPropagation()}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="nexora-library__icon-button"
                    onClick={() => setRenameState({ type: 'folder', id: folder.id, value: folder.name })}
                    aria-label={`Rename ${folder.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="nexora-library__icon-button nexora-library__icon-button--danger"
                    onClick={() => handleDeleteFolder(folder)}
                    aria-label={`Delete ${folder.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.article>
            );
          })
        )}
      </section>

      <section className="nexora-library__files" aria-label="Library files">
        <header className="nexora-library__files-head">
          <h2>Files ({files.length})</h2>
          <span>{currentFolder?.name ?? getModeLabel(mode)}</span>
        </header>

        {loading ? (
          <div className="nexora-library__panel">Loading file list...</div>
        ) : files.length === 0 ? (
          <div className="nexora-library__panel nexora-library__panel--muted">No files in this folder yet.</div>
        ) : (
          <div className="nexora-library__file-list" role="list">
            {files.map((file, index) => (
              <motion.article
                key={file.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: index * 0.02 }}
                className="nexora-library__file-row"
                role="listitem"
              >
                <div className="nexora-library__file-main">
                  <div className="nexora-library__file-icon">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="nexora-library__file-name">{file.originalName}</p>
                    <p className="nexora-library__file-meta">
                      {`${formatFileSize(file.sizeBytes)} - ${file.class?.subjectName ?? 'No class'} - ${new Date(file.uploadedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="nexora-library__file-actions">
                  <span className={cn('nexora-library__status', file.scope === 'general' && 'is-published')}>
                    {file.scope === 'general' ? 'Published' : 'Private'}
                  </span>

                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="nexora-library__publish-button"
                      onClick={() => void handlePublishToggle(file)}
                    >
                      {file.scope === 'general' ? 'Unpublish' : 'Publish'}
                    </Button>
                  ) : null}

                  <Button
                    size="icon"
                    variant="ghost"
                    className="nexora-library__icon-button"
                    onClick={() => void handlePreview(file.id)}
                    aria-label={`Preview ${file.originalName}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="nexora-library__icon-button"
                    onClick={() => void handleDownload(file)}
                    aria-label={`Download ${file.originalName}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="nexora-library__icon-button"
                    onClick={() =>
                      setRenameState({ type: 'file', id: file.id, value: file.originalName })
                    }
                    aria-label={`Rename ${file.originalName}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="nexora-library__icon-button nexora-library__icon-button--danger"
                    onClick={() => handleDeleteFile(file)}
                    aria-label={`Delete ${file.originalName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className={cn('nexora-library__dialog', isAdmin ? 'is-admin' : 'is-teacher')}>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>Create a folder in the current library scope.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="library-folder-name">Folder Name</Label>
            <Input
              id="library-folder-name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="e.g. Quarter 1 Modules"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateFolder()} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameState} onOpenChange={() => setRenameState(null)}>
        <DialogContent className={cn('nexora-library__dialog', isAdmin ? 'is-admin' : 'is-teacher')}>
          <DialogHeader>
            <DialogTitle>Rename {renameState?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>Update the display name for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="library-rename-name">New Name</Label>
            <Input
              id="library-rename-name"
              value={renameState?.value ?? ''}
              onChange={(event) => {
                if (!renameState) return;
                setRenameState({ ...renameState, value: event.target.value });
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameState(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleRenameSubmit()} disabled={!renameState?.value.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
