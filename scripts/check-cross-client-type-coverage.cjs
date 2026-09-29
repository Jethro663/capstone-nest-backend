const fs = require('node:fs');
const path = require('node:path');

const BASELINE = 'contract-fixtures/cross-client-type-coverage.v1.json';
const ADMIN_MANIFEST = 'contract-fixtures/admin-client-contracts.v1.json';
const WEB_TYPES = 'next-frontend/src/types';
const MOBILE_TYPES = 'mobile/src/types';
const CLASSIFICATIONS = new Set(['tracked', 'deferred']);

function typeFiles(rootDirectory, relativeDirectory) {
  const directory = path.join(rootDirectory, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function manifestSources(rootDirectory) {
  const manifestPath = path.join(rootDirectory, ADMIN_MANIFEST);
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return new Set(
    (manifest.contracts ?? []).flatMap((contract) =>
      Object.values(contract.layers ?? {}).flatMap((layer) => layer.sources ?? []),
    ),
  );
}

function validateCrossClientTypeCoverage(rootDirectory) {
  const errors = [];
  const webFiles = new Set(typeFiles(rootDirectory, WEB_TYPES));
  const mobileFiles = new Set(typeFiles(rootDirectory, MOBILE_TYPES));
  const common = [...webFiles].filter((file) => mobileFiles.has(file)).sort();
  const baselinePath = path.join(rootDirectory, BASELINE);
  if (!fs.existsSync(baselinePath)) {
    return {
      errors: [`Missing baseline: ${BASELINE}`],
      commonCount: common.length,
      trackedCount: 0,
      deferredCount: 0,
    };
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (baseline.schemaVersion !== 1) {
    errors.push(`Unsupported schemaVersion: ${baseline.schemaVersion}`);
  }
  const entries = Array.isArray(baseline.entries) ? baseline.entries : [];
  if (!Array.isArray(baseline.entries)) {
    errors.push('Baseline entries must be an array');
  }

  const listedFiles = entries.map((entry) => entry.file);
  const sortedFiles = [...listedFiles].sort();
  if (listedFiles.join('\n') !== sortedFiles.join('\n')) {
    errors.push('Baseline entries must be sorted by file');
  }

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.file)) errors.push(`Baseline entry is duplicated: ${entry.file}`);
    seen.add(entry.file);
    if (!CLASSIFICATIONS.has(entry.classification)) {
      errors.push(`${entry.file}: invalid classification ${entry.classification}`);
    }
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) {
      errors.push(`${entry.file}: reason is required`);
    }
    if (!common.includes(entry.file)) {
      errors.push(`Stale baseline entry: ${entry.file}`);
    }
  }

  for (const file of common) {
    if (!seen.has(file)) errors.push(`Unclassified shared type: ${file}`);
  }

  const sources = manifestSources(rootDirectory);
  if (sources) {
    for (const entry of entries.filter(
      (candidate) => candidate.classification === 'tracked',
    )) {
      const webPath = `${WEB_TYPES}/${entry.file}`;
      const mobilePath = `${MOBILE_TYPES}/${entry.file}`;
      if (!sources.has(webPath) || !sources.has(mobilePath)) {
        errors.push(
          `${entry.file}: tracked classification requires both client type paths in ${ADMIN_MANIFEST}`,
        );
      }
    }
  }

  return {
    errors,
    commonCount: common.length,
    trackedCount: entries.filter((entry) => entry.classification === 'tracked')
      .length,
    deferredCount: entries.filter(
      (entry) => entry.classification === 'deferred',
    ).length,
  };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const result = validateCrossClientTypeCoverage(root);
  if (result.errors.length > 0) {
    console.error(
      `Cross-client type coverage failed with ${result.errors.length} problem(s):`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Cross-client type coverage passed: ${result.commonCount} shared filenames (${result.trackedCount} tracked, ${result.deferredCount} deferred). Filename coverage does not prove semantic type equality.`,
    );
  }
}

module.exports = { validateCrossClientTypeCoverage };
