const path = require('node:path');

function resolveDevComposeBootstrap(repoRoot) {
  return {
    envPath: path.join(repoRoot, '.env'),
    args: [
      'compose',
      'up',
      '-d',
      'postgres',
      'redis',
      'ollama',
      'ai-service',
    ],
  };
}

module.exports = { resolveDevComposeBootstrap };
