import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from '../lib/config.mjs';
import { assertSafeOutputPath } from '../lib/fs-safety.mjs';
import { annotateImage } from './annotate-image.mjs';

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..');
const matrixPath = path.join(path.dirname(scriptPath), 'mobile-capture-matrix.json');
const defaultAdb = path.join(
  process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '/home/jethro/Android/Sdk',
  'platform-tools',
  'adb',
);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

export function selectMobileCaptureOwner(matrix, id) {
  const owner = matrix.find((entry) => entry.id === id);
  if (!owner) throw new Error(`Unknown mobile capture owner: ${id}`);
  return owner;
}

export function parsePackageVersion(packageDump) {
  return {
    versionName: packageDump.match(/versionName=([^\s]+)/)?.[1] ?? 'unknown',
    versionCode: Number(packageDump.match(/versionCode=(\d+)/)?.[1] ?? 0),
  };
}

export function toNumberedAnnotations(annotations, width = 1080, height = 2400) {
  return annotations.map((annotation, index) => ({
    number: index + 1,
    label: annotation.label,
    xPercent: ((annotation.x + annotation.width / 2) / width) * 100,
    yPercent: ((annotation.y + annotation.height / 2) / height) * 100,
  }));
}

async function adb(adbPath, args, options = {}) {
  return execFileAsync(adbPath, args, {
    encoding: options.binary ? 'buffer' : 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

async function currentUi(adbPath) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await adb(adbPath, ['shell', 'uiautomator', 'dump', '/sdcard/nexora-docs-window.xml']).catch(() => null);
    const result = await adb(adbPath, ['exec-out', 'cat', '/sdcard/nexora-docs-window.xml']).catch(() => null);
    if (result?.stdout?.includes('<hierarchy')) return result.stdout;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error('Unable to read the current Android accessibility tree.');
}

async function readJsonIfPresent(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function captureOwner({ owner, config, outputRoot, adbPath, sourcePath, skipWaitCheck }) {
  const rawRelative = path.posix.join('08-VISUALS', 'mobile', `${owner.id}.png`);
  const annotatedRelative = path.posix.join('08-VISUALS', 'annotations', 'mobile', `${owner.id}.png`);
  const rawPath = path.join(outputRoot, rawRelative);
  const annotatedPath = path.join(outputRoot, annotatedRelative);
  await mkdir(path.dirname(rawPath), { recursive: true });

  let ui = '';
  if (sourcePath) {
    await copyFile(path.resolve(sourcePath), rawPath);
  } else {
    ui = await currentUi(adbPath);
    if (!skipWaitCheck && !ui.toLocaleLowerCase().includes(owner.waitFor.toLocaleLowerCase())) {
      throw new Error(
        `${owner.id}: current screen does not contain expected text “${owner.waitFor}”.`,
      );
    }
    const screenshot = await adb(adbPath, ['exec-out', 'screencap', '-p'], { binary: true });
    await writeFile(rawPath, screenshot.stdout);
  }

  const [model, androidVersion, size, density, packageDump] = await Promise.all([
    adb(adbPath, ['shell', 'getprop', 'ro.product.model']),
    adb(adbPath, ['shell', 'getprop', 'ro.build.version.release']),
    adb(adbPath, ['shell', 'wm', 'size']),
    adb(adbPath, ['shell', 'wm', 'density']),
    adb(adbPath, ['shell', 'dumpsys', 'package', 'com.nexora.lms.mobile']),
  ]);
  const version = parsePackageVersion(packageDump.stdout);
  const viewport = size.stdout.match(/Physical size:\s*(\d+x\d+)/)?.[1] ?? 'unknown';
  const dpi = Number(density.stdout.match(/Physical density:\s*(\d+)/)?.[1] ?? 0);

  const annotationResult = await annotateImage({
    inputPath: rawPath,
    outputPath: annotatedPath,
    annotations: toNumberedAnnotations(owner.annotations),
  });
  return {
    id: owner.id,
    status: 'captured',
    classification: 'SYNTHETIC_DOCUMENTATION_ONLY',
    role: owner.role,
    route: owner.routes[0],
    routes: owner.routes,
    title: owner.title,
    caption: owner.caption,
    captureMode: owner.captureMode,
    sourceCommit: config.applicationCommit,
    capturedAt: new Date().toISOString(),
    captureFile: rawRelative,
    annotatedFile: annotatedRelative,
    annotations: annotationResult.labels,
    platform: 'Android',
    emulator: model.stdout.trim(),
    androidVersion: androidVersion.stdout.trim(),
    viewport,
    densityDpi: dpi,
    appVersion: version.versionName,
    appBuild: version.versionCode,
    packageName: 'com.nexora.lms.mobile',
    accessibilityEvidence: sourcePath ? 'source-image' : `contains:${owner.waitFor}`,
  };
}

async function main() {
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  if (process.argv.includes('--list')) {
    process.stdout.write(`${matrix.map((owner) => `${owner.id}\t${owner.role}\t${owner.title}`).join('\n')}\n`);
    return;
  }
  const id = argument('--id');
  if (!id) {
    throw new Error('Usage: node scripts/handoff/capture/capture-mobile.mjs --id <capture-id> [--source <png>]');
  }
  const owner = selectMobileCaptureOwner(matrix, id);
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(
    repoRoot,
    path.join(repoRoot, 'output', config.packageName),
  );
  const metadataPath = path.join(
    outputRoot,
    '08-VISUALS',
    'annotations',
    'mobile-capture-metadata.json',
  );
  const evidence = await captureOwner({
    owner,
    config,
    outputRoot,
    adbPath: argument('--adb') || defaultAdb,
    sourcePath: argument('--source'),
    skipWaitCheck: process.argv.includes('--skip-wait-check'),
  });
  const metadata = await readJsonIfPresent(metadataPath, []);
  const next = [...metadata.filter((entry) => entry.id !== evidence.id), evidence]
    .sort((left, right) => left.id.localeCompare(right.id));
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `Captured ${evidence.id}: ${evidence.viewport}, Android ${evidence.androidVersion}, app ${evidence.appVersion} (${evidence.appBuild}).\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
