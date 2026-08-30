import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const frontendRoot = path.resolve(import.meta.dirname, '..');
const sourceRoots = [
  'app/(dashboard)/dashboard/student',
  'src/components/student',
  'src/features/lesson-blocks/LessonBlockStudentRenderer.tsx',
];
const sourceExtensions = new Set(['.css', '.ts', '.tsx']);
const approvedGradientTokens = new Set([
  '--student-navy',
  '--student-navy-soft',
  '--student-red',
  '--student-red-hover',
]);
const colorFamilyPattern = new RegExp(
  String.raw`\b(?:from|to|via|bg|text|border|ring|outline|shadow|divide|fill|stroke)-(?:black|slate|gray|zinc|neutral|stone|blue|indigo|violet|purple|fuchsia|pink|rose|orange|yellow|lime|green|emerald|teal|cyan|sky|amber)-\d+`,
  'i',
);
const rawColorPattern = /#[0-9a-f]{3,8}\b|rgba?\(|rgb\(/i;
const gradientPattern = /(?:linear|radial|conic)-gradient\(/i;
const studentTokenPattern = /var\((--student-[a-z-]+)\)/gi;

const violations = [];

function relative(filePath) {
  return path.relative(frontendRoot, filePath).split(path.sep).join('/');
}

function addViolation(filePath, line, message) {
  violations.push(`${relative(filePath)}:${line} ${message}`);
}

function collectFiles(targetPath) {
  const absolutePath = path.join(frontendRoot, targetPath);
  if (!fs.existsSync(absolutePath)) return [];
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [absolutePath];

  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) return collectFiles(relative(child));
    if (!sourceExtensions.has(path.extname(entry.name))) return [];
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) return [];
    return [child];
  });
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function auditGradient(filePath, line, value) {
  if (!gradientPattern.test(value)) return;
  const gradientStart = value.search(gradientPattern);
  const declarationEnd = value.indexOf(';', gradientStart);
  const gradientValue = value.slice(
    gradientStart,
    declarationEnd === -1 ? undefined : declarationEnd,
  );
  const tokens = [...gradientValue.matchAll(studentTokenPattern)].map(
    (match) => match[1],
  );
  if (tokens.length === 0 || tokens.some((token) => !approvedGradientTokens.has(token))) {
    addViolation(
      filePath,
      line,
      'decorative gradient is outside the approved navy/red mappings',
    );
  }
}

function auditSourceFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split('\n');
  for (const [index, value] of lines.entries()) {
    const line = index + 1;
    if (rawColorPattern.test(value)) {
      addViolation(filePath, line, 'uses a raw color instead of a student token');
    }
    if (colorFamilyPattern.test(value)) {
      addViolation(filePath, line, 'uses a route-local Tailwind color family');
    }
    if (/hover:(?:-?translate|scale)/i.test(value)) {
      addViolation(filePath, line, 'uses a decorative hover transform');
    }
    auditGradient(filePath, line, value);
  }

  if (/ThemeProvider|StudentThemeSwitcher|nexora-student-theme/.test(source)) {
    addViolation(filePath, 1, 'references the retired student theme runtime');
  }
}

function auditGlobalStudentRules() {
  const filePath = path.join(frontendRoot, 'app/globals.css');
  const source = fs.readFileSync(filePath, 'utf8');
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(source))) {
    const selector = match[1];
    const body = match[2];
    if (!selector.includes('.student')) continue;
    if (/\.(?:teacher|admin|landing)-/.test(selector)) continue;
    const line = lineNumberAt(source, match.index);

    if (rawColorPattern.test(body)) {
      addViolation(filePath, line, 'student-only rule uses a raw color');
    }
    if (/:hover/i.test(selector) && /transform\s*:/i.test(body)) {
      addViolation(filePath, line, 'student-only hover rule uses a transform');
    }
    auditGradient(filePath, line, body);
  }
}

for (const filePath of sourceRoots.flatMap(collectFiles)) {
  auditSourceFile(filePath);
}
auditGlobalStudentRules();

for (const retiredPath of [
  'app/(dashboard)/dashboard/student/chatbot/chatbot-redesign.css',
  'app/(dashboard)/dashboard/student/lxp/lxp-emboss.css',
  'app/(dashboard)/dashboard/theme-test/page.tsx',
  'src/components/layout/StudentThemeSwitcher.tsx',
  'src/providers/ThemeProvider.tsx',
  'src/lib/themes.ts',
]) {
  const absolutePath = path.join(frontendRoot, retiredPath);
  if (fs.existsSync(absolutePath)) {
    addViolation(absolutePath, 1, 'retired student visual-system file still exists');
  }
}

if (violations.length > 0) {
  console.error('Student palette audit failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Student palette audit passed.');
}
