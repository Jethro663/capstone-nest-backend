import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

type Route = {
  method: string;
  path: string;
  file: string;
  line: number;
};

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const CONTROLLER_METHODS = new Map([
  ['Get', 'get'],
  ['Post', 'post'],
  ['Put', 'put'],
  ['Patch', 'patch'],
  ['Delete', 'delete'],
]);

const repoRoot = path.resolve(__dirname, '../../../..');

function sourceFiles(root: string, suffix: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(target, suffix);
    return entry.name.endsWith(suffix) ? [target] : [];
  });
}

function decoratorCall(
  node: ts.Node,
  name: string,
): ts.CallExpression | undefined {
  return ts
    .getDecorators(node)
    ?.map((decorator) => decorator.expression)
    .find(
      (expression): expression is ts.CallExpression =>
        ts.isCallExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === name,
    );
}

function literalText(node: ts.Expression | undefined): string {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : '';
}

function normalizePath(value: string): string {
  const withoutQuery = value.split('?')[0];
  const segments = withoutQuery
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith(':') || segment === '*' ? ':param' : segment,
    );
  const withoutGlobalPrefix = segments[0] === 'api' ? segments.slice(1) : segments;
  return `/${withoutGlobalPrefix.join('/')}`;
}

function joinPath(base: string, child: string): string {
  return normalizePath(`${base}/${child}`);
}

function backendRoutes(): Route[] {
  const root = path.join(repoRoot, 'backend/src');
  return sourceFiles(root, '.controller.ts').flatMap((file) => {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const routes: Route[] = [];

    source.forEachChild((node) => {
      if (!ts.isClassDeclaration(node)) return;
      const controller = decoratorCall(node, 'Controller');
      if (!controller) return;
      const base = literalText(controller.arguments[0]);

      for (const member of node.members) {
        for (const [decoratorName, method] of CONTROLLER_METHODS) {
          const decorator = decoratorCall(member, decoratorName);
          if (!decorator) continue;
          const child = literalText(decorator.arguments[0]);
          const position = source.getLineAndCharacterOfPosition(member.getStart(source));
          routes.push({
            method,
            path: joinPath(base, child),
            file: path.relative(repoRoot, file),
            line: position.line + 1,
          });
        }
      }
    });

    return routes;
  });
}

function templatePath(node: ts.Expression): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text.startsWith('/') ? node.text : undefined;
  }
  if (!ts.isTemplateExpression(node) || !node.head.text.startsWith('/')) {
    return undefined;
  }

  let value = node.head.text;
  for (const span of node.templateSpans) {
    const suffix = span.literal.text;
    const expression = span.expression.getText();
    if (!value.endsWith('/') && !suffix.startsWith('/')) {
      if (/suffix|query|searchParams/i.test(expression)) break;
      value += ':param';
    } else {
      value += ':param';
    }
    value += suffix;
  }
  return value;
}

function clientRoutes(): Route[] {
  const roots = [
    path.join(repoRoot, 'mobile/src/api'),
    path.join(repoRoot, 'next-frontend/src/services'),
    path.join(repoRoot, 'next-frontend/src/lib'),
  ];

  return roots.flatMap((root) =>
    sourceFiles(root, '.ts').flatMap((file) => {
      if (/\.(?:test|spec)\.ts$/.test(file)) return [];
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const routes: Route[] = [];

      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          HTTP_METHODS.has(node.expression.name.text)
        ) {
          const rawPath = node.arguments[0] && templatePath(node.arguments[0]);
          if (rawPath) {
            const position = source.getLineAndCharacterOfPosition(node.getStart(source));
            routes.push({
              method: node.expression.name.text,
              path: normalizePath(rawPath),
              file: path.relative(repoRoot, file),
              line: position.line + 1,
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      return routes;
    }),
  );
}

function pathsMatch(clientPath: string, backendPath: string): boolean {
  const clientSegments = clientPath.split('/').filter(Boolean);
  const backendSegments = backendPath.split('/').filter(Boolean);
  if (clientSegments.length !== backendSegments.length) return false;
  return clientSegments.every(
    (segment, index) =>
      segment === ':param' ||
      backendSegments[index] === ':param' ||
      segment === backendSegments[index],
  );
}

describe('public client route contracts', () => {
  it('maps every literal mobile and web HTTP route to a Nest controller', () => {
    const backend = backendRoutes();
    const unmatched = clientRoutes().filter(
      (client) =>
        !backend.some(
          (route) =>
            route.method === client.method &&
            pathsMatch(client.path, route.path),
        ),
    );

    expect(
      unmatched.map(
        ({ method, path: routePath, file, line }) =>
          `${method.toUpperCase()} ${routePath} (${file}:${line})`,
      ),
    ).toEqual([]);
  });
});
