import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentLessonViewPage from './page';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { moduleService } from '@/services/module-service';

const back = jest.fn();
const push = jest.fn();
const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'lesson-structured' }),
  useRouter: () => ({ back, push, replace }),
  useSearchParams: () => ({
    get: () => null,
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

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;

describe('StudentLessonViewPage structured lesson reader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-structured',
        classId: 'class-1',
        title: 'Fractions and ratios',
        description: 'A lesson with semantic sections.',
        order: 1,
        isDraft: false,
        contentBlocks: [
          {
            id: 'text-1',
            lessonId: 'lesson-structured',
            type: 'text',
            order: 1,
            content: {
              heading: 'Learning objectives',
              html: '<ul><li>Describe a ratio in your own words.</li></ul>',
            },
            metadata: { variant: 'objectives' },
          },
          {
            id: 'text-2',
            lessonId: 'lesson-structured',
            type: 'text',
            order: 2,
            content: {
              heading: 'Key points',
              html: '<p>Ratios compare two quantities.</p>',
            },
            metadata: { variant: 'key_points' },
          },
          {
            id: 'question-1',
            lessonId: 'lesson-structured',
            type: 'question',
            order: 3,
            content: {
              prompt: 'Which pair shows a ratio?',
              choices: ['2:3', '5 + 1'],
              answerType: 'single_select',
            },
            metadata: {
              correctAnswers: ['2:3'],
              explanation: 'A ratio compares two quantities.',
              points: 2,
            },
          },
        ],
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
        section: { id: 'section-1', name: 'Newton', gradeLevel: '7' },
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
                  lessonId: 'lesson-structured',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: true,
                  lessonPoints: 10,
                  lesson: {
                    id: 'lesson-structured',
                    classId: 'class-1',
                    title: 'Fractions and ratios',
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

  it('renders the shared module-style lesson structure with semantic lesson content', async () => {
    render(<StudentLessonViewPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Learning objectives').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to module/i })).toBeInTheDocument();
    expect(
      screen.getByText('Mathematics · Grade 7 - Newton - Maria Santos'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Key points').length).toBeGreaterThan(0);
    expect(screen.getByText('Which pair shows a ratio?')).toBeInTheDocument();
    expect(screen.getByText('2:3')).toBeInTheDocument();
    expect(screen.getByText('5 + 1')).toBeInTheDocument();
  });

  it('shows a safe retryable state for a load failure without exposing service detail', async () => {
    mockedLessonService.getById.mockRejectedValueOnce(
      new Error('relation lesson_internal_drafts does not exist'),
    );

    render(<StudentLessonViewPage />);

    expect(
      await screen.findByRole('heading', { name: "Lesson couldn't be loaded" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('relation lesson_internal_drafts does not exist'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fractions and ratios' }),
    ).toBeInTheDocument();
    expect(mockedLessonService.getById).toHaveBeenCalledTimes(2);
  });

  it('distinguishes an explicit missing lesson from a general load failure', async () => {
    mockedLessonService.getById.mockRejectedValueOnce({
      response: { status: 404 },
      message: 'Lesson row was not found',
    });

    render(<StudentLessonViewPage />);

    expect(await screen.findByRole('heading', { name: 'Lesson not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Courses' })).toHaveAttribute(
      'href',
      '/dashboard/student/courses',
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByText('Lesson row was not found')).not.toBeInTheDocument();
  });
});
