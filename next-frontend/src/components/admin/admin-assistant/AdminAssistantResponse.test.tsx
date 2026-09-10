import { fireEvent, render, screen } from '@testing-library/react';
import { AdminAssistantResponse } from './AdminAssistantResponse';

describe('AdminAssistantResponse', () => {
  it('renders a bounded data view, safe action, evidence, and follow-up prompts', () => {
    const onSuggestedPrompt = jest.fn();

    render(
      <AdminAssistantResponse
        content="Two learner records need review."
        chart={null}
        dataView={{
          title: 'At-risk learners',
          columns: ['Class', 'Learners'],
          rows: [['MATH-7', '2']],
          total: 8,
          truncated: true,
        }}
        sources={[
          {
            source: 'student-performance-report',
            label: 'Student performance report',
            filters: { gradingPeriod: 'Q3' },
            window: '2026-09-11T03:15:00.000Z',
            recordCount: 2,
            total: 8,
            truncated: true,
            href: '/dashboard/admin/reports',
          },
        ]}
        scope={{
          timeRange: 'current_period',
          schoolYear: '2026-2027',
          gradingPeriod: 'Q3',
          periodLabel: 'Quarter 3',
        }}
        action={{
          kind: 'navigate',
          target: 'reports',
          label: 'Open reports',
          description: 'Review the matching records.',
          href: '/dashboard/admin/reports',
          draft: null,
        }}
        suggestedPrompts={['Compare with the last 30 days']}
        onSuggestedPrompt={onSuggestedPrompt}
      />,
    );

    expect(screen.getByText('Two learner records need review.')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'At-risk learners' })).toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 8/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open reports' })).toHaveAttribute(
      'href',
      '/dashboard/admin/reports',
    );

    fireEvent.click(screen.getByText('Evidence and scope'));
    expect(screen.getByText('Student performance report')).toBeInTheDocument();
    expect(screen.getByText(/Quarter 3/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Compare with the last 30 days' }),
    );
    expect(onSuggestedPrompt).toHaveBeenCalledWith(
      'Compare with the last 30 days',
    );
  });
});
