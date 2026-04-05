'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherModuleDetailPage from './page';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { fileService } from '@/services/file-service';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'class-1', moduleId: 'module-1' }),
  useRouter: () => ({ push: pushMock }),
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
    getByClass: jest.fn(),
    attachItem: jest.fn(),
    createSection: jest.fn(),
    updateSection: jest.fn(),
    deleteSection: jest.fn(),
    reorderSections: jest.fn(),
    updateItem: jest.fn(),
    detachItem: jest.fn(),
    reorderItems: jest.fn(),
    update: jest.fn(),
    replaceGradingScale: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getByClass: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: { getByClass: jest.fn() },
}));

jest.mock('@/services/file-service', () => ({
  fileService: { upload: jest.fn() },
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ config }: { config: { onConfirm: () => void } | null }) =>
    config ? (
      <button type="button" onClick={() => void config.onConfirm()}>
        Confirm Action
      </button>
    ) : null,
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedAssessmentService =
  assessmentService as jest.Mocked<typeof assessmentService>;
const mockedFileService = fileService as jest.Mocked<typeof fileService>;

function createModulePayload() {
  return [
    {
      id: 'module-1',
      classId: 'class-1',
      title: 'Module 1',
      description: 'Desc',
      order: 1,
      isVisible: true,
      isLocked: false,
      teacherNotes: '',
      sections: [
        {
          id: 'section-1',
          moduleId: 'module-1',
          title: 'Section A',
          description: '',
          order: 1,
          items: [],
        },
      ],
      gradingScaleEntries: [],
    },
  ];
}

describe('TeacherModuleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushMock.mockReset();

    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'class-1',
        subjectName: 'Math',
        subjectCode: 'MATH-7',
        schedules: [{ id: 'sched-1', days: ['MON'], startTime: '08:00', endTime: '09:00' }],
      } as never,
    });
    mockedModuleService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: createModulePayload() as never,
      count: 1,
    });
    mockedLessonService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    } as never);
    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      total: 0,
    } as never);
    mockedModuleService.attachItem.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {} as never,
    });
    mockedLessonService.create.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'lesson-new' } as never,
    });
    mockedLessonService.delete.mockResolvedValue(undefined);
    mockedFileService.upload.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'file-1' } as never,
    });
  });

  it('creates and attaches a new lesson block then opens lesson editor', async () => {
    render(<TeacherModuleDetailPage />);

    await screen.findByRole('heading', { name: 'Sections' });

    fireEvent.click(screen.getByRole('button', { name: 'Add Block' }));
    fireEvent.click(screen.getByRole('button', { name: /Lesson/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Block' }));

    await waitFor(() => {
      expect(mockedLessonService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: 'class-1',
          title: 'Untitled Lesson',
        }),
      );
    });
    expect(mockedModuleService.attachItem).toHaveBeenCalledWith(
      'section-1',
      expect.objectContaining({
        itemType: 'lesson',
        lessonId: 'lesson-new',
      }),
    );
    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/lessons/lesson-new/edit',
    );
  });

  it('shows orphan legacy lessons and deletes them from the cleanup section', async () => {
    mockedModuleService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
        {
          ...createModulePayload()[0],
          sections: [
            {
              id: 'section-1',
              moduleId: 'module-1',
              title: 'Section A',
              description: '',
              order: 1,
              items: [
                {
                  id: 'item-1',
                  moduleSectionId: 'section-1',
                  itemType: 'lesson',
                  lessonId: 'lesson-attached',
                  order: 1,
                  isVisible: true,
                  isRequired: false,
                  isGiven: true,
                },
              ],
            },
          ],
        },
      ] as never,
      count: 1,
    });
    mockedLessonService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
        { id: 'lesson-attached', classId: 'class-1', title: 'Attached lesson', isDraft: true },
        { id: 'lesson-orphan', classId: 'class-1', title: 'Orphan lesson', isDraft: true },
      ] as never,
      count: 2,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    } as never);

    render(<TeacherModuleDetailPage />);

    expect(await screen.findByText('Legacy Lessons (Not In Modules)')).toBeInTheDocument();
    expect(screen.getByText('Orphan lesson')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete legacy lesson' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Action' }));

    await waitFor(() => {
      expect(mockedLessonService.delete).toHaveBeenCalledWith('lesson-orphan');
    });
  });
});
