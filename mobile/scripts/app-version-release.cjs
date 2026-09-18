const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const {
  access,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} = require("node:fs/promises");
const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const EXPECTED_PACKAGE = "com.nexora.lms.mobile";
const REQUIRED_INSTALL_PERMISSION =
  "android.permission.REQUEST_INSTALL_PACKAGES";
const ANDROID_DEBUG_CERTIFICATE_SHA256 =
  "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c";
const RELEASE_FIELDS = [
  "platform",
  "versionCode",
  "minSupportedVersionCode",
  "nativeVersion",
  "otaRuntimeVersion",
  "artifactKind",
  "artifactDownloadUrl",
  "apkDownloadUrl",
  "requiresFullApk",
  "releaseNotes",
  "artifactSha256",
  "artifactSizeBytes",
  "apkSha256",
  "apkSizeBytes",
  "sourceRevision",
  "distributionChannel",
];

function sha256File(apkPath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(apkPath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function parseGradleVersions(source) {
  const versionCode = source.match(/\bversionCode\s+(\d+)/);
  const versionName = source.match(/\bversionName\s+["']([^"']+)["']/);
  if (!versionCode || !versionName) {
    throw new Error(
      "Could not parse versionCode and versionName from build.gradle.",
    );
  }
  return {
    versionCode: Number(versionCode[1]),
    versionName: versionName[1],
  };
}

function parseStrictSemver(value, label) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) {
    throw new Error(`${label} must be a strict semantic version (x.y.z).`);
  }
  return match.slice(1).map(Number);
}

function compareSemver(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

async function bumpMobileReleaseIdentity(options) {
  const [appJsonSource, gradleSource] = await Promise.all([
    readFile(options.appJsonPath, "utf8"),
    readFile(options.buildGradlePath, "utf8"),
  ]);
  const appJson = JSON.parse(appJsonSource);
  const expo = appJson.expo;
  const gradle = parseGradleVersions(gradleSource);
  const appVersion = expo?.version;
  const androidVersionCode = expo?.android?.versionCode;
  const iosBuildNumber = expo?.ios?.buildNumber;

  if (typeof appVersion !== "string") {
    throw new Error("app.json must define expo.version.");
  }
  if (!Number.isInteger(androidVersionCode) || androidVersionCode < 1) {
    throw new Error(
      "app.json must define a positive expo.android.versionCode.",
    );
  }
  if (!/^\d+$/.test(iosBuildNumber ?? "")) {
    throw new Error("app.json must define a numeric expo.ios.buildNumber.");
  }
  if (appVersion !== gradle.versionName) {
    throw new Error(
      `app.json version ${appVersion} does not match Gradle versionName ${gradle.versionName}.`,
    );
  }
  if (androidVersionCode !== gradle.versionCode) {
    throw new Error(
      `app.json versionCode ${androidVersionCode} does not match Gradle versionCode ${gradle.versionCode}.`,
    );
  }
  if (Number(iosBuildNumber) !== androidVersionCode) {
    throw new Error(
      `iOS buildNumber ${iosBuildNumber} does not match Android versionCode ${androidVersionCode}.`,
    );
  }

  const currentSemver = parseStrictSemver(appVersion, "Current mobile version");
  const nextSemver = parseStrictSemver(
    options.nextVersion,
    "Next mobile version",
  );
  if (compareSemver(nextSemver, currentSemver) <= 0) {
    throw new Error(
      `Next mobile version ${options.nextVersion} must be greater than ${appVersion}.`,
    );
  }

  const nextVersionCode = androidVersionCode + 1;
  expo.version = options.nextVersion;
  expo.android.versionCode = nextVersionCode;
  expo.ios.buildNumber = String(nextVersionCode);

  const nextGradleSource = gradleSource
    .replace(/\bversionCode\s+\d+/, (match) =>
      match.replace(/\d+$/, String(nextVersionCode)),
    )
    .replace(/\bversionName\s+["'][^"']+["']/, (match) =>
      match.replace(/["'][^"']+["']$/, `"${options.nextVersion}"`),
    );
  const nextAppJsonSource = `${JSON.stringify(appJson, null, 2)}\n`;

  const suffix = `.tmp-${process.pid}-${Date.now()}`;
  const appJsonTempPath = `${options.appJsonPath}${suffix}`;
  const gradleTempPath = `${options.buildGradlePath}${suffix}`;
  let appJsonReplaced = false;
  try {
    await Promise.all([
      writeFile(appJsonTempPath, nextAppJsonSource),
      writeFile(gradleTempPath, nextGradleSource),
    ]);
    await rename(appJsonTempPath, options.appJsonPath);
    appJsonReplaced = true;
    await rename(gradleTempPath, options.buildGradlePath);
  } catch (error) {
    if (appJsonReplaced) {
      await writeFile(options.appJsonPath, appJsonSource);
    }
    await Promise.allSettled([unlink(appJsonTempPath), unlink(gradleTempPath)]);
    throw error;
  }

  return {
    nativeVersion: options.nextVersion,
    androidVersionCode: nextVersionCode,
    iosBuildNumber: String(nextVersionCode),
  };
}

function parseAaptBadging(output) {
  const packageLine = output
    .split(/\r?\n/)
    .find((line) => line.startsWith("package:"));
  if (!packageLine) {
    throw new Error("aapt output does not contain APK package metadata.");
  }
  const packageName = packageLine.match(/\bname='([^']+)'/);
  const versionCode = packageLine.match(/\bversionCode='(\d+)'/);
  const versionName = packageLine.match(/\bversionName='([^']+)'/);
  if (!packageName || !versionCode || !versionName) {
    throw new Error(
      "Could not parse package name and versions from aapt output.",
    );
  }
  return {
    packageName: packageName[1],
    versionCode: Number(versionCode[1]),
    versionName: versionName[1],
  };
}

function parseAaptPermissions(output) {
  return [
    ...output.matchAll(/^\s*uses-permission(?:-sdk-\d+)?: name='([^']+)'/gm),
  ].map((match) => match[1]);
}

async function resolveAapt(options = {}) {
  const explicit = options.aaptPath || process.env.AAPT_PATH;
  if (explicit) {
    await access(explicit);
    return explicit;
  }

  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot) {
    throw new Error(
      "aapt was not found. Set AAPT_PATH, ANDROID_HOME, or ANDROID_SDK_ROOT.",
    );
  }

  const buildToolsRoot = path.join(sdkRoot, "build-tools");
  const entries = await readdir(buildToolsRoot, { withFileTypes: true });
  const versions = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true }),
    );

  for (const version of versions) {
    const candidate = path.join(buildToolsRoot, version, "aapt");
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next installed build-tools version.
    }
  }

  throw new Error(`No aapt executable was found under ${buildToolsRoot}.`);
}

async function resolveApksigner(options = {}) {
  const explicit = options.apksignerPath || process.env.APKSIGNER_PATH;
  if (explicit) {
    await access(explicit);
    return explicit;
  }

  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot) {
    throw new Error(
      "apksigner was not found. Set APKSIGNER_PATH, ANDROID_HOME, or ANDROID_SDK_ROOT.",
    );
  }
  const buildToolsRoot = path.join(sdkRoot, "build-tools");
  const entries = await readdir(buildToolsRoot, { withFileTypes: true });
  const versions = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true }),
    );
  for (const version of versions) {
    const candidate = path.join(buildToolsRoot, version, "apksigner");
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next installed build-tools version.
    }
  }
  throw new Error(`No apksigner executable was found under ${buildToolsRoot}.`);
}

function parseApkSignerCertificateSha256(output) {
  const match = output.match(
    /certificate SHA-256 digest:\s*([a-f0-9:]{64,95})/i,
  );
  if (!match) {
    throw new Error(
      "apksigner output does not contain a SHA-256 certificate digest.",
    );
  }
  return match[1].replaceAll(":", "").toLowerCase();
}

function assertProductionSigner(output) {
  const fingerprint = parseApkSignerCertificateSha256(output);
  if (fingerprint === ANDROID_DEBUG_CERTIFICATE_SHA256) {
    throw new Error(
      "The APK is signed with the known Android debug certificate; refusing release.",
    );
  }
  return fingerprint;
}

function assertImmutableAndroidArtifactUrl(
  artifactDownloadUrl,
  versionCode,
  sourceRevision,
) {
  let url;
  try {
    url = new URL(artifactDownloadUrl);
  } catch {
    throw new Error("Android artifact URL must be a valid HTTPS URL.");
  }
  const immutableSegment = `/android/${versionCode}-${sourceRevision.slice(0, 8).toLowerCase()}/`;
  if (
    url.protocol !== "https:" ||
    !url.pathname.includes(immutableSegment) ||
    !url.pathname.endsWith(".apk") ||
    url.search ||
    url.hash ||
    /latest/i.test(url.pathname)
  ) {
    throw new Error(
      `Immutable Android artifact URL must be an HTTPS .apk path containing ${immutableSegment}.`,
    );
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function buildReleasePayload(options) {
  const appJson = await readJson(options.appJsonPath);
  const expo = appJson.expo;
  const configuredVersionCode = expo?.android?.versionCode;
  const configuredVersionName = expo?.version;
  const configuredPackage = expo?.android?.package;

  if (!Number.isInteger(configuredVersionCode) || !configuredVersionName) {
    throw new Error(
      "app.json must define expo.version and expo.android.versionCode.",
    );
  }
  if (configuredPackage !== EXPECTED_PACKAGE) {
    throw new Error(
      `app.json package ${configuredPackage ?? "<missing>"} does not match ${EXPECTED_PACKAGE}.`,
    );
  }
  const configuredPermissions = expo?.android?.permissions;
  const hasConfiguredInstallPermission =
    Array.isArray(configuredPermissions) &&
    configuredPermissions.some(
      (permission) =>
        permission === REQUIRED_INSTALL_PERMISSION ||
        permission === "REQUEST_INSTALL_PACKAGES",
    );
  if (!hasConfiguredInstallPermission) {
    throw new Error(`app.json must declare ${REQUIRED_INSTALL_PERMISSION}.`);
  }
  const minSupportedVersionCode =
    options.minSupportedVersionCode ?? configuredVersionCode;
  if (
    !Number.isInteger(minSupportedVersionCode) ||
    minSupportedVersionCode < 1
  ) {
    throw new Error("minSupportedVersionCode must be a positive integer.");
  }
  if (minSupportedVersionCode > configuredVersionCode) {
    throw new Error(
      "The minimum supported build cannot exceed the packaged build.",
    );
  }
  if (
    minSupportedVersionCode < configuredVersionCode &&
    options.allowSupportedOlderBuilds !== true
  ) {
    throw new Error(
      "A lower supported build requires an explicit recovery override (--allow-supported-older-builds true).",
    );
  }
  if (!options.releaseNotes || !options.releaseNotes.trim()) {
    throw new Error("releaseNotes must not be empty.");
  }
  if (!/^[a-f0-9]{40}$/i.test(options.sourceRevision ?? "")) {
    throw new Error(
      "sourceRevision must be a 40-character hexadecimal Git SHA.",
    );
  }
  assertImmutableAndroidArtifactUrl(
    options.apkDownloadUrl,
    configuredVersionCode,
    options.sourceRevision,
  );

  const gradle = parseGradleVersions(
    await readFile(options.buildGradlePath, "utf8"),
  );
  if (configuredVersionCode !== gradle.versionCode) {
    throw new Error(
      `app.json versionCode ${configuredVersionCode} does not match Gradle versionCode ${gradle.versionCode}.`,
    );
  }
  if (configuredVersionName !== gradle.versionName) {
    throw new Error(
      `app.json version ${configuredVersionName} does not match Gradle versionName ${gradle.versionName}.`,
    );
  }

  let apkBadging = options.apkBadging;
  if (apkBadging === undefined) {
    const aaptPath = await resolveAapt(options);
    const result = await execFileAsync(
      aaptPath,
      ["dump", "badging", options.apkPath],
      {
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    apkBadging = result.stdout;
  }
  const embedded = parseAaptBadging(apkBadging);
  if (embedded.packageName !== EXPECTED_PACKAGE) {
    throw new Error(
      `APK package ${embedded.packageName} does not match ${EXPECTED_PACKAGE}.`,
    );
  }
  if (embedded.versionCode !== configuredVersionCode) {
    throw new Error(
      `APK versionCode ${embedded.versionCode} does not match configured versionCode ${configuredVersionCode}.`,
    );
  }
  if (embedded.versionName !== configuredVersionName) {
    throw new Error(
      `APK versionName ${embedded.versionName} does not match configured version ${configuredVersionName}.`,
    );
  }
  if (!parseAaptPermissions(apkBadging).includes(REQUIRED_INSTALL_PERMISSION)) {
    throw new Error(`APK must embed ${REQUIRED_INSTALL_PERMISSION}.`);
  }

  let apkSignerOutput = options.apkSignerOutput;
  if (apkSignerOutput === undefined) {
    const apksignerPath = await resolveApksigner(options);
    const result = await execFileAsync(
      apksignerPath,
      ["verify", "--verbose", "--print-certs", options.apkPath],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    apkSignerOutput = result.stdout;
  }
  assertProductionSigner(apkSignerOutput);

  const apkStats = await stat(options.apkPath);
  const apkSha256 = await sha256File(options.apkPath);
  return {
    platform: "android",
    versionCode: configuredVersionCode,
    minSupportedVersionCode,
    nativeVersion: configuredVersionName,
    otaRuntimeVersion: configuredVersionName,
    artifactKind: "apk",
    artifactDownloadUrl: options.apkDownloadUrl,
    apkDownloadUrl: options.apkDownloadUrl,
    requiresFullApk: true,
    releaseNotes: options.releaseNotes.trim(),
    artifactSha256: apkSha256,
    artifactSizeBytes: apkStats.size,
    apkSha256,
    apkSizeBytes: apkStats.size,
    sourceRevision: options.sourceRevision.toLowerCase(),
    distributionChannel: "website",
  };
}

async function verifyManifest(manifest, options) {
  const derived = await buildReleasePayload({
    ...options,
    apkDownloadUrl: options.apkDownloadUrl ?? manifest.apkDownloadUrl,
    sourceRevision: options.sourceRevision ?? manifest.sourceRevision,
    minSupportedVersionCode:
      options.minSupportedVersionCode ?? manifest.minSupportedVersionCode,
    releaseNotes: options.releaseNotes ?? manifest.releaseNotes,
  });

  const unexpectedFields = Object.keys(manifest).filter(
    (field) => !RELEASE_FIELDS.includes(field),
  );
  if (unexpectedFields.length > 0) {
    throw new Error(
      `Manifest contains unexpected fields: ${unexpectedFields.join(", ")}.`,
    );
  }

  const mismatches = RELEASE_FIELDS.filter(
    (field) => manifest[field] !== derived[field],
  );
  if (mismatches.length > 0) {
    throw new Error(
      `Manifest does not match the APK: ${mismatches.join(", ")}.`,
    );
  }
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.`);
    }
    values[argument.slice(2)] = value;
    index += 1;
  }
  return values;
}

function defaultPaths(args) {
  const repoRoot = path.resolve(__dirname, "../..");
  return {
    apkPath:
      args.apk ||
      path.join(
        repoRoot,
        "next-frontend/public/downloads/nexora-student-mobile-release.apk",
      ),
    manifestPath:
      args.manifest ||
      path.join(
        repoRoot,
        "next-frontend/public/downloads/nexora-student-mobile-release.json",
      ),
    appJsonPath: args["app-json"] || path.join(repoRoot, "mobile/app.json"),
    allowSupportedOlderBuilds: args["allow-supported-older-builds"] === "true",
    buildGradlePath:
      args["build-gradle"] ||
      path.join(repoRoot, "mobile/android/app/build.gradle"),
    apkDownloadUrl:
      args["download-url"] ||
      "https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk",
    sourceRevision: args["source-revision"],
  };
}

async function main() {
  const [mode, ...rawArgs] = process.argv.slice(2);
  if (mode !== "prepare" && mode !== "verify" && mode !== "bump") {
    throw new Error(
      "Usage: app-version-release.cjs <bump|prepare|verify> [options]",
    );
  }
  const args = parseArguments(rawArgs);
  const paths = defaultPaths(args);

  if (mode === "bump") {
    if (!args.version) {
      throw new Error("bump requires --version x.y.z.");
    }
    const identity = await bumpMobileReleaseIdentity({
      appJsonPath: paths.appJsonPath,
      buildGradlePath: paths.buildGradlePath,
      nextVersion: args.version,
    });
    process.stdout.write(
      `Bumped mobile release to ${identity.nativeVersion} (build ${identity.androidVersionCode}).\n`,
    );
    return;
  }

  if (mode === "prepare") {
    if (!args["release-notes"]) {
      throw new Error(
        "prepare requires --release-notes; the minimum supported build defaults to the packaged build.",
      );
    }
    const payload = await buildReleasePayload({
      ...paths,
      releaseNotes: args["release-notes"],
      minSupportedVersionCode:
        args["min-supported-version-code"] === undefined
          ? undefined
          : Number(args["min-supported-version-code"]),
    });
    await writeFile(
      paths.manifestPath,
      `${JSON.stringify(payload, null, 2)}\n`,
    );
    await verifyManifest(payload, paths);
    process.stdout.write(`Prepared and verified ${paths.manifestPath}\n`);
    return;
  }

  const manifest = await readJson(paths.manifestPath);
  await verifyManifest(manifest, paths);
  process.stdout.write(`Verified ${paths.manifestPath}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  assertProductionSigner,
  bumpMobileReleaseIdentity,
  buildReleasePayload,
  parseAaptBadging,
  parseAaptPermissions,
  parseGradleVersions,
  parseApkSignerCertificateSha256,
  sha256File,
  verifyManifest,
};
