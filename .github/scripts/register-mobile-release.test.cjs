const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, test } = require("node:test");
const { registerMobileRelease } = require("./register-mobile-release.cjs");

const roots = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "nexora-register-release-"),
  );
  roots.push(root);
  const apk = Buffer.from("tested-release-apk");
  const manifest = {
    platform: "android",
    versionCode: 41,
    minSupportedVersionCode: 41,
    nativeVersion: "0.1.40",
    otaRuntimeVersion: "0.1.40",
    apkDownloadUrl: "https://frontend.example/downloads/release.apk",
    requiresFullApk: true,
    releaseNotes: "Cross-surface assessment and mobile reliability fixes.",
    apkSha256: createHash("sha256").update(apk).digest("hex"),
    apkSizeBytes: apk.byteLength,
  };
  const manifestPath = path.join(root, "release.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  return { apk, manifest, manifestPath };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function canonicalManifest(manifest) {
  return {
    platform: manifest.platform,
    versionCode: manifest.versionCode,
    minSupportedVersionCode: manifest.minSupportedVersionCode,
    nativeVersion: manifest.nativeVersion,
    otaRuntimeVersion: manifest.otaRuntimeVersion,
    artifactKind:
      manifest.artifactKind ?? (manifest.platform === "ios" ? "ipa" : "apk"),
    artifactDownloadUrl:
      manifest.artifactDownloadUrl ?? manifest.apkDownloadUrl,
    requiresFullApk: manifest.requiresFullApk,
    releaseNotes: manifest.releaseNotes,
    artifactSha256: manifest.artifactSha256 ?? manifest.apkSha256,
    artifactSizeBytes: manifest.artifactSizeBytes ?? manifest.apkSizeBytes,
    sourceRevision: manifest.sourceRevision ?? null,
    distributionChannel:
      manifest.distributionChannel ??
      (manifest.platform === "ios" ? "sidestore" : "website"),
  };
}

function decision(inputManifest, updateAction) {
  const manifest = canonicalManifest(inputManifest);
  const updateType =
    manifest.platform === "android"
      ? updateAction === "binary_forced"
        ? "apk_forced"
        : updateAction === "binary_optional"
          ? "apk_optional"
          : "none"
      : "none";
  return {
    platform: manifest.platform,
    latestVersionCode: manifest.versionCode,
    minSupportedVersionCode: manifest.minSupportedVersionCode,
    latestNativeVersion: manifest.nativeVersion,
    otaRuntimeVersion: manifest.otaRuntimeVersion,
    artifactKind: manifest.artifactKind,
    artifactDownloadUrl: manifest.artifactDownloadUrl,
    artifactSha256: manifest.artifactSha256,
    artifactSizeBytes: manifest.artifactSizeBytes,
    sourceRevision: manifest.sourceRevision,
    distributionChannel: manifest.distributionChannel,
    apkDownloadUrl:
      manifest.platform === "android" ? manifest.artifactDownloadUrl : "",
    apkSha256: manifest.platform === "android" ? manifest.artifactSha256 : null,
    apkSizeBytes:
      manifest.platform === "android" ? manifest.artifactSizeBytes : null,
    isForceUpdate: updateAction === "binary_forced",
    requiresFullApk: manifest.requiresFullApk,
    releaseNotes: manifest.releaseNotes,
    updateAction,
    updateType,
  };
}

test("registers only after the live package matches and verifies old and current clients", async () => {
  const { apk, manifest, manifestPath } = await fixture();
  const posts = [];
  const checkedBuilds = [];
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/release.json")) return jsonResponse(manifest);
    if (url.endsWith("/release.apk")) return new Response(apk);
    if (url.endsWith("/register")) {
      posts.push({ init, payload: JSON.parse(init.body) });
      return jsonResponse({ success: true, data: { id: "release-41" } });
    }
    if (url.includes("/check?")) {
      const build = Number(new URL(url).searchParams.get("currentVersionCode"));
      checkedBuilds.push(build);
      return jsonResponse({
        success: true,
        data: decision(manifest, build === 41 ? "none" : "binary_forced"),
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  const result = await registerMobileRelease({
    manifestPath,
    manifestUrl: "https://frontend.example/downloads/release.json",
    apiBaseUrl: "https://backend.example/api/app-version",
    ciSecret: "test-ci-secret",
    fetchImpl,
  });

  assert.deepEqual(result.checkedOldBuilds, [1, 39]);
  assert.deepEqual(checkedBuilds, [1, 39, 41]);
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].payload, canonicalManifest(manifest));
  assert.equal(posts[0].init.headers["x-ci-secret"], "test-ci-secret");
  assert.equal(result.apkSha256, manifest.apkSha256);
});

test("registers an immutable iOS IPA with platform-neutral policy checks", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "nexora-register-ios-release-"),
  );
  roots.push(root);
  const ipa = Buffer.from("tested-immutable-ios-ipa");
  const manifest = {
    platform: "ios",
    versionCode: 47,
    minSupportedVersionCode: 47,
    nativeVersion: "0.1.46",
    otaRuntimeVersion: "0.1.46",
    artifactKind: "ipa",
    artifactDownloadUrl:
      "https://github.com/example/nexora/releases/download/ios-sidestore-v0.1.46-build47-aaaaaaaa/Nexora-iOS-v0.1.46-build47-aaaaaaaa-unsigned.ipa",
    requiresFullApk: true,
    releaseNotes: "Immutable physical-iPhone acceptance build.",
    artifactSha256: createHash("sha256").update(ipa).digest("hex"),
    artifactSizeBytes: ipa.byteLength,
    sourceRevision: "a".repeat(40),
    distributionChannel: "sidestore",
  };
  const manifestPath = path.join(root, "ios-release.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  const posts = [];
  const checkedBuilds = [];
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/ios-release.json")) return jsonResponse(manifest);
    if (url.endsWith(".ipa")) return new Response(ipa);
    if (url.endsWith("/register")) {
      posts.push(JSON.parse(init.body));
      return jsonResponse({ success: true, data: { id: "ios-release-47" } });
    }
    if (url.includes("/check?")) {
      const build = Number(new URL(url).searchParams.get("currentVersionCode"));
      checkedBuilds.push(build);
      return jsonResponse({
        success: true,
        data: decision(manifest, build === 47 ? "none" : "binary_forced"),
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  const result = await registerMobileRelease({
    manifestPath,
    manifestUrl:
      "https://github.com/example/nexora/releases/download/ios-sidestore-v0.1.46-build47-aaaaaaaa/ios-release.json",
    apiBaseUrl: "https://backend.example/api/app-version",
    ciSecret: "test-ci-secret",
    fetchImpl,
  });

  assert.deepEqual(result.checkedOldBuilds, [1, 45]);
  assert.deepEqual(checkedBuilds, [1, 45, 47]);
  assert.deepEqual(posts, [manifest]);
  assert.equal(result.artifactSha256, manifest.artifactSha256);
  assert.equal(result.artifactSizeBytes, manifest.artifactSizeBytes);
});

test("refuses registration when the deployed manifest is stale", async () => {
  const { manifest, manifestPath } = await fixture();
  let registrationCalls = 0;
  const fetchImpl = async (input) => {
    const url = String(input);
    if (url.endsWith("/release.json")) {
      return jsonResponse({
        ...manifest,
        apkSizeBytes: manifest.apkSizeBytes - 1,
      });
    }
    if (url.endsWith("/register")) registrationCalls += 1;
    throw new Error(`Unexpected URL ${url}`);
  };

  await assert.rejects(
    registerMobileRelease({
      manifestPath,
      manifestUrl: "https://frontend.example/downloads/release.json",
      apiBaseUrl: "https://backend.example/api/app-version",
      ciSecret: "test-ci-secret",
      fetchImpl,
    }),
    /Live Android manifest differs.*artifactSizeBytes/,
  );
  assert.equal(registrationCalls, 0);
});

test("refuses registration when the deployed APK bytes do not match", async () => {
  const { manifest, manifestPath } = await fixture();
  let registrationCalls = 0;
  const fetchImpl = async (input) => {
    const url = String(input);
    if (url.endsWith("/release.json")) return jsonResponse(manifest);
    if (url.endsWith("/release.apk")) return new Response("stale-apk");
    if (url.endsWith("/register")) registrationCalls += 1;
    throw new Error(`Unexpected URL ${url}`);
  };

  await assert.rejects(
    registerMobileRelease({
      manifestPath,
      manifestUrl: "https://frontend.example/downloads/release.json",
      apiBaseUrl: "https://backend.example/api/app-version",
      ciSecret: "test-ci-secret",
      fetchImpl,
    }),
    /Live Android APK differs/,
  );
  assert.equal(registrationCalls, 0);
});
