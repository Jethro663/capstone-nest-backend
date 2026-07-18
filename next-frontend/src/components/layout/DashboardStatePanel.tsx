import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export type DashboardStateKind = 'error' | 'empty' | 'unavailable';

export type DashboardStateAction =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

export interface DashboardStatePanelProps {
  kind: DashboardStateKind;
  title: string;
  description: string;
  primaryAction?: DashboardStateAction;
  secondaryAction?: DashboardStateAction;
  className?: string;
}

function DashboardStateActionControl({
  action,
  primary = false,
}: {
  action: DashboardStateAction;
  primary?: boolean;
}) {
  const className = cn(
    'dashboard-state-panel__action',
    primary
      ? 'dashboard-state-panel__action--primary'
      : 'dashboard-state-panel__action--secondary',
  );

  if (typeof action.href === 'string') {
    return (
      <Button asChild variant={primary ? 'default' : 'outline'} className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={primary ? 'default' : 'outline'}
      className={className}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
}

export function DashboardStatePanel({
  kind,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: DashboardStatePanelProps) {
  return (
    <section
      className={cn(
        'dashboard-state-panel',
        `dashboard-state-panel--${kind}`,
        className,
      )}
      role={kind === 'empty' ? undefined : 'status'}
      aria-live={kind === 'empty' ? undefined : 'polite'}
    >
      <div className="dashboard-state-panel__copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {primaryAction || secondaryAction ? (
        <div className="dashboard-state-panel__actions">
          {primaryAction ? (
            <DashboardStateActionControl action={primaryAction} primary />
          ) : null}
          {secondaryAction ? (
            <DashboardStateActionControl action={secondaryAction} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
