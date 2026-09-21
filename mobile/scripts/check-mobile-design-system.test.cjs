const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isIgnoredSource,
  scanSource,
} = require("./check-mobile-design-system.cjs");

test("allows the token authority and explicit generated/test boundaries", () => {
  assert.equal(isIgnoredSource("src/theme/mobileBrand.ts"), true);
  assert.equal(isIgnoredSource("src/generated/assessment-rich-text.ts"), true);
  assert.equal(isIgnoredSource("src/components/__tests__/Card.test.tsx"), true);
});

test("reports direct colors with deterministic file and line evidence", () => {
  assert.deepEqual(
    scanSource(
      "src/screens/Example.tsx",
      'const first = "#FFFFFF";\nconst second = "rgba(12, 29, 58, 0.4)";\n',
    ),
    [
      {
        file: "src/screens/Example.tsx",
        line: 1,
        kind: "raw-color",
        value: "#FFFFFF",
      },
      {
        file: "src/screens/Example.tsx",
        line: 2,
        kind: "raw-color",
        value: "rgba(12, 29, 58, 0.4)",
      },
    ],
  );
});

test("reports generic Button and TouchableOpacity controls from React Native", () => {
  const violations = scanSource(
    "src/screens/Legacy.tsx",
    'import { Button, TouchableOpacity } from "react-native";\n',
  );
  assert.deepEqual(
    violations.map(({ kind, value }) => ({ kind, value })),
    [
      { kind: "legacy-control", value: "Button" },
      { kind: "legacy-control", value: "TouchableOpacity" },
    ],
  );
});
