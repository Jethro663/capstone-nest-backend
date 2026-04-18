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

function normalizeLibrarySubjectKey(
  subjectCode?: string | null,
  subjectName?: string | null,
): LibrarySubjectKey | undefined {
  const raw = `${subjectCode ?? ''} ${subjectName ?? ''}`.toLowerCase();
  if (raw.includes('science') || raw.includes('sci')) return 'science';
  if (raw.includes('math')) return 'math';
  if (raw.includes('english') || raw.includes('eng')) return 'english';
  if (raw.includes('filipino') || raw.includes('fil')) return 'filipino';
  if (raw.includes('araling') || raw.includes('panlipunan') || /\bap\b/.test(raw)) return 'ap';
  if (raw.includes('tle')) return 'tle';
  if (raw.includes('mapeh')) return 'mapeh';
  if (raw.includes('esp') || raw.includes('values') || raw.includes('pagpapakatao')) return 'esp';
  return undefined;
}

function normalizeLibraryGradeLevel(value?: string | null): LibraryGradeLevel | undefined {
  const match = String(value ?? '').match(/\b(7|8|9|10)\b/);
  if (!match) return undefined;
  return match[1] as LibraryGradeLevel;
}

function getClassLibraryPartition(classItem?: ClassItem | null): {
  subjectKey?: LibrarySubjectKey;
  gradeLevel?: LibraryGradeLevel;
} {
  if (!classItem) {
    return {};
  }

  return {
    subjectKey: normalizeLibrarySubjectKey(classItem.subjectCode, classItem.subjectName),
    gradeLevel: normalizeLibraryGradeLevel(
      classItem.subjectGradeLevel ?? classItem.section?.gradeLevel,
    ),
  };
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
  uploadDestination: 'personal' | 'class';
  uploadClassId: string;
  uploadSubjectKey: LibrarySubjectKey | '';
  uploadGradeLevel: LibraryGradeLevel | '';
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
  setUploadDestination: (value: 'personal' | 'class') => void;
  setUploadClassId: (value: string) => void;
  setUploadSubjectKey: (value: LibrarySubjectKey | '') => void;
  setUploadGradeLevel: (value: LibraryGradeLevel | '') => void;
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
  handleAiEnabledToggle: (file: UploadedFile) => Promise<void>;
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
  const [uploadDestination, setUploadDestination] = useState<'personal' | 'class'>('personal');
  const [loading, setLoading] = useState(enabled);
  const [uploading, setUploading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameState, setRenameState] = useState<LibraryRenameState | null>(null);
  const [moveState, setMoveState] = useState<LibraryMoveState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [uploadClassId, setUploadClassId] = useState('');
  const [uploadSubjectKey, setUploadSubjectKey] = useState<LibrarySubjectKey | ''>('');
  const [uploadGradeLevel, setUploadGradeLevel] = useState<LibraryGradeLevel | ''>('');
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
      const folderPromise = role === 'admin' || scope === 'general'
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
          classId:
            role === 'admin' || scope === 'general'
              ? undefined
              : classFilter || undefined,
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
    if (mode === 'general') {
      setUploadClassId('');
      setSelectedUpload(null);
    }
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

  const handleAiEnabledToggle = useCallback(async (file: UploadedFile) => {
    try {
      await fileService.update(file.id, {
        aiEnabled: !(file.aiEnabled ?? true),
        classId: file.classId ?? null,
        folderId: file.folderId ?? null,
        scope: file.scope,
        subjectKey: file.subjectKey ?? undefined,
        gradeLevel: file.gradeLevel ?? undefined,
      });
      toast.success(file.aiEnabled === false ? 'AI access enabled' : 'AI access disabled');
      await loadLibrary();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update AI usage',
      );
    }
  }, [loadLibrary]);

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
    if (role === 'teacher' && mode !== 'private') {
      toast.error('Teachers can only upload files inside My Library.');
      return;
    }

    const teacherUploadClass =
      role !== 'teacher' || uploadDestination !== 'class'
        ? undefined
        : classes.find((item) => item.id === uploadClassId);
    const teacherUploadPartition = getClassLibraryPartition(teacherUploadClass);

    if (role === 'teacher' && (!uploadSubjectKey || !uploadGradeLevel)) {
      toast.error('Choose a subject and grade before uploading to My Library.');
      return;
    }

    if (role === 'teacher' && uploadDestination === 'class' && !uploadClassId) {
      toast.error('Choose a class for class-specific library files.');
      return;
    }

    if (
      role === 'teacher' &&
      uploadDestination === 'class' &&
      teacherUploadClass &&
      (teacherUploadPartition.subjectKey !== uploadSubjectKey ||
        teacherUploadPartition.gradeLevel !== uploadGradeLevel)
    ) {
      toast.error('Selected subject and grade must match the chosen class.');
      return;
    }

    try {
      setUploading(true);
      await fileService.upload(selectedUpload, {
        scope: role === 'admin' ? 'general' : mode,
        folderId: role === 'admin' ? undefined : currentFolder?.id,
        classId:
          role === 'admin'
            ? undefined
            : uploadDestination === 'class'
              ? uploadClassId || undefined
              : undefined,
        subjectKey:
          role === 'admin'
            ? subjectFilter || undefined
            : uploadSubjectKey || undefined,
        gradeLevel:
          role === 'admin'
            ? gradeFilter || undefined
            : uploadGradeLevel || undefined,
        aiEnabled: role === 'teacher' ? true : undefined,
        teacherVisible: true,
      });
      toast.success('Module uploaded successfully');
      setSelectedUpload(null);
      setUploadDestination('personal');
      setUploadClassId('');
      setUploadSubjectKey('');
      setUploadGradeLevel('');
      await loadLibrary();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to upload module',
      );
    } finally {
      setUploading(false);
    }
  }, [
    classes,
    currentFolder?.id,
    gradeFilter,
    loadLibrary,
    mode,
    role,
    selectedUpload,
    subjectFilter,
    uploadClassId,
    uploadDestination,
    uploadGradeLevel,
    uploadSubjectKey,
  ]);

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
    uploadDestination,
    uploadClassId,
    uploadSubjectKey,
    uploadGradeLevel,
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
    handlePublishToggle,
    handleVisibilityToggle,
    handleAiEnabledToggle,
    handleRetryIndex,
    handleMoveSubmit,
    openMoveDialog,
    handleUpload,
    reloadLibrary: loadLibrary,
  };
}
