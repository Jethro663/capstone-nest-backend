const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");

test("the embedded editor uses one remediated Tiptap release", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(mobileRoot, "package.json"), "utf8"),
  );
  const tiptapVersions = Object.entries(packageJson.dependencies)
    .filter(([name]) => name.startsWith("@tiptap/"))
    .map(([, version]) => version);

  assert.ok(tiptapVersions.length >= 3);
  assert.deepEqual([...new Set(tiptapVersions)], ["3.31.3"]);

  const generated = await readFile(
    path.join(mobileRoot, "src/generated/assessment-rich-text.ts"),
    "utf8",
  );
  assert.match(generated, /Generated with Tiptap 3\.31\.3/);
});
