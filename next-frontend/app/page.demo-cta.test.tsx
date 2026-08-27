import { render, screen } from '@testing-library/react';
import LandingPage from './page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
    role: null,
    refreshAuth: jest.fn(),
  }),
}));

jest.mock('framer-motion', () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.initial;
    delete rest.animate;
    delete rest.exit;
    delete rest.transition;
    delete rest.variants;
    delete rest.whileHover;
    delete rest.whileInView;
    delete rest.viewport;
    return rest;
  };
  const passthrough = {
    div: (props: Record<string, unknown>) => <div {...stripMotionProps(props)} />,
    article: (props: Record<string, unknown>) => <article {...stripMotionProps(props)} />,
    span: (props: Record<string, unknown>) => <span {...stripMotionProps(props)} />,
    h1: (props: Record<string, unknown>) => <h1 {...stripMotionProps(props)} />,
    h2: (props: Record<string, unknown>) => <h2 {...stripMotionProps(props)} />,
    p: (props: Record<string, unknown>) => <p {...stripMotionProps(props)} />,
    section: (props: Record<string, unknown>) => <section {...stripMotionProps(props)} />,
    header: (props: Record<string, unknown>) => <header {...stripMotionProps(props)} />,
    footer: (props: Record<string, unknown>) => <footer {...stripMotionProps(props)} />,
    nav: (props: Record<string, unknown>) => <nav {...stripMotionProps(props)} />,
    main: (props: Record<string, unknown>) => <main {...stripMotionProps(props)} />,
  };
  return {
    motion: passthrough,
    useReducedMotion: () => true,
  };
});

describe('Landing entry CTAs', () => {
  it('does not link to the removed demo route and keeps the portal entry', () => {
    render(<LandingPage />);
    expect(screen.queryByRole('link', { name: /demo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /enter nexora/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
