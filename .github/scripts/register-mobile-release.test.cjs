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

function decision(manifest, updateType) {
  return {
    platform: manifest.platform,
    latestVersionCode: manifest.versionCode,
    minSupportedVersionCode: manifest.minSupportedVersionCode,
    latestNativeVersion: manifest.nativeVersion,
    otaRuntimeVersion: manifest.otaRuntimeVersion,
    apkDownloadUrl: manifest.apkDownloadUrl,
    apkSha256: manifest.apkSha256,
    apkSizeBytes: manifest.apkSizeBytes,
    isForceUpdate: updateType === "apk_forced",
    requiresFullApk: manifest.requiresFullApk,
    releaseNotes: manifest.releaseNotes,
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
        data: decision(manifest, build === 41 ? "none" : "apk_forced"),
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
  assert.deepEqual(posts[0].payload, manifest);
  assert.equal(posts[0].init.headers["x-ci-secret"], "test-ci-secret");
  assert.equal(result.apkSha256, manifest.apkSha256);
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
    /Live Android manifest differs.*apkSizeBytes/,
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
