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

function sourceFiles(root: string, suffixes: string[]): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(target, suffixes);
    return suffixes.some((suffix) => entry.name.endsWith(suffix))
      ? [target]
      : [];
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
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
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
  const withoutGlobalPrefix =
    segments[0] === 'api' ? segments.slice(1) : segments;
  return `/${withoutGlobalPrefix.join('/')}`;
}

function joinPath(base: string, child: string): string {
  return normalizePath(`${base}/${child}`);
}

function backendRoutes(): Route[] {
  const root = path.join(repoRoot, 'backend/src');
  return sourceFiles(root, ['.controller.ts']).flatMap((file) => {
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
          const position = source.getLineAndCharacterOfPosition(
            member.getStart(source),
          );
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

function fetchMethod(node: ts.CallExpression): string {
  const options = node.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return 'get';
  const methodProperty = options.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === 'method') ||
        (ts.isStringLiteral(property.name) && property.name.text === 'method')),
  );
  return literalText(methodProperty?.initializer).toLowerCase() || 'get';
}

function clientRoutesFromSource(
  sourceText: string,
  file: string,
  includeHttpClientCalls = true,
): Route[] {
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const routes: Route[] = [];

  const addRoute = (
    node: ts.CallExpression,
    method: string,
    rawPath: string,
  ) => {
    const position = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    routes.push({
      method,
      path: normalizePath(rawPath),
      file,
      line: position.line + 1,
    });
  };

  const visit = (node: ts.Node) => {
    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const rawPath = node.arguments[0] && templatePath(node.arguments[0]);
    if (
      rawPath?.startsWith('/api') &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'fetch'
    ) {
      addRoute(node, fetchMethod(node), rawPath);
    } else if (
      rawPath &&
      includeHttpClientCalls &&
      ts.isPropertyAccessExpression(node.expression) &&
      HTTP_METHODS.has(node.expression.name.text)
    ) {
      addRoute(node, node.expression.name.text, rawPath);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return routes;
}

function clientRoutes(): Route[] {
  const roots = [
    {
      root: path.join(repoRoot, 'mobile/src/api'),
      suffixes: ['.ts', '.tsx'],
      includeHttpClientCalls: true,
    },
    {
      root: path.join(repoRoot, 'next-frontend/src/services'),
      suffixes: ['.ts', '.tsx'],
      includeHttpClientCalls: true,
    },
    {
      root: path.join(repoRoot, 'next-frontend/src/lib'),
      suffixes: ['.ts', '.tsx'],
      includeHttpClientCalls: true,
    },
    {
      root: path.join(repoRoot, 'mobile/src/screens'),
      suffixes: ['.tsx'],
      includeHttpClientCalls: false,
    },
    {
      root: path.join(repoRoot, 'next-frontend/app'),
      suffixes: ['.tsx'],
      includeHttpClientCalls: false,
    },
  ];

  return roots.flatMap(({ root, suffixes, includeHttpClientCalls }) =>
    sourceFiles(root, suffixes).flatMap((file) => {
      if (/\.(?:test|spec)\.tsx?$/.test(file)) return [];
      return clientRoutesFromSource(
        fs.readFileSync(file, 'utf8'),
        path.relative(repoRoot, file),
        includeHttpClientCalls,
      );
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
  it('discovers native backend fetch calls in TSX application sources', () => {
    expect(
      clientRoutesFromSource(
        "export const Screen = () => fetch('/api/academic-state/current')",
        'mobile/src/screens/fixture.tsx',
      ),
    ).toEqual([
      {
        method: 'get',
        path: '/academic-state/current',
        file: 'mobile/src/screens/fixture.tsx',
        line: 1,
      },
    ]);
  });

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
