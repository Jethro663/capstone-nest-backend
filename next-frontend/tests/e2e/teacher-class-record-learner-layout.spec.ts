import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const workbookCss = fs.readFileSync(
  path.resolve(
    process.cwd(),
    'src/components/teacher/class-record/TeacherClassRecordWorkbook.module.css',
  ),
  'utf8',
);

const learnerRow = (initial: string, name: string, status: string) => `
  <tr>
    <th class="learnerCell" data-surname-band="sz" scope="row">
      <span class="learnerCard" data-learner-card>
        <span class="surnameBadge" aria-hidden="true">${initial}</span>
        <span class="learnerIdentity">
          <span>${name}</span>
          <small>${status}</small>
        </span>
      </span>
    </th>
    ${Array.from({ length: 8 }, () => '<td class="scoreCell">Recorded</td>').join('')}
    <td class="finalGradeCell"><strong>88</strong><small>Finalized</small></td>
  </tr>
`;

async function renderLayoutFixture(
  page: Page,
  width: number,
) {
  await page.setViewportSize({ width, height: 800 });
  await page.setContent(`
    <style>*, *::before, *::after { box-sizing: border-box; }${workbookCss}</style>
    <main class="workbook">
      <div class="gradeGrid" data-density="comfortable">
        <div class="tableScroll" data-testid="layout-scroll">
          <table class="gradeTable">
            <thead>
              <tr>
                <th class="learnerHeader">Learner</th>
                ${Array.from({ length: 8 }, () => '<th class="itemHeader">Task</th>').join('')}
                <th class="finalGradeHeader">Final grade</th>
              </tr>
            </thead>
            <tbody>
              ${learnerRow(
                'S',
                '<strong>Santos-Dela Cruz-Montenegro</strong>, Ana Maria Concepcion',
                'Not enrolled in period · Removed from current class',
              )}
              ${learnerRow('R', '<strong>Reyes</strong>, Benjamin', 'Eligible')}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  `);
}

for (const viewport of [
  { width: 768, expectedLearnerWidth: 260 },
  { width: 520, expectedLearnerWidth: 220 },
]) {
  test(`keeps long learner cards contained at ${viewport.width}px`, async ({
    page,
  }) => {
    await renderLayoutFixture(page, viewport.width);

    const geometry = await page.evaluate(() => {
      const scroll = document.querySelector<HTMLElement>(
        '[data-testid="layout-scroll"]',
      );
      const cells = Array.from(
        document.querySelectorAll<HTMLElement>('tbody .learnerCell'),
      );
      const firstCell = cells[0];
      const secondCell = cells[1];
      const card = firstCell?.querySelector<HTMLElement>(
        '[data-learner-card]',
      );
      const badge = card?.querySelector<HTMLElement>('.surnameBadge');
      const identity = card?.querySelector<HTMLElement>('.learnerIdentity');
      if (!scroll || !firstCell || !secondCell || !card || !badge || !identity) {
        return null;
      }

      const firstRect = firstCell.getBoundingClientRect();
      const secondRect = secondCell.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const badgeRect = badge.getBoundingClientRect();
      const identityRect = identity.getBoundingClientRect();
      return {
        scrollClientWidth: scroll.clientWidth,
        scrollWidth: scroll.scrollWidth,
        learnerWidth: firstRect.width,
        cardLeftInset: cardRect.left - firstRect.left,
        cardRightInset: firstRect.right - cardRect.right,
        badgeIdentityGap: identityRect.left - badgeRect.right,
        verticalSeparation: secondRect.top - firstRect.bottom,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.scrollWidth).toBeGreaterThan(geometry!.scrollClientWidth);
    expect(geometry!.learnerWidth).toBeCloseTo(
      viewport.expectedLearnerWidth,
      0,
    );
    expect(geometry!.cardLeftInset).toBeGreaterThanOrEqual(0);
    expect(geometry!.cardRightInset).toBeGreaterThanOrEqual(0);
    expect(geometry!.badgeIdentityGap).toBeGreaterThanOrEqual(8);
    expect(geometry!.verticalSeparation).toBeGreaterThanOrEqual(0);

    const scroll = page.getByTestId('layout-scroll');
    const stickyOffset = await scroll.evaluate((element) => {
      element.scrollLeft = 160;
      const scrollRect = element.getBoundingClientRect();
      const learnerRect = element
        .querySelector<HTMLElement>('tbody .learnerCell')!
        .getBoundingClientRect();
      return learnerRect.left - scrollRect.left;
    });
    expect(stickyOffset).toBeGreaterThanOrEqual(0);
    expect(stickyOffset).toBeLessThanOrEqual(2);
  });
}
