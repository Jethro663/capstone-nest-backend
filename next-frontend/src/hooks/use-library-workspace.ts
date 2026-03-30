'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { fileService } from '@/services/file-service';
import type { ClassItem } from '@/types/class';
import type { LibraryFolder, UploadedFile } from '@/types/file';
import type { ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';

export type LibraryMode = 'private' | 'general';
export type LibraryRole = 'teacher' | 'admin';

export interface LibraryRenameState {
  type: 'file' | 'folder';
  id: string;
  value: string;
}

export interface UseLibraryWorkspaceOptions {
  role: LibraryRole;
  userId?: string;
  enabled?: boolean;
}

export interface LibraryWorkspaceController {
  role: LibraryRole;
  mode: LibraryMode;
  setMode: (mode: LibraryMode) => void;
  classes: ClassItem[];
  folders: LibraryFolder[];
  files: UploadedFile[];
  folderTrail: LibraryFolder[];
  currentFolder: LibraryFolder | null;
  search: string;
  classFilter: string;
  uploadClassId: string;
  loading: boolean;
  uploading: boolean;
  createFolderOpen: boolean;
  renameState: LibraryRenameState | null;
  confirmation: ConfirmationDialogConfig | null;
  newFolderName: string;
  selectedUpload: File | null;
  setSearch: (value: string) => void;
  setClassFilter: (value: string) => void;
  setUploadClassId: (value: string) => void;
  setFolderTrail: (updater: LibraryFolder[] | ((prev: LibraryFolder[]) => LibraryFolder[])) => void;
  setCreateFolderOpen: (open: boolean) => void;
  setRenameState: (state: LibraryRenameState | null) => void;
  setConfirmation: (config: ConfirmationDialogConfig | null) => void;
  setNewFolderName: (value: string) => void;
  setSelectedUpload: (file: File | null) => void;
  handlePreview: (fileId: string) => Promise<void>;
  handleDownload: (file: UploadedFile) => Promise<void>;
  handleDeleteFile: (file: UploadedFile) => void;
  handleDeleteFolder: (folder: LibraryFolder) => void;
  handleCreateFolder: () => Promise<void>;
  handleRenameSubmit: () => Promise<void>;
  handlePublishToggle: (file: UploadedFile) => Promise<void>;
  handleUpload: () => Promise<void>;
  reloadLibrary: () => Promise<void>;
}

export function useLibraryWorkspace({ role, userId, enabled = true }: UseLibraryWorkspaceOptions): LibraryWorkspaceController {
  const [mode, setMode] = useState<LibraryMode>('private');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folderTrail, setFolderTrail] = useState<LibraryFolder[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(enabled);
  const [uploading, setUploading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameState, setRenameState] = useState<LibraryRenameState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [uploadClassId, setUploadClassId] = useState('');

  const currentFolder = useMemo(() => folderTrail[folderTrail.length - 1] ?? null, [folderTrail]);

  const loadClasses = useCallback(async () => {
    if (!enabled) return;
    if (!userId) return;

    try {
      const response = role === 'admin' ? await classService.getAll() : await classService.getByTeacher(userId);
      const raw = 'data' in response.data ? response.data.data : response.data;
      setClasses(Array.isArray(raw) ? raw : []);
    } catch {
      setClasses([]);
    }
  }, [enabled, role, userId]);

  const loadLibrary = useCallback(async () => {
    if (!enabled) return;
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
  }, [classFilter, currentFolder?.id, enabled, mode, search]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void loadLibrary();
  }, [enabled, loadLibrary]);

  useEffect(() => {
    setFolderTrail([]);
  }, [mode]);

  const handlePreview = useCallback(async (fileId: string) => {
    try {
      const blob = await fileService.download(fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error('Failed to open PDF preview');
    }
  }, []);

  const handleDownload = useCallback(async (file: UploadedFile) => {
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
  }, []);

  const handleDeleteFile = useCallback((file: UploadedFile) => {
    setConfirmation({
      title: 'Delete library file?',
      description: 'This removes the uploaded file from Nexora Library and any folder it is currently in.',
      confirmLabel: 'Delete File',
      tone: 'danger',
      details: file.originalName,
      onConfirm: async () => {
        try {
          await fileService.delete(file.id);
          toast.success('File deleted');
          await loadLibrary();
        } catch {
          toast.error('Failed to delete file');
        }
      },
    });
  }, [loadLibrary]);

  const handleDeleteFolder = useCallback((folder: LibraryFolder) => {
    setConfirmation({
      title: 'Delete folder?',
      description: 'Files inside this folder will be moved out before the folder is removed.',
      confirmLabel: 'Delete Folder',
      tone: 'danger',
      details: folder.name,
      onConfirm: async () => {
        try {
          await fileService.deleteFolder(folder.id);
          toast.success('Folder deleted');
          setFolderTrail((prev) => prev.filter((item) => item.id !== folder.id));
          await loadLibrary();
        } catch (error: unknown) {
          toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Failed to delete folder',
          );
        }
      },
    });
  }, [loadLibrary]);

  const handleCreateFolder = useCallback(async () => {
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
      await loadLibrary();
    } catch {
      toast.error('Failed to create folder');
    }
  }, [currentFolder?.id, loadLibrary, mode, newFolderName]);

  const handleRenameSubmit = useCallback(async () => {
    if (!renameState?.value.trim()) return;

    try {
      if (renameState.type === 'folder') {
        await fileService.updateFolder(renameState.id, { name: renameState.value.trim() });
      } else {
        await fileService.update(renameState.id, { originalName: renameState.value.trim() });
      }
      toast.success('Renamed successfully');
      setRenameState(null);
      await loadLibrary();
    } catch {
      toast.error('Failed to rename item');
    }
  }, [loadLibrary, renameState]);

  const handlePublishToggle = useCallback(async (file: UploadedFile) => {
    try {
      await fileService.update(file.id, {
        scope: file.scope === 'general' ? 'private' : 'general',
        classId: file.classId ?? null,
        folderId: null,
      });
      toast.success(file.scope === 'general' ? 'Moved back to My Library' : 'Published to General Modules');
      await loadLibrary();
    } catch {
      toast.error('Failed to update module visibility');
    }
  }, [loadLibrary]);

  const handleUpload = useCallback(async () => {
    if (!selectedUpload) return;

    try {
      setUploading(true);
      await fileService.upload(selectedUpload, {
        scope: mode,
        folderId: currentFolder?.id,
        classId: (role === 'admin' ? classFilter : uploadClassId) || undefined,
      });
      toast.success('Module uploaded successfully');
      setSelectedUpload(null);
      setUploadClassId('');
      await loadLibrary();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to upload module',
      );
    } finally {
      setUploading(false);
    }
  }, [classFilter, currentFolder?.id, loadLibrary, mode, role, selectedUpload, uploadClassId]);

  return {
    role,
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
    reloadLibrary: loadLibrary,
  };
}
