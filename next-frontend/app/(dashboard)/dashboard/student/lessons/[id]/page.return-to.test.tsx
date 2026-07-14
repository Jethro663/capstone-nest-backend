import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentLessonViewPage from './page';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { moduleService } from '@/services/module-service';

const back = jest.fn();
const push = jest.fn();
const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'lesson-1' }),
  useRouter: () => ({ back, push, replace }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'returnTo') return '/dashboard/student/lxp/class-1';
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

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
    downloadAttachedFile: jest.fn(),
  },
}));

const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;

describe('StudentLessonViewPage LXP returnTo routing', () => {
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
    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectGradeLevel: '7',
        section: { id: 'section-1', name: 'Section A', gradeLevel: '7' },
        teacher: { id: 'teacher-1', firstName: 'Maria', lastName: 'Santos' },
      } as never,
    });
    mockedModuleService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 1,
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Module 1',
          order: 1,
          isVisible: true,
          isLocked: false,
          requiredCompletedCount: 0,
          requiredVisibleCount: 1,
          progressPercent: 0,
          sections: [
            {
              id: 'section-1',
              moduleId: 'module-1',
              title: 'Section A',
              order: 1,
              items: [
                {
                  id: 'item-lesson-1',
                  moduleSectionId: 'section-1',
                  itemType: 'lesson',
                  lessonId: 'lesson-1',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: true,
                  lessonPoints: 10,
                  lesson: {
                    id: 'lesson-1',
                    classId: 'class-1',
                    title: 'Intro',
                    order: 1,
                    isDraft: false,
                  },
                },
              ],
            },
          ],
          gradingScaleEntries: [],
        },
      ] as never,
    });
  });

  it('sends both back controls to the provided LXP return path', async () => {
    render(<StudentLessonViewPage />);

    const topBack = await screen.findByRole('link', { name: 'Back' });
    expect(topBack).toHaveAttribute('href', '/dashboard/student/lxp/class-1');
    expect(screen.getByRole('button', { name: 'Back to Path' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Path' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/dashboard/student/lxp/class-1');
    });
  });

  it('keeps the provided LXP return path available when lesson loading fails', async () => {
    mockedLessonService.getById.mockRejectedValueOnce(new Error('upstream database unavailable'));

    render(<StudentLessonViewPage />);

    expect(
      await screen.findByRole('heading', { name: "Lesson couldn't be loaded" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Path' })).toHaveAttribute(
      'href',
      '/dashboard/student/lxp/class-1',
    );
  });
});
