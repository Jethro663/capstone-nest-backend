'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentModuleDetailPage from './page';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';

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
  lessonService: {},
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {},
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;

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
});
