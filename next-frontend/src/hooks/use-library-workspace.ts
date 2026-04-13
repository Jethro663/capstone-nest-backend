'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { fileService } from '@/services/file-service';
import type { ClassItem } from '@/types/class';
import type {
  LibraryFolder,
  LibraryGradeLevel,
  LibrarySubjectKey,
  UploadedFile,
} from '@/types/file';
import type { ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';

export type LibraryMode = 'private' | 'general';
export type LibraryRole = 'teacher' | 'admin';

export interface LibraryRenameState {
  type: 'file' | 'folder';
  id: string;
  value: string;
}

export interface LibraryMoveState {
  file: UploadedFile;
  subjectKey: LibrarySubjectKey;
  gradeLevel: LibraryGradeLevel;
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
  subjectFilter: LibrarySubjectKey | '';
  gradeFilter: LibraryGradeLevel | '';
  uploadClassId: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
  uploading: boolean;
  createFolderOpen: boolean;
  renameState: LibraryRenameState | null;
  moveState: LibraryMoveState | null;
  confirmation: ConfirmationDialogConfig | null;
  newFolderName: string;
  selectedUpload: File | null;
  setSearch: (value: string) => void;
  setClassFilter: (value: string) => void;
  setSubjectFilter: (value: LibrarySubjectKey | '') => void;
  setGradeFilter: (value: LibraryGradeLevel | '') => void;
  setUploadClassId: (value: string) => void;
  setPage: (value: number) => void;
  setFolderTrail: (updater: LibraryFolder[] | ((prev: LibraryFolder[]) => LibraryFolder[])) => void;
  setCreateFolderOpen: (open: boolean) => void;
  setRenameState: (state: LibraryRenameState | null) => void;
  setMoveState: (state: LibraryMoveState | null) => void;
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
  handleVisibilityToggle: (file: UploadedFile) => Promise<void>;
  handleRetryIndex: (file: UploadedFile) => Promise<void>;
  handleMoveSubmit: () => Promise<void>;
  openMoveDialog: (file: UploadedFile) => void;
  handleUpload: () => Promise<void>;
  reloadLibrary: () => Promise<void>;
}

export function useLibraryWorkspace({ role, userId, enabled = true }: UseLibraryWorkspaceOptions): LibraryWorkspaceController {
  const [mode, setModeState] = useState<LibraryMode>(role === 'admin' ? 'general' : 'private');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folderTrail, setFolderTrail] = useState<LibraryFolder[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<LibrarySubjectKey | ''>('');
  const [gradeFilter, setGradeFilter] = useState<LibraryGradeLevel | ''>('');
  const [loading, setLoading] = useState(enabled);
  const [uploading, setUploading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameState, setRenameState] = useState<LibraryRenameState | null>(null);
  const [moveState, setMoveState] = useState<LibraryMoveState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [uploadClassId, setUploadClassId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const currentFolder = useMemo(() => folderTrail[folderTrail.length - 1] ?? null, [folderTrail]);

  const setMode = useCallback((nextMode: LibraryMode) => {
    setModeState(role === 'admin' ? 'general' : nextMode);
    setPage(1);
  }, [role]);

  const loadClasses = useCallback(async () => {
    if (!enabled) return;
    if (!userId) return;
    if (role === 'admin') {
      setClasses([]);
      return;
    }

    try {
      const response = await classService.getByTeacher(userId);
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
      const scope = role === 'admin' ? 'general' : mode;
      const folderId = currentFolder?.id;
      const folderPromise = role === 'admin'
        ? Promise.resolve({ data: [] as LibraryFolder[] })
        : fileService.getFolders({
            scope,
            folderId,
            search: debouncedSearch.trim() || undefined,
          });
      const [folderResponse, fileResponse] = await Promise.all([
        folderPromise,
        fileService.getAll({
          scope,
          folderId,
          classId: role === 'admin' ? undefined : classFilter || undefined,
          subjectKey: subjectFilter || undefined,
          gradeLevel: gradeFilter || undefined,
          teacherVisible: role === 'admin' ? undefined : scope === 'general' ? true : undefined,
          search: debouncedSearch.trim() || undefined,
          page,
          limit,
        }),
      ]);
      setFolders(folderResponse.data);
      setFiles(fileResponse.data);
      setTotal(fileResponse.total ?? fileResponse.data.length);
      setTotalPages(fileResponse.totalPages ?? 1);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load Nexora Library';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, currentFolder?.id, debouncedSearch, enabled, gradeFilter, limit, mode, page, role, subjectFilter]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search]);

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

  useEffect(() => {
    setPage(1);
  }, [classFilter, subjectFilter, gradeFilter]);

  const handlePreview = useCallback(async (fileId: string) => {
    try {
      const blob = await fileService.download(fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error('Failed to open file preview');
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

  const handleVisibilityToggle = useCallback(async (file: UploadedFile) => {
    try {
      await fileService.update(file.id, {
        teacherVisible: !file.teacherVisible,
        subjectKey: (file.subjectKey ?? subjectFilter) || undefined,
        gradeLevel: (file.gradeLevel ?? gradeFilter) || undefined,
        scope: file.scope,
      });
      toast.success(!file.teacherVisible ? 'Visible to teachers' : 'Hidden from teachers');
      await loadLibrary();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update teacher visibility',
      );
    }
  }, [gradeFilter, loadLibrary, subjectFilter]);

  const handleRetryIndex = useCallback(async (file: UploadedFile) => {
    try {
      await fileService.retryIndex(file.id);
      toast.success('Indexing queued');
      await loadLibrary();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to queue indexing',
      );
    }
  }, [loadLibrary]);

  const openMoveDialog = useCallback((file: UploadedFile) => {
    setMoveState({
      file,
      subjectKey: (file.subjectKey ?? subjectFilter) as LibrarySubjectKey,
      gradeLevel: (file.gradeLevel ?? gradeFilter) as LibraryGradeLevel,
    });
  }, [gradeFilter, subjectFilter]);

  const handleMoveSubmit = useCallback(async () => {
    if (!moveState?.subjectKey || !moveState.gradeLevel) return;

    try {
      await fileService.update(moveState.file.id, {
        scope: 'general',
        subjectKey: moveState.subjectKey,
        gradeLevel: moveState.gradeLevel,
        teacherVisible: moveState.file.teacherVisible ?? true,
      });
      toast.success('File moved to new partition');
      setMoveState(null);
      await loadLibrary();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to move file',
      );
    }
  }, [loadLibrary, moveState]);

  const handleUpload = useCallback(async () => {
    if (!selectedUpload) return;
    if (role === 'admin' && (!subjectFilter || !gradeFilter)) {
      toast.error('Choose a subject and grade before uploading to General Modules.');
      return;
    }

    try {
      setUploading(true);
      await fileService.upload(selectedUpload, {
        scope: role === 'admin' ? 'general' : mode,
        folderId: role === 'admin' ? undefined : currentFolder?.id,
        classId: role === 'admin' ? undefined : uploadClassId || undefined,
        subjectKey: role === 'admin' ? subjectFilter || undefined : undefined,
        gradeLevel: role === 'admin' ? gradeFilter || undefined : undefined,
        teacherVisible: true,
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
  }, [currentFolder?.id, gradeFilter, loadLibrary, mode, role, selectedUpload, subjectFilter, uploadClassId]);

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
    subjectFilter,
    gradeFilter,
    uploadClassId,
    page,
    limit,
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
    setUploadClassId,
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
    handlePublishToggle,
    handleVisibilityToggle,
    handleRetryIndex,
    handleMoveSubmit,
    openMoveDialog,
    handleUpload,
    reloadLibrary: loadLibrary,
  };
}
