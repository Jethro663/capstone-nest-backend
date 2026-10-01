import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from '../lib/config.mjs';
import { assertSafeOutputPath } from '../lib/fs-safety.mjs';
import { annotateImage } from './annotate-image.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..');
const requireFromFrontend = createRequire(
  path.join(repoRoot, 'next-frontend', 'package.json'),
);

export function selectCaptureEntries(matrix, filters) {
  const ids = filters.ids ? new Set(filters.ids) : null;
  const roles = filters.roles ? new Set(filters.roles) : null;
  const modes = filters.modes ? new Set(filters.modes) : null;
  return matrix.filter(
    (entry) =>
      (!ids || ids.has(entry.id)) &&
      (!roles || roles.has(entry.role)) &&
      (!modes || modes.has(entry.captureMode)),
  );
}

export function isExpectedDestination(requestedPath, actualPath) {
  if (requestedPath === actualPath) return true;
  if (requestedPath === '/dashboard' && /^\/dashboard\/(admin|teacher|student)(\/dashboard)?$/.test(actualPath)) {
    return true;
  }
  if (
    requestedPath === '/dashboard/profile' &&
    /^\/dashboard\/(admin|teacher|student)\/profile$/.test(actualPath)
  ) {
    return true;
  }
  return false;
}

export function isExpectedApiFailure(entry, failure) {
  try {
    const pathname = new URL(failure.url).pathname;
    if (entry.role === 'public' && failure.status === 401) {
      return pathname === '/api/auth/refresh';
    }
    return (
      entry.id === 'dashboard-teacher-classes-id-ai-draft' &&
      failure.status === 503 &&
      /^\/api\/ai\/index\/classes\/[^/]+\/status$/.test(pathname)
    );
  } catch {
    return false;
  }
}

export function isExpectedConsoleError(entry, message) {
  return (
    (entry.role === 'public' &&
      /Failed to load resource:.*401 \(Unauthorized\)/.test(message)) ||
    (entry.id === 'dashboard-teacher-classes-id-ai-draft' &&
      /Failed to load resource:.*503 \(Service Unavailable\)/.test(message))
  );
}

export async function resolveDynamicCapturePath(entry, request, baseUrl) {
  if (entry.captureSetup?.type !== 'lesson-preview-session') {
    return entry.capturePath;
  }
  const refreshResponse = await request.post(
    new URL('/api/auth/refresh', baseUrl).href,
  );
  if (!refreshResponse.ok()) {
    throw new Error(`Capture-session refresh failed with ${refreshResponse.status()}`);
  }
  const refreshPayload = await refreshResponse.json();
  const accessToken = refreshPayload?.data?.accessToken ?? refreshPayload?.accessToken;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Capture-session refresh did not return an access token');
  }
  const response = await request.post(
    new URL(
      `/api/lessons/${encodeURIComponent(entry.captureSetup.lessonId)}/preview-session`,
      baseUrl,
    ).href,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok()) {
    throw new Error(`Lesson preview session request failed with ${response.status()}`);
  }
  const payload = await response.json();
  const previewUrl = payload?.data?.url;
  if (typeof previewUrl !== 'string' || !previewUrl.includes('/lesson-preview/')) {
    throw new Error('Lesson preview session response did not include a preview URL');
  }
  return new URL(previewUrl, baseUrl).pathname;
}

export function buildExtractionComponentEnvelope(fixture) {
  const teacher = fixture.accounts.find((account) => account.role === 'teacher');
  const file = fixture.fileArtifact.file;
  const extraction = fixture.fileArtifact.extraction;
  return {
    success: true,
    message: 'Synthetic extraction component state for documentation',
    data: {
      id: extraction.id,
      file_id: file.id,
      class_id: fixture.classroom.class.id,
      teacher_id: teacher.id,
      extraction_status: 'completed',
      model_used: 'documentation-fixture',
      error_message: null,
      is_applied: false,
      progress_percent: 100,
      total_chunks: 1,
      processed_chunks: 1,
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
      original_name: file.name,
      qualityGate: 'pass',
      reviewRequired: false,
      structured_content: {
        title: extraction.title,
        description: `<p>${extraction.description}</p>`,
        sections: [{
          title: 'Worked Examples',
          description: 'Teacher review section for the synthetic reference.',
          order: 1,
          reviewState: 'ready',
          lessonBlocks: [{
            type: 'text',
            content: { html: '<p>Keep both sides balanced by applying the same inverse operation.</p>' },
            order: 0,
            metadata: { instructionalRole: 'explanation' },
          }],
          assessmentDraft: {
            title: 'Quick Check',
            description: 'A one-question formative check.',
            type: 'quiz',
            passingScore: 75,
            feedbackLevel: 'standard',
            questions: [{ content: 'Solve x + 3 = 7.', type: 'short_answer', points: 1, order: 1 }],
          },
        }],
        mediaAssets: [],
        audit: {
          coherenceScore: 0.96,
          coherenceWarnings: [],
          repairNotes: [],
          confidenceBreakdown: { overallConfidence: 0.96, warningCount: 0 },
          reviewState: 'ready',
          reviewIssues: [],
        },
      },
    },
  };
}

function parseListArgument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) return null;
  return process.argv[index + 1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function relativeCapturePath(...parts) {
  return path.posix.join('08-VISUALS', 'web', ...parts);
}

async function readJsonIfPresent(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function createAuthenticatedContext(browser, baseUrl, email, password) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    baseURL: baseUrl,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // The form has a native POST fallback. Wait until React owns the input before
  // clicking so capture automation exercises Nexora's real client login flow.
  await page.waitForFunction(
    () => Boolean(document.querySelector('#email')?._valueTracker),
    null,
    { timeout: 15_000 },
  );
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/auth/login' &&
      response.status() === 200,
    { timeout: 30_000 },
  );
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith('/dashboard'), {
      timeout: 30_000,
    }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  await loginResponse;
  // The dashboard URL changes before AuthProvider finishes its cookie refresh.
  // Waiting for the authenticated shell keeps the page alive until that
  // bootstrap settles and the rotated cookie is stored in the context.
  await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 });
  await page.close();
  return context;
}

async function captureEntry({
  browserContext,
  entry,
  baseUrl,
  outputRoot,
  config,
}) {
  const page = await browserContext.newPage();
  const consoleErrors = [];
  const expectedConsoleErrors = [];
  const failedApiRequests = [];
  const expectedApiFailures = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      if (isExpectedConsoleError(entry, message.text())) {
        expectedConsoleErrors.push(message.text());
      } else {
        consoleErrors.push(message.text());
      }
    }
  });
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      const failure = { status: response.status(), url: response.url() };
      if (isExpectedApiFailure(entry, failure)) {
        expectedApiFailures.push(failure);
      } else {
        failedApiRequests.push(failure);
      }
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/')) {
      failedApiRequests.push({
        status: 0,
        url: request.url(),
        error: request.failure()?.errorText ?? 'request failed',
      });
    }
  });

  const roleDirectory = entry.role === 'shared' ? 'shared' : entry.role;
  const captureFile = relativeCapturePath(roleDirectory, `${entry.id}.png`);
  const annotatedFile = relativeCapturePath(
    roleDirectory,
    `${entry.id}-annotated.png`,
  );
  const absoluteCapture = path.join(outputRoot, captureFile);
  const absoluteAnnotated = path.join(outputRoot, annotatedFile);
  await mkdir(path.dirname(absoluteCapture), { recursive: true });

  const evidence = {
    id: entry.id,
    route: entry.routes[0],
    requestedPath: entry.capturePath,
    role: entry.role,
    captureMode: entry.captureMode,
    sourceFile: entry.sourceFile,
    sourceCommit: config.applicationCommit,
    capturedAt: new Date().toISOString(),
    classification: entry.classification,
    captureFile,
    annotatedFile,
    viewport: entry.viewport,
    annotations: entry.annotations,
    status: 'failed',
    finalPath: null,
    consoleErrors,
    expectedConsoleErrors,
    failedApiRequests,
    expectedApiFailures,
    failure: null,
  };

  try {
    if (entry.captureSetup?.type === 'extraction-component-state') {
      const fixture = JSON.parse(
        await readFile(
          path.join(repoRoot, 'scripts', 'handoff', 'demo-data', 'documentation-fixture.json'),
          'utf8',
        ),
      );
      const envelope = buildExtractionComponentEnvelope(fixture);
      await page.route(
        `**/api/ai/extractions/${fixture.fileArtifact.extraction.id}`,
        (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope) }),
      );
    }
    const requestedPath = await resolveDynamicCapturePath(
      entry,
      page.request,
      baseUrl,
    );
    evidence.requestedPath = requestedPath;
    if (entry.role === 'student' && entry.routes[0] !== '/dashboard/student') {
      await page.addInitScript(() => {
        window.sessionStorage.setItem(
          'nexora.student.announcement-board.dismissed',
          'dismissed',
        );
      });
    }
    await page.setViewportSize(entry.viewport);
    await page.goto(new URL(requestedPath, baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await page
      .waitForLoadState('networkidle', { timeout: 8_000 })
      .catch(() => {});
    await page.locator(entry.expectedSelector).first().waitFor({
      state: 'visible',
      timeout: 20_000,
    });
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('body *')).some((element) =>
          Object.keys(element).some((key) => key.startsWith('__reactFiber$')),
        ),
      null,
      { timeout: 20_000 },
    );
    for (const text of entry.waitForTextAbsent ?? []) {
      const transient = page.getByText(text, { exact: true });
      await transient.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      await transient.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    if (requestedPath !== '/login') {
      await page.waitForFunction(
        () =>
          !Array.from(document.querySelectorAll('.animate-pulse')).some((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
          );
          }),
        null,
        { timeout: 30_000 },
      );
    }
    await page.addStyleTag({
      content:
        '*,*::before,*::after{animation-duration:0.001ms!important;animation-delay:0ms!important;transition-duration:0.001ms!important;caret-color:transparent!important}',
    });

    const finalPath = new URL(page.url()).pathname;
    evidence.finalPath = finalPath;
    if (
      entry.captureMode === 'live' &&
      !isExpectedDestination(requestedPath, finalPath)
    ) {
      throw new Error(`Unexpected redirect to ${finalPath}`);
    }

    const masks = [];
    for (const selector of entry.sensitiveSelectors) {
      const locator = page.locator(selector);
      if ((await locator.count()) > 0) masks.push(locator);
    }
    await page.screenshot({
      path: absoluteCapture,
      fullPage: true,
      animations: 'disabled',
      mask: masks,
      maskColor: '#D1D5DB',
    });
    const annotation = await annotateImage({
      inputPath: absoluteCapture,
      outputPath: absoluteAnnotated,
      annotations: entry.annotations,
    });
    evidence.image = {
      width: annotation.width,
      height: annotation.height,
      labels: annotation.labels,
    };

    if (entry.captureMode === 'live' && failedApiRequests.length > 0) {
      throw new Error(
        `${failedApiRequests.length} protected API request(s) failed during capture`,
      );
    }
    if (entry.captureMode === 'live' && consoleErrors.length > 0) {
      throw new Error(`${consoleErrors.length} browser console error(s) during capture`);
    }
    evidence.status = 'captured';
  } catch (error) {
    evidence.failure = error.message;
  } finally {
    await page.close();
  }
  return evidence;
}

export async function captureWeb({
  baseUrl,
  entries,
  outputRoot,
  config,
  password,
}) {
  const { chromium } = requireFromFrontend('playwright');
  const browser = await chromium.launch({ headless: true });
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    baseURL: baseUrl,
    colorScheme: 'light',
  });
  const contexts = new Map([['public', publicContext]]);
  const roleEmail = {
    admin: 'docs.admin@nexora.local',
    shared: 'docs.admin@nexora.local',
    teacher: 'docs.teacher@nexora.local',
    student: 'docs.learner@nexora.local',
  };

  try {
    for (const role of new Set(entries.map((entry) => entry.captureContextRole ?? entry.role))) {
      if (role === 'public' || contexts.has(role)) continue;
      const context = await createAuthenticatedContext(
        browser,
        baseUrl,
        roleEmail[role],
        password,
      );
      contexts.set(role, context);
      if (role === 'admin') contexts.set('shared', context);
    }

    const evidence = [];
    for (const [index, entry] of entries.entries()) {
      process.stdout.write(
        `[${index + 1}/${entries.length}] ${entry.role} ${entry.routes[0]}\n`,
      );
      evidence.push(
        await captureEntry({
          browserContext: contexts.get(entry.captureContextRole ?? entry.role),
          entry,
          baseUrl,
          outputRoot,
          config,
        }),
      );
    }
    return evidence;
  } finally {
    const uniqueContexts = new Set(contexts.values());
    for (const context of uniqueContexts) await context.close();
    await browser.close();
  }
}

async function main() {
  const baseUrl = process.env.NEXORA_DOC_WEB_URL ?? 'http://127.0.0.1:3001';
  const password = process.env.NEXORA_DOC_ACCOUNT_PASSWORD;
  if (!password) throw new Error('NEXORA_DOC_ACCOUNT_PASSWORD is required.');

  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(
    repoRoot,
    path.join(repoRoot, 'output', config.packageName),
  );
  const matrixPath = path.join(path.dirname(scriptPath), 'web-capture-matrix.json');
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const entries = selectCaptureEntries(matrix, {
    ids: parseListArgument('--id'),
    roles: parseListArgument('--role'),
    modes: parseListArgument('--mode'),
  });
  if (entries.length === 0) throw new Error('No web capture entries matched the filters.');

  const metadataPath = path.join(
    outputRoot,
    '08-VISUALS',
    'annotations',
    'web-capture-metadata.json',
  );
  await mkdir(path.dirname(metadataPath), { recursive: true });
  const previous = await readJsonIfPresent(metadataPath, []);
  const captured = await captureWeb({
    baseUrl,
    entries,
    outputRoot,
    config,
    password,
  });
  const capturedIds = new Set(captured.map((entry) => entry.id));
  const merged = [
    ...previous.filter((entry) => !capturedIds.has(entry.id)),
    ...captured,
  ].sort((left, right) => left.id.localeCompare(right.id));
  await writeFile(metadataPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  const failures = captured.filter((entry) => entry.status !== 'captured');
  process.stdout.write(
    `Captured ${captured.length - failures.length}/${captured.length}; metadata: ${metadataPath}\n`,
  );
  if (failures.length > 0) {
    for (const failure of failures) {
      process.stderr.write(`${failure.id}: ${failure.failure}\n`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
