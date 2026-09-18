const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, test } = require("node:test");

const roots = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("creates a canonical immutable iOS release manifest", async () => {
  const { buildIosReleaseManifest } = require("./ios-release-manifest.cjs");
  const root = await mkdtemp(path.join(os.tmpdir(), "nexora-ios-manifest-"));
  roots.push(root);
  const appJsonPath = path.join(root, "app.json");
  const ipaPath = path.join(root, "Nexora-iOS-v0.1.46-build47-aaaaaaaa.ipa");
  const outputPath = path.join(root, "manifest.json");
  const ipa = Buffer.from("verified-ipa-bytes");
  await writeFile(
    appJsonPath,
    JSON.stringify({ expo: { version: "0.1.46", ios: { buildNumber: "47" } } }),
  );
  await writeFile(ipaPath, ipa);

  const manifest = await buildIosReleaseManifest({
    appJsonPath,
    ipaPath,
    outputPath,
    artifactDownloadUrl:
      "https://github.com/example/nexora/releases/download/ios-sidestore-v0.1.46-build47-aaaaaaaa/Nexora-iOS-v0.1.46-build47-aaaaaaaa.ipa",
    sourceRevision: "a".repeat(40),
    releaseNotes: "Physical iPhone acceptance build.",
  });

  assert.deepEqual(manifest, {
    platform: "ios",
    versionCode: 47,
    minSupportedVersionCode: 47,
    nativeVersion: "0.1.46",
    otaRuntimeVersion: "0.1.46",
    artifactKind: "ipa",
    artifactDownloadUrl:
      "https://github.com/example/nexora/releases/download/ios-sidestore-v0.1.46-build47-aaaaaaaa/Nexora-iOS-v0.1.46-build47-aaaaaaaa.ipa",
    requiresFullApk: true,
    releaseNotes: "Physical iPhone acceptance build.",
    artifactSha256: createHash("sha256").update(ipa).digest("hex"),
    artifactSizeBytes: ipa.byteLength,
    sourceRevision: "a".repeat(40),
    distributionChannel: "sidestore",
  });
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), manifest);
});

test("rejects a movable artifact URL", async () => {
  const { buildIosReleaseManifest } = require("./ios-release-manifest.cjs");
  await assert.rejects(
    buildIosReleaseManifest({
      appJsonPath: "unused",
      ipaPath: "unused",
      outputPath: "unused",
      artifactDownloadUrl:
        "https://github.com/example/nexora/releases/download/ios-sidestore-latest/Nexora-iOS-latest.ipa",
      sourceRevision: "a".repeat(40),
      releaseNotes: "Release notes",
    }),
    /immutable release tag/,
  );
});
