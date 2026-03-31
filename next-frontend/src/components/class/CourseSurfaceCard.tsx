'use client';

import Link from 'next/link';
import type {
  CSSProperties,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CourseSurfaceActionLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface CourseSurfaceCardProps {
  className?: string;
  dataThemeKind?: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  heroMeta: string;
  heroStyle: CSSProperties;
  heroControl?: ReactNode;
  heroWatermark?: ReactNode;
  stats: Array<{ value: string | number; label: string }>;
  progressPercent: number;
  progressColor: string;
  progressLabel?: string;
  actions: ReadonlyArray<CourseSurfaceActionLink>;
  onClick?: MouseEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  ariaLabel?: string;
  tabIndex?: number;
  style?: CSSProperties;
  animateDelayMs?: number;
}

export function CourseSurfaceCard({
  className,
  dataThemeKind,
  title,
  subtitle,
  statusLabel,
  heroMeta,
  heroStyle,
  heroControl,
  heroWatermark,
  stats,
  progressPercent,
  progressColor,
  progressLabel = 'Completion',
  actions,
  onClick,
  onKeyDown,
  ariaLabel,
  tabIndex = 0,
  style,
  animateDelayMs,
}: CourseSurfaceCardProps) {
  const articleStyle: CSSProperties = {
    ...(style ?? {}),
    ...(animateDelayMs !== undefined
      ? ({ '--enter-delay': `${animateDelayMs}ms` } as CSSProperties)
      : {}),
  };

  return (
    <article
      className={cn('teacher-home-card', className)}
      data-theme-kind={dataThemeKind}
      data-animate="true"
      role="link"
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={articleStyle}
    >
      <div className="teacher-home-card__hero" style={heroStyle}>
        {heroControl ? (
          heroControl
        ) : null}
        {heroWatermark ? (
          <div className="student-course-card__watermark">{heroWatermark}</div>
        ) : null}
        <p>{heroMeta}</p>
      </div>

      <div className="teacher-home-card__body">
        <div className="teacher-home-card__title-row">
          <div className="teacher-home-card__title-copy">
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <span className="teacher-home-card__state">{statusLabel}</span>
        </div>

        <div className="teacher-home-card__stats">
          {stats.map((entry) => (
            <article key={`${entry.label}-${entry.value}`}>
              <strong>{entry.value}</strong>
              <span>{entry.label}</span>
            </article>
          ))}
        </div>

        <div className="teacher-home-card__progress">
          <div className="teacher-home-card__progress-head">
            <span>{progressLabel}</span>
            <strong>{Math.max(0, Math.min(100, progressPercent))}%</strong>
          </div>
          <div className="teacher-home-card__progress-track">
            <div
              style={{
                width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                background: progressColor,
              }}
            />
          </div>
        </div>

        <div className="teacher-home-card__actions">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={`${action.href}-${action.label}`} href={action.href}>
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </article>
  );
}
