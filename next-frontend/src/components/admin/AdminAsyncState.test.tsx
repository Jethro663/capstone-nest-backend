import { fireEvent, render, screen } from '@testing-library/react';
import { AdminAsyncState } from './AdminAsyncState';

describe('AdminAsyncState', () => {
  it('renders an accessible initial loading status', () => {
    render(
      <AdminAsyncState
        isLoading
        hasData={false}
        error={null}
        onRetry={jest.fn()}
      >
        <p>Loaded data</p>
      </AdminAsyncState>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading system status',
    );
    expect(screen.queryByText('Loaded data')).not.toBeInTheDocument();
  });

  it('renders an initial error and retries once', () => {
    const retry = jest.fn();
    render(
      <AdminAsyncState
        isLoading={false}
        hasData={false}
        error="Capabilities unavailable"
        onRetry={retry}
      >
        <p>Loaded data</p>
      </AdminAsyncState>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Capabilities unavailable',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('preserves cached data and labels it stale after refresh failure', () => {
    render(
      <AdminAsyncState
        isLoading={false}
        hasData
        error="Refresh failed"
        onRetry={jest.fn()}
      >
        <p>Last successful data</p>
      </AdminAsyncState>,
    );

    expect(screen.getByText('Last successful data')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing the last successful data',
    );
  });

  it('renders a successful empty state instead of an error', () => {
    render(
      <AdminAsyncState
        isLoading={false}
        hasData={false}
        error={null}
        onRetry={jest.fn()}
        empty={<p>No workflow evidence</p>}
      >
        <p>Loaded data</p>
      </AdminAsyncState>,
    );

    expect(screen.getByText('No workflow evidence')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
