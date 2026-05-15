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
    releaseCoreItem: jest.fn(),
    releaseCoreModule: jest.fn(),
    detachItem: jest.fn(),
    reorderItems: jest.fn(),
    update: jest.fn(),
    replaceGradingScale: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getByClass: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: { getByClass: jest.fn(), getById: jest.fn(), create: jest.fn() },
}));

jest.mock('@/services/file-service', () => ({
  fileService: { upload: jest.fn(), getAll: jest.fn() },
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
    mockedLessonService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'lesson-1',
        classId: 'class-1',
        title: 'Core Lesson',
        description: '<p>Core lesson content</p>',
        order: 1,
        isDraft: false,
        contentBlocks: [],
      } as never,
    });
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
    mockedAssessmentService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'assessment-existing',
        classId: 'class-1',
        title: 'Core Quiz',
        description: '<p>Assessment content</p>',
        type: 'quiz',
        isPublished: true,
        totalPoints: 10,
        questions: [],
      } as never,
    });
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
    mockedFileService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'general-file-1',
          teacherId: 'admin-1',
          scope: 'general',
          originalName: 'General Science File',
          storedName: 'general-science-file.pdf',
          mimeType: 'application/pdf',
          fileKind: 'pdf',
          sizeBytes: 1024,
          filePath: 'uploads/library/general-science-file.pdf',
          uploadedAt: '2026-04-17T00:00:00.000Z',
          subjectKey: 'math',
          gradeLevel: '7',
          teacherVisible: true,
        },
      ],
      count: 1,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as never);
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

  it('renders default-core module content as immutable with release controls', async () => {
    mockedModuleService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Default Module',
          description: 'Locked from template',
          order: 1,
          isVisible: false,
          isLocked: true,
          isCoreTemplateAsset: true,
          teacherNotes: '',
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
                  itemType: 'assessment',
                  assessmentId: 'assessment-existing',
                  order: 1,
                  isVisible: false,
                  isRequired: true,
                  isGiven: false,
                  isCoreTemplateAsset: true,
                  assessment: {
                    id: 'assessment-existing',
                    classId: 'class-1',
                    title: 'Core Quiz',
                    type: 'quiz',
                    totalPoints: 10,
                    isPublished: false,
                  },
                },
              ],
            },
          ],
          gradingScaleEntries: [],
        },
      ] as never,
      count: 1,
    });

    render(<TeacherModuleDetailPage />);

    await screen.findByText('Default Module');
    expect(screen.getByText('Default module')).toBeInTheDocument();
    expect(screen.getByText('Default item')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Hide' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Give' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Content' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Visibility' }));
    expect(screen.getByRole('button', { name: 'Release Module' })).toBeInTheDocument();
  });

  it('routes core default assessment content to the teacher editor so release controls stay available', async () => {
    mockedModuleService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Default Module',
          description: 'Locked from template',
          order: 1,
          isVisible: true,
          isLocked: true,
          isCoreTemplateAsset: true,
          teacherNotes: '',
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
                  itemType: 'assessment',
                  assessmentId: 'assessment-existing',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: true,
                  isCoreTemplateAsset: true,
                  assessment: {
                    id: 'assessment-existing',
                    classId: 'class-1',
                    title: 'Core Quiz',
                    type: 'quiz',
                    totalPoints: 10,
                    isPublished: true,
                  },
                },
              ],
            },
          ],
          gradingScaleEntries: [],
        },
      ] as never,
      count: 1,
    });

    render(<TeacherModuleDetailPage />);

    await screen.findByText('Default Module');
    fireEvent.click(screen.getByRole('button', { name: 'View Content' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        '/dashboard/teacher/assessments/assessment-existing/edit?classId=class-1&moduleId=module-1',
      );
    });
    expect(mockedAssessmentService.getById).not.toHaveBeenCalled();
  });

  it('allows unlocking a default module from the locking tab', async () => {
    mockedModuleService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Default Module',
          description: 'Locked from template',
          order: 1,
          isVisible: true,
          isLocked: true,
          isCoreTemplateAsset: true,
          teacherNotes: '',
          sections: [],
          gradingScaleEntries: [],
        },
      ] as never,
      count: 1,
    });
    mockedModuleService.releaseCoreModule.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: {
        id: 'module-1',
        classId: 'class-1',
        title: 'Default Module',
        description: 'Locked from template',
        order: 1,
        isVisible: true,
        isLocked: false,
        isCoreTemplateAsset: true,
        teacherNotes: '',
        sections: [],
        gradingScaleEntries: [],
      } as never,
    });

    render(<TeacherModuleDetailPage />);

    await screen.findByText('Default Module');
    fireEvent.click(screen.getByRole('button', { name: 'Locking' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: /Unlocked Students can open this template module once it is visible and its items are given\./i,
      }),
    );

    await waitFor(() => {
      expect(mockedModuleService.releaseCoreModule).toHaveBeenCalledWith('module-1', {
        isLocked: false,
      });
    });
  });

  it('routes core default lesson content to the teacher read-only reader', async () => {
    mockedModuleService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Default Module',
          description: 'Locked from template',
          order: 1,
          isVisible: true,
          isLocked: true,
          isCoreTemplateAsset: true,
          teacherNotes: '',
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
                  lessonId: 'lesson-existing',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: false,
                  isCoreTemplateAsset: true,
                  lesson: {
                    id: 'lesson-existing',
                    classId: 'class-1',
                    title: 'Core Lesson',
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
      count: 1,
    });

    render(<TeacherModuleDetailPage />);

    await screen.findByText('Default Module');
    fireEvent.click(screen.getByRole('button', { name: 'View Content' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        '/dashboard/teacher/lessons/lesson-existing/view?classId=class-1&moduleId=module-1',
      );
    });
    expect(mockedLessonService.getById).not.toHaveBeenCalled();
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

  it('disables Give for attached draft assessments', async () => {
    mockedModuleService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [
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
              items: [
                {
                  id: 'item-1',
                  moduleSectionId: 'section-1',
                  itemType: 'assessment',
                  assessmentId: 'assessment-existing',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: false,
                  assessment: {
                    id: 'assessment-existing',
                    classId: 'class-1',
                    title: 'Draft Quiz',
                    type: 'quiz',
                    totalPoints: 10,
                    isPublished: false,
                  },
                },
              ],
            },
          ],
          gradingScaleEntries: [],
        },
      ] as never,
      count: 1,
    });

    render(<TeacherModuleDetailPage />);

    await screen.findByText('Draft Quiz');
    expect(screen.getByRole('checkbox', { name: 'Give' })).toBeDisabled();
  });

  it('attaches an existing library file instead of uploading a new pdf', async () => {
    render(<TeacherModuleDetailPage />);

    await screen.findByRole('heading', { name: 'Sections' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Block' })[0]);
    const dialog = await screen.findByRole('dialog');
    const fileTypeButton = within(dialog).getByText('PDF / PPTX').closest('button');
    if (!fileTypeButton) {
      throw new Error('PDF block type button was not rendered');
    }
    fireEvent.click(fileTypeButton);

    fireEvent.click(within(dialog).getByRole('button', { name: /Choose from Library/i }));
    const picker = await screen.findByRole('dialog', { name: 'Choose from Library' });
    fireEvent.click(await within(picker).findByRole('button', { name: /General Science File/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Block' }));

    await waitFor(() => {
      expect(mockedModuleService.attachItem).toHaveBeenCalledWith(
        'section-1',
        expect.objectContaining({
          itemType: 'file',
          fileId: 'general-file-1',
        }),
      );
    });
    expect(mockedFileService.upload).not.toHaveBeenCalled();
  });

  it('clears file attach state so the same library file can be attached again', async () => {
    render(<TeacherModuleDetailPage />);

    await screen.findByRole('heading', { name: 'Sections' });

    const attachLibraryFile = async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Add Block' })[0]);
      const dialog = await screen.findByRole('dialog');
      const fileTypeButton = within(dialog).getByText('PDF / PPTX').closest('button');
      if (!fileTypeButton) {
        throw new Error('PDF block type button was not rendered');
      }
      fireEvent.click(fileTypeButton);
      fireEvent.click(within(dialog).getByRole('button', { name: /Choose from Library/i }));
      const picker = await screen.findByRole('dialog', { name: 'Choose from Library' });
      fireEvent.click(await within(picker).findByRole('button', { name: /General Science File/i }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Add Block' }));
    };

    await attachLibraryFile();
    await waitFor(() => expect(mockedModuleService.attachItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await attachLibraryFile();

    await waitFor(() => {
      expect(mockedModuleService.attachItem).toHaveBeenCalledTimes(2);
      expect(mockedModuleService.attachItem).toHaveBeenNthCalledWith(
        1,
        'section-1',
        expect.objectContaining({ itemType: 'file', fileId: 'general-file-1' }),
      );
      expect(mockedModuleService.attachItem).toHaveBeenNthCalledWith(
        2,
        'section-1',
        expect.objectContaining({ itemType: 'file', fileId: 'general-file-1' }),
      );
    });
  });

  it('uploads a PPTX module file block with deck metadata', async () => {
    const pptxMime =
      'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const deck = new File(['deck'], 'quarter-one.pptx', { type: pptxMime });
    mockedFileService.upload.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: { id: 'deck-file-1', fileKind: 'pptx', mimeType: pptxMime } as never,
    });

    render(<TeacherModuleDetailPage />);

    await screen.findByRole('heading', { name: 'Sections' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Block' })[0]);
    const dialog = await screen.findByRole('dialog');
    const fileTypeButton = within(dialog).getByText('PDF / PPTX').closest('button');
    if (!fileTypeButton) {
      throw new Error('File block type button was not rendered');
    }
    fireEvent.click(fileTypeButton);

    const fileInput = await screen.findByLabelText('PDF or PowerPoint file') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [deck] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Block' }));

    await waitFor(() => {
      expect(mockedFileService.upload).toHaveBeenCalledWith(deck, {
        classId: 'class-1',
        scope: 'private',
      });
      expect(mockedModuleService.attachItem).toHaveBeenCalledWith(
        'section-1',
        expect.objectContaining({
          itemType: 'file',
          fileId: 'deck-file-1',
          metadata: { fileSubtype: 'pptx' },
        }),
      );
    });
  });

  it('opens the module guide and navigates through all pages', async () => {
    render(<TeacherModuleDetailPage />);

    await screen.findByRole('button', { name: /module help/i });

    fireEvent.click(screen.getByRole('button', { name: /module help/i }));

    expect(await screen.findByText('Teacher guide: Module Workspace')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 6')).toBeInTheDocument();
    expect(screen.getByText('Start from the module header')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('Build sections first')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 3 of 6')).toBeInTheDocument();
    expect(screen.getByText('Attach and manage module blocks')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 4 of 6')).toBeInTheDocument();
    expect(screen.getByText('Choose whether students can see this module')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 5 of 6')).toBeInTheDocument();
    expect(screen.getByText('Control release through locking')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 6 of 6')).toBeInTheDocument();
    expect(screen.getByText('Use private module notes for pacing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('Page 5 of 6')).toBeInTheDocument();
    expect(screen.getByText('Control release through locking')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Close guide')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));

    await waitFor(() => {
      expect(screen.queryByText('Teacher guide: Module Workspace')).not.toBeInTheDocument();
    });
  });
});
