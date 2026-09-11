const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  validateAdminContracts,
  findForbiddenClientBypasses,
} = require("./check-admin-client-contracts.cjs");

test("backend, web, and mobile satisfy the shared administrator transport manifest", () => {
  const root = path.resolve(__dirname, "..");
  const result = validateAdminContracts(root);
  assert.deepEqual(result.errors, []);
  assert.ok(result.contractCount >= 21);
  assert.equal(result.layersChecked, result.contractCount * 3);
});

test("rejects client-authoritative Demo mode bypass transports", () => {
  assert.deepEqual(
    findForbiddenClientBypasses(`api.post('/classes?demo=true', payload)`),
    ["demo query flag"],
  );
  assert.deepEqual(
    findForbiddenClientBypasses(`headers: { 'X-Demo-Mode': 'true' }`),
    ["demo mode header"],
  );
  assert.deepEqual(
    findForbiddenClientBypasses(`api.post('/classes', { demoMode: true })`),
    ["demo request-body authority"],
  );
  assert.deepEqual(
    findForbiddenClientBypasses(
      `status.active && status.relaxedRules.some((rule) => rule.code === code)`,
    ),
    [],
  );
});
