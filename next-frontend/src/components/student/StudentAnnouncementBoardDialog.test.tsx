import { fireEvent, render, screen } from '@testing-library/react';
import { StudentAnnouncementBoardDialog } from './StudentAnnouncementBoardDialog';

describe('StudentAnnouncementBoardDialog', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('opens with LMS dos and donts and no next button when there are no upcoming events', async () => {
    render(
      <StudentAnnouncementBoardDialog
        events={[]}
        now={new Date('2026-04-12T00:00:00.000Z')}
        storageKey="test-board-empty"
      />,
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('LMS reminders')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('lets students page into upcoming school events', async () => {
    render(
      <StudentAnnouncementBoardDialog
        events={[
          {
            id: 'event-1',
            eventType: 'school_event',
            schoolYear: '2025-2026',
            title: 'School Fest',
            description: 'Visit the covered court after class.',
            startsAt: '2026-04-15T00:00:00.000Z',
            endsAt: '2026-04-15T23:59:00.000Z',
            allDay: true,
          },
        ]}
        now={new Date('2026-04-12T00:00:00.000Z')}
        storageKey="test-board-events"
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));

    expect(screen.getByText('School Fest')).toBeInTheDocument();
    expect(screen.getByText('Visit the covered court after class.')).toBeInTheDocument();
  });
});
