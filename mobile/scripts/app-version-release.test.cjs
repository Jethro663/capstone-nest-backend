const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  appendFile,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  bumpMobileReleaseIdentity,
  buildReleasePayload,
  defaultPaths,
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
  appPermissions = ["android.permission.REQUEST_INSTALL_PACKAGES"],
  apkBadging = [
    "package: name='com.nexora.lms.mobile' versionCode='14' versionName='0.1.13'",
    "uses-permission: name='android.permission.REQUEST_INSTALL_PACKAGES'",
  ].join("\n"),
  apkSignerOutput = `Signer #1 certificate SHA-256 digest: ${"11".repeat(32)}`,
  sourceRevision = "a".repeat(40),
} = {}) {
  await writeFile(
    fixtureAppJsonPath,
    JSON.stringify({
      expo: {
        version: "0.1.13",
        android: {
          package: "com.nexora.lms.mobile",
          versionCode: 14,
          permissions: appPermissions,
        },
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
    apkSignerOutput,
    apkDownloadUrl:
      "https://next-frontend-v2-production.up.railway.app/downloads/android/14-aaaaaaaa/nexora-mobile-0.1.13-build14.apk",
    sourceRevision,
    releaseNotes: "Navigation stability and JAHUB mobile updates.",
  };
}

test("buildReleasePayload derives exact APK size and SHA-256", async () => {
  const payload = await buildReleasePayload(await fixtureOptions());

  assert.equal(payload.platform, "android");
  assert.equal(payload.versionCode, 14);
  assert.equal(payload.nativeVersion, "0.1.13");
  assert.equal(payload.otaRuntimeVersion, "0.1.13");
  assert.equal(payload.artifactKind, "apk");
  assert.equal(payload.artifactDownloadUrl, payload.apkDownloadUrl);
  assert.equal(payload.sourceRevision, "a".repeat(40));
  assert.equal(payload.distributionChannel, "website");
  assert.equal(payload.apkSizeBytes, Buffer.byteLength(fixtureApk));
  assert.equal(
    payload.apkSha256,
    createHash("sha256").update(fixtureApk).digest("hex"),
  );
});

test("rejects a mutable Android artifact URL", async () => {
  await assert.rejects(
    buildReleasePayload({
      ...(await fixtureOptions()),
      apkDownloadUrl:
        "https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk",
    }),
    /immutable Android artifact URL/i,
  );
});

test("verify mode preserves the immutable URL stored in the manifest", () => {
  assert.equal(defaultPaths({}, "verify").apkDownloadUrl, undefined);
  assert.match(
    defaultPaths({}, "prepare").apkDownloadUrl,
    /nexora-student-mobile-release\.apk$/,
  );
});

test("rejects Android release metadata without an exact source revision", async () => {
  await assert.rejects(
    buildReleasePayload(await fixtureOptions({ sourceRevision: "not-a-sha" })),
    /sourceRevision/i,
  );
});

test("normal releases require their exact published Android build by default", async () => {
  const payload = await buildReleasePayload(await fixtureOptions());
  assert.equal(payload.minSupportedVersionCode, payload.versionCode);
});

test("a lower release floor requires an explicit recovery override", async () => {
  const options = { ...(await fixtureOptions()), minSupportedVersionCode: 1 };
  await assert.rejects(buildReleasePayload(options), /recovery/i);
  assert.equal(
    (await buildReleasePayload({ ...options, allowSupportedOlderBuilds: true }))
      .minSupportedVersionCode,
    1,
  );
});

test("the minimum supported build can never exceed the packaged build", async () => {
  await assert.rejects(
    buildReleasePayload({
      ...(await fixtureOptions()),
      minSupportedVersionCode: 15,
    }),
    /exceed/i,
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
        apkBadging: [
          "package: name='com.nexora.lms.mobile' versionCode='13' versionName='0.1.12'",
          "uses-permission: name='android.permission.REQUEST_INSTALL_PACKAGES'",
        ].join("\n"),
      }),
    ),
    /APK versionCode 13 does not match configured versionCode 14/,
  );
});

test("rejects app.json without the installer permission", async () => {
  await assert.rejects(
    buildReleasePayload(await fixtureOptions({ appPermissions: [] })),
    /android\.permission\.REQUEST_INSTALL_PACKAGES/,
  );
});

test("rejects an APK without the embedded installer permission", async () => {
  await assert.rejects(
    buildReleasePayload(
      await fixtureOptions({
        apkBadging:
          "package: name='com.nexora.lms.mobile' versionCode='14' versionName='0.1.13'",
      }),
    ),
    /android\.permission\.REQUEST_INSTALL_PACKAGES/,
  );
});

test("rejects an APK signed with the known Android debug certificate", async () => {
  await assert.rejects(
    buildReleasePayload(
      await fixtureOptions({
        apkSignerOutput:
          "Signer #1 certificate SHA-256 digest: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c",
      }),
    ),
    /debug certificate/i,
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

test("mobile release identity keeps iOS build number aligned with Android versionCode", async () => {
  const appJson = JSON.parse(
    await readFile(path.join(__dirname, "..", "app.json"), "utf8"),
  );
  const buildGradle = await readFile(
    path.join(__dirname, "..", "android", "app", "build.gradle"),
    "utf8",
  );

  assert.equal(appJson.expo.version, "0.1.49");
  assert.equal(appJson.expo.android.versionCode, 50);
  assert.match(buildGradle, /\bversionCode\s+50\b/);
  assert.match(buildGradle, /\bversionName\s+["']0\.1\.49["']/);
  assert.equal(
    appJson.expo.ios.buildNumber,
    String(appJson.expo.android.versionCode),
  );
});

test("bumps Android and iOS release identity atomically", async () => {
  await writeFile(
    fixtureAppJsonPath,
    `${JSON.stringify(
      {
        expo: {
          version: "0.1.45",
          ios: { buildNumber: "46" },
          android: { versionCode: 46 },
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    fixtureBuildGradlePath,
    'defaultConfig {\n  versionCode 46\n  versionName "0.1.45"\n}\n',
  );

  await bumpMobileReleaseIdentity({
    appJsonPath: fixtureAppJsonPath,
    buildGradlePath: fixtureBuildGradlePath,
    nextVersion: "0.1.46",
  });

  const appJson = JSON.parse(await readFile(fixtureAppJsonPath, "utf8"));
  const gradle = await readFile(fixtureBuildGradlePath, "utf8");
  assert.equal(appJson.expo.version, "0.1.46");
  assert.equal(appJson.expo.android.versionCode, 47);
  assert.equal(appJson.expo.ios.buildNumber, "47");
  assert.match(gradle, /versionCode 47/);
  assert.match(gradle, /versionName "0\.1\.46"/);
});

test("refuses to bump from platform-divergent identity", async () => {
  await writeFile(
    fixtureAppJsonPath,
    JSON.stringify({
      expo: {
        version: "0.1.45",
        ios: { buildNumber: "45" },
        android: { versionCode: 46 },
      },
    }),
  );
  await writeFile(
    fixtureBuildGradlePath,
    'defaultConfig { versionCode 46\nversionName "0.1.45" }',
  );

  await assert.rejects(
    bumpMobileReleaseIdentity({
      appJsonPath: fixtureAppJsonPath,
      buildGradlePath: fixtureBuildGradlePath,
      nextVersion: "0.1.46",
    }),
    /iOS buildNumber 45 does not match Android versionCode 46/,
  );
});
