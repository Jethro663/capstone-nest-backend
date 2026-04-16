'use client';

import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';
import StudentChatbotRedirectPage from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('StudentChatbotRedirectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the JA workspace route', () => {
    render(<StudentChatbotRedirectPage />);

    expect(mockedRedirect).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard/student/ja');
  });
});
