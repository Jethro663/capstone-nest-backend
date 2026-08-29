import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
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

describe('StudentJaActivityRail pagination', () => {
  it('renders accessible page controls and forwards page changes', () => {
    const PaginatedRail = StudentJaActivityRail as unknown as ComponentType<any>;
    const onPageChange = jest.fn();

    render(
      <PaginatedRail
        mode="ask"
        modeCount={{ ask: 12, review: 9 }}
        activityFilter="all"
        activities={[]}
        activeActivityKey=""
        showHome={false}
        pagination={{
          page: 2,
          limit: 8,
          total: 21,
          totalPages: 3,
          hasNext: true,
          hasPrevious: true,
        }}
        historyLoading={false}
        historyError=""
        onModeChange={jest.fn()}
        onFilterChange={jest.fn()}
        onToggleHistory={jest.fn()}
        onSelectActivity={jest.fn()}
        onPageChange={onPageChange}
        onRetryHistory={jest.fn()}
      />,
    );

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Previous history page/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next history page/i }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('keeps history failures local and retryable', () => {
    const PaginatedRail = StudentJaActivityRail as unknown as ComponentType<any>;
    const onRetryHistory = jest.fn();

    render(
      <PaginatedRail
        mode="ask"
        modeCount={{ ask: 0, review: 0 }}
        activityFilter="all"
        activities={[]}
        activeActivityKey=""
        showHome={false}
        pagination={{
          page: 1,
          limit: 8,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        }}
        historyLoading={false}
        historyError="History unavailable."
        onModeChange={jest.fn()}
        onFilterChange={jest.fn()}
        onToggleHistory={jest.fn()}
        onSelectActivity={jest.fn()}
        onPageChange={jest.fn()}
        onRetryHistory={onRetryHistory}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('History unavailable.');
    fireEvent.click(screen.getByRole('button', { name: /Retry history/i }));
    expect(onRetryHistory).toHaveBeenCalledTimes(1);
  });
});
