const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const {
  access,
  readFile,
  readdir,
  stat,
  writeFile,
} = require("node:fs/promises");
const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const EXPECTED_PACKAGE = "com.nexora.lms.mobile";
const REQUIRED_INSTALL_PERMISSION =
  "android.permission.REQUEST_INSTALL_PACKAGES";
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
  if (expo?.runtimeVersion?.policy !== "appVersion") {
    throw new Error('app.json must use runtimeVersion policy "appVersion".');
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
  const minSupportedVersionCode = options.minSupportedVersionCode ?? configuredVersionCode;
  if (!Number.isInteger(minSupportedVersionCode) || minSupportedVersionCode < 1) {
    throw new Error("minSupportedVersionCode must be a positive integer.");
  }
  if (minSupportedVersionCode > configuredVersionCode) {
    throw new Error("The minimum supported build cannot exceed the packaged build.");
  }
  if (minSupportedVersionCode < configuredVersionCode && options.allowSupportedOlderBuilds !== true) {
    throw new Error("A lower supported build requires an explicit recovery override (--allow-supported-older-builds true).");
  }
  if (!options.releaseNotes || !options.releaseNotes.trim()) {
    throw new Error("releaseNotes must not be empty.");
  }

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

  const apkStats = await stat(options.apkPath);
  return {
    platform: "android",
    versionCode: configuredVersionCode,
    minSupportedVersionCode,
    nativeVersion: configuredVersionName,
    otaRuntimeVersion: configuredVersionName,
    apkDownloadUrl: options.apkDownloadUrl,
    requiresFullApk: true,
    releaseNotes: options.releaseNotes.trim(),
    apkSha256: await sha256File(options.apkPath),
    apkSizeBytes: apkStats.size,
  };
}

async function verifyManifest(manifest, options) {
  const derived = await buildReleasePayload({
    ...options,
    apkDownloadUrl: options.apkDownloadUrl ?? manifest.apkDownloadUrl,
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
  };
}

async function main() {
  const [mode, ...rawArgs] = process.argv.slice(2);
  if (mode !== "prepare" && mode !== "verify") {
    throw new Error(
      "Usage: app-version-release.cjs <prepare|verify> [options]",
    );
  }
  const args = parseArguments(rawArgs);
  const paths = defaultPaths(args);

  if (mode === "prepare") {
    if (!args["release-notes"]) {
      throw new Error(
        "prepare requires --release-notes; the minimum supported build defaults to the packaged build.",
      );
    }
    const payload = await buildReleasePayload({
      ...paths,
      releaseNotes: args["release-notes"],
      minSupportedVersionCode: args["min-supported-version-code"] === undefined ? undefined : Number(args["min-supported-version-code"]),
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
  buildReleasePayload,
  parseAaptBadging,
  parseAaptPermissions,
  parseGradleVersions,
  sha256File,
  verifyManifest,
};
