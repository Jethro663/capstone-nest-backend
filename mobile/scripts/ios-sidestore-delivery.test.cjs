const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "..");

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("Expo config defines the stable iOS SideStore identity", async () => {
  const appJson = JSON.parse(await read("mobile/app.json"));
  assert.equal(appJson.expo.ios.bundleIdentifier, "com.nexora.lms.mobile");
  assert.match(appJson.expo.ios.buildNumber, /^\d+$/);
  assert.match(appJson.expo.version, /^\d+\.\d+\.\d+$/);
});

test("the iOS workflow is deliberate, unsigned, verified, and publish-gated", async () => {
  const workflow = await read(
    ".github/workflows/build-mobile-ios-sidestore.yml",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(
    workflow,
    /push:\n\s+tags:\n\s+- "ios-sidestore-build-\*"/,
  );
  assert.doesNotMatch(workflow, /^\s+branches:/m);
  assert.match(workflow, /runs-on: macos-26/);
  assert.match(workflow, /Xcode_26\.5\.app/);
  assert.match(workflow, /CODE_SIGNING_ALLOWED=NO/);
  assert.match(workflow, /verify-ios-sidestore-ipa\.sh/);
  assert.match(workflow, /^\s+npm run test$/m);
  assert.match(workflow, /ios-sidestore-latest/);
  assert.match(
    workflow,
    /github\.event_name == 'push' \|\| inputs\.publish == true/,
  );
  assert.match(
    workflow,
    /git\/refs\/tags\/\$RELEASE_TAG[\s\S]*?force=true/,
  );
  assert.match(
    workflow,
    /gh release edit "\$RELEASE_TAG" \\\n\s+--target "\$GITHUB_SHA"/,
  );
  assert.match(
    workflow,
    /https:\/\/capstone-backend-v2-production\.up\.railway\.app\/api/,
  );
});

test("the verifier enforces identity, ARM64, embedded JS, and no profile", async () => {
  const verifier = await read(
    "mobile/scripts/verify-ios-sidestore-ipa.sh",
  );
  for (const required of [
    "set -euo pipefail",
    "CFBundleIdentifier",
    "CFBundleShortVersionString",
    "CFBundleVersion",
    "arm64",
    "main.jsbundle",
    "embedded.mobileprovision",
    "codesign -dv",
    "Nexora-iOS-latest-unsigned.ipa.sha256",
  ]) {
    assert.ok(verifier.includes(required), `missing verifier gate: ${required}`);
  }
});

test("the tester guide covers install, refresh, evidence, privacy, and recovery", async () => {
  const guide = await read("docs/mobile-ios-sidestore-windows-guide.md");
  for (const required of [
    "Verify 64-bit Windows",
    "Install LocalDevVPN",
    "Install iLoader",
    "Install SideStore Stable",
    "Enable Developer Mode",
    "First SideStore refresh",
    "Install Nexora",
    "Refresh before seven days",
    "Physical-device test checklist",
    "Do not send anyone",
    "Troubleshooting",
    "Remove SideStore and Nexora",
  ]) {
    assert.ok(guide.includes(required), `guide is missing: ${required}`);
  }
});
