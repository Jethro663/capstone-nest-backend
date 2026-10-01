import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyFixtureToIdentityMap,
  collectFixtureIdentities,
} from '../demo-data/seed-documentation-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  here,
  '../demo-data/documentation-fixture.json',
);

const requiredCategories = [
  'roles',
  'accounts',
  'academicState',
  'classroom',
  'content',
  'classTemplate',
  'fileArtifact',
  'assessment',
  'returnedAttempt',
  'classRecord',
  'report',
  'performance',
  'intervention',
  'evaluation',
  'announcement',
  'calendarEvent',
  'notification',
  'auditRecord',
  'systemSettings',
  'lifecycle',
  'maintenance',
  'mobileRelease',
];

test('fixture covers every manual and capture category', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));

  assert.equal(fixture.classification, 'SYNTHETIC_DOCUMENTATION_ONLY');
  assert.equal(fixture.schoolYear, '2026-2027');
  assert.equal(fixture.quarter, 'Q1');

  for (const category of requiredCategories) {
    assert.ok(fixture[category], `Missing fixture category: ${category}`);
  }

  assert.deepEqual(
    [...new Set(fixture.accounts.map((account) => account.role))].sort(),
    ['admin', 'student', 'teacher'],
  );
  assert.equal(fixture.returnedAttempt.isReturned, true);
  assert.ok(fixture.content.module?.id, 'Missing documentation class module');
  assert.ok(fixture.content.blockId, 'Missing documentation lesson content block');
  assert.ok(fixture.content.module?.section?.id, 'Missing documentation module section');
  assert.equal(
    fixture.content.module?.section?.item?.lessonId,
    fixture.content.id,
    'Documentation module item must expose the fixture lesson',
  );
  assert.ok(fixture.classTemplate?.id, 'Missing documentation class template');
  assert.ok(fixture.classTemplate?.module?.section?.items?.length >= 2);
  assert.ok(fixture.fileArtifact?.file?.id, 'Missing synthetic teaching file');
  assert.ok(fixture.fileArtifact?.extraction?.id, 'Missing synthetic extraction');
  assert.equal(
    fixture.fileArtifact?.moduleItem?.fileId,
    fixture.fileArtifact?.file?.id,
    'Documentation module file item must expose the synthetic teaching file',
  );
  assert.ok(fixture.intervention?.generatedLesson?.assignmentId);
  assert.ok(fixture.intervention?.guidedAssessment?.assignmentId);
  assert.ok(fixture.classRecord.scores.length >= 2);
  assert.ok(fixture.performance.snapshots.length >= 2);
  assert.equal(fixture.mobileRelease.platform, 'android');
  assert.equal(fixture.mobileRelease.versionCode, 57);
  assert.equal(fixture.mobileRelease.minSupportedVersionCode, 1);
  assert.equal(fixture.mobileRelease.requiresFullApk, false);
});

test('fixture identities remain stable when applied twice', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const expected = collectFixtureIdentities(fixture);
  const store = new Map();

  applyFixtureToIdentityMap(store, fixture);
  const first = [...store.entries()].sort();
  applyFixtureToIdentityMap(store, fixture);

  assert.deepEqual([...store.entries()].sort(), first);
  assert.equal(store.size, expected.size);
  assert.deepEqual(new Set(store.values()), expected);
});

test('demo-data instructions use environment variables and contain no password', async () => {
  const readme = await readFile(
    path.resolve(here, '../demo-data/README.txt'),
    'utf8',
  );

  assert.match(readme, /NEXORA_DOC_DATABASE_URL/);
  assert.match(readme, /NEXORA_DOC_ACCOUNT_PASSWORD/);
  assert.doesNotMatch(readme, /postgres:\/\/[^:\s]+:[^@\s]+@/);
  assert.doesNotMatch(readme, /Password\s*:\s*\S+/i);
  assert.match(readme, /synthetic/i);
});
