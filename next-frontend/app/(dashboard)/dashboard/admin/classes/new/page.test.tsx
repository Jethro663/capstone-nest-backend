import { render, waitFor } from '@testing-library/react';
import CreateClassPage from './page';

const push = jest.fn();
const searchParams = new URLSearchParams({
  templateId: 'template-123',
  subjectName: 'Mathematics',
  subjectCode: 'MATH-7',
  subjectGradeLevel: '7',
});

const classFormMock = jest.fn(() => <div data-testid="class-form" />);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

jest.mock('@/components/admin/ClassForm', () => {
  const actual = jest.requireActual('@/components/admin/ClassForm');
  return {
    __esModule: true,
    ...actual,
    default: (props: unknown) => classFormMock(props),
  };
});

jest.mock('@/services/section-service', () => ({
  sectionService: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/services/user-service', () => ({
  userService: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/services/academic-state-service', () => ({
  academicStateService: {
    getCurrent: jest.fn(),
  },
}));

jest.mock('@/services/class-template-service', () => ({
  classTemplateService: {
    getAll: jest.fn(),
    getById: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('CreateClassPage', () => {
  const { sectionService } = jest.requireMock('@/services/section-service') as {
    sectionService: { getAll: jest.Mock };
  };
  const { userService } = jest.requireMock('@/services/user-service') as {
    userService: { getAll: jest.Mock };
  };
  const { academicStateService } = jest.requireMock('@/services/academic-state-service') as {
    academicStateService: { getCurrent: jest.Mock };
  };
  const { classTemplateService } = jest.requireMock('@/services/class-template-service') as {
    classTemplateService: { getAll: jest.Mock; getById: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sectionService.getAll.mockResolvedValue({ data: [] });
    userService.getAll.mockResolvedValue({ users: [] });
    academicStateService.getCurrent.mockResolvedValue({
      data: { schoolYear: '2026-2027' },
    });
    classTemplateService.getAll.mockResolvedValue({
      data: [
        {
          id: 'template-123',
          name: 'Quarter 1 Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          status: 'published',
          createdBy: 'admin-1',
        },
      ],
    });
  });

  it('preloads the class form from the imported template seed in the query string', async () => {
    render(<CreateClassPage />);

    await waitFor(() => expect(classFormMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(classTemplateService.getAll).toHaveBeenCalledWith({
        subjectGradeLevel: '7',
      }),
    );

    await waitFor(() => {
      const lastCall =
        classFormMock.mock.calls[classFormMock.mock.calls.length - 1]?.[0] as {
          initialValues: {
            subjectName: string;
            subjectCode: string;
            subjectGradeLevel: string;
          };
          selectedTemplateId: string;
        };

      expect(lastCall.initialValues).toEqual(
        expect.objectContaining({
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
        }),
      );
      expect(lastCall.selectedTemplateId).toBe('template-123');
    });
  });
});
