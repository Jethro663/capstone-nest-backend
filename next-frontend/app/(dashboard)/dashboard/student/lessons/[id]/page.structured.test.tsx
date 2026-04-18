import { render, screen, waitFor } from '@testing-library/react';
import StudentLessonViewPage from './page';
import { lessonService } from '@/services/lesson-service';

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

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;

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
  });

  it('renders semantic lesson sections and inline checkpoint choices', async () => {
    render(<StudentLessonViewPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Learning objectives').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Key points').length).toBeGreaterThan(0);
    expect(screen.getByText('Which pair shows a ratio?')).toBeInTheDocument();
    expect(screen.getByText('2:3')).toBeInTheDocument();
    expect(screen.getByText('5 + 1')).toBeInTheDocument();
  });
});
