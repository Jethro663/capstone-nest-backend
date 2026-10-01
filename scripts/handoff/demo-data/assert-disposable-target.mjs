const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function assertDisposableTarget(connectionString) {
  let target;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error('NEXORA_DOC_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('NEXORA_DOC_DATABASE_URL must use postgres:// or postgresql://.');
  }
  if (!LOCAL_HOSTS.has(target.hostname)) {
    throw new Error('Documentation data may target only a local PostgreSQL host.');
  }
  if (!target.username || !target.password) {
    throw new Error('Documentation data requires an explicit username and password.');
  }

  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!databaseName.startsWith('nexora_docs_')) {
    throw new Error('Documentation database name must start with nexora_docs_.');
  }

  const sslMode = target.searchParams.get('sslmode');
  if (sslMode && sslMode !== 'disable') {
    throw new Error('A disposable local documentation target must not require TLS.');
  }

  return Object.freeze({
    hostname: target.hostname,
    port: target.port || '5432',
    databaseName,
    username: decodeURIComponent(target.username),
  });
}
