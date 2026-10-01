import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..');
const inventoryPath = path.join(
  repoRoot,
  'output',
  'NEXORA_HANDOFF_2026-10-01',
  '01-MANUALS',
  'sources',
  'inventory.json',
);
const fixturePath = path.join(
  repoRoot,
  'scripts',
  'handoff',
  'demo-data',
  'documentation-fixture.json',
);
const outputPath = path.join(path.dirname(scriptPath), 'web-capture-matrix.json');

function ownerForRoute(route) {
  if (route.startsWith('/dashboard/admin')) return 'admin';
  if (route.startsWith('/dashboard/teacher')) return 'teacher';
  if (route.startsWith('/dashboard/student')) return 'student';
  if (route.startsWith('/dashboard')) return 'shared';
  return 'public';
}

function slugForRoute(route) {
  if (route === '/') return 'public-home';
  return route
    .replaceAll('[', '')
    .replaceAll(']', '')
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function titleForRoute(route) {
  if (route === '/') return 'Nexora landing page';
  const segment = route.split('/').filter(Boolean).at(-1) ?? 'page';
  if (segment.startsWith('[')) return 'Record detail';
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function shouldUseComponentRender(route) {
  return route === '/dashboard/teacher/extractions/[id]';
}

function resolveRoute(route, fixture) {
  if (route === '/dashboard/teacher') return '/dashboard/teacher/dashboard';
  let resolved = route;
  const classId = fixture.classroom.class.id;
  const sectionId = fixture.classroom.section.id;
  const studentId = fixture.accounts.find((account) => account.role === 'student').id;
  const replacements = {
    classId,
    caseId: fixture.intervention.id,
    attemptId: fixture.returnedAttempt.id,
    assignmentId: route.includes('/generated-lessons/')
      ? fixture.intervention.generatedLesson.assignmentId
      : route.includes('/guided-assessment/')
        ? fixture.intervention.guidedAssessment.assignmentId
        : fixture.intervention.assignmentId,
    studentId,
    moduleId: fixture.content.module.id,
    moduleKey: 'idx-0',
    assessmentKey: 'idx-0',
    announcementKey: 'idx-0',
    lessonKey: 'm0-s0-i0',
    fileId: fixture.fileArtifact.file.id,
    token: '__LESSON_PREVIEW_TOKEN__',
    id: route.includes('/class-templates/')
      ? fixture.classTemplate.id
      : route.includes('/extractions/')
        ? fixture.fileArtifact.extraction.id
        : route.includes('/assessments/')
      ? fixture.assessment.id
      : route.includes('/lessons/')
        ? fixture.content.id
        : route.includes('/sections/')
          ? sectionId
          : route.includes('/users/')
            ? studentId
            : classId,
  };
  for (const [parameter, value] of Object.entries(replacements)) {
    resolved = resolved.replaceAll(`[${parameter}]`, value);
  }
  if (route === '/dashboard/admin/sections/[id]/students') {
    return `${resolved}/add`;
  }
  return resolved;
}

function annotationsForRoute(route, role) {
  if (route === '/dashboard/student') {
    return [
      {
        number: 1,
        xPercent: 52,
        yPercent: 26,
        label: 'Read the first-login guide before using the learner dashboard',
      },
    ];
  }
  if (role === 'public') {
    return [
      {
        number: 1,
        xPercent: 50,
        yPercent: 21,
        label: 'Start with the page title and primary account action',
      },
    ];
  }
  return [
    {
      number: 1,
      xPercent: 29,
      yPercent: 17,
      label: 'Confirm the page heading before beginning the task',
    },
  ];
}

export function buildWebCaptureMatrix(inventory, fixture) {
  return inventory.web.pages.items.map((page) => {
    const role = ownerForRoute(page.route);
    const captureMode = shouldUseComponentRender(page.route)
      ? 'component-render'
      : 'live';
    return {
      id: slugForRoute(page.route),
      routes: [page.route],
      sourceFile: page.file,
      role,
      captureContextRole: page.route.startsWith('/lesson-preview/') ? 'teacher' : role,
      captureMode,
      capturePath: resolveRoute(page.route, fixture),
      captureSetup: page.route.startsWith('/lesson-preview/')
        ? { type: 'lesson-preview-session', lessonId: fixture.content.id }
        : page.route === '/dashboard/teacher/extractions/[id]'
          ? { type: 'extraction-component-state' }
          : null,
      viewport: { width: 1440, height: 900 },
      expectedSelector: role === 'public' ? 'body' : 'main',
      waitForTextAbsent: page.route === '/dashboard/admin/class-templates/[id]'
        ? ['Loading template...']
        : [],
      expectedEvidence: `${titleForRoute(page.route)} rendered from the locked application snapshot`,
      sensitiveSelectors: [
        'input[type="password"]',
        '[data-sensitive="true"]',
        '[data-testid*="token"]',
      ],
      annotations: annotationsForRoute(page.route, role),
      imagePurpose: `Show a first-year reader where to begin on ${page.route}.`,
      manualChapter:
        role === 'public'
          ? 'Access and account setup'
          : role === 'shared'
            ? 'Shared workspace tools'
            : `${role.charAt(0).toUpperCase() + role.slice(1)} workflows`,
      classification: 'SYNTHETIC_DOCUMENTATION_ONLY',
    };
  });
}

async function main() {
  const [inventory, fixture] = await Promise.all([
    readFile(inventoryPath, 'utf8').then(JSON.parse),
    readFile(fixturePath, 'utf8').then(JSON.parse),
  ]);
  const matrix = buildWebCaptureMatrix(inventory, fixture);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  process.stdout.write(`Generated ${matrix.length} web capture owners at ${outputPath}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
