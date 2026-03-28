'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { fileService } from '@/services/file-service';
import { classService } from '@/services/class-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClassItem } from '@/types/class';
import type { LibraryFolder, UploadedFile } from '@/types/file';

type LibraryMode = 'private' | 'general';

function handleFolderCardKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  onActivate: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
}

export default function NexoraLibraryPage() {
  const { role, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<LibraryMode>('private');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folderTrail, setFolderTrail] = useState<LibraryFolder[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameState, setRenameState] = useState<{
    type: 'file' | 'folder';
    id: string;
    value: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [uploadClassId, setUploadClassId] = useState('');

  const currentFolder = folderTrail[folderTrail.length - 1] ?? null;
  const isAdmin = role === 'admin';

  const loadClasses = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = isAdmin
        ? await classService.getAll()
        : await classService.getByTeacher(user.id);
      const raw = 'data' in response.data ? response.data.data : response.data;
      setClasses(Array.isArray(raw) ? raw : []);
    } catch {
      setClasses([]);
    }
  }, [isAdmin, user?.id]);

  const loadLibrary = useCallback(async () => {
    setLoading(true);

    try {
      const scope = mode;
      const folderId = currentFolder?.id;
      const [folderResponse, fileResponse] = await Promise.all([
        fileService.getFolders({
          scope,
          folderId,
          search: search.trim() || undefined,
        }),
        fileService.getAll({
          scope,
          folderId,
          classId: classFilter || undefined,
          search: search.trim() || undefined,
        }),
      ]);
      setFolders(folderResponse.data);
      setFiles(fileResponse.data);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load Nexora Library';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, currentFolder?.id, mode, search]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setFolderTrail([]);
  }, [mode]);

  const storageSubtitle = useMemo(() => {
    if (mode === 'general') {
      return 'Schoolwide modules curated for teaching teams.';
    }

    return 'Your personal teaching library and uploaded modules.';
  }, [mode]);

  const handlePreview = async (fileId: string) => {
    try {
      const blob = await fileService.download(fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to open PDF preview');
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const blob = await fileService.download(file.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleDeleteFile = (file: UploadedFile) => {
    setConfirmation({
      title: 'Delete library file?',
      description: 'This removes the uploaded file from Nexora Library and any folder it is currently in.',
      confirmLabel: 'Delete File',
      tone: 'danger',
      details: <p className="text-sm font-black text-[var(--student-text-strong)]">{file.originalName}</p>,
      onConfirm: async () => {
        try {
          await fileService.delete(file.id);
          toast.success('File deleted');
          loadLibrary();
        } catch {
          toast.error('Failed to delete file');
        }
      },
    });
  };

  const handleDeleteFolder = (folder: LibraryFolder) => {
    setConfirmation({
      title: 'Delete folder?',
      description: 'Files inside this folder will be moved out before the folder is removed.',
      confirmLabel: 'Delete Folder',
      tone: 'danger',
      details: <p className="text-sm font-black text-[var(--student-text-strong)]">{folder.name}</p>,
      onConfirm: async () => {
        try {
          await fileService.deleteFolder(folder.id);
          toast.success('Folder deleted');
          setFolderTrail((prev) => prev.filter((item) => item.id !== folder.id));
          loadLibrary();
        } catch (error: unknown) {
          toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Failed to delete folder',
          );
        }
      },
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await fileService.createFolder({
        name: newFolderName.trim(),
        parentId: currentFolder?.id,
        scope: mode,
      });
      toast.success('Folder created');
      setNewFolderName('');
      setCreateFolderOpen(false);
      loadLibrary();
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameState?.value.trim()) return;

    try {
      if (renameState.type === 'folder') {
        await fileService.updateFolder(renameState.id, { name: renameState.value.trim() });
      } else {
        await fileService.update(renameState.id, { originalName: renameState.value.trim() });
      }
      toast.success('Renamed successfully');
      setRenameState(null);
      loadLibrary();
    } catch {
      toast.error('Failed to rename item');
    }
  };

  const handlePublishToggle = async (file: UploadedFile) => {
    try {
      await fileService.update(file.id, {
        scope: file.scope === 'general' ? 'private' : 'general',
        classId: file.classId ?? null,
        folderId: null,
      });
      toast.success(
        file.scope === 'general'
          ? 'Moved back to My Library'
          : 'Published to General Modules',
      );
      loadLibrary();
    } catch {
      toast.error('Failed to update module visibility');
    }
  };

  const handleUpload = async () => {
    if (!selectedUpload) return;

    try {
      setUploading(true);
      await fileService.upload(selectedUpload, {
        scope: mode,
        folderId: currentFolder?.id,
        classId: (isAdmin ? classFilter : uploadClassId) || undefined,
      });
      toast.success('Module uploaded successfully');
      setSelectedUpload(null);
      setUploadClassId('');
      loadLibrary();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to upload module',
      );
    } finally {
      setUploading(false);
    }
  };

  if (role !== 'teacher' && role !== 'admin') {
    return <p className="text-sm text-muted-foreground">Nexora Library is available to teachers and admins only.</p>;
  }

  if (isAdmin) {
    return (
      <AdminPageShell
        badge="Admin Library"
        title="Nexora Library"
        description="Manage teaching resources and materials"
        actions={(
          <div className="admin-controls">
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl px-4 font-black"
              onClick={() => setCreateFolderOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Folder
            </Button>
            <Button
              className="admin-button-solid rounded-xl px-4 font-black"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(event) => {
                setSelectedUpload(event.target.files?.[0] ?? null);
              }}
            />
          </div>
        )}
      >
        <div className="space-y-6">
          <div className="admin-library-tabs">
            <button
              type="button"
              className={mode === 'private' ? 'admin-library-tab is-active' : 'admin-library-tab'}
              onClick={() => setMode('private')}
            >
              My Library
            </button>
            <button
              type="button"
              className={mode === 'general' ? 'admin-library-tab is-active' : 'admin-library-tab'}
              onClick={() => setMode('general')}
            >
              General Modules
            </button>
          </div>

          <div className="admin-library-filter-row">
            <div className="admin-library-search">
              <Search className="h-4 w-4 text-[var(--admin-text-muted)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files..."
                className="admin-input border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="admin-select min-w-[11rem]"
            >
              <option value="">All Classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subjectCode} - {item.subjectName}
                </option>
              ))}
            </select>
          </div>

          <p className="admin-library-breadcrumb">
            <span>Library</span>
            <span className="text-[var(--admin-text-muted)]"> / {currentFolder?.name ?? 'All Files'}</span>
          </p>

          {loading ? (
            <AdminSectionCard title="Library" description="Loading current folder contents...">
              <div className="py-12 text-center text-sm text-[var(--admin-text-muted)]">Loading library contents...</div>
            </AdminSectionCard>
          ) : (
            <>
              <div className="admin-library-folder-grid">
                {folders.map((folder, index) => {
                  const folderCount =
                    typeof (folder as { fileCount?: number }).fileCount === 'number'
                      ? (folder as { fileCount?: number }).fileCount
                      : null;
                  return (
                    <div
                      key={folder.id}
                      role="button"
                      tabIndex={0}
                      className="admin-library-folder-card"
                      onClick={() => setFolderTrail((prev) => [...prev, folder])}
                      onKeyDown={(event) =>
                        handleFolderCardKeyDown(event, () =>
                          setFolderTrail((prev) => [...prev, folder]),
                        )
                      }
                    >
                      <div className={`admin-library-folder-icon color-${index % 4}`}>
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-left text-[1.05rem] font-black text-[var(--admin-text-strong)]">{folder.name}</p>
                        <p className="mt-1 text-left text-sm text-[var(--admin-text-muted)]">
                          {folderCount === null ? '— files' : `${folderCount} files`}
                        </p>
                      </div>
                      <div
                        className="admin-library-folder-actions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-full p-0"
                          onClick={() => setRenameState({ type: 'folder', id: folder.id, value: folder.name })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-full p-0 text-rose-600"
                          onClick={() => handleDeleteFolder(folder)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <AdminSectionCard
                title={`Files (${files.length})`}
                description={currentFolder ? `Inside ${currentFolder.name}` : 'All files in current library scope.'}
              >
                {files.length === 0 ? (
                  <AdminEmptyState
                    title="No files in this view"
                    description="Upload a PDF or change filters to display file records."
                  />
                ) : (
                  <div className="admin-library-file-list">
                    {files.map((file) => (
                      <article key={file.id} className="admin-library-file-row">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="admin-library-file-icon">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-[var(--admin-text-strong)]">{file.originalName}</p>
                            <p className="truncate text-sm text-[var(--admin-text-muted)]">
                              {(file.sizeBytes / 1_048_576).toFixed(1)} MB • {file.class?.subjectName ?? 'No class'} • {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={file.scope === 'general' ? 'admin-library-status is-published' : 'admin-library-status'}>
                            {file.scope === 'general' ? 'Published' : 'Private'}
                          </span>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePreview(file.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(file)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setRenameState({ type: 'file', id: file.id, value: file.originalName })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteFile(file)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </AdminSectionCard>

              {selectedUpload ? (
                <AdminSectionCard title="Ready to Upload" description={`Selected file: ${selectedUpload.name}`} density="compact">
                  <div className="admin-controls">
                    <Button
                      className="admin-button-solid rounded-xl px-4 font-black"
                      onClick={handleUpload}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload PDF'}
                    </Button>
                    <Button
                      variant="outline"
                      className="admin-button-outline rounded-xl px-4 font-black"
                      onClick={() => {
                        setSelectedUpload(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </AdminSectionCard>
              ) : null}

              {folderTrail.length > 0 ? (
                <Button
                  variant="outline"
                  className="admin-button-outline rounded-xl px-4 font-black"
                  onClick={() => setFolderTrail((prev) => prev.slice(0, -1))}
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back to Previous Folder
                </Button>
              ) : null}
            </>
          )}
        </div>

        <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
          <DialogContent className="rounded-2xl border-[var(--admin-outline)] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-[var(--admin-text-strong)]">Create Folder</DialogTitle>
              <DialogDescription className="text-sm text-[var(--admin-text-muted)]">
                Create a folder in the current library location.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="admin-profile-label">Folder Name</Label>
              <Input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} className="admin-input" />
            </div>
            <DialogFooter>
              <Button variant="outline" className="admin-button-outline" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
              <Button className="admin-button-solid" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create Folder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!renameState} onOpenChange={() => setRenameState(null)}>
          <DialogContent className="rounded-2xl border-[var(--admin-outline)] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-[var(--admin-text-strong)]">
                Rename {renameState?.type === 'folder' ? 'Folder' : 'File'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="admin-profile-label">New Name</Label>
              <Input
                value={renameState?.value ?? ''}
                onChange={(event) => setRenameState((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                className="admin-input"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" className="admin-button-outline" onClick={() => setRenameState(null)}>Cancel</Button>
              <Button className="admin-button-solid" onClick={handleRenameSubmit} disabled={!renameState?.value.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
      </AdminPageShell>
    );
  }

  return (
    <TeacherPageShell
      className={isAdmin ? 'theme-admin-bridge' : undefined}
      badge={isAdmin ? 'Admin Resource Hub' : 'Teacher Resource Hub'}
      title="Nexora Library"
      description="Organize modules and teaching files in a cleaner resource studio, while keeping the same upload, folder, preview, and publish workflows you already use."
      actions={(
        <div className="teacher-dashboard-chip">
          {mode === 'private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
          {mode === 'private' ? 'My Library' : 'General Modules'}
        </div>
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Folders"
            value={folders.length}
            caption={currentFolder ? 'Inside the current folder' : 'At the current library level'}
            icon={FolderOpen}
            accent="sky"
          />
          <TeacherStatCard
            label="Files"
            value={files.length}
            caption="Visible with current filters"
            icon={FileText}
            accent="teal"
          />
          <TeacherStatCard
            label="Class Links"
            value={classes.length}
            caption="Available for resource attachment"
            icon={Globe}
            accent="amber"
          />
          <TeacherStatCard
            label="Library Mode"
            value={mode === 'private' ? 'Private' : 'General'}
            caption={storageSubtitle}
            icon={mode === 'private' ? Lock : Globe}
            accent="rose"
          />
        </>
      )}
    >
      <Tabs value={mode} onValueChange={(value) => setMode(value as LibraryMode)} className="space-y-6">
        <TeacherSectionCard
          title="Library Views"
          description="Switch between your personal library and shared modules without losing the new workspace rhythm."
        >
          <TabsList className="teacher-tab-list grid h-auto w-full max-w-md grid-cols-2">
            <TabsTrigger value="private" className="teacher-tab rounded-xl font-black">
              <Lock className="mr-2 h-4 w-4" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="general" className="teacher-tab rounded-xl font-black">
              <Globe className="mr-2 h-4 w-4" />
              General Modules
            </TabsTrigger>
          </TabsList>
        </TeacherSectionCard>

        <TabsContent value={mode} className="space-y-6">
          <TeacherSectionCard
            title="Library Controls"
            description="Search, filter, create folders, and upload resources from one cleaner command strip."
          >
            <div className="teacher-library-controls">
              <div className="space-y-2">
                <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Search</Label>
                <div className="teacher-library-search">
                  <Search className="h-4 w-4 text-[var(--teacher-text-muted)]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find a module or folder"
                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Class Filter</Label>
                <select
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  className="teacher-select w-full text-sm font-semibold"
                >
                  <option value="">All classes</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.subjectCode} - {item.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black text-[var(--teacher-text-strong)]">PDF Upload</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(event) => setSelectedUpload(event.target.files?.[0] ?? null)}
                  className="teacher-input rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Attach to Class</Label>
                <select
                  value={uploadClassId}
                  onChange={(event) => setUploadClassId(event.target.value)}
                  className="teacher-select w-full text-sm font-semibold"
                >
                  <option value="">No class attached</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.subjectCode} - {item.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-end gap-3 xl:col-span-4">
                <Button
                  className="teacher-button-outline rounded-xl font-black"
                  variant="outline"
                  onClick={() => setCreateFolderOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
                <Button
                  className="teacher-button-solid rounded-xl font-black"
                  onClick={handleUpload}
                  disabled={!selectedUpload || uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload PDF'}
                </Button>
              </div>
            </div>
          </TeacherSectionCard>

          <TeacherSectionCard
            title={currentFolder?.name ?? (mode === 'private' ? 'My Root Folder' : 'General Modules')}
            description="Browse folders and modules with calmer panels, cleaner hierarchy, and the same actions you already rely on."
            action={(
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--teacher-text-muted)]">
                <button className="font-black text-[var(--teacher-text-strong)]" onClick={() => setFolderTrail([])}>
                  Root
                </button>
                {folderTrail.map((folder, index) => (
                  <span key={folder.id} className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    <button
                      className="font-bold text-[var(--teacher-text-strong)]"
                      onClick={() => setFolderTrail(folderTrail.slice(0, index + 1))}
                    >
                      {folder.name}
                    </button>
                  </span>
                ))}
              </div>
            )}
          >
            {loading ? (
              <div className="py-12 text-center text-sm text-[var(--teacher-text-muted)]">
                Loading library contents...
              </div>
            ) : folders.length === 0 && files.length === 0 ? (
              <TeacherEmptyState
                title="This library space is still empty"
                description="Upload a PDF or create a folder to start organizing modules in this teacher resource studio."
              />
            ) : (
              <div className="space-y-6">
                {folders.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {folders.map((folder) => (
                      <motion.div
                        key={folder.id}
                        whileHover={{ y: -3 }}
                        className="teacher-library-folder"
                        role="button"
                        tabIndex={0}
                        onClick={() => setFolderTrail((prev) => [...prev, folder])}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setFolderTrail((prev) => [...prev, folder]);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="teacher-library-folder__icon">
                              <FolderOpen className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-black text-[var(--teacher-text-strong)]">{folder.name}</p>
                              <p className="text-xs text-[var(--teacher-text-muted)]">
                                {folder.scope === 'general' ? 'General folder' : 'Private folder'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 rounded-full p-0"
                              onClick={(event) => {
                                event.stopPropagation();
                                setRenameState({ type: 'folder', id: folder.id, value: folder.name });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 rounded-full p-0 text-rose-600"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteFolder(folder);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : null}

                {files.length > 0 ? (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="teacher-library-file"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div className="teacher-library-file__icon">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-black text-[var(--teacher-text-strong)]">{file.originalName}</p>
                                <span className="teacher-dashboard-chip">
                                  {(file.sizeBytes / 1_048_576).toFixed(2)} MB
                                </span>
                                <span className="teacher-dashboard-chip">
                                  {file.scope === 'general' ? 'General' : 'Private'}
                                </span>
                              </div>
                              <p className="text-sm text-[var(--teacher-text-muted)]">
                                {file.class?.subjectCode
                                  ? `${file.class.subjectCode} • ${file.class.subjectName}`
                                  : 'No class attached'}
                              </p>
                              <p className="text-xs text-[var(--teacher-text-muted)]">
                                Uploaded {new Date(file.uploadedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => handlePreview(file.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Read
                            </Button>
                            <Button size="sm" variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => handleDownload(file)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="teacher-button-outline rounded-xl font-black"
                              onClick={() => setRenameState({ type: 'file', id: file.id, value: file.originalName })}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </Button>
                            {isAdmin ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="teacher-button-outline rounded-xl font-black"
                                onClick={() => handlePublishToggle(file)}
                              >
                                {file.scope === 'general' ? 'Unpublish' : 'Publish'}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => handleDeleteFile(file)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </TeacherSectionCard>
        </TabsContent>
      </Tabs>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="rounded-[1.8rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-[var(--teacher-text-strong)]">
              Create Folder
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--teacher-text-muted)]">
              Create a private library folder to group related modules and uploaded resources.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Folder Name</Label>
            <Input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="e.g. Quarter 1 Modules"
              className="teacher-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button className="teacher-button-solid rounded-xl font-black" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameState} onOpenChange={() => setRenameState(null)}>
        <DialogContent className="rounded-[1.8rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-[var(--teacher-text-strong)]">
              Rename {renameState?.type === 'folder' ? 'Folder' : 'File'}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--teacher-text-muted)]">
              Update the display name shown in your library while keeping the item in its current location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm font-black text-[var(--teacher-text-strong)]">New Name</Label>
            <Input
              value={renameState?.value ?? ''}
              onChange={(event) =>
                setRenameState((prev) => (prev ? { ...prev, value: event.target.value } : prev))
              }
              className="teacher-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => setRenameState(null)}>
              Cancel
            </Button>
            <Button className="teacher-button-solid rounded-xl font-black" onClick={handleRenameSubmit} disabled={!renameState?.value.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </TeacherPageShell>
  );
}
