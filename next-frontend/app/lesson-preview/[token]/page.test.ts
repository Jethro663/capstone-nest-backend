import fs from 'node:fs';
import path from 'node:path';

describe('lesson preview route composition', () => {
  it('uses the real student renderer and exposes no editing controls', () => {
    const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(source).toContain('LessonBlockStudentRenderer');
    expect(source).toContain('RichTextRenderer');
    expect(source).toContain("getLessonPreview(token)");
    expect(source).toContain('previewFileBaseUrl');
    expect(source).not.toContain('LessonBlockTeacherEditor');
  });
});
