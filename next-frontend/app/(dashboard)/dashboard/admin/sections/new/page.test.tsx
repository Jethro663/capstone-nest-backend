import { act, render, waitFor } from '@testing-library/react';
import CreateSectionPage from './page';

const push = jest.fn();
const refreshDemoMode = jest.fn();
const sectionFormMock = jest.fn<React.ReactNode, [Record<string, unknown>]>(
  () => <div data-testid="section-form" />,
);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('@/providers/AdminDemoModeProvider', () => ({
  useAdminDemoMode: () => ({ refresh: refreshDemoMode }),
}));

jest.mock('@/components/admin/SectionForm', () => {
  const React = jest.requireActual('react');
  const actual = jest.requireActual('@/components/admin/SectionForm');
  return {
    __esModule: true,
    ...actual,
    default: (props: Record<string, unknown>) =>
      React.createElement(sectionFormMock, props),
  };
});

jest.mock('@/services/section-service', () => ({
  sectionService: { getAll: jest.fn(), create: jest.fn() },
}));
jest.mock('@/services/user-service', () => ({
  userService: { getAll: jest.fn() },
}));
jest.mock('@/services/academic-state-service', () => ({
  academicStateService: { getCurrent: jest.fn() },
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('CreateSectionPage', () => {
  const { sectionService } = jest.requireMock('@/services/section-service') as {
    sectionService: { getAll: jest.Mock; create: jest.Mock };
  };
  const { userService } = jest.requireMock('@/services/user-service') as {
    userService: { getAll: jest.Mock };
  };
  const { academicStateService } = jest.requireMock(
    '@/services/academic-state-service',
  ) as { academicStateService: { getCurrent: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    userService.getAll.mockResolvedValue({
      users: [
        {
          id: 'teacher-1',
          firstName: 'Ana',
          lastName: 'Reyes',
          roles: ['teacher'],
          status: 'ACTIVE',
        },
      ],
    });
    sectionService.getAll.mockResolvedValue({
      data: [
        {
          id: 'section-existing',
          name: 'Rizal',
          gradeLevel: '7',
          schoolYear: '2026-2027',
          adviserId: 'teacher-1',
          roomNumber: '201',
          isActive: true,
        },
      ],
    });
    academicStateService.getCurrent.mockResolvedValue({
      data: { schoolYear: '2026-2027' },
    });
  });

  it('passes room and adviser conflicts to the capability-aware form', async () => {
    render(<CreateSectionPage />);
    await waitFor(() => expect(sectionFormMock).toHaveBeenCalled());

    const props = sectionFormMock.mock.calls.at(-1)?.[0] as {
      roomDisabledReasonByNumber: Record<string, string>;
      adviserDisabledReasonById: Record<string, string>;
    };
    expect(props.roomDisabledReasonByNumber['201']).toMatch(/Rizal/);
    expect(props.adviserDisabledReasonById['teacher-1']).toMatch(/Rizal/);
  });

  it('refreshes Demo mode and does not retry a rejected create', async () => {
    sectionService.create.mockRejectedValueOnce({
      response: { data: { message: 'Room is already assigned.' } },
    });
    render(<CreateSectionPage />);
    await waitFor(() => expect(sectionFormMock).toHaveBeenCalled());
    const props = sectionFormMock.mock.calls.at(-1)?.[0] as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>;
    };

    await act(async () => {
      await props.onSubmit({
        name: 'Kamia',
        gradeLevel: '7',
        schoolYear: '2026-2027',
        capacity: 40,
        roomNumber: '201',
        adviserId: 'teacher-1',
      });
    });

    expect(refreshDemoMode).toHaveBeenCalledTimes(1);
    expect(sectionService.create).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
