import { render, screen } from '@testing-library/react';
import { LibraryWorkspaceView } from '@/components/library/LibraryWorkspaceView';
import type { LibraryWorkspaceController } from '@/hooks/use-library-workspace';
import type { UploadedFile } from '@/types/file';

function createFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    id: 'file-1',
    teacherId: 'teacher-1',
    scope: 'private',
    originalName: 'Teacher Notes.pdf',
    storedName: 'teacher-notes.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    filePath: 'uploads/library/teacher-notes.pdf',
    uploadedAt: '2026-04-17T00:00:00.000Z',
    teacherVisible: true,
    aiEnabled: true,
    ...overrides,
  };
}

function createWorkspace(
  overrides: Partial<LibraryWorkspaceController> = {},
): LibraryWorkspaceController {
  return {
    role: 'teacher',
    mode: 'private',
    setMode: jest.fn(),
    classes: [],
    folders: [],
    files: [],
    folderTrail: [],
    currentFolder: null,
    search: '',
    classFilter: '',
    subjectFilter: '',
    gradeFilter: '',
    uploadDestination: 'personal',
    uploadClassId: '',
    uploadSubjectKey: '',
    uploadGradeLevel: '',
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    loading: false,
    uploading: false,
    createFolderOpen: false,
    renameState: null,
    moveState: null,
    confirmation: null,
    newFolderName: '',
    selectedUpload: null,
    setSearch: jest.fn(),
    setClassFilter: jest.fn(),
    setSubjectFilter: jest.fn(),
    setGradeFilter: jest.fn(),
    setUploadDestination: jest.fn(),
    setUploadClassId: jest.fn(),
    setUploadSubjectKey: jest.fn(),
    setUploadGradeLevel: jest.fn(),
    setPage: jest.fn(),
    setFolderTrail: jest.fn(),
    setCreateFolderOpen: jest.fn(),
    setRenameState: jest.fn(),
    setMoveState: jest.fn(),
    setConfirmation: jest.fn(),
    setNewFolderName: jest.fn(),
    setSelectedUpload: jest.fn(),
    handlePreview: jest.fn(),
    handleDownload: jest.fn(),
    handleDeleteFile: jest.fn(),
    handleDeleteFolder: jest.fn(),
    handleCreateFolder: jest.fn(),
    handleRenameSubmit: jest.fn(),
    handlePublishToggle: jest.fn(),
    handleVisibilityToggle: jest.fn(),
    handleAiEnabledToggle: jest.fn(),
    handleRetryIndex: jest.fn(),
    handleMoveSubmit: jest.fn(),
    openMoveDialog: jest.fn(),
    handleUpload: jest.fn(),
    reloadLibrary: jest.fn(),
    ...overrides,
  };
}

describe('LibraryWorkspaceView teacher mode', () => {
  it('shows General Modules and My Library tabs for teachers', () => {
    const workspace = createWorkspace();

    render(<LibraryWorkspaceView variant="teacher" workspace={workspace} />);

    expect(screen.getByRole('button', { name: 'My Library' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General Modules' })).toBeInTheDocument();
  });

  it('keeps teacher general modules read-only', () => {
    const file = createFile({
      scope: 'general',
      originalName: 'General science.pdf',
      subjectKey: 'science',
      gradeLevel: '7',
    });
    const workspace = createWorkspace({
      mode: 'general',
      files: [file],
      total: 1,
    });

    render(<LibraryWorkspaceView variant="teacher" workspace={workspace} />);

    expect(screen.queryByLabelText('Teacher visible')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename General science.pdf' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete General science.pdf' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview General science.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download General science.pdf' })).toBeInTheDocument();
  });

  it('shows an AI toggle for teacher-owned files in My Library', () => {
    const workspace = createWorkspace({
      mode: 'private',
      files: [createFile()],
      total: 1,
    });

    render(<LibraryWorkspaceView variant="teacher" workspace={workspace} />);

    expect(screen.getByLabelText('Use in AI')).toBeInTheDocument();
  });

  it('allows opening the upload picker before teacher metadata is selected', () => {
    const workspace = createWorkspace({
      mode: 'private',
      uploadSubjectKey: '',
      uploadGradeLevel: '',
    });

    render(<LibraryWorkspaceView variant="teacher" workspace={workspace} />);

    expect(screen.getByRole('button', { name: 'Upload File' })).toBeEnabled();
  });

  it('limits class-specific upload choices to the selected subject and grade', () => {
    const workspace = createWorkspace({
      selectedUpload: new File(['pdf'], 'lesson.pdf', { type: 'application/pdf' }),
      uploadDestination: 'class',
      uploadSubjectKey: 'math',
      uploadGradeLevel: '7',
      classes: [
        {
          id: 'math-7',
          subjectCode: 'MATH-7',
          subjectName: 'Mathematics',
          gradeLevel: '7',
          section: { id: 'section-1', name: 'Section A', gradeLevel: '7' },
        },
        {
          id: 'science-7',
          subjectCode: 'SCI-7',
          subjectName: 'Science',
          gradeLevel: '7',
          section: { id: 'section-2', name: 'Section B', gradeLevel: '7' },
        },
        {
          id: 'math-8',
          subjectCode: 'MATH-8',
          subjectName: 'Mathematics',
          gradeLevel: '8',
          section: { id: 'section-3', name: 'Section C', gradeLevel: '8' },
        },
      ] as any,
    });

    render(<LibraryWorkspaceView variant="teacher" workspace={workspace} />);

    const uploadClass = screen.getByLabelText('Upload class');
    expect(uploadClass).toHaveTextContent('MATH-7 - Mathematics');
    expect(uploadClass).not.toHaveTextContent('SCI-7 - Science');
    expect(uploadClass).not.toHaveTextContent('MATH-8 - Mathematics');
  });
});
