const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const RELEASE_FIELDS = [
  "platform",
  "versionCode",
  "minSupportedVersionCode",
  "nativeVersion",
  "otaRuntimeVersion",
  "artifactKind",
  "artifactDownloadUrl",
  "requiresFullApk",
  "releaseNotes",
  "artifactSha256",
  "artifactSizeBytes",
  "sourceRevision",
  "distributionChannel",
];

function normalizeRelease(release) {
  const platform = release.platform;
  return {
    platform,
    versionCode: release.versionCode,
    minSupportedVersionCode: release.minSupportedVersionCode,
    nativeVersion: release.nativeVersion,
    otaRuntimeVersion: release.otaRuntimeVersion,
    artifactKind: release.artifactKind ?? (platform === "ios" ? "ipa" : "apk"),
    artifactDownloadUrl: release.artifactDownloadUrl ?? release.apkDownloadUrl,
    requiresFullApk: release.requiresFullApk,
    releaseNotes: release.releaseNotes,
    artifactSha256: release.artifactSha256 ?? release.apkSha256,
    artifactSizeBytes: release.artifactSizeBytes ?? release.apkSizeBytes,
    sourceRevision: release.sourceRevision ?? null,
    distributionChannel:
      release.distributionChannel ??
      (platform === "ios" ? "sidestore" : "website"),
  };
}

async function requireOk(response, label) {
  if (response.ok) return response;
  const body = await response.text().catch(() => "");
  throw new Error(
    `${label} failed with HTTP ${response.status}${body ? `: ${body}` : ""}`,
  );
}

function assertReleaseMatches(expected, actual, label) {
  const expectedRelease = normalizeRelease(expected);
  const actualRelease = normalizeRelease(actual);
  const mismatches = RELEASE_FIELDS.filter(
    (field) => expectedRelease[field] !== actualRelease[field],
  );
  if (mismatches.length > 0) {
    throw new Error(
      `${label} differs from the tested manifest: ${mismatches.join(", ")}`,
    );
  }
}

function assertDecisionMatches(manifest, decision, expectedAction) {
  const mapped = {
    platform: decision.platform,
    versionCode: decision.latestVersionCode,
    minSupportedVersionCode: decision.minSupportedVersionCode,
    nativeVersion: decision.latestNativeVersion,
    otaRuntimeVersion: decision.otaRuntimeVersion,
    artifactKind: decision.artifactKind,
    artifactDownloadUrl: decision.artifactDownloadUrl,
    requiresFullApk: decision.requiresFullApk,
    releaseNotes: decision.releaseNotes,
    artifactSha256: decision.artifactSha256,
    artifactSizeBytes: decision.artifactSizeBytes,
    sourceRevision: decision.sourceRevision,
    distributionChannel: decision.distributionChannel,
  };
  assertReleaseMatches(manifest, mapped, "Backend release policy");
  if (decision.updateAction !== expectedAction) {
    throw new Error(
      `Backend returned ${decision.updateAction}; expected ${expectedAction}`,
    );
  }
  if (
    (expectedAction === "binary_forced") !==
    Boolean(decision.isForceUpdate)
  ) {
    throw new Error(
      "Backend force-update flag does not match the expected policy",
    );
  }
  if (manifest.platform === "android") {
    const legacyType =
      expectedAction === "binary_forced"
        ? "apk_forced"
        : expectedAction === "binary_optional"
          ? "apk_optional"
          : "none";
    if (decision.updateType !== legacyType) {
      throw new Error(
        `Backend returned legacy action ${decision.updateType}; expected ${legacyType}`,
      );
    }
  }
}

async function fetchJson(fetchImpl, url, options, label) {
  const response = await requireOk(await fetchImpl(url, options), label);
  return response.json();
}

async function registerMobileRelease({
  manifestPath,
  manifestUrl,
  apiBaseUrl,
  ciSecret,
  fetchImpl = fetch,
}) {
  if (!ciSecret || !ciSecret.trim()) {
    throw new Error("CI_ADMIN_SECRET is unavailable from the backend service");
  }

  const manifest = normalizeRelease(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );
  const platformLabel = manifest.platform === "ios" ? "iOS" : "Android";
  const artifactLabel = manifest.artifactKind.toUpperCase();
  const requestHeaders = { "cache-control": "no-cache" };
  const liveManifest = await fetchJson(
    fetchImpl,
    manifestUrl,
    { cache: "no-store", headers: requestHeaders },
    `Live ${platformLabel} manifest check`,
  );
  assertReleaseMatches(
    manifest,
    liveManifest,
    `Live ${platformLabel} manifest`,
  );

  const artifactResponse = await requireOk(
    await fetchImpl(manifest.artifactDownloadUrl, {
      cache: "no-store",
      headers: requestHeaders,
    }),
    `Live ${platformLabel} ${artifactLabel} check`,
  );
  const artifactBytes = Buffer.from(await artifactResponse.arrayBuffer());
  const liveSize = artifactBytes.byteLength;
  const liveSha = createHash("sha256").update(artifactBytes).digest("hex");
  if (
    liveSize !== manifest.artifactSizeBytes ||
    liveSha !== manifest.artifactSha256
  ) {
    throw new Error(
      `Live ${platformLabel} ${artifactLabel} differs from the tested manifest: expected ${manifest.artifactSizeBytes} bytes/${manifest.artifactSha256}, received ${liveSize} bytes/${liveSha}`,
    );
  }

  await fetchJson(
    fetchImpl,
    `${apiBaseUrl.replace(/\/$/, "")}/register`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ci-secret": ciSecret,
      },
      body: JSON.stringify(manifest),
    },
    `${platformLabel} release registration`,
  );

  const checkPolicy = async (currentVersionCode) => {
    const query = new URLSearchParams({
      platform: manifest.platform,
      currentVersionCode: String(currentVersionCode),
      currentNativeVersion:
        currentVersionCode === manifest.versionCode
          ? manifest.nativeVersion
          : "0.0.0",
      currentOtaVersion:
        currentVersionCode === manifest.versionCode
          ? manifest.otaRuntimeVersion
          : "0.0.0",
    });
    const payload = await fetchJson(
      fetchImpl,
      `${apiBaseUrl.replace(/\/$/, "")}/check?${query}`,
      { cache: "no-store", headers: requestHeaders },
      `${platformLabel} policy check for build ${currentVersionCode}`,
    );
    return payload.data;
  };

  const oldBuilds = [1, Math.max(1, manifest.versionCode - 2)]
    .filter((value) => value < manifest.minSupportedVersionCode)
    .filter((value, index, values) => values.indexOf(value) === index);
  for (const oldBuild of oldBuilds) {
    assertDecisionMatches(
      manifest,
      await checkPolicy(oldBuild),
      "binary_forced",
    );
  }
  const optionalBuild =
    manifest.requiresFullApk &&
    manifest.minSupportedVersionCode < manifest.versionCode
      ? manifest.minSupportedVersionCode
      : null;
  if (optionalBuild !== null) {
    assertDecisionMatches(
      manifest,
      await checkPolicy(optionalBuild),
      "binary_optional",
    );
  }
  assertDecisionMatches(
    manifest,
    await checkPolicy(manifest.versionCode),
    "none",
  );

  return {
    versionCode: manifest.versionCode,
    nativeVersion: manifest.nativeVersion,
    platform: manifest.platform,
    artifactKind: manifest.artifactKind,
    artifactSizeBytes: liveSize,
    artifactSha256: liveSha,
    apkSizeBytes: manifest.platform === "android" ? liveSize : undefined,
    apkSha256: manifest.platform === "android" ? liveSha : undefined,
    checkedOldBuilds: oldBuilds,
    checkedOptionalBuild: optionalBuild,
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, "../..");
  const result = await registerMobileRelease({
    manifestPath:
      process.env.MOBILE_RELEASE_MANIFEST_PATH ||
      path.join(
        repoRoot,
        "next-frontend/public/downloads/nexora-student-mobile-release.json",
      ),
    manifestUrl:
      process.env.MOBILE_RELEASE_MANIFEST_URL ||
      "https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.json",
    apiBaseUrl:
      process.env.MOBILE_RELEASE_API_BASE_URL ||
      "https://capstone-backend-v2-production.up.railway.app/api/app-version",
    ciSecret: process.env.CI_ADMIN_SECRET,
  });
  process.stdout.write(
    `Registered and verified ${result.platform} ${result.nativeVersion} (build ${result.versionCode}), ${result.artifactSizeBytes} bytes, SHA-256 ${result.artifactSha256}; forced-update checks passed for builds ${result.checkedOldBuilds.join(", ") || "none"}; optional-update check passed for build ${result.checkedOptionalBuild ?? "none"}.\n`,
  );
}

module.exports = {
  assertDecisionMatches,
  assertReleaseMatches,
  normalizeRelease,
  registerMobileRelease,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
