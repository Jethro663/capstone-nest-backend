import { render, screen } from '@testing-library/react';
import { ClassCard, type ClassCardMetrics } from './ClassCard';

const metrics: ClassCardMetrics = {
  lessonsCount: 5,
  assessmentsCount: 2,
  pendingCount: 2,
  progressPercent: 86,
};

describe('ClassCard', () => {
  it('uses a link-like class entry point and keeps lesson actions separate', () => {
    render(
      <ClassCard
        classItem={{
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-07A',
          section: {
            name: 'Section A',
            gradeLevel: '7',
          },
          teacher: {
            firstName: 'Ana',
            lastName: 'Reyes',
          },
          schedules: [
            {
              days: ['T'],
              startTime: '06:00',
              endTime: '07:00',
            },
          ],
        }}
        metrics={metrics}
        accentIndex={0}
        classHref="/dashboard/teacher/classes/class-1"
        lessonsHref="/dashboard/teacher/classes/class-1?view=modules"
      />,
    );

    expect(screen.getByRole('link', { name: 'Open Mathematics' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1',
    );
    expect(screen.getByRole('link', { name: 'View Lessons' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1?view=modules',
    );
    expect(
      screen.getByRole('link', { name: 'Continue Learning' }),
    ).toHaveAttribute('href', '/dashboard/teacher/classes/class-1');
  });
});
