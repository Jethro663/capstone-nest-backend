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
  const React = jest.requireActual('react');
  const actual = jest.requireActual('@/components/admin/ClassForm');
  return {
    __esModule: true,
    ...actual,
    default: (props: unknown) => React.createElement(classFormMock, props),
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

jest.mock('@/services/class-service', () => ({
  classService: {
    create: jest.fn(),
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
  const { academicStateService } = jest.requireMock(
    '@/services/academic-state-service',
  ) as { academicStateService: { getCurrent: jest.Mock } };
  const { classTemplateService } = jest.requireMock(
    '@/services/class-template-service',
  ) as {
    classTemplateService: { getAll: jest.Mock; getById: jest.Mock };
  };
  const { classService } = jest.requireMock('@/services/class-service') as {
    classService: { create: jest.Mock };
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
    classTemplateService.getById.mockResolvedValue({
      data: {
        id: 'template-123',
        status: 'published',
        name: 'Quarter 1 Mathematics',
        subjectCode: 'MATH-7',
        subjectGradeLevel: '7',
      },
    });
    classService.create.mockResolvedValue({
      data: { id: 'class-1' },
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

  it('sends gradingProfile in classService.create payload', async () => {
    render(<CreateClassPage />);

    await waitFor(() => expect(classFormMock).toHaveBeenCalled());
    const formProps = classFormMock.mock.calls[0]?.[0] as {
      onSubmit: (values: {
        gradingProfile: {
          writtenWork: number;
          performanceTask: number;
          quarterlyAssessment: number;
        };
      }) => void;
    };

    await waitFor(() => {
      expect(classFormMock).toHaveBeenCalled();
    });

    const submittedValues = {
      gradingProfile: {
        writtenWork: 35,
        performanceTask: 35,
        quarterlyAssessment: 30,
      },
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      sectionId: 'section-1',
      teacherId: 'teacher-1',
      schoolYear: '2026-2027',
      room: 'Room 201',
      schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
    } as const;

    await formProps.onSubmit(submittedValues as any);

    expect(classService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gradingProfile: submittedValues.gradingProfile,
        subjectName: submittedValues.subjectName,
        subjectCode: submittedValues.subjectCode,
      }),
    );
  });

  it('keeps grading profile stable when selecting a template', async () => {
    render(<CreateClassPage />);

    await waitFor(() => expect(classFormMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(classTemplateService.getAll).toHaveBeenCalledWith({
        subjectGradeLevel: '7',
      }),
    );

    const firstProps = classFormMock.mock.calls[0]?.[0] as {
      initialValues: { gradingProfile: Record<string, number> };
      onTemplateChange: (templateId: string) => void;
    };
    const initialProfile = firstProps.initialValues.gradingProfile;
    firstProps.onTemplateChange('template-123');

    await waitFor(() => {
      const latestProps = classFormMock.mock.calls[
        classFormMock.mock.calls.length - 1
      ][0] as {
        initialValues: { gradingProfile: Record<string, number> };
      };
      expect(latestProps.initialValues.gradingProfile).toEqual(initialProfile);
    });
  });
});
