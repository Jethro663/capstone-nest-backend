const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');
const disallowedSuffixes = ['.js', '.js.map'];
const offenders = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      visit(fullPath);
      continue;
    }

    if (disallowedSuffixes.some((suffix) => entry.name.endsWith(suffix))) {
      offenders.push(path.relative(projectRoot, fullPath));
    }
  }
}

visit(srcRoot);

if (offenders.length > 0) {
  console.error('Unexpected compiled JS artifacts found in backend/src:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  console.error('Use the standard Nest build output in dist/, not in-place transpilation under src/.');
  process.exit(1);
}

console.log('backend/src is clean: no compiled JS artifacts found.');
