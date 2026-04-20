'use client';

import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';
import StudentJaRedirectPage from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('StudentJaRedirectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects ja route traffic into the embedded lxp ja tab', () => {
    render(<StudentJaRedirectPage />);

    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard/student/lxp?tab=ja');
  });

  it('preserves mode and class query when redirecting', () => {
    render(
      <StudentJaRedirectPage
        searchParams={{ mode: 'review', classId: 'class-123' }}
      />,
    );

    expect(mockedRedirect).toHaveBeenCalledWith(
      '/dashboard/student/lxp?tab=ja&mode=review&classId=class-123',
    );
  });
});

