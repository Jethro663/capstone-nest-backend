'use client';

import { useMemo, useRef, type KeyboardEvent } from 'react';
import {
  ArrowRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  Lock,
  MoveRight,
  Pencil,
  Plus,
  RefreshCw,
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
import { LIBRARY_GRADES, LIBRARY_SUBJECTS, type LibraryGradeLevel, type LibrarySubjectKey } from '@/types/file';

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

function getSubjectLabel(subjectKey?: string | null) {
  return LIBRARY_SUBJECTS.find((subject) => subject.key === subjectKey)?.label ?? 'Unpartitioned';
}

function getIndexStatusLabel(status?: string) {
  if (!status) return 'Not indexed';
  return status.replace(/_/g, ' ');
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
    subjectFilter,
    gradeFilter,
    uploadDestination,
    uploadClassId,
    uploadSubjectKey,
    uploadGradeLevel,
    page,
    total,
    totalPages,
    loading,
    uploading,
    createFolderOpen,
    renameState,
    moveState,
    confirmation,
    newFolderName,
    selectedUpload,
    setSearch,
    setClassFilter,
    setSubjectFilter,
    setGradeFilter,
    setUploadDestination,
    setUploadClassId,
    setUploadSubjectKey,
    setUploadGradeLevel,
    setPage,
    setFolderTrail,
    setCreateFolderOpen,
    setRenameState,
    setMoveState,
    setConfirmation,
    setNewFolderName,
    setSelectedUpload,
    handlePreview,
    handleDownload,
    handleDeleteFile,
    handleDeleteFolder,
    handleCreateFolder,
    handleRenameSubmit,
    handleVisibilityToggle,
    handleAiEnabledToggle,
    handleRetryIndex,
    handleMoveSubmit,
    openMoveDialog,
    handleUpload,
  } = workspace;

  const uploadDisabled = isAdmin && (!subjectFilter || !gradeFilter);
  const isTeacherGeneralMode = !isAdmin && mode === 'general';
  const isTeacherPrivateMode = !isAdmin && mode === 'private';
  const teacherUploadDisabled =
    !isAdmin &&
    (!uploadSubjectKey ||
      !uploadGradeLevel ||
      (uploadDestination === 'class' && !uploadClassId));
  const canOpenUploadDialog = isAdmin || isTeacherPrivateMode;
  const uploadDisabledReason = isAdmin
    ? !subjectFilter || !gradeFilter
      ? 'Choose a subject and grade partition first.'
      : null
    : isTeacherGeneralMode
      ? 'General Modules are read-only for teachers.'
      : !uploadSubjectKey || !uploadGradeLevel
        ? 'Choose a destination subject and grade first.'
        : uploadDestination === 'class' && !uploadClassId
          ? 'Choose a class for class-specific files.'
          : null;

  const breadcrumb = useMemo(() => {
    return ['Library', ...folderTrail.map((folder) => folder.name)];
  }, [folderTrail]);

  const filterScopeLabel = isAdmin
    ? 'General Modules'
    : isTeacherGeneralMode
      ? 'General Modules'
      : 'My Library';

  const workspaceSummary = isAdmin
    ? 'Admin-managed subject partitions for AI-ready shared content.'
    : isTeacherGeneralMode
      ? 'Read-only institutional resources you can preview, download, and attach to modules.'
      : 'Your private teaching workspace for personal and class-specific resources.';

  return (
    <div className={cn('nexora-library', isAdmin ? 'nexora-library--admin' : 'nexora-library--teacher')}>
      <section className="nexora-library__header" aria-label="Library header">
        <div className="nexora-library__title-wrap">
          <div className="nexora-library__title-icon">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="nexora-library__eyebrow">{filterScopeLabel}</p>
            <h1 className="nexora-library__title">Nexora Library</h1>
            <p className="nexora-library__subtitle">{workspaceSummary}</p>
          </div>
        </div>

        <div className="nexora-library__header-side">
          <div className="nexora-library__scope-card">
            <span>{files.length} files</span>
            <span>{totalPages} pages</span>
            <span>{mode === 'general' || isAdmin ? 'Shared access' : 'Teacher-owned'}</span>
          </div>

          <div className="nexora-library__actions">
            {isTeacherPrivateMode ? (
              <Button
                type="button"
                variant="outline"
                className="nexora-library__button nexora-library__button--ghost"
                onClick={() => setCreateFolderOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Folder
              </Button>
            ) : null}
            {canOpenUploadDialog ? (
              <Button
                type="button"
                className="nexora-library__button nexora-library__button--solid"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(uploadDisabledReason)}
                title={uploadDisabledReason ?? undefined}
              >
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            data-testid="library-upload-input"
            type="file"
            accept=".pdf,.txt,.pptx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            onChange={(event) => setSelectedUpload(event.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      <section className="nexora-library__tabs" aria-label="Library scope tabs">
        {isAdmin ? (
          <div className="nexora-library__tab is-active">
            <Globe className="h-4 w-4" />
            General Modules
          </div>
        ) : (
          <>
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
          </>
        )}
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

        {isAdmin || isTeacherGeneralMode ? (
          <>
            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value as LibrarySubjectKey | '')}
              className="nexora-library__select"
              aria-label="Subject filter"
            >
              <option value="">All Subjects</option>
              {LIBRARY_SUBJECTS.map((subject) => (
                <option key={subject.key} value={subject.key}>
                  {subject.label}
                </option>
              ))}
            </select>
            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value as LibraryGradeLevel | '')}
              className="nexora-library__select"
              aria-label="Grade filter"
            >
              <option value="">All Grades</option>
              {LIBRARY_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value as LibrarySubjectKey | '')}
              className="nexora-library__select"
              aria-label="Subject filter"
            >
              <option value="">All Subjects</option>
              {LIBRARY_SUBJECTS.map((subject) => (
                <option key={subject.key} value={subject.key}>
                  {subject.label}
                </option>
              ))}
            </select>
            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value as LibraryGradeLevel | '')}
              className="nexora-library__select"
              aria-label="Grade filter"
            >
              <option value="">All Grades</option>
              {LIBRARY_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
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
          </>
        )}
      </section>

      {selectedUpload ? (
        <section className="nexora-library__upload-strip" aria-live="polite">
          <div className="nexora-library__upload-copy">
            <p className="nexora-library__upload-label">Ready to upload</p>
            <p className="nexora-library__upload-file">{selectedUpload.name}</p>
            {uploadDisabledReason ? (
              <p className="nexora-library__upload-warning">{uploadDisabledReason}</p>
            ) : null}
          </div>
          {isTeacherPrivateMode ? (
            <div className="nexora-library__upload-metadata">
              <div className="nexora-library__segmented" role="group" aria-label="Upload destination">
                <button
                  type="button"
                  className={cn('nexora-library__segment', uploadDestination === 'personal' && 'is-active')}
                  onClick={() => {
                    setUploadDestination('personal');
                    setUploadClassId('');
                  }}
                >
                  Personal
                </button>
                <button
                  type="button"
                  className={cn('nexora-library__segment', uploadDestination === 'class' && 'is-active')}
                  onClick={() => setUploadDestination('class')}
                >
                  Class-specific
                </button>
              </div>

              <label className="nexora-library__field">
                <span>Upload Subject</span>
                <select
                  value={uploadSubjectKey}
                  onChange={(event) => setUploadSubjectKey(event.target.value as LibrarySubjectKey | '')}
                  className="nexora-library__select"
                  aria-label="Upload subject"
                >
                  <option value="">Select subject</option>
                  {LIBRARY_SUBJECTS.map((subject) => (
                    <option key={subject.key} value={subject.key}>
                      {subject.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="nexora-library__field">
                <span>Upload Grade</span>
                <select
                  value={uploadGradeLevel}
                  onChange={(event) => setUploadGradeLevel(event.target.value as LibraryGradeLevel | '')}
                  className="nexora-library__select"
                  aria-label="Upload grade"
                >
                  <option value="">Select grade</option>
                  {LIBRARY_GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </label>

              {uploadDestination === 'class' ? (
                <label className="nexora-library__field">
                  <span>Upload class</span>
                  <select
                    value={uploadClassId}
                    onChange={(event) => setUploadClassId(event.target.value)}
                    className="nexora-library__select"
                    aria-label="Upload class"
                  >
                    <option value="">Select class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.subjectCode} - {item.subjectName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          <div className="nexora-library__upload-actions">
            <Button
              type="button"
              className="nexora-library__button nexora-library__button--solid"
              onClick={() => void handleUpload()}
              disabled={uploading || uploadDisabled || teacherUploadDisabled}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload File'}
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

      {isTeacherPrivateMode ? (
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
      ) : null}

      {isTeacherPrivateMode ? (
      <section className="nexora-library__folder-grid" aria-label="Library folders">
        {loading ? (
          <div className="nexora-library__panel">Loading library contents...</div>
        ) : folders.length === 0 ? (
          <div className="nexora-library__panel nexora-library__panel--muted">No folders in this view yet.</div>
        ) : (
          folders.map((folder) => {
            const folderCount =
              typeof (folder as { fileCount?: number }).fileCount === 'number'
                ? (folder as { fileCount?: number }).fileCount
                : null;

            return (
              <article
                key={folder.id}
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
              </article>
            );
          })
        )}
      </section>
      ) : null}

      <section className="nexora-library__files" aria-label="Library files">
        <header className="nexora-library__files-head">
          <h2>Files ({total || files.length})</h2>
          <span>
            {isAdmin
              ? `${subjectFilter ? getSubjectLabel(subjectFilter) : 'All subjects'} - ${gradeFilter ? `Grade ${gradeFilter}` : 'All grades'}`
              : isTeacherGeneralMode
                ? `${subjectFilter ? getSubjectLabel(subjectFilter) : 'All subjects'} - ${gradeFilter ? `Grade ${gradeFilter}` : 'All grades'}`
                : currentFolder?.name ?? getModeLabel(mode)}
          </span>
        </header>

        {loading ? (
          <div className="nexora-library__panel">Loading file list...</div>
        ) : files.length === 0 ? (
          <div className="nexora-library__panel nexora-library__panel--muted">No files in this folder yet.</div>
        ) : (
          <div className="nexora-library__file-list" role="list">
            {files.map((file) => (
              <article
                key={file.id}
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
                      {isAdmin
                        ? `${formatFileSize(file.sizeBytes)} - ${getSubjectLabel(file.subjectKey)} - Grade ${file.gradeLevel ?? '?'} - ${new Date(file.uploadedAt).toLocaleDateString()}`
                        : `${formatFileSize(file.sizeBytes)} - ${file.class?.subjectName ?? getSubjectLabel(file.subjectKey)} - Grade ${file.gradeLevel ?? '?'} - ${new Date(file.uploadedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="nexora-library__file-actions">
                  <span className={cn('nexora-library__status', file.scope === 'general' && 'is-published')}>
                    {file.scope === 'general' ? 'Published' : 'Private'}
                  </span>
                  {file.subjectKey ? (
                    <span className="nexora-library__status">{getSubjectLabel(file.subjectKey)}</span>
                  ) : null}
                  {file.gradeLevel ? (
                    <span className="nexora-library__status">Grade {file.gradeLevel}</span>
                  ) : null}
                  {isAdmin ? (
                    <span className={cn('nexora-library__status', file.indexStatus === 'completed' && 'is-published')}>
                      {getIndexStatusLabel(file.indexStatus)}
                    </span>
                  ) : null}

                  {isTeacherPrivateMode ? (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        aria-label="Use in AI"
                        checked={file.aiEnabled ?? true}
                        onChange={() => void handleAiEnabledToggle(file)}
                      />
                      Use in AI
                    </label>
                  ) : null}

                  {isAdmin ? (
                    <>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={file.teacherVisible ?? true}
                          onChange={() => void handleVisibilityToggle(file)}
                        />
                        Teacher visible
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        className="nexora-library__publish-button"
                        onClick={() => openMoveDialog(file)}
                      >
                        <MoveRight className="h-4 w-4" />
                        Move
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="nexora-library__publish-button"
                        onClick={() => void handleRetryIndex(file)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                      </Button>
                    </>
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
                  {!isTeacherGeneralMode ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
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

      <Dialog open={!!moveState} onOpenChange={() => setMoveState(null)}>
        <DialogContent className={cn('nexora-library__dialog', isAdmin ? 'is-admin' : 'is-teacher')}>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>Move this file to another subject and grade partition.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="library-move-subject">Subject</Label>
              <select
                id="library-move-subject"
                value={moveState?.subjectKey ?? ''}
                onChange={(event) => {
                  if (!moveState) return;
                  setMoveState({ ...moveState, subjectKey: event.target.value as LibrarySubjectKey });
                }}
                className="nexora-library__select w-full"
              >
                {LIBRARY_SUBJECTS.map((subject) => (
                  <option key={subject.key} value={subject.key}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="library-move-grade">Grade</Label>
              <select
                id="library-move-grade"
                value={moveState?.gradeLevel ?? ''}
                onChange={(event) => {
                  if (!moveState) return;
                  setMoveState({ ...moveState, gradeLevel: event.target.value as LibraryGradeLevel });
                }}
                className="nexora-library__select w-full"
              >
                {LIBRARY_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveState(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleMoveSubmit()}>
              Move File
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
