import * as client from 'prom-client';

// HTTP Request Duration Histogram (in seconds)
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// HTTP Request Counter
export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTP Request Errors Counter
export const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
});

export const storageCleanupFailures = new client.Counter({
  name: 'storage_cleanup_failures_total',
  help: 'Local storage cleanup failures after a successful remote operation',
  labelNames: ['component', 'operation'],
});

// DB Pool Metrics
export const dbPoolTotal = new client.Gauge({
  name: 'db_pool_total_connections',
  help: 'Total connections in the DB pool',
});

export const dbPoolIdle = new client.Gauge({
  name: 'db_pool_idle_connections',
  help: 'Idle connections in the DB pool',
});

export const dbPoolWaiting = new client.Gauge({
  name: 'db_pool_waiting_requests',
  help: 'Waiting connection requests in the DB pool',
});

export const workflowJobsTotal = new client.Gauge({
  name: 'workflow_jobs_total',
  help: 'Durable workflow jobs grouped by the fixed persisted status enum',
  labelNames: ['status'],
});

export const workflowOldestNonterminalAgeSeconds = new client.Gauge({
  name: 'workflow_oldest_nonterminal_age_seconds',
  help: 'Age in seconds of the oldest pending or processing workflow',
});

export const workflowFailedJobsTotal = new client.Gauge({
  name: 'workflow_failed_jobs_total',
  help: 'Durable workflows currently recorded with failed status',
});

export const workflowDiagnosticsCollectionFailures = new client.Counter({
  name: 'workflow_diagnostics_collection_failures_total',
  help: 'Failures while collecting aggregate workflow diagnostics for metrics',
});

// Export all metrics as an array for registration
export const allMetrics: client.Metric<string>[] = [
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
  dbPoolTotal,
  dbPoolIdle,
  dbPoolWaiting,
  workflowJobsTotal,
  workflowOldestNonterminalAgeSeconds,
  workflowFailedJobsTotal,
  workflowDiagnosticsCollectionFailures,
];
