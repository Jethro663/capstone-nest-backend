// Next 16.2.10 omits ctx.nonce on loading/error/template boundary scripts.
// Upstream: https://github.com/vercel/next.js/issues/97882
// Keep this narrowly checked compatibility patch until upstream ships the fix.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('next/package.json'));
if (require('next/package.json').version !== '16.2.10') {
  throw new Error('Revalidate/remove the Next.js 16.2.10 nonce compatibility patch before upgrading Next.js');
}
const before = 'key: `script-${index}`\n';
const after = 'key: `script-${index}`,\n            nonce: ctx.nonce\n';
for (const format of ['server', 'esm/server']) {
  const filename = path.join(root, 'dist', format, 'app-render/create-component-styles-and-scripts.js');
  const source = fs.readFileSync(filename, 'utf8');
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2 || !source.includes("createElement('script'")) {
    throw new Error(`Review Next.js CSP boundary patch after dependency change: ${filename}`);
  }
  fs.writeFileSync(filename, source.replace(before, after));
}
// Production uses Next's bundled renderer rather than the individual modules.
for (const name of ['app-page', 'app-page-turbo', 'app-page-experimental', 'app-page-turbo-experimental']) {
  const filename = path.join(root, 'dist/compiled/next-server', `${name}.runtime.prod.js`);
  const source = fs.readFileSync(filename, 'utf8');
  const original = 'async:!0,key:`script-${t}`}';
  const patched = 'async:!0,key:`script-${t}`,nonce:a.nonce}';
  if (source.includes(patched)) continue;
  const index = source.indexOf(original);
  if (source.split(original).length !== 2 || !source.slice(index - 300, index).includes('ctx:a}')) {
    throw new Error(`Unexpected Next.js production boundary renderer: ${filename}`);
  }
  fs.writeFileSync(filename, source.replace(original, patched));
}
console.log('Verified Next.js boundary scripts carry the request nonce.');
