'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentChatbotPage from './page';
import { aiService } from '@/services/ai-service';
import { toast } from 'sonner';

jest.mock('@/services/ai-service', () => ({
  aiService: {
    getStudentTutorBootstrap: jest.fn(),
    getStudentTutorSession: jest.fn(),
    startStudentTutorSession: jest.fn(),
    sendStudentTutorMessage: jest.fn(),
    submitStudentTutorAnswers: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockedAiService = aiService as jest.Mocked<typeof aiService>;
const mockedToast = toast as jest.Mocked<typeof toast>;

function mockBootstrapWithClasses() {
  mockedAiService.getStudentTutorBootstrap.mockResolvedValue({
    data: {
      classes: [
        {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-10',
          sectionName: 'Rizal',
          blendedScore: 70,
          isAtRisk: true,
          thresholdApplied: 75,
        },
        {
          id: 'class-2',
          subjectName: 'Science',
          subjectCode: 'SCI-10',
          sectionName: 'Rizal',
          blendedScore: 82,
          isAtRisk: false,
          thresholdApplied: 75,
        },
      ],
      selectedClassId: 'class-1',
      recentLessons: [],
      recentAttempts: [],
      recommendations: [
        {
          id: 'rec-1',
          title: 'Sets practice',
          reason: 'Recent errors detected in set operations.',
          focusText: 'Review union and intersection basics.',
          lessonId: null,
          assessmentId: null,
          questionId: null,
          sourceChunkId: null,
        },
      ],
      history: [],
    },
  });
}

describe('StudentChatbotPage redesign and outage handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBootstrapWithClasses();
  });

  it('renders redesigned chatbot workspace when bootstrap succeeds', async () => {
    render(<StudentChatbotPage />);

    expect(await screen.findByRole('heading', { name: 'Ja Chat Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Study Modes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Session Progress' })).toBeInTheDocument();
    expect(mockedAiService.getStudentTutorBootstrap).toHaveBeenCalledTimes(1);
  });

  it('shows outage state when bootstrap endpoint returns service unavailable', async () => {
    mockedAiService.getStudentTutorBootstrap.mockRejectedValueOnce({
      response: {
        status: 503,
        data: {
          message: 'Service dependencies are not ready',
        },
      },
      message: 'Request failed with status code 503',
    });

    render(<StudentChatbotPage />);

    expect(await screen.findByRole('heading', { name: 'Ja is currently unreachable' })).toBeInTheDocument();
    expect(screen.getByText('Service Unreachable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry connection' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ja Chat Workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Study Modes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Session Progress' })).not.toBeInTheDocument();
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('keeps outage page and shows retry hint when retry still fails', async () => {
    mockedAiService.getStudentTutorBootstrap.mockRejectedValue({
      response: {
        status: 503,
        data: {
          message: 'Service dependencies are not ready',
        },
      },
      message: 'Request failed with status code 503',
    });

    render(<StudentChatbotPage />);

    expect(await screen.findByRole('heading', { name: 'Ja is currently unreachable' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));

    expect(await screen.findByText('Still offline. Please try again in a few minutes.')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedAiService.getStudentTutorBootstrap).toHaveBeenCalledTimes(2);
    });
  });

  it('refreshes bootstrap for selected class without health preflight', async () => {
    render(<StudentChatbotPage />);

    const classSelect = await screen.findByRole('combobox');
    fireEvent.change(classSelect, { target: { value: 'class-2' } });

    await waitFor(() => {
      expect(mockedAiService.getStudentTutorBootstrap).toHaveBeenCalledTimes(2);
    });

    expect(mockedAiService.getStudentTutorBootstrap).toHaveBeenLastCalledWith('class-2');
  });
});
