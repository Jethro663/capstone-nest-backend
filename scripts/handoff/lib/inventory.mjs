import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { loadHandoffConfig } from './config.mjs';

const toPosix = (value) => value.split(path.sep).join('/');

async function walkFiles(absoluteDirectory) {
  const results = [];
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkFiles(absolutePath)));
    } else if (entry.isFile()) {
      results.push(absolutePath);
    }
  }

  return results;
}

async function existingFiles(repoRoot, relativeDirectory) {
  return walkFiles(path.join(repoRoot, relativeDirectory));
}

function sourceLine(text, index) {
  return text.slice(0, index).split('\n').length;
}

async function regexEvidence(repoRoot, files, regex, mapMatch) {
  const items = [];

  for (const absoluteFile of files) {
    const text = await readFile(absoluteFile, 'utf8');
    const matcher = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
    for (const match of text.matchAll(matcher)) {
      items.push({
        file: toPosix(path.relative(repoRoot, absoluteFile)),
        line: sourceLine(text, match.index ?? 0),
        ...mapMatch(match),
      });
    }
  }

  return items;
}

function counted(items) {
  return { count: items.length, items };
}

export function nextRouteFromPagePath(pagePath) {
  const withoutPrefix = toPosix(pagePath).replace(/^next-frontend\/app\/?/, '');
  const routeParts = withoutPrefix
    .replace(/\/page\.tsx$/, '')
    .split('/')
    .filter(Boolean)
    .filter((part) => !(part.startsWith('(') && part.endsWith(')')));
  return routeParts.length === 0 ? '/' : `/${routeParts.join('/')}`;
}

function sortByFileLine(items) {
  return items.sort(
    (left, right) =>
      left.file.localeCompare(right.file) || left.line - right.line,
  );
}

async function buildDatabaseInventory(repoRoot) {
  const schemaFiles = (await existingFiles(repoRoot, 'backend/src/drizzle/schema')).filter(
    (file) => file.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(file),
  );
  const tables = sortByFileLine(
    await regexEvidence(
      repoRoot,
      schemaFiles,
      /pgTable\s*\(\s*['"]([^'"]+)['"]/g,
      (match) => ({ name: match[1] }),
    ),
  );
  const enums = sortByFileLine(
    await regexEvidence(
      repoRoot,
      schemaFiles,
      /pgEnum\s*\(\s*['"]([^'"]+)['"]/g,
      (match) => ({ name: match[1] }),
    ),
  );
  const migrationFiles = (await existingFiles(repoRoot, 'backend/drizzle'))
    .filter((file) => /\/[0-9]{4}[^/]*\.sql$/.test(toPosix(file)))
    .map((file) => path.basename(file))
    .sort();

  return {
    tables: counted(tables),
    enums: counted(enums),
    migrationFiles,
  };
}

async function buildBackendInventory(repoRoot) {
  const backendFiles = await existingFiles(repoRoot, 'backend/src');
  const controllerFiles = backendFiles.filter((file) => file.endsWith('.controller.ts'));
  const featureControllers = controllerFiles
    .filter((file) => toPosix(file).includes('/backend/src/modules/'))
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort();
  const featureModules = backendFiles
    .filter(
      (file) =>
        toPosix(file).includes('/backend/src/modules/') &&
        file.endsWith('.module.ts'),
    )
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort();
  const httpHandlers = sortByFileLine(
    await regexEvidence(
      repoRoot,
      controllerFiles,
      /@(Get|Post|Put|Patch|Delete|Options|Head|All)\s*\(/g,
      (match) => ({ decorator: match[1] }),
    ),
  );

  return {
    controllers: counted(
      controllerFiles
        .map((file) => toPosix(path.relative(repoRoot, file)))
        .sort(),
    ),
    featureControllers: counted(featureControllers),
    featureModules: counted(featureModules),
    httpHandlers: counted(httpHandlers),
  };
}

async function buildAiInventory(repoRoot) {
  const files = (await existingFiles(repoRoot, 'ai-service/app')).filter((file) =>
    file.endsWith('.py'),
  );
  const httpHandlers = sortByFileLine(
    await regexEvidence(
      repoRoot,
      files,
      /^\s*@(app|router)\.(get|post|put|patch|delete|options|head)\s*\(/gm,
      (match) => ({ owner: match[1], method: match[2].toUpperCase() }),
    ),
  );

  return {
    sourceFiles: counted(
      files.map((file) => toPosix(path.relative(repoRoot, file))).sort(),
    ),
    httpHandlers: counted(httpHandlers),
  };
}

async function buildWebInventory(repoRoot) {
  const pageFiles = (await existingFiles(repoRoot, 'next-frontend/app')).filter(
    (file) => file.endsWith(`${path.sep}page.tsx`),
  );
  const pages = pageFiles
    .map((file) => {
      const relativePath = toPosix(path.relative(repoRoot, file));
      return { route: nextRouteFromPagePath(relativePath), file: relativePath };
    })
    .sort((left, right) => left.route.localeCompare(right.route));
  const componentFiles = (await existingFiles(repoRoot, 'next-frontend/src/components'))
    .filter(
      (file) =>
        /\.(ts|tsx)$/.test(file) &&
        !/\.(test|spec)\.(ts|tsx)$/.test(file),
    )
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort();

  return {
    pages: counted(pages),
    components: counted(componentFiles),
  };
}

async function buildMobileInventory(repoRoot) {
  const screenFiles = (await existingFiles(repoRoot, 'mobile/src/screens'))
    .filter(
      (file) =>
        file.endsWith('.tsx') &&
        !toPosix(file).includes('/__tests__/') &&
        !/\.(test|spec)\.tsx$/.test(file),
    )
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort();
  const componentFiles = (await existingFiles(repoRoot, 'mobile/src/components'))
    .filter(
      (file) =>
        /\.(ts|tsx)$/.test(file) &&
        !toPosix(file).includes('/__tests__/') &&
        !/\.(test|spec)\.(ts|tsx)$/.test(file) &&
        path.basename(file) !== 'index.ts',
    )
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort();
  const navigatorFile = path.join(
    repoRoot,
    'mobile/src/navigation/AppNavigator.tsx',
  );
  const registrations = sortByFileLine(
    await regexEvidence(
      repoRoot,
      [navigatorFile],
      /<(AuthStack|RootStack|Tab)\.Screen\b/g,
      (match) => ({ navigator: match[1] }),
    ),
  );

  return {
    screenFiles: counted(screenFiles),
    componentFiles: counted(componentFiles),
    jsxScreenRegistrations: counted(registrations),
  };
}

async function buildQueueInventory(repoRoot) {
  const processors = (await existingFiles(repoRoot, 'backend/src'))
    .filter((file) => file.endsWith('.processor.ts'))
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort();
  return { processors: counted(processors) };
}

async function buildConfigurationInventory(repoRoot) {
  const relativeSources = [
    '.env.compose.example',
    'backend/.env.example',
    'mobile/.env.example',
    'ai-service/.env.example',
  ];
  const keys = new Map();

  for (const relativeSource of relativeSources) {
    const text = await readFile(path.join(repoRoot, relativeSource), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line);
      if (!match) continue;
      const sources = keys.get(match[1]) ?? [];
      sources.push(relativeSource);
      keys.set(match[1], sources);
    }
  }

  const items = [...keys.entries()]
    .map(([key, sources]) => ({ key, sources: [...new Set(sources)].sort() }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    exampleFiles: relativeSources,
    uniqueKeys: counted(items),
  };
}

async function buildComposeInventory(repoRoot) {
  const text = await readFile(path.join(repoRoot, 'docker-compose.yml'), 'utf8');
  const lines = text.split(/\r?\n/);
  const services = [];
  let inServices = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === 'services:') {
      inServices = true;
      continue;
    }
    if (inServices && /^[A-Za-z0-9_-]+:\s*$/.test(line)) break;
    if (!inServices) continue;
    const serviceMatch = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (!serviceMatch) continue;

    const block = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[cursor])) break;
      if (/^[A-Za-z0-9_-]+:\s*$/.test(lines[cursor])) break;
      block.push(lines[cursor]);
    }
    services.push({
      name: serviceMatch[1],
      observability: block.some((entry) =>
        /profiles:\s*\[observability\]/.test(entry),
      ),
    });
  }

  return {
    coreServices: services
      .filter((service) => !service.observability)
      .map((service) => service.name),
    observabilityServices: services
      .filter((service) => service.observability)
      .map((service) => service.name),
  };
}

async function buildDeploymentInventory(repoRoot) {
  const workflowFiles = (await existingFiles(repoRoot, '.github/workflows'))
    .filter((file) => /\.ya?ml$/.test(file))
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort();

  return {
    compose: await buildComposeInventory(repoRoot),
    workflowFiles,
    railwayFiles: [
      'backend/railway.json',
      'next-frontend/railway.json',
      '.github/workflows/railway-deploy.yml',
    ],
  };
}

export async function buildInventory(repoRoot) {
  const absoluteRoot = path.resolve(repoRoot);
  const config = await loadHandoffConfig(absoluteRoot);
  const handoffHead = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: absoluteRoot,
    encoding: 'utf8',
  }).trim();

  const [web, mobile, backend, aiService, database, queues, configuration, deployment] =
    await Promise.all([
      buildWebInventory(absoluteRoot),
      buildMobileInventory(absoluteRoot),
      buildBackendInventory(absoluteRoot),
      buildAiInventory(absoluteRoot),
      buildDatabaseInventory(absoluteRoot),
      buildQueueInventory(absoluteRoot),
      buildConfigurationInventory(absoluteRoot),
      buildDeploymentInventory(absoluteRoot),
    ]);

  return {
    identity: {
      packageName: config.packageName,
      applicationCommit: config.applicationCommit,
      handoffHead,
      generatedDate: config.buildDate,
    },
    web,
    mobile,
    backend,
    aiService,
    database,
    queues,
    configuration,
    deployment,
  };
}

function markdownList(items, format) {
  return items.map((item) => `- ${format(item)}`).join('\n');
}

export function inventoryToMarkdown(inventory) {
  const summary = [
    ['Database tables', inventory.database.tables.count],
    ['Database enums', inventory.database.enums.count],
    ['SQL migrations', inventory.database.migrationFiles.length],
    ['Backend controllers', inventory.backend.controllers.count],
    ['Backend HTTP handlers', inventory.backend.httpHandlers.count],
    ['AI HTTP handlers', inventory.aiService.httpHandlers.count],
    ['Web pages', inventory.web.pages.count],
    ['Web components', inventory.web.components.count],
    ['Mobile TSX screen files', inventory.mobile.screenFiles.count],
    ['Mobile component files', inventory.mobile.componentFiles.count],
    ['Mobile JSX screen registrations', inventory.mobile.jsxScreenRegistrations.count],
    ['BullMQ processors', inventory.queues.processors.count],
    ['Unique example environment keys', inventory.configuration.uniqueKeys.count],
  ];

  return [
    '# Nexora Current Source Inventory',
    '',
    `Application snapshot: \`${inventory.identity.applicationCommit}\``,
    '',
    '## Summary',
    '',
    '| Item | Count |',
    '| --- | ---: |',
    ...summary.map(([label, count]) => `| ${label} | ${count} |`),
    '',
    '## Web Pages',
    '',
    markdownList(
      inventory.web.pages.items,
      (page) => `\`${page.route}\` - \`${page.file}\``,
    ),
    '',
    '## Mobile Screen Files',
    '',
    markdownList(inventory.mobile.screenFiles.items, (file) => `\`${file}\``),
    '',
    '## Backend Feature Modules',
    '',
    markdownList(inventory.backend.featureModules.items, (file) => `\`${file}\``),
    '',
    '## Queue Processors',
    '',
    markdownList(inventory.queues.processors.items, (file) => `\`${file}\``),
    '',
    '## Database Migrations',
    '',
    markdownList(inventory.database.migrationFiles, (file) => `\`${file}\``),
    '',
    '## Compose Services',
    '',
    `Core: ${inventory.deployment.compose.coreServices.map((name) => `\`${name}\``).join(', ')}`,
    '',
    `Observability: ${inventory.deployment.compose.observabilityServices.map((name) => `\`${name}\``).join(', ')}`,
    '',
    '## Environment Keys',
    '',
    markdownList(
      inventory.configuration.uniqueKeys.items,
      (entry) => `\`${entry.key}\` - ${entry.sources.map((source) => `\`${source}\``).join(', ')}`,
    ),
    '',
  ].join('\n');
}
