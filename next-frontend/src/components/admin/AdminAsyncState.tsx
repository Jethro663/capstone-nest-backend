import type { ReactNode } from 'react';

type AdminAsyncStateProps = {
  isLoading: boolean;
  hasData: boolean;
  error: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  empty?: ReactNode;
  children: ReactNode;
};

function RetryButton({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={isRetrying}
      className="mt-3 rounded-md border border-current px-3 py-1.5 text-sm font-medium disabled:cursor-wait disabled:opacity-60"
    >
      {isRetrying ? 'Retrying…' : 'Retry'}
    </button>
  );
}

export function AdminAsyncState({
  isLoading,
  hasData,
  error,
  onRetry,
  isRetrying = false,
  empty = null,
  children,
}: AdminAsyncStateProps) {
  if (isLoading && !hasData) {
    return (
      <div
        role="status"
        className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
      >
        Loading system status…
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        <p>{error}</p>
        <RetryButton onRetry={onRetry} isRetrying={isRetrying} />
      </div>
    );
  }

  if (!hasData) {
    return <>{empty}</>;
  }

  return (
    <>
      {error ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>Showing the last successful data. {error}</p>
          <RetryButton onRetry={onRetry} isRetrying={isRetrying} />
        </div>
      ) : null}
      {children}
    </>
  );
}
