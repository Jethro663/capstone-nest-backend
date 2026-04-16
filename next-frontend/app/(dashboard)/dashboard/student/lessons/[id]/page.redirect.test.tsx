import { render, waitFor } from '@testing-library/react';
import StudentLessonViewPage from './page';
import { lessonService } from '@/services/lesson-service';

const back = jest.fn();
const push = jest.fn();
const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'lesson-1' }),
  useRouter: () => ({ back, push, replace }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'classId') return 'class-1';
      if (key === 'moduleId') return 'module-1';
      return null;
    },
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getById: jest.fn(),
    getCompletionStatus: jest.fn(),
    complete: jest.fn(),
  },
}));

const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;

describe('StudentLessonViewPage module-route redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Intro',
        order: 1,
        isDraft: false,
        contentBlocks: [],
      },
    } as Awaited<ReturnType<typeof lessonService.getById>>);
    mockedLessonService.getCompletionStatus.mockResolvedValue({
      success: true,
      data: { completed: false },
    });
  });

  it('redirects lesson access to module-owned student route when moduleId is provided', async () => {
    render(<StudentLessonViewPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        '/dashboard/student/classes/class-1/modules/module-1?lessonId=lesson-1',
      );
    });
  });
});
