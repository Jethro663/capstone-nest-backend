const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");

test("release configuration is HTTPS-only, backup-safe, and permission-minimized", async () => {
  const appJson = JSON.parse(
    await readFile(path.join(mobileRoot, "app.json"), "utf8"),
  );
  const manifest = await readFile(
    path.join(mobileRoot, "android/app/src/main/AndroidManifest.xml"),
    "utf8",
  );
  const permissions = appJson.expo.android.permissions;

  assert.equal(appJson.expo.android.usesCleartextTraffic, false);
  assert.equal(new Set(permissions).size, permissions.length);
  assert.doesNotMatch(
    manifest,
    /READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|RECORD_AUDIO|SYSTEM_ALERT_WINDOW/,
  );
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
});

test("release signing fails closed instead of using the Android debug key", async () => {
  const gradle = await readFile(
    path.join(mobileRoot, "android/app/build.gradle"),
    "utf8",
  );
  const releaseBlock = gradle.match(/release\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";

  assert.doesNotMatch(releaseBlock, /signingConfigs\.debug/);
  assert.match(gradle, /NEXORA_RELEASE_STORE_FILE/);
  assert.match(gradle, /NEXORA_RELEASE_STORE_PASSWORD/);
  assert.match(gradle, /NEXORA_RELEASE_KEY_ALIAS/);
  assert.match(gradle, /NEXORA_RELEASE_KEY_PASSWORD/);
  assert.match(gradle, /verifyNexoraReleaseSigner/);
  assert.match(gradle, /MessageDigest/);
  assert.match(gradle, /debug\.keystore/);
  assert.match(gradle, /certificate-sha256/);
  assert.match(gradle, /GradleException/);
});

test("binary release policy does not advertise an unowned Expo OTA channel", async () => {
  const appJson = JSON.parse(
    await readFile(path.join(mobileRoot, "app.json"), "utf8"),
  );
  const packageJson = JSON.parse(
    await readFile(path.join(mobileRoot, "package.json"), "utf8"),
  );
  const updateService = await readFile(
    path.join(mobileRoot, "src/services/update/update.service.ts"),
    "utf8",
  );

  assert.equal(appJson.expo.runtimeVersion, undefined);
  assert.equal(appJson.expo.updates, undefined);
  assert.equal(packageJson.dependencies["expo-updates"], undefined);
  assert.doesNotMatch(updateService, /expo-updates|triggerOtaUpdate/);
});
