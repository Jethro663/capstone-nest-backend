const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  waitForDeployment,
  deploymentIdFromUpload,
} = require('./wait-railway-deployment.cjs');
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
function fixture(responses) {
  let clock = 0;
  let calls = 0;
  return {
    run: () =>
      waitForDeployment({
        deploymentId: id,
        list: async () => responses[Math.min(calls++, responses.length - 1)],
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
        timeoutMs: 30,
        intervalMs: 10,
        log: () => {},
      }),
    calls: () => calls,
  };
}
test('waits through build and startup for this deployment', async () => {
  const f = fixture(
    ['BUILDING', 'DEPLOYING', 'SUCCESS'].map((status) => [{ id, status }]),
  );
  assert.equal((await f.run()).id, id);
  assert.equal(f.calls(), 3);
});
test('never accepts a different successful deployment', async () => {
  const f = fixture([
    [
      { id: other, status: 'SUCCESS' },
      { id, status: 'BUILDING' },
    ],
  ]);
  await assert.rejects(f.run(), /timed out/);
});
for (const status of ['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED', 'CANCELED']) {
  test(`fails closed on ${status}`, async () => {
    const f = fixture([[{ id, status }]]);
    await assert.rejects(f.run(), new RegExp(status));
    assert.equal(f.calls(), 1);
  });
}
test('missing deployment times out rather than accepting the newest', async () => {
  await assert.rejects(fixture([[]]).run(), /timed out/);
});
test('malformed status responses fail closed', async () => {
  await assert.rejects(fixture([{ deployments: [] }]).run(), /array/);
});
test('upload receipt requires a valid exact deployment ID', () => {
  assert.equal(
    deploymentIdFromUpload(
      JSON.stringify({ deploymentId: id, logsUrl: 'https://example.invalid' }),
    ),
    id,
  );
  assert.throws(() => deploymentIdFromUpload('{}'), /deploymentId/);
  assert.throws(
    () => deploymentIdFromUpload('{"deploymentId":"latest"}'),
    /deploymentId/,
  );
});
