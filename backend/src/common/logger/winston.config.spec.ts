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
    const LokiTransport = jest
      .fn()
      .mockImplementation(function MockLokiTransport(
        this: any,
        options: Record<string, unknown>,
      ) {
        this.name = 'LokiTransport';
        this.options = options;
        this.log = jest.fn((_info: unknown, callback?: () => void) =>
          callback?.(),
        );
        this.close = jest.fn();
        this.on = jest.fn();
        this.once = jest.fn();
        this.removeListener = jest.fn();
      });

    jest.doMock('winston-loki', () => ({
      __esModule: true,
      default: LokiTransport,
    }));

    process.env.NODE_ENV = 'development';
    process.env.LOKI_HOST = 'http://loki:3100';
    delete process.env.OTEL_SERVICE_NAME;

    let winstonLogger: typeof import('./winston.config').winstonLogger;
    jest.isolateModules(() => {
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
  });
});
