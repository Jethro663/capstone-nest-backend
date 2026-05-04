import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SystemInfoButton } from './SystemInfoButton';

const getLivenessMock = jest.fn();
const getReadinessMock = jest.fn();
const getAiHealthMock = jest.fn();

jest.mock('@/services/health-service', () => ({
  FRONTEND_APP_VERSION: '0.1.0-test',
  healthService: {
    getLiveness: () => getLivenessMock(),
    getReadiness: () => getReadinessMock(),
    getAiHealth: () => getAiHealthMock(),
  },
}));

describe('SystemInfoButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLivenessMock.mockResolvedValue({
      status: 'ok',
      timestamp: '2026-05-05T08:00:00.000Z',
      service: {
        name: 'backend',
        version: '0.0.1-test',
      },
    });
    getReadinessMock.mockResolvedValue({
      ready: true,
      timestamp: '2026-05-05T08:00:01.000Z',
      service: {
        name: 'backend',
        version: '0.0.1-test',
      },
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: {
          ok: true,
          version: '1.0.0-test',
          runtimeProvider: 'ollama',
        },
      },
    });
    getAiHealthMock.mockResolvedValue({
      service: {
        name: 'ai-service',
        version: '1.0.0-test',
      },
      runtimeAvailable: true,
      runtimeProvider: 'ollama',
      configuredTextModel: 'llama3',
      timestamp: '2026-05-05T08:00:02.000Z',
    });
  });

  it('loads and displays live service versions inside the modal', async () => {
    render(
      <SystemInfoButton
        buttonClassName="system-info-trigger"
        iconClassName="h-5 w-5"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /open system info/i }));

    expect(await screen.findByText('System information')).toBeInTheDocument();

    await waitFor(() => {
      expect(getLivenessMock).toHaveBeenCalledTimes(1);
      expect(getReadinessMock).toHaveBeenCalledTimes(1);
      expect(getAiHealthMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('0.1.0-test')).toBeInTheDocument();
    expect(await screen.findByText('0.0.1-test')).toBeInTheDocument();
    expect(await screen.findByText('1.0.0-test')).toBeInTheDocument();
    expect(await screen.findByText(/Model: llama3/i)).toBeInTheDocument();
    expect(await screen.findAllByText('Operational')).toHaveLength(2);
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Redis')).toBeInTheDocument();
  });
});
