const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const RELEASE_FIELDS = [
  "platform",
  "versionCode",
  "minSupportedVersionCode",
  "nativeVersion",
  "otaRuntimeVersion",
  "apkDownloadUrl",
  "requiresFullApk",
  "releaseNotes",
  "apkSha256",
  "apkSizeBytes",
];

async function requireOk(response, label) {
  if (response.ok) return response;
  const body = await response.text().catch(() => "");
  throw new Error(
    `${label} failed with HTTP ${response.status}${body ? `: ${body}` : ""}`,
  );
}

function assertReleaseMatches(expected, actual, label) {
  const mismatches = RELEASE_FIELDS.filter(
    (field) => expected[field] !== actual[field],
  );
  if (mismatches.length > 0) {
    throw new Error(
      `${label} differs from the tested manifest: ${mismatches.join(", ")}`,
    );
  }
}

function assertDecisionMatches(manifest, decision, expectedType) {
  const mapped = {
    platform: decision.platform,
    versionCode: decision.latestVersionCode,
    minSupportedVersionCode: decision.minSupportedVersionCode,
    nativeVersion: decision.latestNativeVersion,
    otaRuntimeVersion: decision.otaRuntimeVersion,
    apkDownloadUrl: decision.apkDownloadUrl,
    requiresFullApk: decision.requiresFullApk,
    releaseNotes: decision.releaseNotes,
    apkSha256: decision.apkSha256,
    apkSizeBytes: decision.apkSizeBytes,
  };
  assertReleaseMatches(manifest, mapped, "Backend release policy");
  if (decision.updateType !== expectedType) {
    throw new Error(
      `Backend returned ${decision.updateType}; expected ${expectedType}`,
    );
  }
  if ((expectedType === "apk_forced") !== Boolean(decision.isForceUpdate)) {
    throw new Error(
      "Backend force-update flag does not match the expected policy",
    );
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

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const requestHeaders = { "cache-control": "no-cache" };
  const liveManifest = await fetchJson(
    fetchImpl,
    manifestUrl,
    { cache: "no-store", headers: requestHeaders },
    "Live Android manifest check",
  );
  assertReleaseMatches(manifest, liveManifest, "Live Android manifest");

  const apkResponse = await requireOk(
    await fetchImpl(manifest.apkDownloadUrl, {
      cache: "no-store",
      headers: requestHeaders,
    }),
    "Live Android APK check",
  );
  const apkBytes = Buffer.from(await apkResponse.arrayBuffer());
  const liveSize = apkBytes.byteLength;
  const liveSha = createHash("sha256").update(apkBytes).digest("hex");
  if (liveSize !== manifest.apkSizeBytes || liveSha !== manifest.apkSha256) {
    throw new Error(
      `Live Android APK differs from the tested manifest: expected ${manifest.apkSizeBytes} bytes/${manifest.apkSha256}, received ${liveSize} bytes/${liveSha}`,
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
    "Android release registration",
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
      `Android policy check for build ${currentVersionCode}`,
    );
    return payload.data;
  };

  const oldBuilds = [1, Math.max(1, manifest.versionCode - 2)]
    .filter((value) => value < manifest.minSupportedVersionCode)
    .filter((value, index, values) => values.indexOf(value) === index);
  for (const oldBuild of oldBuilds) {
    assertDecisionMatches(manifest, await checkPolicy(oldBuild), "apk_forced");
  }
  assertDecisionMatches(
    manifest,
    await checkPolicy(manifest.versionCode),
    "none",
  );

  return {
    versionCode: manifest.versionCode,
    nativeVersion: manifest.nativeVersion,
    apkSizeBytes: liveSize,
    apkSha256: liveSha,
    checkedOldBuilds: oldBuilds,
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
    `Registered and verified Android ${result.nativeVersion} (build ${result.versionCode}), ${result.apkSizeBytes} bytes, SHA-256 ${result.apkSha256}; forced-update checks passed for builds ${result.checkedOldBuilds.join(", ") || "none"}.\n`,
  );
}

module.exports = {
  assertDecisionMatches,
  assertReleaseMatches,
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
