'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NexoraLibraryPage from './page';
import { classService } from '@/services/class-service';
import { fileService } from '@/services/file-service';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    role: 'admin',
    user: {
      id: 'admin-1',
      firstName: 'Alex',
      lastName: 'Rivera',
    },
  }),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getAll: jest.fn(),
    getByTeacher: jest.fn(),
  },
}));

jest.mock('@/services/file-service', () => ({
  fileService: {
    getFolders: jest.fn(),
    getAll: jest.fn(),
    upload: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteFolder: jest.fn(),
    download: jest.fn(),
  },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedFileService = fileService as jest.Mocked<typeof fileService>;
type ClassListResponse = Awaited<ReturnType<typeof classService.getAll>>;
type FolderListResponse = Awaited<ReturnType<typeof fileService.getFolders>>;
type FileListResponse = Awaited<ReturnType<typeof fileService.getAll>>;
type UploadResponse = Awaited<ReturnType<typeof fileService.upload>>;

describe('NexoraLibraryPage (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClassService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        data: [
          {
            id: 'class-1',
            subjectCode: 'MATH',
            subjectName: 'Mathematics',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      },
    } as ClassListResponse);
    mockedFileService.getFolders.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'folder-1',
          name: 'Mathematics',
          ownerId: 'admin-1',
          scope: 'private',
        },
      ],
      count: 1,
    } as FolderListResponse);
    mockedFileService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'file-1',
          originalName: 'Chapter 1 - Algebra Basics.pdf',
          sizeBytes: 1024 * 1024 * 2,
          scope: 'general',
          uploadedAt: '2026-03-27T00:00:00.000Z',
          class: { subjectName: 'Mathematics' },
        },
      ],
      count: 1,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as FileListResponse);
    mockedFileService.upload.mockResolvedValue({
      success: true,
      message: 'uploaded',
      data: {} as UploadResponse['data'],
    } as UploadResponse);
  });

  it('renders admin library layout and uploads selected PDF', async () => {
    const { container } = render(<NexoraLibraryPage />);

    expect(await screen.findByRole('heading', { name: 'Nexora Library' })).toBeInTheDocument();
    expect(await screen.findByText('Chapter 1 - Algebra Basics.pdf')).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf'], 'module.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText('Ready to Upload');
    const uploadButtons = screen.getAllByRole('button', { name: 'Upload PDF' });
    fireEvent.click(uploadButtons[uploadButtons.length - 1]);

    await waitFor(() =>
      expect(mockedFileService.upload).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          scope: 'private',
        }),
      ),
    );
  });
});
