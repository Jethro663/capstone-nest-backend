import { render, screen } from '@testing-library/react';
import { StudentUpcomingEventsCard } from './StudentUpcomingEventsCard';
import type { StudentUpcomingEvent } from './types';

function makeEvent(index: number): StudentUpcomingEvent {
  return {
    id: `event-${index}`,
    classId: 'class-1',
    title: `Upcoming item ${index}`,
    subtitle: 'Mathematics',
    tag: 'assessment',
    href: `/dashboard/student/assessments/${index}`,
    timestamp: Date.UTC(2026, 8, index),
    dateKey: `2026-09-${String(index).padStart(2, '0')}`,
    dayLabel: String(index).padStart(2, '0'),
    monthLabel: 'SEP',
  };
}

describe('StudentUpcomingEventsCard', () => {
  it('renders five preview items and reports the remaining count through the calendar link', () => {
    render(
      <StudentUpcomingEventsCard
        events={Array.from({ length: 7 }, (_, index) => makeEvent(index + 1))}
        selectedDateKey="2026-08-30"
      />,
    );

    expect(screen.getByText('Upcoming item 1')).toBeInTheDocument();
    expect(screen.getByText('Upcoming item 5')).toBeInTheDocument();
    expect(screen.queryByText('Upcoming item 6')).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming item 7')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See All \(2 more\)/i })).toHaveAttribute(
      'href',
      '/dashboard/student/calendar?view=upcoming',
    );
  });
});
