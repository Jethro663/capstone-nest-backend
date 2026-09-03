const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { appendFile, mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  buildReleasePayload,
  verifyManifest,
} = require("./app-version-release.cjs");

const fixtureApk = Buffer.from("fixture-apk-bytes");
let fixtureRoot;
let fixtureApkPath;
let fixtureAppJsonPath;
let fixtureBuildGradlePath;

test.beforeEach(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "nexora-release-test-"));
  fixtureApkPath = path.join(fixtureRoot, "release.apk");
  fixtureAppJsonPath = path.join(fixtureRoot, "app.json");
  fixtureBuildGradlePath = path.join(fixtureRoot, "build.gradle");
  await writeFile(fixtureApkPath, fixtureApk);
});

test.afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

async function fixtureOptions({
  gradleVersionCode = 14,
  gradleVersionName = "0.1.13",
  apkBadging = "package: name='com.nexora.lms.mobile' versionCode='14' versionName='0.1.13'",
} = {}) {
  await writeFile(
    fixtureAppJsonPath,
    JSON.stringify({
      expo: {
        version: "0.1.13",
        android: { package: "com.nexora.lms.mobile", versionCode: 14 },
        runtimeVersion: { policy: "appVersion" },
      },
    }),
  );
  await writeFile(
    fixtureBuildGradlePath,
    `android { defaultConfig { versionCode ${gradleVersionCode}\nversionName "${gradleVersionName}" } }`,
  );
  return {
    apkPath: fixtureApkPath,
    appJsonPath: fixtureAppJsonPath,
    buildGradlePath: fixtureBuildGradlePath,
    apkBadging,
    apkDownloadUrl:
      "https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk",
    minSupportedVersionCode: 1,
    releaseNotes: "Navigation stability and JAHUB mobile updates.",
  };
}

test("buildReleasePayload derives exact APK size and SHA-256", async () => {
  const payload = await buildReleasePayload(await fixtureOptions());

  assert.equal(payload.platform, "android");
  assert.equal(payload.versionCode, 14);
  assert.equal(payload.nativeVersion, "0.1.13");
  assert.equal(payload.otaRuntimeVersion, "0.1.13");
  assert.equal(payload.apkSizeBytes, Buffer.byteLength(fixtureApk));
  assert.equal(
    payload.apkSha256,
    createHash("sha256").update(fixtureApk).digest("hex"),
  );
});

test("rejects app.json and Gradle version drift", async () => {
  await assert.rejects(
    buildReleasePayload(await fixtureOptions({ gradleVersionCode: 13 })),
    /app.json versionCode 14 does not match Gradle versionCode 13/,
  );
});

test("rejects APK badging that differs from source configuration", async () => {
  await assert.rejects(
    buildReleasePayload(
      await fixtureOptions({
        apkBadging:
          "package: name='com.nexora.lms.mobile' versionCode='13' versionName='0.1.12'",
      }),
    ),
    /APK versionCode 13 does not match configured versionCode 14/,
  );
});

test("verifyManifest rejects a changed APK", async () => {
  const options = await fixtureOptions();
  const payload = await buildReleasePayload(options);
  await appendFile(fixtureApkPath, Buffer.from("changed"));
  await assert.rejects(
    verifyManifest(payload, options),
    /apkSizeBytes|apkSha256/,
  );
});
