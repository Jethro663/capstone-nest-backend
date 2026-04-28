import { render, screen } from '@testing-library/react';
import StudentLxpDetailPage from './page';

jest.mock('@/components/student/lxp/StudentLxpDetailExperience', () => ({
  __esModule: true,
  default: () => <div data-testid="student-lxp-detail">LXP Detail</div>,
}));

describe('StudentLxpDetailPage', () => {
  it('renders the dedicated Learners Path detail experience', () => {
    render(<StudentLxpDetailPage />);

    expect(screen.getByTestId('student-lxp-detail')).toBeInTheDocument();
    expect(screen.getByText('LXP Detail')).toBeInTheDocument();
  });
});
