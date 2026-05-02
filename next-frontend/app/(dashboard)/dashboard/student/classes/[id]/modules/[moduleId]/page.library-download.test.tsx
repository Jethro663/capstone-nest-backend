'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentModuleDetailPage from './page';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { lessonService } from '@/services/lesson-service';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const routerMock = { push: pushMock, replace: replaceMock };
const searchParamsMock = { get: jest.fn(() => null) };

jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockNextImage(props: Record<string, unknown>) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'class-1', moduleId: 'module-1' }),
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock,
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/class-service', () => ({
  classService: { getById: jest.fn() },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClassAndModule: jest.fn(),
    downloadAttachedFile: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getById: jest.fn(),
    getCompletionStatus: jest.fn(),
    complete: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {},
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;

describe('StudentModuleDetailPage library downloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushMock.mockReset();
    replaceMock.mockReset();
    searchParamsMock.get.mockReturnValue(null);
    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'class-1',
        subjectName: 'Science',
        subjectGradeLevel: '7',
        section: { id: 'section-1', name: 'Newton', gradeLevel: '7' },
        teacher: { id: 'teacher-1', firstName: 'Maria', lastName: 'Santos' },
      } as never,
    });
    mockedModuleService.getByClassAndModule.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'module-1',
        classId: 'class-1',
        title: 'Module 1',
        description: 'Desc',
        order: 1,
        isVisible: true,
        isLocked: false,
        sections: [
          {
            id: 'section-1',
            moduleId: 'module-1',
            title: 'Section A',
            order: 1,
            items: [
              {
                id: 'item-file-1',
                moduleSectionId: 'section-1',
                itemType: 'file',
                fileId: 'private-file-1',
                order: 1,
                isVisible: true,
                isRequired: false,
                isGiven: true,
                file: {
                  id: 'private-file-1',
                  originalName: 'Private Notes.pdf',
                  mimeType: 'application/pdf',
                  sizeBytes: 2048,
                  scope: 'private',
                },
              },
            ],
          },
        ],
        gradingScaleEntries: [],
      } as never,
    });
    mockedModuleService.downloadAttachedFile.mockResolvedValue(new Blob(['pdf']));
    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Checkpoint Lesson',
        order: 1,
        isDraft: false,
        contentBlocks: [],
      },
    });
    mockedLessonService.getCompletionStatus.mockResolvedValue({
      success: true,
      data: { completed: false },
    });
    mockedLessonService.complete.mockResolvedValue({
      success: true,
      data: { completed: true },
    });
    global.URL.createObjectURL = jest.fn(() => 'blob:module-file');
    global.URL.revokeObjectURL = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();
  });

  it('downloads file blocks through moduleService.downloadAttachedFile on the student page', async () => {
    render(<StudentModuleDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(mockedModuleService.downloadAttachedFile).toHaveBeenCalledWith('item-file-1');
    });
  });

  it('requires configured checkpoints to be answered before the lesson completion timer unlocks', async () => {
    searchParamsMock.get.mockImplementation((key: string) => (key === 'lessonId' ? 'lesson-1' : null));
    mockedModuleService.getByClassAndModule.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'module-1',
        classId: 'class-1',
        title: 'Module 1',
        description: 'Desc',
        order: 1,
        isVisible: true,
        isLocked: false,
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
                completed: false,
                lessonPoints: 10,
                lesson: {
                  id: 'lesson-1',
                  title: 'Checkpoint Lesson',
                  isDraft: false,
                },
              },
            ],
          },
        ],
        gradingScaleEntries: [],
      } as never,
    });
    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Checkpoint Lesson',
        order: 1,
        isDraft: false,
        contentBlocks: [
          {
            id: 'checkpoint-1',
            lessonId: 'lesson-1',
            type: 'question',
            order: 1,
            content: {
              prompt: '<p>What is 2 + 2?</p>',
              answerType: 'single_select',
              choices: [
                { id: 'wrong', html: '<p>3</p>' },
                { id: 'right', html: '<p>4</p>' },
              ],
            },
            metadata: {
              correctAnswers: ['right'],
              explanation: '<p>2 + 2 equals 4.</p>',
            },
          },
        ],
      },
    });

    render(<StudentModuleDetailPage />);

    expect(await screen.findByText(/Answer all checkpoints correctly/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /3/i }));
    expect(await screen.findByText(/Not yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /4/i }));
    expect(await screen.findByText(/Stay on this lesson/i)).toBeInTheDocument();
  });

  it('renders lesson description content when the module lesson has no block rows', async () => {
    searchParamsMock.get.mockImplementation((key: string) => (key === 'lessonId' ? 'lesson-1' : null));
    mockedModuleService.getByClassAndModule.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'module-1',
        classId: 'class-1',
        title: 'Module 1',
        description: 'Desc',
        order: 1,
        isVisible: true,
        isLocked: false,
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
                completed: false,
                lessonPoints: 0,
                lesson: {
                  id: 'lesson-1',
                  title: 'Aralin 1.1',
                  isDraft: false,
                },
              },
            ],
          },
        ],
        gradingScaleEntries: [],
      } as never,
    });
    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Aralin 1.1',
        description: '<p>Panimula</p><p>Mga Karunungang Bayan</p>',
        order: 1,
        isDraft: false,
        contentBlocks: [],
      },
    });

    render(<StudentModuleDetailPage />);

    expect(await screen.findByText('Panimula')).toBeInTheDocument();
    expect(screen.getByText('Mga Karunungang Bayan')).toBeInTheDocument();
    expect(screen.queryByText('No lesson content available.')).not.toBeInTheDocument();
  });

  it('does not duplicate the lesson hero when a lesson is opened inside the module route', async () => {
    searchParamsMock.get.mockImplementation((key: string) => (key === 'lessonId' ? 'lesson-1' : null));
    mockedModuleService.getByClassAndModule.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'module-1',
        classId: 'class-1',
        title: 'Module 1',
        description: 'Desc',
        order: 1,
        isVisible: true,
        isLocked: false,
        requiredCompletedCount: 0,
        requiredVisibleCount: 0,
        progressPercent: 100,
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
                isRequired: false,
                isGiven: true,
                completed: true,
                lessonPoints: 0,
                lesson: {
                  id: 'lesson-1',
                  title: 'Lesson #1',
                  isDraft: false,
                },
              },
            ],
          },
        ],
        gradingScaleEntries: [],
      } as never,
    });
    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Lesson #1',
        description: '<p>What I Need To Know</p>',
        order: 1,
        isDraft: false,
        contentBlocks: [],
      },
    });
    mockedLessonService.getCompletionStatus.mockResolvedValue({
      success: true,
      data: { completed: true },
    });

    render(<StudentModuleDetailPage />);

    await screen.findByText('What I Need To Know');

    expect(screen.getAllByRole('link', { name: 'Back' })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { name: 'Lesson #1', level: 1 })).toHaveLength(1);
  });
});
