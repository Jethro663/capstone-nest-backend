/* eslint-disable @typescript-eslint/no-require-imports -- Jest isolateModules is synchronous. */

describe('tracing bootstrap', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, envSnapshot);
  });

  it('does not initialize tracing when the OTLP endpoint is explicitly blank', () => {
    const start = jest.fn();
    const shutdown = jest.fn().mockResolvedValue(undefined);
    const NodeSDK = jest.fn().mockImplementation(() => ({ start, shutdown }));
    const OTLPTraceExporter = jest.fn().mockImplementation(() => ({}));

    jest.doMock('@opentelemetry/sdk-node', () => ({ NodeSDK }));
    jest.doMock('@opentelemetry/auto-instrumentations-node', () => ({
      getNodeAutoInstrumentations: jest.fn(() => []),
    }));
    jest.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
      OTLPTraceExporter,
    }));
    jest.doMock('@opentelemetry/resources', () => ({
      resourceFromAttributes: jest.fn(() => ({})),
    }));
    jest.doMock('@opentelemetry/semantic-conventions', () => ({
      SemanticResourceAttributes: {
        SERVICE_NAME: 'service.name',
        SERVICE_NAMESPACE: 'service.namespace',
        SERVICE_INSTANCE_ID: 'service.instance.id',
        SERVICE_VERSION: 'service.version',
      },
    }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '   ';

    jest.isolateModules(() => {
      require('./tracing');
    });

    expect(OTLPTraceExporter).not.toHaveBeenCalled();
    expect(NodeSDK).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });
});
