import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { loginAs, missingRoleCredentials } from "./helpers/auth";

const origin = process.env.PLAYWRIGHT_API_ORIGIN || "http://127.0.0.1:3000";
test.use({ actionTimeout: 20_000 });
let token: string;
let classId: string;
const headers = () => ({ authorization: `Bearer ${token}` });
async function count(api: APIRequestContext) {
  const response = await api.get(`${origin}/api/assessments/class/${classId}`, {
    headers: headers(),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).total as number;
}
async function open(page: Page) {
  await page.goto(`/dashboard/teacher/classes/${classId}?view=assignments`);
  await page
    .getByRole("button", { name: "New Assignment", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function placement(
  page: Page,
  format: "Question assignment" | "File upload assignment",
) {
  await page.getByRole("button", { name: new RegExp(format) }).click();
  await page.getByLabel("Class-record category").selectOption("written_work");
}
async function submit(page: Page, name: string) {
  const response = page.waitForResponse(
    (entry) =>
      entry.url().endsWith("/api/assessments/editor") &&
      entry.request().method() === "POST",
  );
  await page.getByRole("button", { name, exact: true }).click();
  return response;
}

test.beforeAll(async ({ request }) => {
  test.skip(
    missingRoleCredentials("teacher"),
    "Provide disposable local teacher credentials.",
  );
  expect(["127.0.0.1", "localhost"]).toContain(new URL(origin).hostname);
  const response = await request.post(`${origin}/api/auth/login`, {
    data: {
      email: process.env.PLAYWRIGHT_TEACHER_EMAIL,
      password: process.env.PLAYWRIGHT_TEACHER_PASSWORD,
    },
  });
  expect(response.ok()).toBeTruthy();
  const session = (await response.json()).data;
  token = session.accessToken;
  const classes = await request.get(
    `${origin}/api/classes/teacher/${session.user.id}`,
    { headers: headers() },
  );
  classId = (await classes.json()).data[0].id;
});

test("cancel, complete setup, and skip preserve the promised draft behavior", async ({
  page,
  request,
}) => {
  await loginAs(page, "teacher");
  const before = await count(request);
  const beforeContext = await request.get(
    `${origin}/api/assessments/class/${classId}/creation-context`,
    { headers: headers() },
  );
  const workbooksBefore = (await beforeContext.json()).data.periods.filter(
    (entry: { workbook: unknown }) => entry.workbook,
  ).length;
  await open(page);
  await expect(
    page.getByRole("button", { name: /Question assignment/ }),
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("01-format.png") });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "New Assignment", exact: true }),
  ).toBeFocused();
  expect(await count(request)).toBe(before);
  const afterContext = await request.get(
    `${origin}/api/assessments/class/${classId}/creation-context`,
    { headers: headers() },
  );
  expect(
    (await afterContext.json()).data.periods.filter(
      (entry: { workbook: unknown }) => entry.workbook,
    ).length,
  ).toBe(workbooksBefore);
  await open(page);
  await placement(page, "Question assignment");
  await expect(
    page.getByRole("heading", { name: "Class record setup" }),
  ).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("02-placement.png") });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Assignment name").fill("Wizard question verification");
  await page.getByLabel("Maximum attempts", { exact: true }).fill("3");
  await page.getByLabel("No due date").uncheck();
  await page.getByLabel("Due date and time").fill("2030-09-10T15:00");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Class-record category")).toHaveValue(
    "written_work",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Assignment name")).toHaveValue(
    "Wizard question verification",
  );
  await expect(
    page.getByRole("heading", { name: "Name and schedule" }),
  ).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("03-details.png") });
  const response = await submit(page, "Create question assignment");
  expect(response.ok(), await response.text()).toBeTruthy();
  const created = (await response.json()).data.assessment;
  expect(created).toMatchObject({
    type: "quiz",
    isPublished: false,
    maxAttempts: 3,
    classRecordCategory: "written_work",
    dueDate: "2030-09-10T07:00:00.000Z",
  });
  expect(created.classRecordPlacement.itemId).toBeTruthy();
  await expect(
    page.getByRole("status", { name: "Assignment created" }),
  ).toBeVisible();
  expect(await count(request)).toBe(before + 1);
  await open(page);
  await page.getByRole("button", { name: /File upload assignment/ }).click();
  const skipResponse = await submit(page, "Skip setup & start editing");
  expect(skipResponse.ok()).toBeTruthy();
  const skipped = (await skipResponse.json()).data.assessment;
  expect(skipped).toMatchObject({
    type: "file_upload",
    isPublished: false,
    classRecordPlacement: null,
    dueDate: null,
  });
  expect(await count(request)).toBe(before + 2);
  await expect(
    page.getByRole("button", { name: "Add upload instructions", exact: true }),
  ).toBeVisible();
});

test("lost creation response is recovered after reload without a duplicate", async ({
  page,
  request,
}) => {
  await loginAs(page, "teacher");
  const before = await count(request);
  await open(page);
  await page.getByRole("button", { name: /Question assignment/ }).click();
  let savedId = "";
  await page.route(
    "**/api/assessments/editor",
    async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBeTruthy();
      savedId = (await response.json()).data.assessment.id;
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Skip setup & start editing" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recover your assignment" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "New Assignment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry creation", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/assessments/${savedId}/edit`));
  expect(await count(request)).toBe(before + 1);
});

test("slot races retain input, then upload creation fits a reduced-motion phone viewport", async ({
  page,
  request,
}) => {
  await loginAs(page, "teacher");
  const contextResponse = await request.get(
    `${origin}/api/assessments/class/${classId}/creation-context`,
    { headers: headers() },
  );
  const context = (await contextResponse.json()).data;
  if (
    !context.periods.find(
      (period: { key: string }) => period.key === context.defaultPeriod,
    ).workbook
  ) {
    const primed = await request.post(`${origin}/api/assessments/editor`, {
      headers: headers(),
      data: {
        mutationId: randomUUID(),
        classId,
        action: "save",
        settings: {
          title: "Placement fixture",
          type: "quiz",
          quarter: context.defaultPeriod,
          classRecordCategory: "written_work",
        },
        questions: [],
      },
    });
    expect(primed.ok()).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await count(request);
  await open(page);
  await placement(page, "File upload assignment");
  await page
    .getByLabel("Slot placement", { exact: true })
    .selectOption("manual");
  const slot = await page
    .getByLabel("Class-record slot", { exact: true })
    .locator("option:not([disabled])")
    .nth(1)
    .getAttribute("value");
  await page
    .getByLabel("Class-record slot", { exact: true })
    .selectOption(slot!);
  const period = await page.getByLabel("Academic period").inputValue();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Assignment name").fill("Upload race verification");
  await expect(
    page.getByLabel("Maximum attempts", { exact: true }),
  ).toHaveCount(0);
  const competing = await request.post(`${origin}/api/assessments/editor`, {
    headers: headers(),
    data: {
      mutationId: randomUUID(),
      classId,
      action: "save",
      settings: {
        title: "Competing draft",
        type: "quiz",
        quarter: period,
        classRecordCategory: "written_work",
        classRecordItemId: slot,
      },
      questions: [],
    },
  });
  expect(competing.ok(), await competing.text()).toBeTruthy();
  const conflict = await submit(page, "Create file upload assignment");
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).code).toBe("ASSESSMENT_SLOT_UNAVAILABLE");
  await expect(
    page.getByRole("heading", { name: "Class record setup" }),
  ).toBeVisible();
  expect(await count(request)).toBe(before + 1);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Assignment name")).toHaveValue(
    "Upload race verification",
  );
  await page.screenshot({
    path: test.info().outputPath("04-phone-upload.png"),
  });
  const dialog = page.getByRole("dialog");
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  const created = await submit(page, "Create file upload assignment");
  expect(created.ok(), await created.text()).toBeTruthy();
  expect(await count(request)).toBe(before + 2);
  await expect(
    page.getByRole("status", { name: "Assignment created" }),
  ).toBeVisible();
});

test("publishing an unplaced draft returns placement errors and rolls back content changes", async ({
  request,
}) => {
  const createdResponse = await request.post(
    `${origin}/api/assessments/editor`,
    {
      headers: headers(),
      data: {
        mutationId: randomUUID(),
        classId,
        action: "save",
        settings: {
          title: "Unplaced upload",
          type: "file_upload",
          quarter: "Q1",
        },
        questions: [],
      },
    },
  );
  expect(createdResponse.ok()).toBeTruthy();
  const draft = (await createdResponse.json()).data.assessment;
  const published = await request.put(
    `${origin}/api/assessments/${draft.id}/editor`,
    {
      headers: headers(),
      data: {
        mutationId: randomUUID(),
        expectedRevision: draft.editorRevision,
        action: "publish",
        settings: {
          title: "Should roll back",
          passingScore: 60,
          fileUploadInstructions: "Upload your portfolio.",
          allowedUploadExtensions: ["pdf"],
          allowedUploadMimeTypes: ["application/pdf"],
          maxUploadSizeBytes: 1048576,
        },
      },
    },
  );
  expect(published.status()).toBe(400);
  const failure = await published.json();
  expect(failure.code).toBe("ASSESSMENT_NOT_READY");
  expect(failure.fieldErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: "classRecordCategory" }),
      expect.objectContaining({ field: "classRecordItemId" }),
    ]),
  );
  const saved = await request.get(`${origin}/api/assessments/${draft.id}`, {
    headers: headers(),
  });
  expect((await saved.json()).data).toMatchObject({
    title: "Unplaced upload",
    isPublished: false,
    editorRevision: draft.editorRevision,
  });
});
