const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { setTimeout: sleep } = require('node:timers/promises');

function deploymentIdFromUpload(text) {
  const id = JSON.parse(text).deploymentId;
  if (
    typeof id !== 'string' ||
    !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)
  ) {
    throw new Error(
      'Upload receipt has no valid deploymentId; refusing to follow the latest deployment',
    );
  }
  return id;
}

async function waitForDeployment({
  deploymentId,
  list,
  now = Date.now,
  sleep: pause = sleep,
  timeoutMs = 20 * 60 * 1000,
  intervalMs = 10000,
  log = console.log,
}) {
  const deadline = now() + timeoutMs;
  let previous;
  while (now() < deadline) {
    const deployments = await list();
    if (!Array.isArray(deployments))
      throw new Error('Expected an array of deployment statuses');
    const deployment = deployments.find((entry) => entry.id === deploymentId);
    const status = deployment?.status ?? 'NOT_VISIBLE';
    if (status !== previous) log(`Deployment ${deploymentId}: ${status}`);
    previous = status;
    if (status === 'SUCCESS') return deployment;
    if (
      [
        'FAILED',
        'CRASHED',
        'REMOVED',
        'SKIPPED',
        'CANCELED',
        'CANCELLED',
      ].includes(status)
    ) {
      throw new Error(`Deployment ${deploymentId} ended with ${status}`);
    }
    await pause(intervalMs);
  }
  throw new Error(
    `Deployment ${deploymentId} timed out before runtime success`,
  );
}

async function main() {
  const file = process.argv[2];
  if (!file)
    throw new Error('Provide the JSON receipt from railway up --detach --json');
  const deploymentId = deploymentIdFromUpload(readFileSync(file, 'utf8'));
  const required = [
    'RAILWAY_PROJECT_ID',
    'RAILWAY_ENVIRONMENT_NAME',
    'RAILWAY_SERVICE_NAME',
  ];
  for (const key of required)
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  await waitForDeployment({
    deploymentId,
    list: async () =>
      JSON.parse(
        execFileSync(
          'railway',
          [
            'deployment',
            'list',
            '--project',
            process.env.RAILWAY_PROJECT_ID,
            '--environment',
            process.env.RAILWAY_ENVIRONMENT_NAME,
            '--service',
            process.env.RAILWAY_SERVICE_NAME,
            '--limit',
            '100',
            '--json',
          ],
          { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
        ),
      ),
  });
}

module.exports = { deploymentIdFromUpload, waitForDeployment };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
