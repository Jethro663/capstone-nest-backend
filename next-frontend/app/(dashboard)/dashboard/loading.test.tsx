import { render, screen } from '@testing-library/react';
import SharedDashboardLoading from './loading';
import StudentDashboardLoading from './student/loading';
import TeacherDashboardLoading from './teacher/loading';
import AdminDashboardLoading from './admin/loading';

jest.mock('@/components/shared/DashboardRouteSkeleton', () => ({
  DashboardRouteSkeleton: ({ variant }: { variant: string }) => (
    <div data-testid="dashboard-route-skeleton" data-variant={variant} />
  ),
}));

describe('dashboard loading boundaries', () => {
  it.each([
    ['shared', SharedDashboardLoading],
    ['student', StudentDashboardLoading],
    ['teacher', TeacherDashboardLoading],
    ['admin', AdminDashboardLoading],
  ])('uses the %s content skeleton', (variant, LoadingComponent) => {
    render(<LoadingComponent />);

    expect(screen.getByTestId('dashboard-route-skeleton')).toHaveAttribute(
      'data-variant',
      variant,
    );
    expect(screen.queryByTestId('app-orbit-loader')).not.toBeInTheDocument();
  });
});
