import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DashboardRouteSkeleton,
  type DashboardRouteSkeletonVariant,
} from './DashboardRouteSkeleton';

const variants: DashboardRouteSkeletonVariant[] = [
  'student',
  'teacher',
  'admin',
  'shared',
];

describe('DashboardRouteSkeleton', () => {
  it.each(variants)('renders the %s content skeleton accessibly', (variant) => {
    render(<DashboardRouteSkeleton variant={variant} />);

    const loader = screen.getByRole('status');
    expect(loader).toHaveAttribute('aria-busy', 'true');
    expect(loader).toHaveAttribute('data-variant', variant);
    expect(screen.getByText('Loading page content.')).toHaveClass('sr-only');
  });

  it.each(variants)('keeps the %s skeleton inside the dashboard content area', (variant) => {
    render(<DashboardRouteSkeleton variant={variant} />);

    const loader = screen.getByTestId('dashboard-route-skeleton');
    expect(loader).toHaveClass('dashboard-route-skeleton');
    expect(loader).toHaveClass('dashboard-route-skeleton--delayed');
    expect(loader.className).not.toMatch(/fullscreen|orbit-loader/);
    expect(loader).not.toHaveStyle({ minHeight: '100vh' });
  });

  it('uses a student feed-and-rail shape', () => {
    render(<DashboardRouteSkeleton variant="student" />);

    expect(screen.getByTestId('student-loading-main')).toBeInTheDocument();
    expect(screen.getByTestId('student-loading-rail')).toBeInTheDocument();
  });

  it.each(['teacher', 'admin'] as const)(
    'uses a workspace shape for the %s dashboard',
    (variant) => {
      render(<DashboardRouteSkeleton variant={variant} />);

      expect(screen.getByTestId('workspace-loading-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-loading-list')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-loading-support')).toBeInTheDocument();
    },
  );

  it('uses a neutral two-section shape for shared routes', () => {
    render(<DashboardRouteSkeleton variant="shared" />);

    expect(screen.getAllByTestId('shared-loading-section')).toHaveLength(2);
  });

  it('disables motion while preserving the delayed reveal for reduced motion', () => {
    const stylesheet = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

    expect(stylesheet).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*dashboard-route-skeleton-reveal-static/,
    );
    expect(stylesheet).toMatch(
      /\.dashboard-route-skeleton \.animate-pulse\s*{\s*animation: none;/,
    );
  });
});
