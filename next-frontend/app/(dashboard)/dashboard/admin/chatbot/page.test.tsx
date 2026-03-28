'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminChatbotPage from './page';

const apiGetMock = jest.fn();
const apiPostMock = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      firstName: 'Alex',
      lastName: 'Rivera',
    },
  }),
}));

jest.mock('@/lib/api-client', () => ({
  createApiClient: () => ({
    get: apiGetMock,
    post: apiPostMock,
  }),
}));

describe('AdminChatbotPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiGetMock.mockResolvedValue({
      data: {
        data: {
          ollamaOnline: true,
          model: 'llama3',
        },
      },
    });
    apiPostMock.mockResolvedValue({
      data: {
        data: {
          reply: 'There are 120 active users.',
          sessionId: 'session-1',
        },
      },
    });
  });

  it('renders quick prompts and sends selected prompt to AI chat endpoint', async () => {
    render(<AdminChatbotPage />);

    await screen.findByText('AI Online');

    const prompt = await screen.findByRole('button', {
      name: 'How many active users are there?',
    });
    fireEvent.click(prompt);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith('/ai/chat', {
        message: 'How many active users are there?',
      }),
    );

    expect(await screen.findByText('There are 120 active users.')).toBeInTheDocument();
  });
});
