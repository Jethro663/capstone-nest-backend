'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  FileText,
  Upload,
  Plus,
  Search,
  Trash2,
  Pencil,
  Globe,
  Lock,
  Download,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { fileService } from '@/services/file-service';
import { classService } from '@/services/class-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClassItem } from '@/types/class';
import type { LibraryFolder, UploadedFile } from '@/types/file';

type LibraryMode = 'private' | 'general';

export default function NexoraLibraryPage() {
  const { role, user } = useAuth();
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
      const [folderRes, fileRes] = await Promise.all([
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
      setFolders(folderRes.data);
      setFiles(fileRes.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Delete this file from Nexora Library?')) return;
    try {
      await fileService.delete(fileId);
      toast.success('File deleted');
      loadLibrary();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('Delete this folder? Files inside will be moved out of the folder.')) return;
    try {
      await fileService.deleteFolder(folderId);
      toast.success('Folder deleted');
      setFolderTrail((prev) => prev.filter((item) => item.id !== folderId));
      loadLibrary();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to delete folder',
      );
    }
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
        classId: uploadClassId || undefined,
      });
      toast.success('Module uploaded successfully');
      setSelectedUpload(null);
      setUploadClassId('');
      loadLibrary();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to upload module',
      );
    } finally {
      setUploading(false);
    }
  };

  if (role !== 'teacher' && role !== 'admin') {
    return <p className="text-sm text-muted-foreground">Nexora Library is available to teachers and admins only.</p>;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <div className="rounded-3xl border border-red-100 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.14),_transparent_38%),linear-gradient(135deg,#fff8f5_0%,#ffffff_56%,#fff3ec_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">
                Teacher Resource Hub
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Nexora Library
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Organize PDF modules the way teachers actually work: your own teaching files on one side,
                general shared modules on the other, with clear folders and fast read actions.
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-red-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Current View
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {mode === 'private' ? 'My Library' : 'General Modules'}
              </p>
              <p className="text-sm text-slate-500">{storageSubtitle}</p>
            </div>
          </div>
        </div>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as LibraryMode)}
          className="space-y-4"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl bg-rose-50 p-1">
            <TabsTrigger value="private" className="rounded-xl">
              <Lock className="mr-2 h-4 w-4" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="general" className="rounded-xl">
              <Globe className="mr-2 h-4 w-4" />
              General Modules
            </TabsTrigger>
          </TabsList>

          <TabsContent value={mode} className="space-y-4">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_auto_auto]">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="flex items-center gap-2 rounded-2xl border bg-white px-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Find a module or folder"
                      className="border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Class Filter</Label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="h-10 w-full rounded-2xl border bg-white px-3 text-sm"
                  >
                    <option value="">All classes</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.subjectCode} - {item.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="h-10 rounded-2xl"
                  variant="outline"
                  onClick={() => setCreateFolderOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
                <Button
                  className="h-10 rounded-2xl bg-red-600 text-white hover:bg-red-700"
                  onClick={handleUpload}
                  disabled={!selectedUpload || uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload PDF'}
                </Button>
                <div className="space-y-2 lg:col-span-2">
                  <Label>PDF Upload</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedUpload(e.target.files?.[0] ?? null)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>Attach to Class (Optional)</Label>
                  <select
                    value={uploadClassId}
                    onChange={(e) => setUploadClassId(e.target.value)}
                    className="h-10 w-full rounded-2xl border bg-white px-3 text-sm"
                  >
                    <option value="">No class attached</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.subjectCode} - {item.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <button
                    className="font-medium text-slate-700"
                    onClick={() => setFolderTrail([])}
                  >
                    Root
                  </button>
                  {folderTrail.map((folder, index) => (
                    <span key={folder.id} className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      <button
                        className="font-medium text-slate-700"
                        onClick={() => setFolderTrail(folderTrail.slice(0, index + 1))}
                      >
                        {folder.name}
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black text-slate-900">
                    {currentFolder?.name ?? (mode === 'private' ? 'My Root Folder' : 'General Modules')}
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    {folders.length} folder(s) • {files.length} file(s)
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="py-10 text-center text-sm text-slate-500">Loading library contents...</div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {folders.map((folder) => (
                        <motion.button
                          key={folder.id}
                          whileHover={{ y: -2 }}
                          className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 text-left shadow-sm transition"
                          onClick={() => setFolderTrail((prev) => [...prev, folder])}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                                <FolderOpen className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{folder.name}</p>
                                <p className="text-xs text-slate-500">
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
                                className="h-8 w-8 rounded-full p-0 text-red-600"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteFolder(folder.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {files.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                              <div className="rounded-2xl bg-rose-50 p-3 text-red-700">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-900">{file.originalName}</p>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    {(file.sizeBytes / 1_048_576).toFixed(2)} MB
                                  </span>
                                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                    {file.scope === 'general' ? 'General' : 'Private'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500">
                                  {file.class?.subjectCode
                                    ? `${file.class.subjectCode} • ${file.class.subjectName}`
                                    : 'No class attached'}
                                </p>
                                <p className="text-xs text-slate-400">
                                  Uploaded {new Date(file.uploadedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => handlePreview(file.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Read
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDownload(file)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setRenameState({ type: 'file', id: file.id, value: file.originalName })
                                }
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                              </Button>
                              {isAdmin && (
                                <Button size="sm" variant="outline" onClick={() => handlePublishToggle(file)}>
                                  {file.scope === 'general' ? 'Unpublish' : 'Publish'}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleDeleteFile(file.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {folders.length === 0 && files.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                        <p className="text-lg font-semibold text-slate-800">This space is still empty.</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Upload a PDF or create a folder so teachers can keep modules organized.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Folder Name</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Quarter 1 Modules"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameState} onOpenChange={() => setRenameState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameState?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>New Name</Label>
            <Input
              value={renameState?.value ?? ''}
              onChange={(e) =>
                setRenameState((prev) => (prev ? { ...prev, value: e.target.value } : prev))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameState(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!renameState?.value.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
