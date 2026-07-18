import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { TeacherPageShell, TeacherStatCard } from './TeacherPageShell';

describe('TeacherPageShell', () => {
  it('leads with the title and keeps real actions without decorative shell chrome', () => {
    const { container } = render(
      <TeacherPageShell
        title="Assessments"
        description="Create and review class assessments."
        actions={<button type="button">New assessment</button>}
        stats={
          <TeacherStatCard
            label="Published"
            value="8"
            caption="Available to students"
            icon={Activity}
          />
        }
      >
        <div>Assessment list</div>
      </TeacherPageShell>,
    );

    const title = screen.getByRole('heading', { level: 1, name: 'Assessments' });
    const copy = container.querySelector('.teacher-figma-header__copy > div');

    expect(copy?.firstElementChild).toBe(title);
    expect(screen.queryByText('Teacher Workspace')).not.toBeInTheDocument();
    expect(container.querySelector('.teacher-figma-header__icon')).not.toBeInTheDocument();
    expect(container.querySelector('.teacher-figma-stat svg')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New assessment' })).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
