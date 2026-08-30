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

  it('keeps the reported module, lesson, LXP, and announcement surfaces on tokens', () => {
    const moduleCss = read(
      'app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/student-module-detail.css',
    );
    const lessonRenderer = read(
      'src/features/lesson-blocks/LessonBlockStudentRenderer.tsx',
    );
    const lxpCss = read('src/components/student/lxp/StudentLxpExperience.css');
    const globalCss = read('app/globals.css');
    const announcementCss = globalCss.slice(
      globalCss.indexOf('.student-announcements-header'),
      globalCss.indexOf('.student-announcements-empty'),
    );

    expect(moduleCss).toContain(
      'linear-gradient(135deg, var(--student-navy) 0%, var(--student-navy-soft) 100%)',
    );
    expect(moduleCss).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(lessonRenderer).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(lessonRenderer).not.toMatch(
      /(?:rose|purple|violet|orange|pink|teal|blue|sky)-\d+/,
    );
    expect(lxpCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(announcementCss).toContain('background: var(--student-white);');
    expect(announcementCss).not.toMatch(
      /#(?:10213e|172c4c|7f1d1d|fecaca|0f172a)|translateY\(-2px\)/i,
    );
  });
});
