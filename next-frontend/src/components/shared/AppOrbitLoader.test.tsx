import { render, screen } from '@testing-library/react';
import { AppOrbitLoader } from './AppOrbitLoader';
import { useReducedMotion } from 'framer-motion';

jest.mock('framer-motion', () => {
  const React = jest.requireActual('react') as typeof import('react');

  const MockMotionDiv = React.forwardRef(
    ({ children, ...props }: { children?: React.ReactNode }, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    ),
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  return {
    motion: {
      div: MockMotionDiv,
    },
    useReducedMotion: jest.fn(),
  };
});

const mockedUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

describe('AppOrbitLoader', () => {
  beforeEach(() => {
    mockedUseReducedMotion.mockReturnValue(false);
  });

  it('renders one restrained orbit without the old backdrop layer', () => {
    render(<AppOrbitLoader variant="calm" />);

    expect(screen.getByTestId('orbit-ring-a')).toBeInTheDocument();
    expect(screen.queryByTestId('orbit-ring-b')).not.toBeInTheDocument();
    expect(document.querySelector('.orbit-loader__backdrop')).not.toBeInTheDocument();
  });

  it('renders student copy and icon for student variant', () => {
    render(<AppOrbitLoader variant="student" />);

    expect(screen.getByText('Preparing your learning space…')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-loader-icon')).toBeInTheDocument();
  });

  it('renders calm default copy for calm variant', () => {
    render(<AppOrbitLoader variant="calm" />);

    expect(screen.getByText('Preparing your workspace…')).toBeInTheDocument();
  });

  it('has no inline or fullscreen display mode', () => {
    render(<AppOrbitLoader variant="calm" />);

    const loader = screen.getByTestId('app-orbit-loader');
    expect(loader).toHaveClass('orbit-loader');
    expect(loader).not.toHaveClass('orbit-loader--fullscreen');
  });

  it('renders static fallback when reduced motion is preferred', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    render(<AppOrbitLoader variant="student" />);

    expect(screen.getByTestId('orbit-static')).toBeInTheDocument();
  });
});
