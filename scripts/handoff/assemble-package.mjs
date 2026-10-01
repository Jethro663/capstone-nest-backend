#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';
import { renderStartPage } from './generate-start-page.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../..');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

async function sha256(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

async function listFiles(root, directory = root) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(root, absolute));
    if (entry.isFile()) result.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
  return result;
}

function sanitizeEnvironmentTemplate(source) {
  const secretPattern = /(SECRET|PASSWORD|TOKEN|API_KEY|PEPPER|PRIVATE_KEY)/;
  return source.split(/\r?\n/).flatMap((line) => {
    if (/EXPO_PUBLIC_LOGIN_SEED_/.test(line)) return [];
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) return [line];
    const [, key, value] = match;
    if (secretPattern.test(key)) return [`${key}=CHANGE_ME_${key}`];
    if (/EMAIL/.test(key) && value.includes('@')) return [`${key}=operator@example.invalid`];
    return [line];
  }).join('\n').replaceAll('jethrojosephfida@gmail.com', 'operator@example.invalid');
}

async function copySanitized(source, destination) {
  const content = await readFile(source, 'utf8');
  await writeFile(destination, `${sanitizeEnvironmentTemplate(content).trimEnd()}\n`, 'utf8');
}

const backupSh = `#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --db-url URL --uploads PATH --output NEW_DIRECTORY" >&2
  exit 2
}

db_url=""; uploads=""; output=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url) db_url="\${2:-}"; shift 2 ;;
    --uploads) uploads="\${2:-}"; shift 2 ;;
    --output) output="\${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ -n "$db_url" && -n "$uploads" && -n "$output" ]] || usage
[[ -d "$uploads" ]] || { echo "Uploads path does not exist: $uploads" >&2; exit 3; }
[[ "$output" = /* ]] || { echo "Output must be an explicit absolute path." >&2; exit 3; }
[[ "$output" != "/" && "$output" != "$HOME" ]] || { echo "Unsafe output path." >&2; exit 3; }
[[ ! -e "$output" ]] || { echo "Output already exists; choose a new directory." >&2; exit 3; }

command -v pg_dump >/dev/null || { echo "pg_dump is required." >&2; exit 4; }
command -v sha256sum >/dev/null || { echo "sha256sum is required." >&2; exit 4; }
mkdir -p "$output"
pg_dump --format=custom --no-owner --no-privileges --file "$output/database.dump" "$db_url"
tar -C "$uploads" -czf "$output/uploads.tar.gz" .
pg_dump --version > "$output/tool-versions.txt"
(cd "$output" && sha256sum database.dump uploads.tar.gz tool-versions.txt > MANIFEST.sha256)
echo "Backup created at $output. Copy operator notes separately; do not store credentials here."
`;

const restoreSh = `#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --admin-url URL --backup DIRECTORY --target-db NAME_restore_test --confirm CREATE_EMPTY_TARGET" >&2
  exit 2
}

admin_url=""; backup=""; target_db=""; confirm=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin-url) admin_url="\${2:-}"; shift 2 ;;
    --backup) backup="\${2:-}"; shift 2 ;;
    --target-db) target_db="\${2:-}"; shift 2 ;;
    --confirm) confirm="\${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ -n "$admin_url" && -n "$backup" && -n "$target_db" ]] || usage
[[ "$confirm" == "CREATE_EMPTY_TARGET" ]] || { echo "Explicit confirmation missing." >&2; exit 3; }
[[ "$target_db" =~ ^[A-Za-z0-9_]+_restore_test$ ]] || { echo "Target must end in _restore_test." >&2; exit 3; }
[[ -f "$backup/database.dump" && -f "$backup/MANIFEST.sha256" ]] || { echo "Backup dump or manifest missing." >&2; exit 3; }

command -v createdb >/dev/null || { echo "createdb is required." >&2; exit 4; }
command -v pg_restore >/dev/null || { echo "pg_restore is required." >&2; exit 4; }
(cd "$backup" && sha256sum --check MANIFEST.sha256)

if psql "$admin_url" -Atqc "SELECT 1 FROM pg_database WHERE datname = '$target_db'" | grep -q 1; then
  echo "Target database already exists; refusing to overwrite it." >&2
  exit 5
fi

createdb --maintenance-db "$admin_url" "$target_db"
target_url="\${admin_url%/*}/$target_db"
pg_restore --exit-on-error --no-owner --no-privileges --dbname "$target_url" "$backup/database.dump"
psql "$target_url" -v ON_ERROR_STOP=1 -c "SELECT current_database(), now();"
echo "Restore completed into $target_db. Application integrity and role smoke checks are still required."
`;

const backupPs1 = `param(
  [Parameter(Mandatory=$true)][string]$DatabaseUrl,
  [Parameter(Mandatory=$true)][string]$UploadsPath,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
if (-not [IO.Path]::IsPathRooted($OutputDirectory)) { throw 'OutputDirectory must be an explicit absolute path.' }
if ($OutputDirectory -eq [IO.Path]::GetPathRoot($OutputDirectory)) { throw 'Refusing a filesystem root.' }
if (Test-Path $OutputDirectory) { throw 'OutputDirectory already exists; choose a new directory.' }
if (-not (Test-Path -PathType Container $UploadsPath)) { throw 'UploadsPath does not exist.' }
New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
& pg_dump --format=custom --no-owner --no-privileges --file (Join-Path $OutputDirectory 'database.dump') $DatabaseUrl
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
Compress-Archive -Path (Join-Path $UploadsPath '*') -DestinationPath (Join-Path $OutputDirectory 'uploads.zip')
Get-FileHash (Join-Path $OutputDirectory 'database.dump'), (Join-Path $OutputDirectory 'uploads.zip') -Algorithm SHA256 |
  ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } |
  Set-Content (Join-Path $OutputDirectory 'MANIFEST.sha256')
Write-Host "Backup created at $OutputDirectory. Do not store credentials in this folder."
`;

const restorePs1 = `param(
  [Parameter(Mandatory=$true)][string]$AdminUrl,
  [Parameter(Mandatory=$true)][string]$BackupDirectory,
  [Parameter(Mandatory=$true)][string]$TargetDatabase,
  [Parameter(Mandatory=$true)][ValidateSet('CREATE_EMPTY_TARGET')][string]$Confirm
)
$ErrorActionPreference = 'Stop'
if ($TargetDatabase -notmatch '^[A-Za-z0-9_]+_restore_test$') { throw 'TargetDatabase must end in _restore_test.' }
$dump = Join-Path $BackupDirectory 'database.dump'
$manifest = Join-Path $BackupDirectory 'MANIFEST.sha256'
if (-not (Test-Path $dump) -or -not (Test-Path $manifest)) { throw 'Backup dump or manifest missing.' }
$expected = (Get-Content $manifest | Where-Object { $_ -match 'database.dump$' }).Split()[0]
$actual = (Get-FileHash $dump -Algorithm SHA256).Hash.ToLower()
if ($expected -ne $actual) { throw 'Database dump checksum mismatch.' }
$exists = & psql $AdminUrl -Atqc "SELECT 1 FROM pg_database WHERE datname = '$TargetDatabase'"
if ($exists -eq '1') { throw 'Target database already exists; refusing to overwrite it.' }
& createdb --maintenance-db $AdminUrl $TargetDatabase
if ($LASTEXITCODE -ne 0) { throw 'createdb failed.' }
$targetUrl = $AdminUrl.Substring(0, $AdminUrl.LastIndexOf('/') + 1) + $TargetDatabase
& pg_restore --exit-on-error --no-owner --no-privileges --dbname $targetUrl $dump
if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed; preserve the target for diagnosis.' }
& psql $targetUrl -v ON_ERROR_STOP=1 -c 'SELECT current_database(), now();'
Write-Host 'Restore completed. Application integrity and role smoke checks are still required.'
`;

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function dependencyRows() {
  const rows = [];
  for (const component of ['backend', 'next-frontend', 'mobile']) {
    const packageJson = JSON.parse(await readFile(path.join(repoRoot, component, 'package.json'), 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    for (const [name, requested] of Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b))) {
      let license = 'See installed package or registry metadata';
      try {
        const manifest = JSON.parse(await readFile(path.join(repoRoot, component, 'node_modules', name, 'package.json'), 'utf8'));
        license = typeof manifest.license === 'string' ? manifest.license : JSON.stringify(manifest.license ?? license);
      } catch {}
      rows.push([component, name, requested, license]);
    }
  }
  const requirements = await readFile(path.join(repoRoot, 'ai-service', 'requirements.txt'), 'utf8');
  for (const line of requirements.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    rows.push(['ai-service', trimmed.split(/[<>=!~]/)[0], trimmed, 'See Python package metadata']);
  }
  return rows;
}

async function assemble() {
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(repoRoot, path.join(repoRoot, 'output', config.packageName));
  const expectedCommit = run('git', ['rev-parse', config.applicationCommit], { cwd: repoRoot });
  if (expectedCommit !== config.applicationCommit) throw new Error('Configured application commit did not resolve exactly.');

  for (const directory of config.directories) await mkdir(path.join(outputRoot, directory), { recursive: true });

  const sourceArchive = path.join(outputRoot, '03-SOURCE', `nexora-source-${config.applicationCommit.slice(0, 7)}.zip`);
  const sourceBuildRoot = await mkdtemp(path.join(os.tmpdir(), 'nexora-source-archive-'));
  try {
    const tarPath = path.join(sourceBuildRoot, 'snapshot.tar');
    const extractedPath = path.join(sourceBuildRoot, 'source');
    await mkdir(extractedPath);
    run('git', ['archive', '--format=tar', `--output=${tarPath}`, config.applicationCommit], { cwd: repoRoot });
    run('tar', [
      '--extract', `--file=${tarPath}`, `--directory=${extractedPath}`,
      '--exclude=mobile/.npm-cache', '--exclude=redis-binaries', '--exclude=*.apk',
      '--exclude=docs', '--exclude=artifacts', '--exclude=mobile/APK_DEPLOYMENT.md',
      '--exclude=mobile/profile_screen.xml', '--exclude=mobile/.env.example',
    ]);
    await rm(sourceArchive, { force: true });
    run('zip', ['-q', '-r', sourceArchive, '.'], { cwd: extractedPath });
  } finally {
    await rm(sourceBuildRoot, { recursive: true, force: true });
  }
  await writeFile(path.join(outputRoot, '03-SOURCE', 'SOURCE-README.txt'), [
    'NEXORA SOURCE SNAPSHOT',
    '',
    `Commit: ${config.applicationCommit}`,
    'Branch at selection time: developement',
    'Archive type: filtered git archive (tracked source only)',
    'Excluded by construction: .git history, node_modules, local .env files, build output, database volumes, runtime caches, tracked npm cache, Redis dependency binaries, every APK, generated artifacts, and historical docs.',
    'Privacy exclusions: mobile/.env.example, mobile/APK_DEPLOYMENT.md, and mobile/profile_screen.xml contained documentation-only identity or generated-device evidence. Use the sanitized templates in 05-CONFIG-TEMPLATES instead.',
    '',
    'Extract this ZIP to a writable local SSD. Do not run the system directly from the external drive.',
    'Read the System Manual and the operating-system quick start before configuring secrets or starting services.',
    '',
  ].join('\n'), 'utf8');

  const apkSource = process.env.NEXORA_APK_SOURCE
    ? path.resolve(process.env.NEXORA_APK_SOURCE)
    : path.join(repoRoot, config.apk.source);
  const apkDestination = path.join(outputRoot, config.apk.destination);
  const apkSourceStat = await stat(apkSource);
  if (apkSourceStat.size !== config.apk.sizeBytes) throw new Error(`APK size mismatch: ${apkSourceStat.size}`);
  if (await sha256(apkSource) !== config.apk.sha256) throw new Error('APK SHA-256 mismatch.');
  await copyFile(apkSource, apkDestination);
  await writeFile(path.join(outputRoot, '04-MOBILE', 'APK-SHA256.txt'), `${config.apk.sha256}  ${path.basename(apkDestination)}\n`, 'utf8');
  await writeFile(path.join(outputRoot, '04-MOBILE', 'RELEASE-IDENTITY.txt'), [
    'Nexora Mobile', `Version: ${config.apk.version}`, `Build: ${config.apk.build}`,
    `Size: ${config.apk.sizeBytes} bytes`, `SHA-256: ${config.apk.sha256}`, '',
  ].join('\n'), 'utf8');

  const configDirectory = path.join(outputRoot, '05-CONFIG-TEMPLATES');
  await copySanitized(path.join(repoRoot, '.env.compose.example'), path.join(configDirectory, 'root.env.compose.example'));
  await copySanitized(path.join(repoRoot, 'backend', '.env.example'), path.join(configDirectory, 'backend.env.example'));
  await copySanitized(path.join(repoRoot, 'backend', '.env.docker'), path.join(configDirectory, 'backend.env.docker.defaults'));
  await copySanitized(path.join(repoRoot, 'ai-service', '.env.example'), path.join(configDirectory, 'ai-service.env.example'));
  await copySanitized(path.join(repoRoot, 'ai-service', '.env.docker'), path.join(configDirectory, 'ai-service.env.docker.defaults'));
  await copySanitized(path.join(repoRoot, 'mobile', '.env.example'), path.join(configDirectory, 'mobile.env.example'));
  await writeFile(path.join(configDirectory, 'web.env.example'), [
    '# Public web build values. Never place secrets in NEXT_PUBLIC_* keys.',
    'NEXT_PUBLIC_API_URL=http://localhost:3000/api',
    'NEXT_PUBLIC_WS_URL=http://localhost:3000',
    '',
  ].join('\n'), 'utf8');
  await writeFile(path.join(configDirectory, 'README.txt'), [
    'Copy only the template required by the workflow into the extracted local source.',
    'For default Compose, rename root.env.compose.example to .env at the repository root.',
    'Replace every CHANGE_ME value. Never save a real .env file to the external drive or source control.',
    'The PDF configuration reference documents all 98 current environment keys and their source locations.',
    '',
  ].join('\n'), 'utf8');

  const recoveryDirectory = path.join(outputRoot, '06-DATABASE-AND-RECOVERY');
  const recoveryScripts = path.join(recoveryDirectory, 'scripts');
  await writeFile(path.join(recoveryScripts, 'backup-nexora.sh'), backupSh, { encoding: 'utf8', mode: 0o755 });
  await writeFile(path.join(recoveryScripts, 'restore-nexora-verify.sh'), restoreSh, { encoding: 'utf8', mode: 0o755 });
  await writeFile(path.join(recoveryScripts, 'Backup-Nexora.ps1'), backupPs1, 'utf8');
  await writeFile(path.join(recoveryScripts, 'Restore-Nexora-Verify.ps1'), restorePs1, 'utf8');
  await writeFile(path.join(recoveryScripts, 'README.txt'), [
    'These scripts require explicit targets and never delete a database.',
    'Restore accepts only a new database whose name ends in _restore_test and refuses an existing target.',
    'Read Backup-and-Restore-Runbook.pdf before use. A successful restore is not production-cutover authorization.',
    '',
  ].join('\n'), 'utf8');

  const inventory = JSON.parse(await readFile(path.join(outputRoot, '01-MANUALS', 'sources', 'inventory.json'), 'utf8'));
  const count = (value) => Array.isArray(value) ? value.length : value.count;
  const evidenceDirectory = path.join(outputRoot, '09-DEPLOYMENT-EVIDENCE');
  const toolingCommit = run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  await writeFile(path.join(evidenceDirectory, 'SNAPSHOT-EVIDENCE.md'), [
    '# Nexora handoff evidence', '',
    `- Application snapshot: \`${config.applicationCommit}\``,
    `- Handoff build date: \`${config.buildDate}\``,
    `- Documentation tooling checkout: \`${toolingCommit}\``,
    `- Backend modules: ${count(inventory.backend.featureModules)}`,
    `- Backend HTTP handlers: ${count(inventory.backend.httpHandlers)}`,
    `- AI handlers: ${count(inventory.aiService.httpHandlers)}`,
    `- Web pages: ${count(inventory.web.pages)}`,
    `- Mobile screen files: ${count(inventory.mobile.screenFiles)}`,
    `- Database tables/enums/migrations: ${count(inventory.database.tables)} / ${count(inventory.database.enums)} / ${inventory.database.migrationFiles.length}`,
    `- Queue processors: ${count(inventory.queues.processors)}`,
    `- Environment keys: ${count(inventory.configuration.uniqueKeys)}`, '',
    '## Confirmed in the handoff build', '',
    '- 114/114 web capture owners and 25/25 mobile evidence owners are present.',
    '- User and System PDFs were fully rendered and visually inspected page by page.',
    '- Mobile typecheck and its administrator/coverage contract gates passed during evidence capture.',
    '- The APK bytes match the recorded size and SHA-256.',
    '- Source archive is produced directly from the locked application commit.', '',
    '## Boundary', '',
    'This package does not claim that the locked snapshot is currently deployed, that current CI is green, or that a physical Android/iOS device was tested during this documentation build. Production secrets and production school records are intentionally absent.', '',
  ].join('\n'), 'utf8');
  await writeFile(path.join(evidenceDirectory, 'RELEASE-CHECKLIST.md'), [
    '# Release evidence checklist', '',
    '- [ ] Record the exact candidate commit and protected branch.',
    '- [ ] Run backend, web, mobile, AI, migration, contract, and security gates required by the changed surfaces.',
    '- [ ] Take and verify a durable backup before schema or official-record changes.',
    '- [ ] Deploy stateful dependencies and backend before clients; run migrations once.',
    '- [ ] Record provider deployment IDs and prove public live/readiness for the exact commit.',
    '- [ ] Verify authenticated role workflows without performing unauthorized destructive actions.',
    '- [ ] Verify APK/IPA identity, signing, size, SHA-256, policy registration, and physical-device behavior.',
    '- [ ] Record rollback target and post-deploy observation result.', '',
  ].join('\n'), 'utf8');
  await writeFile(path.join(evidenceDirectory, 'MANUAL-QA.txt'), [
    'Nexora User Manual: 144 A4 pages; 114 web page evidence owners; 25 mobile evidence owners.',
    'Nexora System Manual: 147 A4 pages; 43 backend modules; 485 backend handlers; 63 AI handlers; 116 tables; 55 enums; 37 migrations; 9 queues; 98 environment keys.',
    'All 291 manual PDF pages were rendered to PNG contact sheets and visually inspected after the final screenshot-layout repair.',
    'Support PDFs were rendered and visually inspected; quick-reference guides fit one page each and the complete configuration index spans five pages.',
    '',
  ].join('\n'), 'utf8');

  const noticesDirectory = path.join(outputRoot, '10-LICENSES-AND-NOTICES');
  await writeFile(path.join(noticesDirectory, 'NEXORA-LICENSE-NOTICE.txt'), [
    'NEXORA PROJECT NOTICE', '',
    'Repository package metadata marks the application UNLICENSED.',
    'This handoff is a school/project reference copy; possession of the drive does not grant public redistribution rights.',
    'Third-party dependencies retain their own licenses. See DIRECT-DEPENDENCIES.csv and the exact lockfiles in the source archive.',
    'Before redistribution or commercial use, obtain repository-owner approval and generate a complete transitive license report from the locked source.', '',
  ].join('\n'), 'utf8');
  const rows = await dependencyRows();
  const csv = [['component', 'dependency', 'requested', 'license'], ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  await writeFile(path.join(noticesDirectory, 'DIRECT-DEPENDENCIES.csv'), `${csv}\n`, 'utf8');

  await writeFile(path.join(outputRoot, 'README-FIRST.txt'), [
    'NEXORA COMPLETE HANDOFF', '',
    '1. Copy this entire folder to a local SSD; keep the external-drive copy unchanged.',
    '2. Open START-HERE.html in a modern browser.',
    '3. Read 02-QUICK-START/00-READ-ME-FIRST.pdf and the System Manual before running anything.',
    '4. Verify MANIFEST.sha256 before trusting the source archive or APK.',
    '5. Use the User Manual for the role-by-role web and mobile workflows.', '',
    'Internet is required for first-time dependency, container image, and AI model downloads.',
    'Production secrets and production school data are not included.',
    `Application source commit: ${config.applicationCommit}`, '',
  ].join('\n'), 'utf8');
  await writeFile(path.join(outputRoot, 'START-HERE.html'), await renderStartPage(config), 'utf8');
  await writeFile(path.join(outputRoot, 'VERSION.txt'), [
    'Nexora LMS Complete Handoff',
    `Package: ${config.packageName}`,
    `Build date: ${config.buildDate}`,
    `Application commit: ${config.applicationCommit}`,
    `Documentation tooling checkout: ${toolingCommit}`,
    `Android version: ${config.apk.version}`,
    `Android build: ${config.apk.build}`,
    '',
  ].join('\n'), 'utf8');

  await writeFile(path.join(outputRoot, 'MANIFEST-README.txt'), [
    'MANIFEST.sha256 contains every package file except itself, sorted by portable relative path.',
    'Windows PowerShell: Get-FileHash .\\04-MOBILE\\nexora-mobile-0.1.56-build57.apk -Algorithm SHA256',
    'Linux/macOS (GNU): sha256sum --check MANIFEST.sha256',
    'A mismatch means the package is incomplete or changed. Recopy it from the trusted original.', '',
  ].join('\n'), 'utf8');

  const payloadFiles = (await listFiles(outputRoot)).filter((relative) => !['MANIFEST.sha256', 'PACKAGE-SIZE.txt'].includes(relative));
  let payloadBytes = 0;
  for (const relative of payloadFiles) payloadBytes += (await stat(path.join(outputRoot, relative))).size;
  let sizeText = '';
  let describedBytes = payloadBytes;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    sizeText = `${describedBytes} bytes (all package files except MANIFEST.sha256)\n`;
    describedBytes = payloadBytes + Buffer.byteLength(sizeText);
  }
  sizeText = `${describedBytes} bytes (all package files except MANIFEST.sha256)\n`;
  await writeFile(path.join(outputRoot, 'PACKAGE-SIZE.txt'), sizeText, 'utf8');

  const files = (await listFiles(outputRoot)).filter((relative) => relative !== 'MANIFEST.sha256').sort();
  const manifest = [];
  let totalBytes = 0;
  for (const relative of files) {
    const absolute = path.join(outputRoot, relative);
    totalBytes += (await stat(absolute)).size;
    manifest.push(`${await sha256(absolute)}  ${relative}`);
  }
  if (totalBytes > config.maxBytes) throw new Error(`Package exceeds configured ${config.maxBytes} byte limit.`);
  await writeFile(path.join(outputRoot, 'MANIFEST.sha256'), `${manifest.join('\n')}\n`, 'utf8');
  process.stdout.write(`Assembled ${files.length + 1} files, ${totalBytes} bytes, at ${outputRoot}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  assemble().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { assemble, sanitizeEnvironmentTemplate };
