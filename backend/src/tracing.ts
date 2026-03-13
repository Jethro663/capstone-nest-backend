import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('🔍 OpenTelemetry Tracing initialized');

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('✅ Tracing shutdown gracefully'))
    .catch((err) => console.error('❌ Error shutting down tracing:', err))
    .finally(() => process.exit(0));
});
