import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LessonEditorPage from './page';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'lesson-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ role: 'teacher' }),
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getById: jest.fn(),
    getVersions: jest.fn(),
    update: jest.fn(),
    createVersion: jest.fn(),
    restoreVersion: jest.fn(),
    createBlock: jest.fn(),
    updateBlock: jest.fn(),
    reorderBlocks: jest.fn(),
    deleteBlock: jest.fn(),
  },
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
  },
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;

describe('LessonEditorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'class-1',
        subjectName: 'Math',
        subjectCode: 'MTH7',
        schedules: [],
      } as never,
    });

    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Lesson One',
        description: '<p>Lesson baseline</p>',
        order: 1,
        isDraft: true,
        contentBlocks: [],
      } as never,
    });

    mockedLessonService.getVersions.mockResolvedValue({
      count: 1,
      success: true,
      message: 'ok',
      data: [
        {
          id: 'version-1',
          lessonId: 'lesson-1',
          versionNumber: 1,
          type: 'manual',
          createdAt: '2026-05-03T00:00:00.000Z',
          createdByName: 'Admin',
          metadata: null,
        },
      ] as never,
    });

    mockedLessonService.update.mockResolvedValue({
      success: true,
      message: 'saved',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Lesson One',
        description: '<p>Lesson baseline</p>',
        order: 1,
        isDraft: true,
        contentBlocks: [],
      } as never,
    });

    mockedLessonService.createVersion.mockResolvedValue({
      count: 0,
      success: true,
      message: 'ok',
      data: {} as never,
    });
    mockedLessonService.restoreVersion.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {} as never,
    });
    mockedLessonService.createBlock.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'block-1' } as never,
    });
    mockedLessonService.updateBlock.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {} as never,
    });
    mockedLessonService.reorderBlocks.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {} as never,
    });
    mockedLessonService.deleteBlock.mockResolvedValue(undefined);

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    });
  });

  it('opens the lesson helper guide from the top-right question-mark button', async () => {
    render(<LessonEditorPage />);

    expect(await screen.findByText('Lesson One')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /lesson help/i }));

    expect(
      await screen.findByText('Teacher guide: Lesson Editor Workspace'),
    ).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
    expect(
      screen.getByText('Start from the lesson header'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Finish lesson details')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Build your content flow')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(
      screen.getByText('Take snapshots before publish'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));

    await waitFor(() => {
      expect(
        screen.queryByText('Teacher guide: Lesson Editor Workspace'),
      ).not.toBeInTheDocument();
    });
  });
});
