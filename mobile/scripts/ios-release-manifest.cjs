const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const { readFile, stat, writeFile } = require("node:fs/promises");

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function assertImmutableArtifactUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("artifactDownloadUrl must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("artifactDownloadUrl must be a valid HTTPS URL.");
  }
  const releaseTag = url.pathname.match(/\/releases\/download\/([^/]+)\//)?.[1];
  if (
    !releaseTag ||
    /latest/i.test(releaseTag) ||
    !/-[a-f0-9]{8}$/i.test(releaseTag)
  ) {
    throw new Error(
      "artifactDownloadUrl must use an immutable release tag ending in the source SHA.",
    );
  }
}

async function buildIosReleaseManifest(options) {
  assertImmutableArtifactUrl(options.artifactDownloadUrl);
  if (!/^[a-f0-9]{40}$/i.test(options.sourceRevision ?? "")) {
    throw new Error(
      "sourceRevision must be a 40-character hexadecimal Git SHA.",
    );
  }
  if (!options.releaseNotes?.trim()) {
    throw new Error("releaseNotes must not be empty.");
  }

  const appJson = JSON.parse(await readFile(options.appJsonPath, "utf8"));
  const nativeVersion = appJson.expo?.version;
  const buildNumber = appJson.expo?.ios?.buildNumber;
  const versionCode = Number(buildNumber);
  if (!/^\d+\.\d+\.\d+$/.test(nativeVersion ?? "")) {
    throw new Error("app.json must define a semantic expo.version.");
  }
  if (
    !/^\d+$/.test(buildNumber ?? "") ||
    !Number.isSafeInteger(versionCode) ||
    versionCode < 1
  ) {
    throw new Error("app.json must define a positive expo.ios.buildNumber.");
  }
  const expectedTagSuffix = `-${options.sourceRevision.slice(0, 8)}`;
  if (
    !new URL(options.artifactDownloadUrl).pathname.includes(expectedTagSuffix)
  ) {
    throw new Error(
      "The immutable artifact URL does not match sourceRevision.",
    );
  }

  const ipaStats = await stat(options.ipaPath);
  if (!ipaStats.isFile() || ipaStats.size < 1) {
    throw new Error("The verified IPA is empty or unavailable.");
  }

  const manifest = {
    platform: "ios",
    versionCode,
    minSupportedVersionCode: options.minSupportedVersionCode ?? versionCode,
    nativeVersion,
    otaRuntimeVersion: nativeVersion,
    artifactKind: "ipa",
    artifactDownloadUrl: options.artifactDownloadUrl,
    requiresFullApk: true,
    releaseNotes: options.releaseNotes.trim(),
    artifactSha256: await sha256File(options.ipaPath),
    artifactSizeBytes: ipaStats.size,
    sourceRevision: options.sourceRevision.toLowerCase(),
    distributionChannel: "sidestore",
  };
  if (
    !Number.isSafeInteger(manifest.minSupportedVersionCode) ||
    manifest.minSupportedVersionCode < 1 ||
    manifest.minSupportedVersionCode > versionCode
  ) {
    throw new Error(
      "minSupportedVersionCode must be positive and cannot exceed the packaged build.",
    );
  }

  await writeFile(options.outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? "<end>"}.`);
    }
    values[key.slice(2)] = value;
  }
  return values;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const manifest = await buildIosReleaseManifest({
    appJsonPath: args["app-json"],
    ipaPath: args.ipa,
    outputPath: args.output,
    artifactDownloadUrl: args["artifact-url"],
    sourceRevision: args["source-revision"],
    releaseNotes: args["release-notes"],
    minSupportedVersionCode: args["min-supported-build"]
      ? Number(args["min-supported-build"])
      : undefined,
  });
  process.stdout.write(
    `Created iOS ${manifest.nativeVersion} build ${manifest.versionCode} manifest for ${manifest.artifactSha256}.\n`,
  );
}

module.exports = { buildIosReleaseManifest };

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
