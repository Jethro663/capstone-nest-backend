const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const entrypoint = path.resolve(__dirname, '../dist/main.js');
assert.ok(
  fs.existsSync(entrypoint),
  'Production entrypoint dist/main.js is missing. Keep application compilation rooted at src/.',
);
console.log('Production entrypoint verified: dist/main.js');
