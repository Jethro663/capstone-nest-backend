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

  it('renders the two-orbit structure', () => {
    render(<AppOrbitLoader variant="calm" />);

    expect(screen.getByTestId('orbit-ring-a')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-ring-b')).toBeInTheDocument();
  });

  it('renders student copy and icon for student variant', () => {
    render(<AppOrbitLoader variant="student" />);

    expect(screen.getByText('Wait a minute!')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-loader-icon')).toBeInTheDocument();
  });

  it('renders calm default copy for calm variant', () => {
    render(<AppOrbitLoader variant="calm" />);

    expect(screen.getByText('Loading your portal...')).toBeInTheDocument();
  });

  it('renders static fallback when reduced motion is preferred', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    render(<AppOrbitLoader variant="student" />);

    expect(screen.getByTestId('orbit-static')).toBeInTheDocument();
  });
});
