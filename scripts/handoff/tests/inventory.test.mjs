import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInventory, nextRouteFromPagePath } from '../lib/inventory.mjs';

test('converts Next app page paths to reader-facing routes', () => {
  assert.equal(
    nextRouteFromPagePath(
      'next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx',
    ),
    '/dashboard/teacher/classes/[id]',
  );
  assert.equal(
    nextRouteFromPagePath('next-frontend/app/(auth)/login/page.tsx'),
    '/login',
  );
  assert.equal(nextRouteFromPagePath('next-frontend/app/page.tsx'), '/');
});

test('inventory includes every required subsystem at the locked snapshot', async () => {
  const inventory = await buildInventory(process.cwd());

  for (const key of [
    'identity',
    'web',
    'mobile',
    'backend',
    'aiService',
    'database',
    'queues',
    'configuration',
    'deployment',
  ]) {
    assert.ok(inventory[key], `missing ${key}`);
  }

  assert.equal(inventory.database.tables.count, 116);
  assert.equal(inventory.database.enums.count, 55);
  assert.equal(inventory.database.migrationFiles.length, 37);
  assert.equal(
    inventory.database.migrationFiles.at(-1),
    '0036_mobile_release_reset_compatibility.sql',
  );

  assert.equal(inventory.backend.featureModules.count, 43);
  assert.equal(inventory.backend.featureControllers.count, 44);
  assert.equal(inventory.backend.httpHandlers.count, 485);
  assert.equal(inventory.aiService.httpHandlers.count, 63);
  assert.equal(inventory.web.pages.count, 114);
  assert.equal(inventory.web.components.count, 138);
  assert.equal(inventory.mobile.screenFiles.count, 100);
  assert.equal(inventory.mobile.componentFiles.count, 53);
  assert.equal(inventory.mobile.jsxScreenRegistrations.count, 138);
  assert.equal(inventory.queues.processors.count, 9);
  assert.equal(inventory.configuration.uniqueKeys.count, 98);
  assert.equal(inventory.deployment.compose.coreServices.length, 6);
  assert.equal(inventory.deployment.compose.observabilityServices.length, 8);
});

test('inventory lists are sorted and contain source evidence', async () => {
  const inventory = await buildInventory(process.cwd());

  assert.deepEqual(
    inventory.web.pages.items,
    [...inventory.web.pages.items].sort((left, right) =>
      left.route.localeCompare(right.route),
    ),
  );
  assert.ok(
    inventory.backend.httpHandlers.items.every(
      (handler) => handler.file && handler.decorator && handler.line > 0,
    ),
  );
  assert.ok(
    inventory.configuration.uniqueKeys.items.every(
      (entry) => entry.key && entry.sources.length > 0,
    ),
  );
});
