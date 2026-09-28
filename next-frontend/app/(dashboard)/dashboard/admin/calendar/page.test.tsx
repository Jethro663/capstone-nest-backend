import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminCalendarPage from './page';
import { academicStateService } from '@/services/academic-state-service';
import { classService } from '@/services/class-service';
import { schoolEventService } from '@/services/school-event-service';

jest.mock('@/services/academic-state-service', () => ({
  academicStateService: { getCurrent: jest.fn() },
}));

jest.mock('@/services/class-service', () => ({
  classService: { getAll: jest.fn() },
}));

jest.mock('@/services/school-event-service', () => ({
  schoolEventService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/components/admin/AdminPageShell', () => ({
  AdminPageShell: ({ actions, children }: { actions?: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{children}</main>
  ),
  AdminSectionCard: ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
    <section><h2>{title}</h2>{action}{children}</section>
  ),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedAcademicState = academicStateService as jest.Mocked<typeof academicStateService>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedSchoolEvents = schoolEventService as jest.Mocked<typeof schoolEventService>;

describe('AdminCalendarPage data authority and load states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAcademicState.getCurrent.mockResolvedValue({
      success: true,
      message: 'Current academic state retrieved',
      data: { schoolYear: '2040-2041', quarter: 'Q1' },
    } as Awaited<ReturnType<typeof academicStateService.getCurrent>>);
    mockedClassService.getAll.mockResolvedValue({
      success: true,
      message: 'Classes retrieved',
      data: { data: [], total: 0, page: 1, limit: 100 },
    } as Awaited<ReturnType<typeof classService.getAll>>);
    mockedSchoolEvents.getAll.mockResolvedValue({
      success: true,
      message: 'Events retrieved',
      data: [],
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
  });

  it('uses the authenticated current academic state instead of a raw active route', async () => {
    render(<AdminCalendarPage />);

    expect(
      await screen.findByText('No entries yet for 2040-2041.'),
    ).toBeInTheDocument();
    expect(mockedAcademicState.getCurrent).toHaveBeenCalledTimes(1);
    expect(mockedSchoolEvents.getAll).toHaveBeenCalledWith({
      schoolYear: '2040-2041',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows a retryable event error instead of a successful empty state', async () => {
    mockedSchoolEvents.getAll
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({
        success: true,
        message: 'Events retrieved',
        data: [],
      });

    render(<AdminCalendarPage />);

    expect(
      await screen.findByText('Calendar entries unavailable'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No entries yet for 2040-2041.'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Retry calendar entries' }),
    );
    expect(
      await screen.findByText('No entries yet for 2040-2041.'),
    ).toBeInTheDocument();
  });

  it('does not invent an official year when academic state cannot load', async () => {
    mockedAcademicState.getCurrent.mockRejectedValueOnce(
      new Error('academic state unavailable'),
    );

    render(<AdminCalendarPage />);

    expect(
      await screen.findByText('Academic state unavailable'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No entries yet for/)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockedSchoolEvents.getAll).not.toHaveBeenCalled();
    });
  });
});
