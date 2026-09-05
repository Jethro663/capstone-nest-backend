import { expect, test } from '@playwright/test';
import { ASSESSMENT_RICH_TEXT_HTML } from '../../../mobile/src/generated/assessment-rich-text';

declare global {
  interface Window {
    setAssessmentContent(html: string): void;
    assessmentCommand(name: string, value?: string): void;
  }
}

test.beforeEach(async ({ page }) => {
  await page.setContent(ASSESSMENT_RICH_TEXT_HTML);
  await expect(page.getByRole('textbox', { name: 'Rich text editor' })).toBeVisible();
});

test('offline announcement editor loads existing rich content without exposing markup', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Rich text editor' });
  await page.evaluate(() => window.setAssessmentContent('<p>Bring <strong>a notebook</strong> &amp; a pen.</p><ul><li>Read first</li></ul>'));
  await expect(editor.locator('strong')).toHaveText('a notebook');
  await expect(editor.locator('li')).toHaveText('Read first');
  await expect(editor).not.toContainText('<p>');
});

for (const [command, tag] of [['heading', 'h2'], ['blockquote', 'blockquote'], ['code', 'code'], ['underline', 'u'], ['bold', 'strong'], ['italic', 'em'], ['bulletList', 'ul'], ['orderedList', 'ol']]) {
  test(`offline announcement editor applies ${command} to selected text`, async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'Rich text editor' });
    await page.evaluate(() => window.setAssessmentContent('<p>Class update</p>'));
    await editor.click();
    await editor.press('ControlOrMeta+A');
    await page.evaluate(name => window.assessmentCommand(name), command);
    await expect(editor.locator(tag)).toHaveText('Class update');
  });
}

test('offline announcement editor adds a link to selected text', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Rich text editor' });
  await page.evaluate(() => window.setAssessmentContent('<p>Read the guide</p>'));
  await editor.click();
  await editor.press('ControlOrMeta+A');
  await page.evaluate(() => window.assessmentCommand('link', 'https://example.com/guide'));
  await expect(editor.locator('a')).toHaveAttribute('href', 'https://example.com/guide');
});
