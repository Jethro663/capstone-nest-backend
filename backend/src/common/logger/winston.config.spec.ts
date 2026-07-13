/* eslint-disable @typescript-eslint/no-require-imports -- Jest isolateModules is synchronous. */
import TransportStream from 'winston-transport';

describe('winston.config', () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, envSnapshot);
  });

  afterAll(() => {
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, envSnapshot);
  });

  it('enables Loki transport when LOKI_HOST is configured', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    class MockLokiTransport extends TransportStream {
      readonly options: Record<string, unknown>;

      constructor(options: Record<string, unknown>) {
        super();
        this.options = options;
      }

      log(_info: unknown, callback: () => void) {
        callback();
      }
    }
    const LokiTransport = jest
      .fn()
      .mockImplementation(
        (options: Record<string, unknown>) => new MockLokiTransport(options),
      );

    jest.doMock('winston-loki', () => ({
      __esModule: true,
      default: LokiTransport,
    }));

    process.env.NODE_ENV = 'development';
    process.env.LOKI_HOST = 'http://loki:3100';
    delete process.env.OTEL_SERVICE_NAME;

    let winstonLogger: typeof import('./winston.config').winstonLogger;
    jest.isolateModules(() => {
      // Jest's CommonJS runner requires a synchronous load inside isolateModules.
      ({ winstonLogger } =
        require('./winston.config') as typeof import('./winston.config'));
    });

    expect(LokiTransport).toHaveBeenCalledTimes(1);
    expect(winstonLogger!.transports).toHaveLength(4);

    const [options] = LokiTransport.mock.calls[0] as [
      {
        host: string;
        labels: Record<string, string>;
      },
    ];

    expect(options.host).toBe('http://loki:3100');
    expect(options.labels).toMatchObject({
      app: 'nexora-backend',
      service_name: 'nexora-backend',
      environment: 'development',
    });
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('legacy winston transport'),
    );
  });
});
