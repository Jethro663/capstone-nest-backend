const fs = require("node:fs");
const path = require("node:path");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const ALLOWED_SOURCE_FILES = new Set([
  path.normalize("src/theme/mobileBrand.ts"),
]);

const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?(?:\s*,\s*(?:\d+(?:\.\d+)?|\.\d+))?\s*\)/g;
const LEGACY_CONTROL_PATTERN = /\b(?:Button|TouchableOpacity)\b/g;
const NAMED_STYLE_COLOR_PATTERN = /(?:color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|shadowColor|tintColor)\s*:\s*(["'])(?:white|black|gray|grey|red|blue|green|yellow|purple|orange)\1/g;

function isIgnoredSource(relativePath) {
  const normalized = path.normalize(relativePath);
  return (
    ALLOWED_SOURCE_FILES.has(normalized) ||
    normalized.includes(`${path.sep}__tests__${path.sep}`) ||
    normalized.includes(`${path.sep}generated${path.sep}`) ||
    normalized.includes(`${path.sep}mocks${path.sep}`) ||
    /(?:\.test|\.spec)\.[jt]sx?$/.test(normalized)
  );
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function scanSource(relativePath, source) {
  if (isIgnoredSource(relativePath)) return [];
  const violations = [];
  for (const match of source.matchAll(COLOR_PATTERN)) {
    violations.push({
      file: path.normalize(relativePath),
      line: lineForOffset(source, match.index),
      kind: "raw-color",
      value: match[0],
    });
  }
  for (const match of source.matchAll(NAMED_STYLE_COLOR_PATTERN)) {
    violations.push({
      file: path.normalize(relativePath),
      line: lineForOffset(source, match.index),
      kind: "named-color",
      value: match[0],
    });
  }

  if (/from\s+["']react-native["']/.test(source)) {
    for (const match of source.matchAll(LEGACY_CONTROL_PATTERN)) {
      violations.push({
        file: path.normalize(relativePath),
        line: lineForOffset(source, match.index),
        kind: "legacy-control",
        value: match[0],
      });
    }
  }
  return violations;
}

function walkSource(rootDir, currentDir = path.join(rootDir, "src")) {
  return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) return walkSource(rootDir, absolutePath);
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) return [];
    const relativePath = path.relative(rootDir, absolutePath);
    return scanSource(relativePath, fs.readFileSync(absolutePath, "utf8"));
  });
}

function findDesignViolations(rootDir) {
  return [...walkSource(rootDir), ...checkNativeDesignContracts(rootDir)].sort((left, right) =>
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.kind.localeCompare(right.kind) ||
    left.value.localeCompare(right.value),
  );
}

function checkNativeDesignContracts(rootDir) {
  const violations = [];
  const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, "app.json"), "utf8"));
  const colorsXml = fs.readFileSync(
    path.join(rootDir, "android/app/src/main/res/values/colors.xml"),
    "utf8",
  );
  const stylesXml = fs.readFileSync(
    path.join(rootDir, "android/app/src/main/res/values/styles.xml"),
    "utf8",
  );
  const appRoot = fs.readFileSync(path.join(rootDir, "src/bootstrap/AppRoot.tsx"), "utf8");
  const richTextBuilder = fs.readFileSync(
    path.join(rootDir, "scripts/build-assessment-rich-text.cjs"),
    "utf8",
  );
  const expectations = [
    [
      appJson.expo?.android?.adaptiveIcon?.backgroundColor === "#0C1D3A",
      "app.json",
      "adaptive-icon",
      "backgroundColor=#0C1D3A",
    ],
    [
      /<color name="splashscreen_background">#F6F7F9<\/color>/.test(colorsXml),
      "android/app/src/main/res/values/colors.xml",
      "native-color",
      "splashscreen_background=#F6F7F9",
    ],
    [
      /<color name="iconBackground">#0C1D3A<\/color>/.test(colorsXml),
      "android/app/src/main/res/values/colors.xml",
      "native-color",
      "iconBackground=#0C1D3A",
    ],
    [
      /<color name="colorPrimary">#0C1D3A<\/color>/.test(colorsXml),
      "android/app/src/main/res/values/colors.xml",
      "native-color",
      "colorPrimary=#0C1D3A",
    ],
    [
      /<color name="navigationBar">#F6F7F9<\/color>/.test(colorsXml),
      "android/app/src/main/res/values/colors.xml",
      "native-color",
      "navigationBar=#F6F7F9",
    ],
    [
      stylesXml.includes('<item name="android:statusBarColor">@color/colorPrimary</item>') &&
        stylesXml.includes('<item name="android:navigationBarColor">@color/navigationBar</item>'),
      "android/app/src/main/res/values/styles.xml",
      "system-bars",
      "semantic status and navigation resources",
    ],
    [
      appRoot.includes('<StatusBar barStyle="light-content" backgroundColor={mobileBrand.navy} />'),
      "src/bootstrap/AppRoot.tsx",
      "status-bar",
      "light-content on mobileBrand.navy",
    ],
    [
      richTextBuilder.includes('text: "#101828"') &&
        richTextBuilder.includes('background: "#FFFFFF"') &&
        richTextBuilder.includes('link: "#175CD3"') &&
        richTextBuilder.includes('quote: "#DC2626"'),
      "scripts/build-assessment-rich-text.cjs",
      "rich-text-palette",
      "approved semantic palette",
    ],
  ];
  for (const [ok, file, kind, value] of expectations) {
    if (!ok) violations.push({ file, line: 1, kind, value });
  }
  return violations;
}

function main() {
  const rootDir = path.resolve(__dirname, "..");
  const violations = findDesignViolations(rootDir);
  if (violations.length === 0) {
    console.log("Mobile design-system audit passed.");
    return;
  }
  console.error(`Mobile design-system audit found ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line} ${violation.kind} ${violation.value}`,
    );
  }
  process.exitCode = 1;
}

module.exports = {
  findDesignViolations,
  checkNativeDesignContracts,
  isIgnoredSource,
  scanSource,
};

if (require.main === module) main();
