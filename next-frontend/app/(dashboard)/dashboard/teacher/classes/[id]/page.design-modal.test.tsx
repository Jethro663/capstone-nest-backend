import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherClassDetailPage from './page';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { discussionBoardService } from '@/services/discussion-board-service';
import { extractionService } from '@/services/extraction-service';
import { moduleService } from '@/services/module-service';
import {
  createCroppedModuleCoverBlob,
  validateModuleCoverFile,
} from '@/lib/module-cover-images';

const classId = '11111111-1111-4111-8111-111111111111';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: classId }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'view' ? 'modules' : null),
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    status: 'authenticated',
    user: { id: 'teacher-1', roles: [{ name: 'teacher' }] },
    role: 'teacher',
    isProfileIncomplete: false,
    setUser: jest.fn(),
    refreshAuth: jest.fn(),
  }),
}));

jest.mock('react-easy-crop', () => ({
  __esModule: true,
  default: () => <div data-testid="module-cover-cropper" />,
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/hooks/use-ai-availability', () => ({
  useAiAvailability: () => ({
    isReady: true,
    dependencies: { aiService: { ok: true } },
  }),
}));

jest.mock('@/hooks/use-teacher-class-record', () => ({
  useTeacherClassRecord: () => ({
    loading: false,
    records: [],
  }),
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/class-record-service', () => ({
  classRecordService: {
    getByClass: jest.fn(),
    getFinalGrades: jest.fn(),
  },
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
    getEnrollments: jest.fn(),
  },
}));

jest.mock('@/services/discussion-board-service', () => ({
  discussionBoardService: {
    listThreads: jest.fn(),
  },
}));

jest.mock('@/services/extraction-service', () => ({
  extractionService: {
    listByClass: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
    update: jest.fn(),
    uploadCover: jest.fn(),
    releaseCoreModule: jest.fn(),
    reorder: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/module-cover-images', () => ({
  ...jest.requireActual('@/lib/module-cover-images'),
  validateModuleCoverFile: jest.fn(),
  createCroppedModuleCoverBlob: jest.fn(),
}));

const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedClassRecordService = classRecordService as jest.Mocked<typeof classRecordService>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedDiscussionBoardService = discussionBoardService as jest.Mocked<typeof discussionBoardService>;
const mockedExtractionService = extractionService as jest.Mocked<typeof extractionService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;
const mockedValidateModuleCoverFile = validateModuleCoverFile as jest.MockedFunction<
  typeof validateModuleCoverFile
>;
const mockedCreateCroppedModuleCoverBlob =
  createCroppedModuleCoverBlob as jest.MockedFunction<
    typeof createCroppedModuleCoverBlob
  >;

describe('TeacherClassDetailPage design modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:module-cover-preview');
    URL.revokeObjectURL = jest.fn();

    mockedClassService.getById.mockResolvedValue({
      data: {
        id: classId,
        subjectName: 'Science',
        subjectCode: 'SCI-7',
        subjectGradeLevel: '7',
        room: '201',
        schedules: [],
        section: {
          name: 'Rizal',
          gradeLevel: '7',
        },
        enrollments: [],
      },
    } as Awaited<ReturnType<typeof classService.getById>>);
    mockedClassService.getEnrollments.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof classService.getEnrollments>>);
    mockedModuleService.getByClass.mockResolvedValue({
      data: [
        {
          id: 'module-1',
          classId,
          title: 'Module One',
          description: '<p>Intro</p>',
          order: 1,
          isVisible: false,
          isLocked: true,
          sections: [],
          gradingScaleEntries: [],
        },
      ],
    } as Awaited<ReturnType<typeof moduleService.getByClass>>);
    mockedAssessmentService.getByClass.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAnnouncementService.getByClass.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof announcementService.getByClass>>);
    mockedClassRecordService.getByClass.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof classRecordService.getByClass>>);
    mockedClassRecordService.getFinalGrades.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof classRecordService.getFinalGrades>>);
    mockedDiscussionBoardService.listThreads.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);
    mockedExtractionService.listByClass.mockResolvedValue({
      data: [],
    } as Awaited<ReturnType<typeof extractionService.listByClass>>);
    mockedValidateModuleCoverFile.mockResolvedValue({ width: 1280, height: 720 });
    mockedCreateCroppedModuleCoverBlob.mockResolvedValue(
      new Blob(['cover'], { type: 'image/png' }),
    );
    mockedModuleService.uploadCover.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        coverImageUrl: '/api/modules/covers/module.png',
        module: {
          id: 'module-1',
          classId,
          title: 'Module One',
          description: '<p>Intro</p>',
          order: 1,
          isVisible: false,
          isLocked: true,
          themeKind: 'image',
          coverImageUrl: '/api/modules/covers/module.png',
          sections: [],
          gradingScaleEntries: [],
        },
      },
    });
  });

  it('shows image controls only in image mode and uploads custom covers only on save', async () => {
    render(<TeacherClassDetailPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: /customize module design/i }),
    );

    expect(await screen.findByText('Customize Module Design')).toBeInTheDocument();
    expect(screen.queryByLabelText('Upload custom image')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Image' }));
    const uploadInput = screen.getByLabelText('Upload custom image');
    expect(uploadInput).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gradient' }));
    expect(screen.queryByLabelText('Upload custom image')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Image' }));
    const file = new File(['cover'], 'science-cover.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Upload custom image'), {
      target: { files: [file] },
    });

    expect(mockedValidateModuleCoverFile).toHaveBeenCalledWith(file);
    expect(mockedModuleService.uploadCover).not.toHaveBeenCalled();
    expect(await screen.findByTestId('module-cover-cropper')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save design/i }));
    await waitFor(() =>
      expect(mockedModuleService.uploadCover).toHaveBeenCalledTimes(1),
    );
  });

  it('opens the helper guide and walks through all pages', async () => {
    render(<TeacherClassDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /module help/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /module help/i }));

    expect(await screen.findByText('Teacher guide: Class Workspace')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 8')).toBeInTheDocument();
    expect(screen.getByText('Start at the top of the class workspace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 8')).toBeInTheDocument();
    expect(screen.getByText('Manage class modules first')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 3 of 8')).toBeInTheDocument();
    expect(screen.getByText('Use assignment filters and assignment actions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 4 of 8')).toBeInTheDocument();
    expect(screen.getByText('Run AI extraction when you need fast lesson input')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 5 of 8')).toBeInTheDocument();
    expect(screen.getByText('Keep class communication in one workflow')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 6 of 8')).toBeInTheDocument();
    expect(screen.getByText('Review students from one tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 7 of 8')).toBeInTheDocument();
    expect(screen.getByText('View class record and progress summaries')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 8 of 8')).toBeInTheDocument();
    expect(screen.getByText('Plan with the class calendar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('Page 7 of 8')).toBeInTheDocument();
    expect(screen.getByText('View class record and progress summaries')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Close guide')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));

    await waitFor(() => {
      expect(screen.queryByText('Teacher guide: Class Workspace')).not.toBeInTheDocument();
    });
  });
});
