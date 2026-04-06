'use client';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  assessmentService: { getByClass: jest.fn(), create: jest.fn() },
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
    mockedAssessmentService.create.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'assessment-new' } as never,
    });
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Block' })[0]);
    const dialog = await screen.findByRole('dialog');
    const lessonTypeButton = within(dialog).getByText('Lesson').closest('button');
    if (!lessonTypeButton) {
      throw new Error('Lesson block type button was not rendered');
    }
    fireEvent.click(lessonTypeButton);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Block' }));

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

  it('creates and attaches a new assessment block then opens assessment editor', async () => {
    render(<TeacherModuleDetailPage />);

    await screen.findByRole('heading', { name: 'Sections' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Block' })[0]);
    const dialog = await screen.findByRole('dialog');
    const assessmentTypeButton = within(dialog).getByText('Assessment').closest('button');
    if (!assessmentTypeButton) {
      throw new Error('Assessment block type button was not rendered');
    }
    fireEvent.click(assessmentTypeButton);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Block' }));

    await waitFor(() => {
      expect(mockedAssessmentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled Assessment',
          classId: 'class-1',
        }),
      );
    });
    expect(mockedModuleService.attachItem).toHaveBeenCalledWith(
      'section-1',
      expect.objectContaining({
        itemType: 'assessment',
        assessmentId: 'assessment-new',
        isGiven: false,
      }),
    );
    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/assessments/assessment-new/edit',
    );
  });

  it('attaches an existing assessment without creating a new one', async () => {
    mockedAssessmentService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-existing',
          classId: 'class-1',
          title: 'Existing Assessment',
          isPublished: false,
        },
      ] as never,
      count: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      total: 1,
    } as never);

    render(<TeacherModuleDetailPage />);

    await screen.findByRole('heading', { name: 'Sections' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Block' })[0]);
    const dialog = await screen.findByRole('dialog');
    const assessmentTypeButton = within(dialog).getByText('Assessment').closest('button');
    if (!assessmentTypeButton) {
      throw new Error('Assessment block type button was not rendered');
    }
    fireEvent.click(assessmentTypeButton);

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Attach Existing Assessment/i }),
    );
    fireEvent.change(within(dialog).getByLabelText('Available assessments'), {
      target: { value: 'assessment-existing' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Block' }));

    await waitFor(() => {
      expect(mockedModuleService.attachItem).toHaveBeenCalledWith(
        'section-1',
        expect.objectContaining({
          itemType: 'assessment',
          assessmentId: 'assessment-existing',
          isGiven: false,
        }),
      );
    });
    expect(mockedAssessmentService.create).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('updates assessment submit state when switching between create and existing modes', async () => {
    render(<TeacherModuleDetailPage />);

    await screen.findByRole('heading', { name: 'Sections' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Block' })[0]);
    const dialog = await screen.findByRole('dialog');
    const assessmentTypeButton = within(dialog).getByText('Assessment').closest('button');
    if (!assessmentTypeButton) {
      throw new Error('Assessment block type button was not rendered');
    }
    fireEvent.click(assessmentTypeButton);

    const submitButton = within(dialog).getByRole('button', { name: 'Add Block' });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Attach Existing Assessment/i }),
    );
    expect(submitButton).toBeDisabled();

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Create New Assessment/i }),
    );
    expect(submitButton).not.toBeDisabled();
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
