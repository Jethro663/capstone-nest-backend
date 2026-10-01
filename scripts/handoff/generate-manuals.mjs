import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), '../..');
const NAVY = '0C1D3A';
const RED = 'DC2626';
const RED_DARK = 'B91C1C';
const RED_SOFT = 'FEE2E2';
const WHITE = 'FFFFFF';
const INK = '101828';
const MUTED = '475467';
const BORDER = 'D9D9D9';
const PALE = 'F7F8FA';

export const USER_CONTENTS = [
  'How to use this book',
  'Mobile workspace guide',
  'Complete web screen guide',
  'Glossary',
];

export const SYSTEM_CONTENTS = [
  '1. System at a glance',
  '2. First run from an external drive',
  '3. Local development',
  '4. Security and request flow',
  '5. Deployment and release',
  '6. Backup, restore, and disaster recovery',
  '7. Backend module catalog',
  '8. Backend HTTP handler index',
  '9. AI service handler index',
  '10. Queue processors',
  '11. Database catalog',
  '12. Configuration reference',
  '13. Client source catalogs',
  '14. Incident checklist',
];

export const DOCUMENT_DEFAULT_PARAGRAPH = { spacing: { after: 90 } };

const MODULE_DESCRIPTIONS = {
  'academic-grading': 'Calculates and records official period and annual grading evidence, including revisions, remediation, and source selection.',
  'academic-policy': 'Owns the school-year and grading-period rules that decide whether academic work may be prepared, edited, released, or finalized.',
  'academic-readiness': 'Evaluates learner and class evidence before release, completion, transition, or remediation decisions.',
  'academic-state': 'Publishes the backend-authoritative current school year, period, lifecycle state, and related capability decisions.',
  'admin-demo-mode': 'Provides a controlled demonstration state for administrators without turning demonstration behavior into production authority.',
  'admin-lifecycle': 'Previews and executes governed archive, cleanup, and lifecycle actions while preserving impact and audit evidence.',
  'admin-maintenance': 'Controls reauthenticated maintenance sessions and high-impact administrator operations.',
  admin: 'Aggregates administrator-facing capabilities, summaries, and management endpoints.',
  'ai-mentor': 'Accepts authenticated AI-assistance requests, creates durable jobs where needed, and proxies only to the internal AI service.',
  analytics: 'Builds role-scoped usage, learning, and operational summaries from authoritative backend data.',
  announcements: 'Creates, targets, schedules, publishes, and tracks school or class announcements.',
  'app-version': 'Publishes mobile build policy, update eligibility, download metadata, and integrity requirements.',
  assessments: 'Owns assessment authoring, assignment, attempts, scoring, review, release, and result history.',
  audit: 'Stores and retrieves immutable evidence of consequential actions and security-relevant events.',
  auth: 'Validates credentials, issues and rotates sessions, applies account-state rules, and supports secure recovery.',
  'class-record': 'Maintains the official class workbook, score evidence, exceptions, calculations, and release readiness.',
  'class-templates': 'Lets authorized staff prepare reusable class structures and import or export template definitions.',
  classes: 'Owns class identity, membership, teacher assignment, status, and class-level views.',
  'content-modules': 'Organizes course modules, ordering, publication state, and lesson relationships.',
  'discussion-board': 'Runs moderated class discussions, comments, attachments, reactions, reports, and publication state.',
  'file-upload': 'Validates uploaded teaching files, records ownership, and schedules extraction or indexing work.',
  storage: 'Provides the storage-driver boundary for local files or S3-compatible object storage.',
  health: 'Reports liveness, readiness, dependency status, and operational diagnostics.',
  ja: 'Coordinates JA guidance, review, learner support, and AI-assisted study interactions.',
  lessons: 'Owns lesson content, publication, preview access, completion evidence, and delivery metadata.',
  lxp: 'Builds personalized learning paths and learner-facing experience data from approved content and evidence.',
  mail: 'Sends account, recovery, verification, and workflow email through the configured mail transport.',
  'mobile-workspace': 'Returns compact, role-specific mobile dashboard, calendar, and library projections.',
  notifications: 'Creates in-app notifications and safely fans out push or workflow alerts.',
  otp: 'Issues and validates short-lived verification codes with rate and expiry controls.',
  performance: 'Computes learner performance signals, intervention candidates, and restart-safe recomputation jobs.',
  profiles: 'Owns user profile completion, personal data, and role-safe self-service updates.',
  rag: 'Coordinates retrieval indexing and source-grounded context used by assistive AI flows.',
  reports: 'Builds authorized operational and academic reports for review or export.',
  roles: 'Defines and resolves role records used by backend authorization.',
  'roster-import': 'Validates roster files, previews impact, and performs controlled account or enrollment imports.',
  'school-events': 'Stores and delivers school calendar events and role-scoped schedules.',
  sections: 'Owns section identity, membership, advisers, schedules, and class relationships.',
  'system-capabilities': 'Consolidates backend-owned feature availability and dependency readiness for clients.',
  'system-reset': 'Previews and coordinates protected reset workflows with allowlists, reauthentication, queues, and audit evidence.',
  'teacher-profiles': 'Stores teacher-specific professional profile data and assignments.',
  teacher: 'Provides teacher dashboard, class, learner, and workflow projections.',
  users: 'Creates, reads, updates, archives, and searches user accounts under role and lifecycle policy.',
};

const ENV_HELP = [
  [/SECRET|PASSWORD|TOKEN|API_KEY/, 'Secret credential. Generate a unique value, store it outside source control, and rotate it after exposure.'],
  [/DATABASE_URL|DB_/, 'Database connection or database setting. Keep backend and AI database targets aligned with the intended environment.'],
  [/REDIS|QUEUE|BULL/, 'Redis or background-job setting. Required for restart-safe asynchronous work.'],
  [/AI_|OLLAMA|MODEL|EMBED/, 'AI runtime, model, retrieval, or timeout setting. The backend remains the public boundary.'],
  [/AWS_|S3_|STORAGE|BUCKET/, 'File/object-storage setting. Required when the selected storage driver uses S3-compatible storage.'],
  [/NEXT_PUBLIC_|FRONTEND|CORS|DOMAIN|URL/, 'Public URL, browser origin, or client build-time setting. Confirm HTTPS and allowed origins in production.'],
  [/EXPO_PUBLIC_|ANDROID|IOS|EAS/, 'Mobile build, runtime, or release setting. Public Expo values must never contain secrets.'],
  [/SMTP|EMAIL|MAIL|OTP/, 'Email or verification delivery setting. Test delivery before onboarding real users.'],
  [/ADMIN_|MAINTENANCE|RESET|ERASE|LIFECYCLE/, 'High-impact administrator feature flag or safety control. Enable only with the documented preview and audit workflow.'],
  [/OTEL|PROM|GRAFANA|LOKI|TEMPO|LOG/, 'Observability setting for logs, metrics, or traces. It is optional for core Compose unless stated otherwise.'],
];

function extractItems(value) {
  if (Array.isArray(value)) return value;
  return value?.items ?? [];
}

function extractCount(value) {
  return value?.count ?? extractItems(value).length;
}

function slugFromModule(file) {
  return path.basename(file).replace(/\.module\.ts$/, '');
}

function titleCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function humanizeRoute(route) {
  if (route === '/') return 'Public home';
  const parts = route.split('/').filter(Boolean);
  const last = parts.at(-1) ?? 'home';
  if (/^\[.+\]$/.test(last)) {
    return `${titleCase(parts.at(-2) ?? 'item')} - selected item`;
  }
  return titleCase(last);
}

function primaryActionForRoute(route) {
  if (/system-reset|maintenance|lifecycle|year-transition|archive|delete/.test(route)) return 'Preview the impact, read every blocker, reauthenticate, and confirm only when the evidence is correct.';
  if (/new|create|add|import|upload|editor|edit/.test(route)) return 'Complete every required field, review the summary, then save or publish once.';
  if (/report|analytics|audit|record|grade|performance|transcript/.test(route)) return 'Choose the correct scope and filters, inspect the evidence, then export or record the result if needed.';
  if (/assessment/.test(route)) return 'Choose the class and assessment state, open the intended item, then author, take, review, or grade as permitted.';
  if (/class|section|student|teacher|user/.test(route)) return 'Search for the correct person or class, open it, and use only the actions shown for your role.';
  if (/calendar|announcement|event/.test(route)) return 'Choose the relevant date or audience, open the item, and verify its schedule or publication state.';
  if (/chatbot|tutor|ja|lxp|ai/.test(route)) return 'Choose an approved class or source, ask one focused question, and review AI output before applying it.';
  return 'Read the page heading and current state, choose the intended item, and use the primary action shown on screen.';
}

export function workflowForRoute(route, role) {
  const roleName = role === 'public' ? 'visitor' : role;
  const highImpact = /system-reset|maintenance|lifecycle|year-transition|archive|delete/.test(route);
  return {
    steps: [
      role === 'public' ? 'Open the Nexora address supplied by the school.' : `Sign in with an active ${roleName} account.`,
      `Open ${humanizeRoute(route)} from the visible navigation or its parent workspace.`,
      primaryActionForRoute(route),
      highImpact ? 'Stop if the preview, blockers, or affected records differ from the intended scope.' : 'Wait for the success state, then refresh once to confirm the saved result.',
    ],
    doneWhen: highImpact
      ? 'The preview, confirmation, resulting state, and audit evidence agree.'
      : 'The expected page state or saved result remains correct after refresh.',
    ifStuck: highImpact
      ? 'Stop. Save the blocker text and ask an administrator to verify policy and readiness before retrying.'
      : 'Check the account role, internet connection, selected school year/class, and visible error. Refresh once; do not repeat a write action blindly.',
  };
}

function environmentPurpose(key) {
  return ENV_HELP.find(([pattern]) => pattern.test(key))?.[1]
    ?? 'Runtime configuration. Keep the value environment-specific and document who owns it.';
}

function moduleDescription(file) {
  const slug = slugFromModule(file);
  return MODULE_DESCRIPTIONS[slug] ?? `Owns the ${titleCase(slug)} backend capability and its durable API behavior.`;
}

export function imageParagraphOptions(alignment) {
  return { alignment, spacing: { after: 90 } };
}

function moduleKeyword(slug) {
  const aliases = {
    auth: 'login', users: 'users', roles: 'users', profiles: 'profile', 'teacher-profiles': 'profile',
    classes: 'classes', sections: 'sections', assessments: 'assessments', lessons: 'lessons',
    'content-modules': 'modules', announcements: 'announcements', 'school-events': 'calendar',
    audit: 'audit', reports: 'reports', analytics: 'analytics', performance: 'performance',
    'class-record': 'class-record', 'class-templates': 'class-templates', 'roster-import': 'roster',
    'system-reset': 'system-reset', 'system-capabilities': 'diagnostics', health: 'diagnostics',
    'admin-maintenance': 'maintenance', 'admin-lifecycle': 'lifecycle', 'academic-state': 'academic',
    'academic-grading': 'academic-records', 'academic-policy': 'academic', 'academic-readiness': 'readiness',
    'ai-mentor': 'chatbot', ja: 'ja', lxp: 'lxp', rag: 'library', 'file-upload': 'library',
    storage: 'library', notifications: 'notifications', mail: 'settings', otp: 'forgot-password',
    'mobile-workspace': 'dashboard', 'app-version': 'settings', 'discussion-board': 'discussion',
    teacher: 'teacher', admin: 'admin', 'admin-demo-mode': 'admin',
  };
  return aliases[slug] ?? slug;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function loadManualData(repoRoot = defaultRepoRoot) {
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(repoRoot, path.join(repoRoot, 'output', config.packageName));
  const inventory = await readJson(path.join(outputRoot, '01-MANUALS', 'sources', 'inventory.json'));
  const webMatrix = await readJson(path.join(repoRoot, 'scripts/handoff/capture/web-capture-matrix.json'));
  const mobileMatrix = await readJson(path.join(repoRoot, 'scripts/handoff/capture/mobile-capture-matrix.json'));
  const webMetadata = await readJson(path.join(outputRoot, '08-VISUALS/annotations/web-capture-metadata.json'));
  const mobileMetadata = await readJson(path.join(outputRoot, '08-VISUALS/annotations/mobile-capture-metadata.json'));
  return { config, outputRoot, inventory, webMatrix, mobileMatrix, webMetadata, mobileMetadata };
}

export async function buildManualCoverage(repoRoot = defaultRepoRoot) {
  const data = await loadManualData(repoRoot);
  const webIds = new Set(data.webMetadata.filter((entry) => entry.status === 'captured').map((entry) => entry.id));
  const mobileIds = new Set(data.mobileMetadata.filter((entry) => entry.status === 'captured').map((entry) => entry.id));
  return {
    webPages: extractCount(data.inventory.web.pages),
    webEvidence: webIds.size,
    mobileOwners: data.mobileMatrix.length,
    mobileEvidence: mobileIds.size,
    backendModules: extractCount(data.inventory.backend.featureModules),
    backendHandlers: extractCount(data.inventory.backend.httpHandlers),
    aiHandlers: extractCount(data.inventory.aiService.httpHandlers),
    databaseTables: extractCount(data.inventory.database.tables),
    databaseEnums: extractCount(data.inventory.database.enums),
    migrations: data.inventory.database.migrationFiles.length,
    queues: extractCount(data.inventory.queues.processors),
    environmentKeys: extractCount(data.inventory.configuration.uniqueKeys),
    missingWebEvidence: data.webMatrix.filter((entry) => !webIds.has(entry.id)).map((entry) => entry.id),
    missingMobileEvidence: data.mobileMatrix.filter((entry) => !mobileIds.has(entry.id)).map((entry) => entry.id),
  };
}

function loadDocumentLibrary() {
  const localRequire = createRequire(import.meta.url);
  try {
    return localRequire('docx');
  } catch {
    const modules = process.env.NEXORA_WORKSPACE_NODE_MODULES;
    if (!modules) throw new Error('Set NEXORA_WORKSPACE_NODE_MODULES to the bundled workspace node_modules path.');
    return createRequire(path.join(modules, 'package.json'))('docx');
  }
}

function webEvidenceMap(data) {
  return new Map(data.webMetadata.map((entry) => [entry.id, entry]));
}

function mobileEvidenceMap(data) {
  return new Map(data.mobileMetadata.map((entry) => [entry.id, entry]));
}

function roleLabel(role) {
  return ({ public: 'Everyone', student: 'Learner', teacher: 'Teacher', admin: 'Administrator', shared: 'All roles' })[role] ?? titleCase(role);
}

function routeMarkdown(data, entry, evidence) {
  const workflow = workflowForRoute(entry.routes[0], entry.role);
  const image = `../../${evidence.captureFile}`;
  return [
    `### ${humanizeRoute(entry.routes[0])}`,
    '',
    `**Role:** ${roleLabel(entry.role)}  `,
    `**Web path:** \`${entry.routes.join('`, `')}\`  `,
    `**Purpose:** ${entry.expectedEvidence}`,
    '',
    `![${humanizeRoute(entry.routes[0])}](${image})`,
    '',
    '**Do this**',
    '',
    ...workflow.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `**Done when:** ${workflow.doneWhen}`,
    '',
    `**If stuck:** ${workflow.ifStuck}`,
    '',
    `**Behind the screen:** \`${entry.sourceFile}\` at application snapshot \`${data.config.applicationCommit}\`.`,
    '',
  ].join('\n');
}

function mobileMarkdown(entry, evidence) {
  const image = `../../${evidence.captureFile}`;
  return [
    `### ${entry.title}`,
    '',
    `**Role:** ${roleLabel(entry.role)}  `,
    `**Covers mobile routes:** \`${entry.routes.join('`, `')}\``,
    '',
    `![${entry.title}](${image})`,
    '',
    entry.caption,
    '',
    '**Read the screen in this order:** page title, current state, main card or form, primary action, then success/error feedback.',
    '',
  ].join('\n');
}

async function buildUserMarkdown(data) {
  const webEvidence = webEvidenceMap(data);
  const mobileEvidence = mobileEvidenceMap(data);
  const lines = [
    '# Nexora User Manual',
    '',
    `**Handoff edition:** ${data.config.buildDate}  `,
    `**Application snapshot:** \`${data.config.applicationCommit}\`  `,
    '**Audience:** first-year IT students, school administrators, teachers, learners, and future maintainers.',
    '',
    'This book explains what every current web page and mobile route family is for, what to do, what success looks like, and where the implementation lives. All screenshots use synthetic documentation-only data.',
    '',
    '## How to use this book',
    '',
    '1. Start with the role chapter that matches the account you are using.',
    '2. Follow the numbered steps beside the screenshot.',
    '3. Stop on permission, policy, maintenance, or data-impact blockers; do not bypass them.',
    '4. Use the system manual for installation, deployment, backup, architecture, and source-level ownership.',
    '',
    '## Mobile workspace guide',
    '',
  ];
  for (const role of ['public', 'student', 'teacher', 'admin', 'shared']) {
    lines.push(`## ${roleLabel(role)} mobile screens`, '');
    for (const entry of data.mobileMatrix.filter((item) => item.role === role)) {
      lines.push(mobileMarkdown(entry, mobileEvidence.get(entry.id)));
    }
  }
  lines.push('## Complete web screen guide', '');
  const roles = ['public', 'student', 'teacher', 'admin'];
  for (const role of roles) {
    lines.push(`## ${roleLabel(role)} web screens`, '');
    const chapters = Map.groupBy(data.webMatrix.filter((entry) => entry.role === role), (entry) => entry.manualChapter);
    for (const [chapter, entries] of chapters) {
      lines.push(`## ${chapter}`, '');
      for (const entry of entries) lines.push(routeMarkdown(data, entry, webEvidence.get(entry.id)));
    }
  }
  return `${lines.join('\n')}\n`;
}

function groupHandlersByFile(value) {
  const grouped = new Map();
  for (const item of extractItems(value)) {
    const list = grouped.get(item.file) ?? [];
    list.push(item);
    grouped.set(item.file, list);
  }
  return grouped;
}

async function buildSystemMarkdown(data) {
  const inventory = data.inventory;
  const lines = [
    '# Nexora System Manual', '',
    `**Handoff edition:** ${data.config.buildDate}  `,
    `**Application snapshot:** \`${data.config.applicationCommit}\``, '',
    'This book is the source-of-truth reference for architecture, setup, local execution, deployment, configuration, security boundaries, backup/recovery, modules, APIs, queues, database objects, clients, and troubleshooting.', '',
    '## System at a glance', '',
    `- ${extractCount(inventory.backend.featureModules)} backend modules and ${extractCount(inventory.backend.httpHandlers)} HTTP handlers`,
    `- ${extractCount(inventory.aiService.httpHandlers)} AI service handlers`,
    `- ${extractCount(inventory.database.tables)} database tables, ${extractCount(inventory.database.enums)} enums, and ${inventory.database.migrationFiles.length} migrations`,
    `- ${extractCount(inventory.web.pages)} web pages and ${extractCount(inventory.mobile.screenFiles)} mobile screen files`,
    `- ${extractCount(inventory.queues.processors)} queue processors and ${extractCount(inventory.configuration.uniqueKeys)} configuration keys`, '',
    '![System architecture](../../07-DIAGRAMS/01-system-architecture.png)', '',
    '## First run from the external drive', '',
    '1. Copy the whole `NEXORA_HANDOFF_2026-10-01` folder to a local SSD; do not run databases directly from removable media.',
    '2. Install Git, Docker Desktop or Docker Engine with Compose, Node.js 22 LTS, Python 3.11+, and Android Studio only if rebuilding the APK.',
    '3. Read `README-FIRST.txt`, then open `START-HERE.html`.',
    '4. Copy the supplied environment templates into a private working folder and replace every placeholder secret.',
    '5. From the source folder run `docker compose up -d --build` and wait until PostgreSQL, Redis, AI, backend, and frontend are healthy.',
    '6. Verify backend health, open the frontend, sign in with a real authorized account, and complete the smoke checklist before importing real data.', '',
    '## Security and trust boundary', '',
    'Public clients call only the NestJS `/api` boundary. The backend owns authentication, role checks, official academic state, audit evidence, database writes, and durable job orchestration. The AI service is internal and assistive; it cannot become the public authentication or academic authority.', '',
    '![Request and trust flow](../../07-DIAGRAMS/02-request-and-trust-flow.png)', '',
    '## Deployment', '',
    'Local and self-hosted deployments use the same ownership boundaries. Railway uses the repository service definitions and GitHub Actions workflow; secrets are configured in the target environment, never committed.', '',
    '![Deployment topology](../../07-DIAGRAMS/03-deployment-topology.png)', '',
    '## Backup and recovery', '',
    'A backup is not considered valid until its checksum is recorded and a restore into an empty test environment passes migrations, health checks, authentication, and role smoke tests.', '',
    '![Backup and recovery](../../07-DIAGRAMS/04-backup-and-recovery.png)', '',
    '## Backend module catalog', '',
  ];
  const controllerItems = extractItems(inventory.backend.featureControllers);
  const handlerItems = extractItems(inventory.backend.httpHandlers);
  for (const file of extractItems(inventory.backend.featureModules)) {
    const slug = slugFromModule(file);
    const folder = path.dirname(file);
    const controllers = controllerItems.filter((item) => (typeof item === 'string' ? item : item.file).startsWith(`${folder}/`));
    const handlers = handlerItems.filter((item) => item.file.startsWith(`${folder}/`));
    lines.push(
      `### ${titleCase(slug)}`, '',
      moduleDescription(file), '',
      '- **Authority:** NestJS backend; clients must use its `/api` contract.',
      `- **Inputs:** authenticated requests, validated DTOs, policy state, and durable records relevant to this capability.`,
      `- **Outputs:** role-scoped response data, auditable state changes, or a durable job identity for long work.`,
      `- **Controllers in folder:** ${controllers.length}. **HTTP handlers:** ${handlers.length}.`,
      `- **Failure check:** inspect the HTTP status and request ID, backend log, dependency health, and audit event before retrying.`,
      `- **Verify:** exercise one permitted read and one permitted write or preview using synthetic data; confirm persistence and role isolation.`,
      `- **Source:** \`${file}\``, '',
    );
  }
  lines.push('## Backend HTTP handler index', '');
  for (const [file, handlers] of groupHandlersByFile(inventory.backend.httpHandlers)) {
    lines.push(`### ${file}`, '', handlers.map((item) => `- ${item.decorator.toUpperCase()} at source line ${item.line}`).join('\n'), '');
  }
  lines.push('## AI service handler index', '');
  for (const [file, handlers] of groupHandlersByFile(inventory.aiService.httpHandlers)) {
    lines.push(`### ${file}`, '', handlers.map((item) => `- ${item.decorator ?? item.method ?? 'handler'} at source line ${item.line}`).join('\n'), '');
  }
  lines.push('## Queue processors', '');
  for (const item of extractItems(inventory.queues.processors)) lines.push(`- \`${item}\``);
  lines.push('', '## Database table catalog', '');
  for (const table of extractItems(inventory.database.tables)) lines.push(`- **${table.name}** — \`${table.file}:${table.line}\``);
  lines.push('', '## Database enum catalog', '');
  for (const item of extractItems(inventory.database.enums)) lines.push(`- **${item.name}** — \`${item.file}:${item.line}\``);
  lines.push('', '## Migration catalog', '');
  for (const item of inventory.database.migrationFiles) lines.push(`- \`${item}\``);
  lines.push('', '## Configuration reference', '');
  for (const item of extractItems(inventory.configuration.uniqueKeys)) {
    lines.push(`### ${item.key}`, '', environmentPurpose(item.key), '', `Sources: ${item.sources.map((source) => `\`${source}\``).join(', ')}`, '');
  }
  lines.push('## Web page source index', '');
  for (const item of extractItems(inventory.web.pages)) lines.push(`- \`${item.route}\` — \`${item.file}\``);
  lines.push('', '## Mobile screen source index', '');
  for (const item of extractItems(inventory.mobile.screenFiles)) lines.push(`- \`${typeof item === 'string' ? item : item.file}\``);
  return `${lines.join('\n')}\n`;
}

function makeDocHelpers(docx) {
  const {
    AlignmentType, BorderStyle, ImageRun, PageBreak, Paragraph, ShadingType,
    Table, TableCell, TableRow, TextRun, WidthType,
  } = docx;
  const border = { style: BorderStyle.SINGLE, color: BORDER, size: 4 };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const text = (value, options = {}) => new TextRun({
    text: String(value), color: options.color ?? INK, bold: options.bold, italics: options.italics,
    size: options.size ?? 19, font: 'Aptos', break: options.break,
  });
  const p = (value = '', options = {}) => new Paragraph({
    children: Array.isArray(value) ? value : [text(value, options)],
    heading: options.heading,
    alignment: options.alignment,
    spacing: { after: options.after ?? 90, before: options.before ?? 0, line: options.line ?? 260 },
    pageBreakBefore: options.pageBreakBefore,
    keepNext: options.keepNext,
    bullet: options.bullet ? { level: 0 } : undefined,
  });
  const labelValue = (label, value) => p([text(`${label}: `, { bold: true, color: NAVY }), text(value, { color: MUTED })], { after: 65 });
  const callout = (title, body, fill = RED_SOFT) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders,
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill, type: ShadingType.CLEAR }, margins: { top: 130, bottom: 130, left: 160, right: 160 },
      children: [p(title, { bold: true, color: fill === NAVY ? WHITE : RED_DARK, after: 40 }), p(body, { color: fill === NAVY ? WHITE : INK, after: 0 })],
    })] })],
  });
  const image = async (file, width, height, alt = '') => new Paragraph({
    ...imageParagraphOptions(AlignmentType.CENTER),
    children: [new ImageRun({
      data: await readFile(file),
      transformation: { width, height },
      type: 'png',
      altText: { title: alt, description: alt, name: alt },
    })],
  });
  const page = () => p([new PageBreak()], { after: 0 });
  const twoColumn = (left, right, widths = [36, 64]) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths.map((v) => v * 100), borders,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: widths[0], type: WidthType.PERCENTAGE }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: left }),
      new TableCell({ width: { size: widths[1], type: WidthType.PERCENTAGE }, margins: { top: 120, bottom: 120, left: 150, right: 150 }, children: right }),
    ] })],
  });
  return { text, p, labelValue, callout, image, page, twoColumn, borders };
}

function docStyles(docx) {
  const { HeadingLevel } = docx;
  return {
    default: { document: { run: { font: 'Aptos', size: 20, color: INK }, paragraph: DOCUMENT_DEFAULT_PARAGRAPH } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 54, bold: true, color: NAVY, font: 'Aptos Display' }, paragraph: { spacing: { after: 220 } } },
      { id: 'Subtitle', name: 'Subtitle', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, color: MUTED, font: 'Aptos' }, paragraph: { spacing: { after: 140 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: NAVY, font: 'Aptos Display' }, paragraph: { spacing: { before: 180, after: 120 }, keepNext: true }, outlineLevel: 0 },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: RED_DARK, font: 'Aptos Display' }, paragraph: { spacing: { before: 140, after: 90 }, keepNext: true }, outlineLevel: 1 },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: NAVY, font: 'Aptos' }, paragraph: { spacing: { before: 100, after: 70 }, keepNext: true }, outlineLevel: 2 },
    ],
  };
}

function headerFooter(docx, manualTitle, config) {
  const { AlignmentType, Footer, Header, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = docx;
  const header = new Header({ children: [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: { bottom: { style: 'single', color: RED, size: 10 } },
    rows: [new TableRow({ children: [
      new TableCell({ borders: {}, children: [new Paragraph({ children: [new TextRun({ text: 'NEXORA', bold: true, color: NAVY, size: 20 })] })] }),
      new TableCell({ borders: {}, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: manualTitle, color: MUTED, size: 16 })] })] }),
    ] })],
  })] });
  const footer = new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: `Handoff ${config.buildDate} · ${config.applicationCommit.slice(0, 8)} · Page `, color: MUTED, size: 15 }),
      PageNumber.CURRENT,
    ],
  })] });
  return { header, footer };
}

async function coverChildren(docx, helpers, data, title, subtitle) {
  const { AlignmentType, HeadingLevel } = docx;
  const seal = path.join(data.outputRoot, '03-SOURCE', 'placeholder-never-used.png');
  const candidates = [
    path.join(data.outputRoot, '08-VISUALS/mobile/mobile-auth-entry.png'),
    path.join(data.outputRoot, '07-DIAGRAMS/01-system-architecture.png'),
  ];
  const hero = title.includes('User') ? candidates[0] : candidates[1];
  const dimensions = title.includes('User') ? [210, 467] : [610, 343];
  return [
    helpers.p('GAT ANDRES BONIFACIO HIGH SCHOOL', { bold: true, color: RED, size: 18, after: 120, alignment: AlignmentType.CENTER }),
    helpers.p(title, { heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, after: 150 }),
    helpers.p(subtitle, { heading: HeadingLevel.SUBTITLE, alignment: AlignmentType.CENTER, after: 220 }),
    await helpers.image(hero, dimensions[0], dimensions[1], title),
    helpers.callout('Locked evidence edition', `Application snapshot ${data.config.applicationCommit}. Screens use synthetic documentation-only records; no production data or credentials are included.`, NAVY),
    helpers.p(`Prepared ${data.config.buildDate} · English edition · External-drive reference`, { alignment: AlignmentType.CENTER, color: MUTED, size: 17, before: 180 }),
    helpers.page(),
  ];
}

async function buildUserDocx(data, docx) {
  const { AlignmentType, Document, HeadingLevel, Packer } = docx;
  const h = makeDocHelpers(docx);
  const evidence = webEvidenceMap(data);
  const mobileEvidence = mobileEvidenceMap(data);
  const children = await coverChildren(docx, h, data, 'Nexora User Manual', 'A screen-by-screen guide for learners, teachers, administrators, and future IT faculty');
  children.push(
    h.p('How to use this book', { heading: HeadingLevel.HEADING_1 }),
    h.callout('Fast reading pattern', 'Every screen uses the same five-part pattern: purpose, do this, done when, if stuck, and behind the screen.'),
    h.p('Use only an account assigned to your role. Read the current state before acting. On destructive or policy-governed screens, stop when the preview or blocker differs from your intent.', { before: 120 }),
    h.p('Contents', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    h.p('Use search or the Navigation pane to jump to any heading. The screen guide is grouped by role and task.', { color: MUTED }),
    ...USER_CONTENTS.map((item, index) => h.p(`${index + 1}. ${item}`, { size: 21, after: 110 })),
    h.page(),
    h.p('Mobile workspace guide', { heading: HeadingLevel.HEADING_1 }),
    h.callout('Why mobile is grouped', 'The app has many registered routes that reuse the same task workspace. Each evidence page lists every route covered by that workspace, so no route is silently omitted.'),
  );
  for (const role of ['public', 'student', 'teacher', 'admin', 'shared']) {
    children.push(h.p(`${roleLabel(role)} mobile screens`, { heading: HeadingLevel.HEADING_1, pageBreakBefore: role !== 'public' }));
    for (const entry of data.mobileMatrix.filter((item) => item.role === role)) {
      const meta = mobileEvidence.get(entry.id);
      const imagePath = path.join(data.outputRoot, meta.captureFile);
      const left = [await h.image(imagePath, 230, 511, entry.title)];
      const right = [
        h.p(entry.title, { heading: HeadingLevel.HEADING_2 }),
        h.labelValue('Role', roleLabel(entry.role)),
        h.labelValue('Purpose', entry.caption),
        h.labelValue('Routes covered', entry.routes.join(', ')),
        h.p('Read it in this order', { bold: true, color: RED_DARK, before: 90 }),
        h.p('1. Page title and current state.\n2. Main card or form.\n3. Primary action.\n4. Success, empty, offline, or error feedback.', { color: MUTED }),
        h.labelValue('Evidence', `${meta.platform} ${meta.androidVersion}; app ${meta.appVersion} build ${meta.appBuild}`),
      ];
      children.push(h.twoColumn(left, right), h.page());
    }
  }
  children.push(h.p('Complete web screen guide', { heading: HeadingLevel.HEADING_1 }));
  for (const role of ['public', 'student', 'teacher', 'admin']) {
    children.push(h.p(`${roleLabel(role)} web screens`, { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    const chapters = Map.groupBy(data.webMatrix.filter((entry) => entry.role === role), (entry) => entry.manualChapter);
    for (const [chapter, entries] of chapters) {
      children.push(h.p(chapter, { heading: HeadingLevel.HEADING_2 }));
      for (const entry of entries) {
        const meta = evidence.get(entry.id);
        const workflow = workflowForRoute(entry.routes[0], entry.role);
        children.push(
          h.p(humanizeRoute(entry.routes[0]), { heading: HeadingLevel.HEADING_3, pageBreakBefore: true }),
          h.labelValue('Role and path', `${roleLabel(entry.role)} · ${entry.routes.join(', ')}`),
          h.labelValue('Purpose', entry.expectedEvidence),
          await h.image(path.join(data.outputRoot, meta.captureFile), 610, 381, humanizeRoute(entry.routes[0])),
          h.p('Do this', { bold: true, color: RED_DARK, after: 50 }),
          ...workflow.steps.map((step, index) => h.p(`${index + 1}. ${step}`, { after: 45, size: 17 })),
          h.labelValue('Done when', workflow.doneWhen),
          h.labelValue('If stuck', workflow.ifStuck),
          h.labelValue('Behind the screen', `${entry.sourceFile} · evidence ${meta.sourceCommit.slice(0, 8)}`),
        );
      }
    }
  }
  children.push(
    h.p('Glossary', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    h.labelValue('Academic state', 'The backend-owned school year, grading period, and lifecycle rules that govern what work is allowed.'),
    h.labelValue('Audit evidence', 'A durable record showing who performed an important action, when, and against which target.'),
    h.labelValue('Draft', 'Work that is not yet official or visible to its final audience.'),
    h.labelValue('Preview', 'A read-only impact check that must be reviewed before a consequential action.'),
    h.labelValue('Synthetic data', 'Invented documentation records that do not identify real people.'),
  );
  const { header, footer } = headerFooter(docx, 'User Manual', data.config);
  const document = new Document({
    styles: docStyles(docx),
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720, header: 360, footer: 360 } } }, headers: { default: header }, footers: { default: footer }, children }],
  });
  return Packer.toBuffer(document);
}

function handlerRows(docx, h, handlers) {
  const { Table, TableCell, TableRow, WidthType } = docx;
  const rows = [new TableRow({ tableHeader: true, children: [
    new TableCell({ shading: { fill: NAVY }, children: [h.p('Method', { bold: true, color: WHITE, after: 0 })] }),
    new TableCell({ shading: { fill: NAVY }, children: [h.p('Source line', { bold: true, color: WHITE, after: 0 })] }),
  ] })];
  for (const item of handlers) rows.push(new TableRow({ children: [
    new TableCell({ children: [h.p(String(item.decorator ?? item.method ?? 'handler').toUpperCase(), { after: 0, size: 16 })] }),
    new TableCell({ children: [h.p(String(item.line), { after: 0, size: 16 })] }),
  ] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: h.borders, rows });
}

function catalogTable(docx, h, headers, rows, widths) {
  const { Table, TableCell, TableRow, WidthType } = docx;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths.map((v) => v * 100), borders: h.borders,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((header, index) => new TableCell({ width: { size: widths[index], type: WidthType.PERCENTAGE }, shading: { fill: NAVY }, children: [h.p(header, { bold: true, color: WHITE, after: 0, size: 16 })] })) }),
      ...rows.map((row) => new TableRow({ children: row.map((value, index) => new TableCell({ width: { size: widths[index], type: WidthType.PERCENTAGE }, children: [h.p(value, { after: 0, size: 15, color: index === 0 ? INK : MUTED })] })) })),
    ],
  });
}

function splitEvery(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function buildSystemDocx(data, docx) {
  const { Document, HeadingLevel, Packer } = docx;
  const h = makeDocHelpers(docx);
  const inv = data.inventory;
  const webEvidence = webEvidenceMap(data);
  const children = await coverChildren(docx, h, data, 'Nexora System Manual', 'Architecture, setup, deployment, recovery, modules, data, contracts, and operations');
  children.push(
    h.p('How to use this book', { heading: HeadingLevel.HEADING_1 }),
    h.callout('Start here', 'Use Chapters 1-6 to run or recover the platform. Use the module and catalog chapters to trace ownership from a screen or incident to source, API, queue, table, and configuration.'),
    h.p('Contents', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    h.p('Use search or the Navigation pane to jump to a numbered chapter. Catalog chapters continue across multiple indexed pages.', { color: MUTED }),
    ...SYSTEM_CONTENTS.map((item) => h.p(item, { size: 20, after: 75 })),
    h.page(),
    h.p('1. System at a glance', { heading: HeadingLevel.HEADING_1 }),
    h.callout('Inventory locked to one commit', `${extractCount(inv.backend.featureModules)} backend modules · ${extractCount(inv.backend.httpHandlers)} backend HTTP handlers · ${extractCount(inv.aiService.httpHandlers)} AI handlers · ${extractCount(inv.database.tables)} tables · ${extractCount(inv.configuration.uniqueKeys)} environment keys.`, NAVY),
    await h.image(path.join(data.outputRoot, '07-DIAGRAMS/01-system-architecture.png'), 620, 349, 'System architecture'),
    h.labelValue('Public boundary', 'Next.js web and Expo mobile call the NestJS /api only.'),
    h.labelValue('Authority', 'Backend authentication, RBAC, academic policy, audit, and durable orchestration.'),
    h.labelValue('Assistive boundary', 'FastAPI AI receives internal shared-secret calls and returns drafts or retrieval output.'),
    h.labelValue('Durable state', 'PostgreSQL with pgvector, Redis/BullMQ, and configured file/object storage.'),
    h.p('2. First run from an external drive', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    h.callout('Important', 'Copy the package to a local SSD first. Containers, databases, node_modules, and Android builds should not run directly from a removable drive.'),
    ...[
      'Install Git, Docker Desktop or Docker Engine with Compose, Node.js 22 LTS, and Python 3.11 or newer.',
      'Open README-FIRST.txt and START-HERE.html. Confirm VERSION.txt names the intended snapshot.',
      'Copy the source archive into a writable local folder. Keep the original external-drive copy unchanged.',
      'Copy the supplied configuration templates. Replace placeholders with unique secrets and environment-specific URLs.',
      'Run docker compose up -d --build from the source root. The six core services are postgres, redis, ollama, backend, ai-service, and frontend.',
      'Run docker compose ps until required services are healthy. Check backend health and open the frontend over its documented URL.',
      'Create or restore only authorized data. Run the role smoke checklist before a real onboarding or import.',
    ].map((step, index) => h.p(`${index + 1}. ${step}`)),
    h.p('Done when', { heading: HeadingLevel.HEADING_2 }),
    h.p('All core health checks are green, the frontend loads over HTTPS or localhost, each role can sign in, and one read-only workflow succeeds without console or API failures.'),
    h.p('3. Local development', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    h.labelValue('Backend', 'Install from backend/package-lock.json, provide DATABASE_URL, REDIS_URL, JWT_SECRET, and JWT_REFRESH_SECRET, then use the backend development script.'),
    h.labelValue('Web', 'Install from next-frontend/package-lock.json, set the backend API URL, then run the Next.js development script.'),
    h.labelValue('Mobile', 'Install from mobile/package-lock.json, set EXPO_PUBLIC_API_URL, then run the Expo development build or install the supplied APK.'),
    h.labelValue('AI', 'Create a Python environment from ai-service requirements, configure database and the matching internal shared secret, then start FastAPI. Materialize the approved Ollama or cloud model separately.'),
    h.labelValue('Core rule', 'Web and mobile never call the AI service directly.'),
    h.p('4. Security and request flow', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    await h.image(path.join(data.outputRoot, '07-DIAGRAMS/02-request-and-trust-flow.png'), 620, 349, 'Request and trust flow'),
    h.callout('Safe operating rule', 'Treat a 403, academic-state blocker, maintenance gate, or impact-preview mismatch as a stop condition. Do not add force flags or bypass backend authority.'),
    h.p('5. Deployment and release', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    await h.image(path.join(data.outputRoot, '07-DIAGRAMS/03-deployment-topology.png'), 620, 349, 'Deployment topology'),
    ...[
      'Choose the target environment and record its owner, domain, database, Redis, object storage, model runtime, and rollback target.',
      'Configure secrets in Railway or the target secret store. Never reuse development credentials.',
      'Deploy PostgreSQL/pgvector and Redis before backend workers. Keep the AI service private.',
      'Deploy backend, run migrations once, verify health/readiness, then deploy the frontend with the public backend URL.',
      'Build mobile with the production HTTPS API URL, publish the APK metadata and checksum, then verify the update policy endpoint.',
      'Run role smoke tests and record the commit SHA, workflow run, deployed URLs, migration result, APK SHA-256, and rollback decision.',
    ].map((step, index) => h.p(`${index + 1}. ${step}`)),
    h.labelValue('Railway definitions', inv.deployment.railwayFiles.join(', ')),
    h.labelValue('Release workflows', inv.deployment.workflowFiles.join(', ')),
    h.p('6. Backup, restore, and disaster recovery', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    await h.image(path.join(data.outputRoot, '07-DIAGRAMS/04-backup-and-recovery.png'), 620, 349, 'Backup and recovery'),
    h.callout('Recovery gate', 'Never overwrite production as a first restore attempt. Restore into a new empty target, run integrity checks and smoke tests, retain the current backup, and obtain explicit authorization before a production cutover.'),
    h.labelValue('Database', 'Use pg_dump custom format with the application quiesced or a documented consistency strategy. Record server version and checksum.'),
    h.labelValue('Files', 'Copy local uploads or object-storage objects with version and checksum evidence.'),
    h.labelValue('Configuration', 'Save a key-name map and ownership notes, not plaintext secrets in the handoff package.'),
    h.labelValue('Restore proof', 'Migrations, health, authentication, role access, one representative file, one queue job, and one audit read must pass.'),
    h.p('7. Backend module catalog', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
  );
  const controllerItems = extractItems(inv.backend.featureControllers);
  const handlerItems = extractItems(inv.backend.httpHandlers);
  for (const file of extractItems(inv.backend.featureModules)) {
    const slug = slugFromModule(file);
    const folder = path.dirname(file);
    const controllers = controllerItems.filter((item) => (typeof item === 'string' ? item : item.file).startsWith(`${folder}/`));
    const handlers = handlerItems.filter((item) => item.file.startsWith(`${folder}/`));
    const keyword = moduleKeyword(slug);
    const related = data.webMatrix.find((entry) => entry.routes.some((route) => route.includes(keyword))) ?? data.webMatrix.find((entry) => entry.role === 'admin');
    const relatedMeta = related ? webEvidence.get(related.id) : null;
    children.push(
      h.p(titleCase(slug), { heading: HeadingLevel.HEADING_2, pageBreakBefore: true }),
      h.callout('In plain English', moduleDescription(file)),
      h.labelValue('Authority', 'NestJS backend. Web and mobile consume its public /api contract; the database is never a client API.'),
      h.labelValue('Inputs', 'Authenticated request or internal event, validated data, role/account state, academic policy, and existing durable records.'),
      h.labelValue('Outputs', 'Role-scoped response, audited transaction, notification, or durable job identity.'),
      h.labelValue('Source owner', file),
      h.labelValue('Surface count', `${controllers.length} controller files in this folder · ${handlers.length} HTTP handlers`),
      h.labelValue('Failure path', 'Capture status code and request ID; check dependency health and backend log; inspect audit/job state; correct the cause before retrying.'),
      h.labelValue('Verification', 'Run a permitted read and a synthetic preview or write, confirm persistence, then repeat with a disallowed role to verify isolation.'),
    );
    if (relatedMeta) {
      children.push(await h.image(path.join(data.outputRoot, relatedMeta.captureFile), 390, 244, `${titleCase(slug)} related screen`));
      children.push(h.p(`Related screen evidence: ${related.routes[0]}`, { color: MUTED, size: 16 }));
    }
  }
  children.push(h.p('8. Backend HTTP handler index', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  for (const [file, handlers] of groupHandlersByFile(inv.backend.httpHandlers)) {
    children.push(h.p(file, { heading: HeadingLevel.HEADING_2, pageBreakBefore: true }), handlerRows(docx, h, handlers));
  }
  children.push(h.p('9. AI service handler index', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  for (const [file, handlers] of groupHandlersByFile(inv.aiService.httpHandlers)) {
    children.push(h.p(file, { heading: HeadingLevel.HEADING_2, pageBreakBefore: true }), handlerRows(docx, h, handlers));
  }
  children.push(h.p('10. Queue processors', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  for (const item of extractItems(inv.queues.processors)) {
    children.push(h.p(titleCase(path.basename(item).replace(/\.processor\.ts$/, '')), { heading: HeadingLevel.HEADING_2 }), h.labelValue('Source', item), h.labelValue('Operating rule', 'Jobs are backend-owned, retryable where safe, observable, and must preserve their durable identity across restarts.'));
  }
  children.push(h.p('11. Database catalog', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  for (const [index, batch] of splitEvery(extractItems(inv.database.tables), 14).entries()) {
    children.push(h.p(`Tables ${index * 14 + 1}-${index * 14 + batch.length}`, { heading: HeadingLevel.HEADING_2, pageBreakBefore: index > 0 }), catalogTable(docx, h, ['Table', 'Schema source'], batch.map((item) => [item.name, `${item.file}:${item.line}`]), [38, 62]));
  }
  for (const [index, batch] of splitEvery(extractItems(inv.database.enums), 16).entries()) {
    children.push(h.p(`Enums ${index * 16 + 1}-${index * 16 + batch.length}`, { heading: HeadingLevel.HEADING_2, pageBreakBefore: true }), catalogTable(docx, h, ['Enum', 'Schema source'], batch.map((item) => [item.name, `${item.file}:${item.line}`]), [38, 62]));
  }
  for (const [index, batch] of splitEvery(inv.database.migrationFiles, 18).entries()) {
    children.push(h.p(`Migrations ${index * 18 + 1}-${index * 18 + batch.length}`, { heading: HeadingLevel.HEADING_2, pageBreakBefore: true }), ...batch.map((item) => h.p(item, { size: 16, after: 45 })));
  }
  children.push(h.p('12. Configuration reference', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  for (const [index, batch] of splitEvery(extractItems(inv.configuration.uniqueKeys), 9).entries()) {
    children.push(h.p(`Configuration keys ${index * 9 + 1}-${index * 9 + batch.length}`, { heading: HeadingLevel.HEADING_2, pageBreakBefore: index > 0 }), catalogTable(docx, h, ['Key', 'Purpose and source'], batch.map((item) => [item.key, `${environmentPurpose(item.key)} Sources: ${item.sources.join(', ')}`]), [31, 69]));
  }
  children.push(h.p('13. Client source catalogs', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  for (const [index, batch] of splitEvery(extractItems(inv.web.pages), 14).entries()) {
    children.push(h.p(`Web pages ${index * 14 + 1}-${index * 14 + batch.length}`, { heading: HeadingLevel.HEADING_2, pageBreakBefore: index > 0 }), catalogTable(docx, h, ['Route', 'Source'], batch.map((item) => [item.route, item.file]), [38, 62]));
  }
  const mobileFiles = extractItems(inv.mobile.screenFiles).map((item) => typeof item === 'string' ? item : item.file);
  for (const [index, batch] of splitEvery(mobileFiles, 18).entries()) {
    children.push(h.p(`Mobile screens ${index * 18 + 1}-${index * 18 + batch.length}`, { heading: HeadingLevel.HEADING_2, pageBreakBefore: true }), ...batch.map((item) => h.p(item, { size: 16, after: 45 })));
  }
  children.push(
    h.p('14. Incident checklist', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    ...[
      'Record time, environment, user role, route, visible message, request ID, and current commit/build.',
      'Check frontend/mobile connectivity, backend health, PostgreSQL, Redis, AI readiness, and storage in that order.',
      'Determine whether the failure is permission, policy, validation, dependency, data integrity, or code.',
      'Preserve logs and audit/job identifiers. Do not delete evidence to make a retry pass.',
      'Apply the smallest safe correction in a non-production target, run the relevant smoke path, then document rollback.',
    ].map((step, index) => h.p(`${index + 1}. ${step}`)),
    h.callout('Stop condition', 'If data scope, authorization, backup integrity, or rollback safety is uncertain, stop and escalate. Do not improvise a production mutation.'),
  );
  const { header, footer } = headerFooter(docx, 'System Manual', data.config);
  const document = new Document({
    styles: docStyles(docx),
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720, header: 360, footer: 360 } } }, headers: { default: header }, footers: { default: footer }, children }],
  });
  return Packer.toBuffer(document);
}

async function main() {
  const data = await loadManualData(defaultRepoRoot);
  const coverage = await buildManualCoverage(defaultRepoRoot);
  if (coverage.missingWebEvidence.length || coverage.missingMobileEvidence.length) {
    throw new Error(`Manual generation refused: missing evidence ${JSON.stringify({ web: coverage.missingWebEvidence, mobile: coverage.missingMobileEvidence })}`);
  }
  const docx = loadDocumentLibrary();
  const sourceDir = path.join(data.outputRoot, '01-MANUALS', 'sources');
  await mkdir(sourceDir, { recursive: true });
  const [userMarkdown, systemMarkdown] = await Promise.all([buildUserMarkdown(data), buildSystemMarkdown(data)]);
  await Promise.all([
    writeFile(path.join(sourceDir, 'Nexora-User-Manual.md'), userMarkdown, 'utf8'),
    writeFile(path.join(sourceDir, 'Nexora-System-Manual.md'), systemMarkdown, 'utf8'),
  ]);
  const userDocx = await buildUserDocx(data, docx);
  const systemDocx = await buildSystemDocx(data, docx);
  await Promise.all([
    writeFile(path.join(data.outputRoot, data.config.manuals.userDocx), userDocx),
    writeFile(path.join(data.outputRoot, data.config.manuals.systemDocx), systemDocx),
    writeFile(path.join(sourceDir, 'manual-coverage.json'), `${JSON.stringify(coverage, null, 2)}\n`, 'utf8'),
  ]);
  process.stdout.write(`Generated user and system manuals. Coverage: ${JSON.stringify(coverage)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
