import { Skeleton } from '@/components/ui/skeleton';

export type DashboardRouteSkeletonVariant =
  | 'student'
  | 'teacher'
  | 'admin'
  | 'shared';

interface DashboardRouteSkeletonProps {
  variant: DashboardRouteSkeletonVariant;
}

function HeadingSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44 sm:w-56" />
        <Skeleton className="h-4 w-52 max-w-[70vw] sm:w-72" />
      </div>
      {action ? <Skeleton className="h-10 w-28 shrink-0" /> : null}
    </div>
  );
}

function StudentSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6" data-testid="student-loading-main">
        <HeadingSkeleton />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1].map((section) => (
            <div className="space-y-4" key={section}>
              <Skeleton className="h-5 w-32" />
              <div className="space-y-3">
                {[0, 1, 2].map((row) => (
                  <Skeleton className="h-16 w-full rounded-lg" key={row} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="space-y-4" data-testid="student-loading-rail">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </aside>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton action />
      <div
        className="flex flex-wrap items-center gap-3"
        data-testid="workspace-loading-toolbar"
      >
        <Skeleton className="h-10 min-w-48 flex-1" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-3" data-testid="workspace-loading-list">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton className="h-16 w-full rounded-lg" key={row} />
          ))}
        </div>
        <aside className="space-y-3" data-testid="workspace-loading-support">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </aside>
      </div>
    </div>
  );
}

function SharedSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((section) => (
          <div
            className="space-y-4"
            data-testid="shared-loading-section"
            key={section}
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardRouteSkeleton({
  variant,
}: DashboardRouteSkeletonProps) {
  return (
    <section
      className={`dashboard-route-skeleton dashboard-route-skeleton--delayed dashboard-route-skeleton--${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-variant={variant}
      data-testid="dashboard-route-skeleton"
    >
      <span className="sr-only">Loading page content.</span>
      {variant === 'student' ? <StudentSkeleton /> : null}
      {variant === 'teacher' || variant === 'admin' ? (
        <WorkspaceSkeleton />
      ) : null}
      {variant === 'shared' ? <SharedSkeleton /> : null}
    </section>
  );
}
