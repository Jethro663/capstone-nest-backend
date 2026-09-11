const fs = require("node:fs");
const path = require("node:path");

const MANIFEST = "contract-fixtures/admin-client-contracts.v1.json";
const LAYERS = ["backend", "web", "mobile"];
const CLIENT_SOURCE_ROOTS = [
  "next-frontend/src",
  "next-frontend/app",
  "mobile/src",
];

const FORBIDDEN_CLIENT_BYPASSES = [
  {
    label: "demo query flag",
    pattern: /[?&]demo(?:Mode)?=(?:true|1)(?:\b|&)/i,
  },
  {
    label: "demo mode header",
    pattern: /["']x-demo-mode["']\s*:/i,
  },
  {
    label: "demo request-body authority",
    pattern: /\bdemoMode\s*:\s*true\b/i,
  },
];

function findForbiddenClientBypasses(source) {
  return FORBIDDEN_CLIENT_BYPASSES.filter(({ pattern }) =>
    pattern.test(source),
  ).map(({ label }) => label);
}

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      files.push(...sourceFiles(fullPath));
      continue;
    }
    if (!/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) continue;
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    files.push(fullPath);
  }
  return files;
}

function hasToken(source, token) {
  return source.includes(token);
}

function hasField(source, field) {
  return new RegExp(
    `(^|[^A-Za-z0-9_$])${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_$]|$)`,
    "m",
  ).test(source);
}

function validateAdminContracts(rootDirectory) {
  const errors = [];
  const manifestPath = path.join(rootDirectory, MANIFEST);
  if (!fs.existsSync(manifestPath))
    return {
      errors: [`Missing manifest: ${MANIFEST}`],
      contractCount: 0,
      layersChecked: 0,
    };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1)
    errors.push(`Unsupported schemaVersion: ${manifest.schemaVersion}`);
  if (!Array.isArray(manifest.contracts))
    errors.push("Manifest contracts must be an array");
  const contracts = Array.isArray(manifest.contracts) ? manifest.contracts : [];
  const ids = new Set();
  let layersChecked = 0;
  for (const contract of contracts) {
    if (!contract.id || ids.has(contract.id))
      errors.push(
        `Contract id is missing or duplicated: ${contract.id ?? "<missing>"}`,
      );
    ids.add(contract.id);
    if (!Array.isArray(contract.fields) || contract.fields.length === 0)
      errors.push(`${contract.id}: fields must not be empty`);
    for (const layer of LAYERS) {
      layersChecked += 1;
      const definition = contract.layers?.[layer];
      if (
        !definition ||
        !Array.isArray(definition.sources) ||
        definition.sources.length === 0
      ) {
        errors.push(`${contract.id}/${layer}: sources are missing`);
        continue;
      }
      let combined = "";
      for (const relativePath of definition.sources) {
        const sourcePath = path.join(rootDirectory, relativePath);
        if (!fs.existsSync(sourcePath)) {
          errors.push(
            `${contract.id}/${layer}: missing source ${relativePath}`,
          );
          continue;
        }
        combined += `\n${fs.readFileSync(sourcePath, "utf8")}`;
      }
      if (!hasToken(combined, definition.endpoint))
        errors.push(
          `${contract.id}/${layer}: endpoint token ${definition.endpoint} is missing`,
        );
      for (const token of definition.tokens ?? []) {
        if (!hasToken(combined, token))
          errors.push(`${contract.id}/${layer}: token ${token} is missing`);
      }
      for (const field of contract.fields ?? []) {
        if (!hasField(combined, field))
          errors.push(`${contract.id}/${layer}: field ${field} is missing`);
      }
    }
  }
  for (const sourceRoot of CLIENT_SOURCE_ROOTS) {
    for (const sourcePath of sourceFiles(
      path.join(rootDirectory, sourceRoot),
    )) {
      const source = fs.readFileSync(sourcePath, "utf8");
      for (const violation of findForbiddenClientBypasses(source)) {
        errors.push(
          `${path.relative(rootDirectory, sourcePath)}: forbidden ${violation}`,
        );
      }
    }
  }
  return { errors, contractCount: contracts.length, layersChecked };
}

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const result = validateAdminContracts(root);
  if (result.errors.length > 0) {
    console.error(
      `Administrator contract gate failed with ${result.errors.length} problem(s):`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Administrator contract gate passed: ${result.contractCount} contracts across ${result.layersChecked} layer checks.`,
    );
  }
}

module.exports = { validateAdminContracts, findForbiddenClientBypasses };
