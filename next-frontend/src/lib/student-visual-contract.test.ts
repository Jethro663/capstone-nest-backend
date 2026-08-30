import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = path.resolve(__dirname, '../..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
}

describe('canonical student visual system', () => {
  it('defines the dashboard navy, red, and white palette centrally', () => {
    const css = read('app/globals.css');

    expect(css).toContain('--student-navy: #0c1d3a;');
    expect(css).toContain('--student-navy-soft: #172944;');
    expect(css).toContain('--student-red: #ff0011;');
    expect(css).toContain('--student-red-hover: #d90d1d;');
    expect(css).toContain('--student-white: #ffffff;');
  });

  it('does not install or expose the retired multi-theme runtime', () => {
    const layout = read('app/layout.tsx');
    const css = read('app/globals.css');

    expect(layout).not.toContain('ThemeProvider');
    expect(css).not.toMatch(/html\[data-theme=/);
    expect(fs.existsSync(path.join(frontendRoot, 'src/providers/ThemeProvider.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(frontendRoot, 'src/components/layout/StudentThemeSwitcher.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(frontendRoot, 'src/lib/themes.ts'))).toBe(false);
    expect(fs.existsSync(path.join(frontendRoot, 'app/(dashboard)/dashboard/theme-test/page.tsx'))).toBe(false);
  });
});
