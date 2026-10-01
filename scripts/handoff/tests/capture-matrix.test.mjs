import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const inventoryPath = path.join(
  repoRoot,
  'output',
  'NEXORA_HANDOFF_2026-10-01',
  '01-MANUALS',
  'sources',
  'inventory.json',
);
const matrixPath = path.join(
  repoRoot,
  'scripts',
  'handoff',
  'capture',
  'web-capture-matrix.json',
);

test('every current web page has one capture owner', async () => {
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const pages = inventory.web.pages.items.map((page) => page.route);
  const owners = new Map();

  for (const entry of matrix) {
    for (const route of entry.routes) {
      owners.set(route, [...(owners.get(route) ?? []), entry.id]);
    }
  }

  assert.deepEqual(
    pages.filter((route) => !owners.has(route)),
    [],
  );
  assert.deepEqual(
    [...owners].filter(([, ownerIds]) => ownerIds.length !== 1),
    [],
  );
  assert.deepEqual(
    [...owners.keys()].filter((route) => !pages.includes(route)),
    [],
  );
});

test('capture entries contain reproducible evidence metadata', async () => {
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const allowedRoles = new Set(['public', 'admin', 'teacher', 'student', 'shared']);
  const allowedModes = new Set(['live', 'component-render']);

  assert.ok(matrix.length > 0);
  for (const entry of matrix) {
    assert.ok(entry.id);
    assert.ok(entry.sourceFile?.endsWith('page.tsx'));
    assert.ok(allowedRoles.has(entry.role));
    assert.ok(allowedModes.has(entry.captureMode));
    assert.ok(entry.routes.length > 0);
    assert.ok(entry.manualChapter);
    assert.ok(entry.imagePurpose);
    assert.ok(Array.isArray(entry.sensitiveSelectors));
    assert.ok(Array.isArray(entry.annotations));
    assert.ok(Number.isInteger(entry.viewport?.width));
    assert.ok(Number.isInteger(entry.viewport?.height));
    if (entry.captureMode === 'live') {
      assert.ok(entry.capturePath.startsWith('/'));
      assert.doesNotMatch(entry.capturePath, /\[[^\]]+\]/);
      assert.ok(entry.expectedEvidence);
    }
  }
});

test('known live routes use their real documentation fixture destinations', async () => {
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const byRoute = new Map(matrix.map((entry) => [entry.routes[0], entry]));

  assert.equal(
    byRoute.get('/dashboard/admin/sections/[id]/students')?.capturePath,
    '/dashboard/admin/sections/10000000-0000-4000-8000-000000000301/students/add',
  );

  for (const route of [
    '/dashboard/student/classes/[id]/modules/[moduleId]',
    '/dashboard/teacher/classes/[id]/modules/[moduleId]',
  ]) {
    const entry = byRoute.get(route);
    assert.equal(entry?.captureMode, 'live');
    assert.match(entry?.capturePath ?? '', /10000000-0000-4000-8000-000000000402/);
  }

  const fixtureBackedRoutes = new Map([
    ['/dashboard/admin/class-templates/[id]', '10000000-0000-4000-8000-000000001401'],
    ['/dashboard/admin/class-templates/[id]/modules/[moduleKey]', 'idx-0'],
    ['/dashboard/admin/class-templates/[id]/assessments/[assessmentKey]/edit', 'idx-0'],
    ['/dashboard/admin/class-templates/[id]/lessons/[lessonKey]/edit', 'm0-s0-i0'],
    ['/dashboard/admin/class-templates/[id]/announcements/[announcementKey]/edit', 'idx-0'],
    ['/dashboard/admin/class-templates/[id]/announcements/new', '/new'],
    ['/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]', '10000000-0000-4000-8000-000000001501'],
    ['/dashboard/student/lxp/[classId]/generated-lessons/[assignmentId]', '10000000-0000-4000-8000-000000001602'],
    ['/dashboard/student/lxp/[classId]/guided-assessment/[assignmentId]', '10000000-0000-4000-8000-000000001604'],
    ['/complete-profile', '/complete-profile'],
    ['/lesson-preview/[token]', '__LESSON_PREVIEW_TOKEN__'],
  ]);
  for (const [route, expectedPathPart] of fixtureBackedRoutes) {
    const entry = byRoute.get(route);
    assert.equal(entry?.captureMode, 'live', `${route} should be captured live`);
    assert.match(entry?.capturePath ?? '', new RegExp(expectedPathPart));
  }
  const extraction = byRoute.get('/dashboard/teacher/extractions/[id]');
  assert.equal(extraction?.captureMode, 'component-render');
  assert.equal(extraction?.captureSetup?.type, 'extraction-component-state');
  assert.match(extraction?.capturePath ?? '', /10000000-0000-4000-8000-000000001503/);
});
