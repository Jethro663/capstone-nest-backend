const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");
const productionApiUrl =
  "https://capstone-backend-v2-production.up.railway.app/api";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(mobileRoot, relativePath), "utf8"));
}

async function resolveExpoConfig(iosBundleIdentifier) {
  const appJson = await readJson("app.json");
  const variableName = "NEXORA_IOS_BUNDLE_IDENTIFIER";
  const previousValue = process.env[variableName];
  try {
    if (iosBundleIdentifier === undefined) {
      delete process.env[variableName];
    } else {
      process.env[variableName] = iosBundleIdentifier;
    }
    const configure = require(path.join(mobileRoot, "app.config.js"));
    return configure({ config: appJson.expo });
  } finally {
    if (previousValue === undefined) {
      delete process.env[variableName];
    } else {
      process.env[variableName] = previousValue;
    }
  }
}

function findPlugin(expo, pluginName) {
  return expo.plugins.find((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    return name === pluginName;
  });
}

function readPngMetadata(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(buffer.subarray(0, 8).equals(signature), "icon must be a PNG");

  let offset = 8;
  let metadata;
  let hasTransparencyChunk = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const nextOffset = dataStart + length + 4;
    assert.ok(nextOffset <= buffer.length, `invalid PNG ${type} chunk`);

    if (type === "IHDR") {
      metadata = {
        width: buffer.readUInt32BE(dataStart),
        height: buffer.readUInt32BE(dataStart + 4),
        bitDepth: buffer[dataStart + 8],
        colorType: buffer[dataStart + 9],
      };
    }
    if (type === "tRNS") {
      hasTransparencyChunk = true;
    }
    offset = nextOffset;
    if (type === "IEND") break;
  }

  assert.ok(metadata, "icon must contain an IHDR chunk");
  return { ...metadata, hasTransparencyChunk };
}

test("default Expo config preserves the established SideStore identity", async () => {
  const appJson = await readJson("app.json");
  const expo = await resolveExpoConfig();

  assert.equal(appJson.expo.ios.bundleIdentifier, "com.nexora.lms.mobile");
  assert.equal(expo.ios.bundleIdentifier, "com.nexora.lms.mobile");
});

test("production Expo config matches the existing App Store Connect record", async () => {
  const expo = await resolveExpoConfig("com.nexora.lms.mobile.7A4H2D888M");

  assert.equal(
    expo.ios.bundleIdentifier,
    "com.nexora.lms.mobile.7A4H2D888M",
  );
  assert.equal(expo.android.package, "com.nexora.lms.mobile");
  assert.equal(Number(expo.ios.buildNumber), expo.android.versionCode);
  assert.equal(expo.ios.icon, "./assets/ios/icon.png");
  assert.equal(expo.ios.config.usesNonExemptEncryption, false);
});

test("dynamic config rejects an unexpected iOS bundle override", async () => {
  await assert.rejects(
    resolveExpoConfig("com.nexora.lms.mobile.wrong-team"),
    /NEXORA_IOS_BUNDLE_IDENTIFIER must be com\.nexora\.lms\.mobile\.7A4H2D888M/,
  );
});

test("Expo config declares the iOS runtime permissions and version floor", async () => {
  const appJson = await readJson("app.json");
  const { expo } = appJson;
  const imagePicker = findPlugin(expo, "expo-image-picker");
  const buildProperties = findPlugin(expo, "expo-build-properties");

  assert.ok(Array.isArray(imagePicker), "expo-image-picker must be configured");
  assert.match(imagePicker[1].photosPermission, /select photos/i);
  assert.match(imagePicker[1].cameraPermission, /camera/i);
  assert.equal(imagePicker[1].microphonePermission, false);

  assert.ok(
    Array.isArray(buildProperties),
    "expo-build-properties must be configured",
  );
  assert.equal(buildProperties[1].ios.deploymentTarget, "15.1");
});

test("EAS production build is store-distributed and submission is pinned", async () => {
  const eas = await readJson("eas.json");

  assert.equal(eas.cli.appVersionSource, "local");
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(
    eas.build.production.env.EXPO_PUBLIC_API_URL,
    productionApiUrl,
  );
  assert.equal(
    eas.build.production.env.NEXORA_IOS_BUNDLE_IDENTIFIER,
    "com.nexora.lms.mobile.7A4H2D888M",
  );
  assert.equal(eas.build.production.autoIncrement, undefined);
  assert.equal(eas.submit.production.ios.ascAppId, "6816592125");
});

test("the dedicated App Store icon is an opaque 1024px RGB PNG", async () => {
  const icon = await readFile(path.join(mobileRoot, "assets/ios/icon.png"));
  const metadata = readPngMetadata(icon);

  assert.deepEqual(metadata, {
    width: 1024,
    height: 1024,
    bitDepth: 8,
    colorType: 2,
    hasTransparencyChunk: false,
  });
});

test("EAS ignore rules keep nested iOS assets in the remote build archive", async () => {
  for (const ignorePath of [
    path.join(mobileRoot, ".easignore"),
    path.join(mobileRoot, "..", ".easignore"),
  ]) {
    const rules = (await readFile(ignorePath, "utf8"))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    assert.ok(rules.includes("/ios/"), `${ignorePath} must anchor /ios/`);
    assert.ok(
      rules.includes("/android/"),
      `${ignorePath} must anchor /android/`,
    );
    assert.ok(!rules.includes("ios/"), `${ignorePath} must retain assets/ios/`);
    assert.ok(!rules.includes("android/"), `${ignorePath} must retain nested Android assets`);
  }
});
