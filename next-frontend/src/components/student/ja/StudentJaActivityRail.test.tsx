import { fireEvent, render, screen } from '@testing-library/react';
import { StudentJaActivityRail } from './StudentJaActivityRail';

describe('StudentJaActivityRail', () => {
  it('renders the selected mode and forwards mode, filter, history, and activity actions', () => {
    const onModeChange = jest.fn();
    const onFilterChange = jest.fn();
    const onToggleHistory = jest.fn();
    const onSelectActivity = jest.fn();

    render(
      <StudentJaActivityRail
        mode="ask"
        modeCount={{ ask: 1, review: 1 }}
        activityFilter="all"
        activities={[
          {
            id: 'thread-1',
            mode: 'ask',
            title: 'Fractions explanation',
            subtitle: 'Lesson: Fractions',
            classLabel: 'Mathematics (MATH)',
            status: 'active',
            updatedAt: '2026-04-25T11:00:00.000Z',
          },
        ]}
        activeActivityKey=""
        showHome={false}
        onModeChange={onModeChange}
        onFilterChange={onFilterChange}
        onToggleHistory={onToggleHistory}
        onSelectActivity={onSelectActivity}
      />,
    );

    expect(screen.getByRole('tab', { name: /Ask Get help with a lesson/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('tab', { name: /Replay Practice again/i }));
    expect(onModeChange).toHaveBeenCalledWith('review');

    fireEvent.click(screen.getByRole('button', { name: /^Ask$/i }));
    expect(onFilterChange).toHaveBeenCalledWith('ask');

    fireEvent.click(screen.getByRole('button', { name: /Hide activity history/i }));
    expect(onToggleHistory).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Fractions explanation/i }));
    expect(onSelectActivity).toHaveBeenCalledWith(expect.objectContaining({ id: 'thread-1' }));
  });
});
