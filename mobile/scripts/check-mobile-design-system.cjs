const fs = require("node:fs");
const path = require("node:path");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const ALLOWED_SOURCE_FILES = new Set([
  path.normalize("src/theme/mobileBrand.ts"),
]);

const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?(?:\s*,\s*(?:\d+(?:\.\d+)?|\.\d+))?\s*\)/g;
const LEGACY_CONTROL_PATTERN = /\b(?:Button|TouchableOpacity)\b/g;

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
  return walkSource(rootDir).sort((left, right) =>
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.kind.localeCompare(right.kind) ||
    left.value.localeCompare(right.value),
  );
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
  isIgnoredSource,
  scanSource,
};

if (require.main === module) main();
