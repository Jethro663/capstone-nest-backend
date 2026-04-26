import { render, screen } from '@testing-library/react';
import StudentJaPage from './page';

const studentJaWorkspaceProps: Array<Record<string, unknown>> = [];

jest.mock('@/components/student/ja/StudentJaWorkspace', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    studentJaWorkspaceProps.push(props);
    return <div data-testid="student-ja-workspace">JA Workspace</div>;
  },
}));

describe('StudentJaPage', () => {
  beforeEach(() => {
    studentJaWorkspaceProps.length = 0;
  });

  it('renders the standalone JA workspace', async () => {
    render(await StudentJaPage({}));

    expect(screen.getByTestId('student-ja-workspace')).toBeInTheDocument();
    expect(screen.getByText('JA Workspace')).toBeInTheDocument();
  });

  it('passes mode and class query params into the standalone workspace', async () => {
    render(
      await StudentJaPage({
        searchParams: Promise.resolve({ mode: 'review', classId: 'class-123' }),
      }),
    );

    expect(studentJaWorkspaceProps.at(-1)).toMatchObject({
      initialMode: 'review',
      initialClassId: 'class-123',
    });
  });

  it('passes lightweight entry and return params into the workspace', async () => {
    render(
      await StudentJaPage({
        searchParams: Promise.resolve({
          mode: 'ask',
          classId: 'class-123',
          entry: 'class',
          returnTo: '/dashboard/student/classes/class-123',
        }),
      }),
    );

    expect(studentJaWorkspaceProps.at(-1)).toMatchObject({
      initialMode: 'ask',
      initialClassId: 'class-123',
      initialEntry: 'class',
      returnTo: '/dashboard/student/classes/class-123',
    });
  });
});
