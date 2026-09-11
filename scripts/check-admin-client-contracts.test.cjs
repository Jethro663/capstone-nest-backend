const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  validateAdminContracts,
} = require("./check-admin-client-contracts.cjs");

test("backend, web, and mobile satisfy the shared administrator transport manifest", () => {
  const root = path.resolve(__dirname, "..");
  const result = validateAdminContracts(root);
  assert.deepEqual(result.errors, []);
  assert.ok(result.contractCount >= 10);
  assert.equal(result.layersChecked, result.contractCount * 3);
});
