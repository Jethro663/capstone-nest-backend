import { render, screen } from '@testing-library/react';
import type { ImageProps } from 'next/image';
import AuthLayout from './layout';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: ImageProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { priority: _priority, ...imgProps } = props;

    // Keep the image render trivial for link/accessibility assertions.
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={props.alt} />;
  },
}));

describe('AuthLayout', () => {
  it('links the Nexora portal brand back to the landing page', () => {
    render(
      <AuthLayout>
        <div>auth content</div>
      </AuthLayout>,
    );

    expect(
      screen.getByRole('link', { name: /nexora portal/i }),
    ).toHaveAttribute('href', '/');
  });

  it('renders its child content inside the auth shell', () => {
    render(
      <AuthLayout>
        <div>auth content</div>
      </AuthLayout>,
    );

    expect(screen.getByText('auth content')).toBeInTheDocument();
  });
});
