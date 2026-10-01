import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManualCoverage,
  DOCUMENT_DEFAULT_PARAGRAPH,
  humanizeRoute,
  imageParagraphOptions,
  SYSTEM_CONTENTS,
  USER_CONTENTS,
  workflowForRoute,
} from '../generate-manuals.mjs';

const testPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testPath), '../../..');

test('manual coverage matches every locked inventory surface', async () => {
  const coverage = await buildManualCoverage(repoRoot);

  assert.equal(coverage.webPages, 114);
  assert.equal(coverage.webEvidence, 114);
  assert.equal(coverage.mobileOwners, 25);
  assert.equal(coverage.mobileEvidence, 25);
  assert.equal(coverage.backendModules, 43);
  assert.equal(coverage.backendHandlers, 485);
  assert.equal(coverage.aiHandlers, 63);
  assert.equal(coverage.databaseTables, 116);
  assert.equal(coverage.databaseEnums, 55);
  assert.equal(coverage.migrations, 37);
  assert.equal(coverage.queues, 9);
  assert.equal(coverage.environmentKeys, 98);
  assert.deepEqual(coverage.missingWebEvidence, []);
  assert.deepEqual(coverage.missingMobileEvidence, []);
});

test('route helpers produce beginner-facing instructions', () => {
  assert.equal(humanizeRoute('/dashboard/admin/class-templates/[id]'), 'Class Templates - selected item');
  const workflow = workflowForRoute('/dashboard/admin/system-reset', 'admin');
  assert.match(workflow.steps.join(' '), /preview/i);
  assert.match(workflow.doneWhen, /evidence|confirmation|result/i);
  assert.match(workflow.ifStuck, /refresh|administrator|stop/i);
});

test('image paragraphs allow the full screenshot height to render', () => {
  const options = imageParagraphOptions('center');

  assert.deepEqual(options.spacing, { after: 90 });
  assert.equal('line' in options.spacing, false);
  assert.equal('line' in DOCUMENT_DEFAULT_PARAGRAPH.spacing, false);
});

test('manuals use dependable static contents guides', () => {
  assert.deepEqual(USER_CONTENTS, [
    'How to use this book',
    'Mobile workspace guide',
    'Complete web screen guide',
    'Glossary',
  ]);
  assert.equal(SYSTEM_CONTENTS.length, 14);
  assert.equal(SYSTEM_CONTENTS[0], '1. System at a glance');
  assert.equal(SYSTEM_CONTENTS.at(-1), '14. Incident checklist');
});
