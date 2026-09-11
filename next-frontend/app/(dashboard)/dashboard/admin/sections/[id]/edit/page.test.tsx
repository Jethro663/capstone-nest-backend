import { render, waitFor } from '@testing-library/react';
import EditSectionPage from './page';

const push = jest.fn();
const refreshDemoMode = jest.fn();
const sectionFormMock = jest.fn<React.ReactNode, [Record<string, unknown>]>(
  () => <div data-testid="section-form" />,
);

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'section-1' }),
  useRouter: () => ({ push }),
}));
jest.mock('@/providers/AdminDemoModeProvider', () => ({
  useAdminDemoMode: () => ({ refresh: refreshDemoMode }),
}));
jest.mock('@/components/admin/SectionForm', () => {
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement(sectionFormMock, props),
  };
});
jest.mock('@/components/admin/AdminLifecycleDialog', () => ({
  AdminLifecycleDialog: () => null,
}));
jest.mock('@/services/section-service', () => ({
  sectionService: {
    getById: jest.fn(),
    getRoster: jest.fn(),
    getAll: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('@/services/user-service', () => ({
  userService: { getAll: jest.fn() },
}));
jest.mock('@/services/academic-state-service', () => ({
  academicStateService: { getCurrent: jest.fn() },
}));
jest.mock('@/services/admin-lifecycle-service', () => ({
  adminLifecycleService: {},
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

describe('EditSectionPage', () => {
  const { sectionService } = jest.requireMock('@/services/section-service') as {
    sectionService: {
      getById: jest.Mock;
      getRoster: jest.Mock;
      getAll: jest.Mock;
      update: jest.Mock;
    };
  };
  const { userService } = jest.requireMock('@/services/user-service') as {
    userService: { getAll: jest.Mock };
  };
  const { academicStateService } = jest.requireMock(
    '@/services/academic-state-service',
  ) as { academicStateService: { getCurrent: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    refreshDemoMode.mockResolvedValue(undefined);
    sectionService.getById.mockResolvedValue({
      data: {
        id: 'section-1',
        name: 'Kamia',
        gradeLevel: '7',
        schoolYear: '2026-2027',
        capacity: 40,
        roomNumber: '201',
        adviserId: 'teacher-1',
        isActive: true,
      },
    });
    sectionService.getRoster.mockResolvedValue({ data: [] });
    sectionService.getAll.mockResolvedValue({ data: [] });
    userService.getAll.mockResolvedValue({ users: [] });
    academicStateService.getCurrent.mockResolvedValue({
      data: { quarter: 'Q1' },
    });
  });

  it('retains the existing historical school year in the form choices', async () => {
    sectionService.getById.mockResolvedValueOnce({
      data: {
        id: 'section-1',
        name: 'Kamia',
        gradeLevel: '7',
        schoolYear: '2024-2025',
        capacity: 40,
        roomNumber: '201',
        adviserId: '',
        isActive: false,
      },
    });
    render(<EditSectionPage />);
    await waitFor(() => expect(sectionFormMock).toHaveBeenCalled());
    const props = sectionFormMock.mock.calls.at(-1)?.[0] as {
      schoolYears: string[];
    };
    expect(props.schoolYears).toContain('2024-2025');
  });

  it('refreshes Demo mode without retrying when an update is rejected', async () => {
    sectionService.update.mockRejectedValueOnce({
      response: { data: { message: 'Adviser is already assigned.' } },
    });
    render(<EditSectionPage />);
    await waitFor(() => expect(sectionFormMock).toHaveBeenCalled());
    const props = sectionFormMock.mock.calls.at(-1)?.[0] as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>;
    };

    void props.onSubmit({
      name: 'Kamia',
      gradeLevel: '7',
      schoolYear: '2026-2027',
      capacity: 40,
      roomNumber: '201',
      adviserId: 'teacher-1',
    });

    await waitFor(() => expect(refreshDemoMode).toHaveBeenCalledTimes(1));
    expect(sectionService.update).toHaveBeenCalledTimes(1);
  });
});
