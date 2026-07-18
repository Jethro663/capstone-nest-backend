const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { resolveDevComposeBootstrap } = require('./dev-compose-config.cjs');

test('backend dev bootstrap uses root .env and Compose automatic env loading', () => {
  const repoRoot = path.join(path.sep, 'workspace', 'nexora');
  const config = resolveDevComposeBootstrap(repoRoot);

  assert.equal(config.envPath, path.join(repoRoot, '.env'));
  assert.deepEqual(config.args, [
    'compose',
    'up',
    '-d',
    'postgres',
    'redis',
    'ollama',
    'ai-service',
  ]);
});
