import fs from "node:fs";
import path from "node:path";
import { adminSettingsTaskRoutes } from "../admin-route-manifest";
import { adminWebRouteParity } from "../admin-parity-manifest";

it("places reset beneath settings with web parity and keeps its progress above auth navigation", () => {
  expect(adminSettingsTaskRoutes.resetSchoolData).toBe(
    "AdminSettingsResetSchoolData",
  );
  expect(adminWebRouteParity).toContainEqual(
    expect.objectContaining({
      webPath: "/dashboard/admin/system-settings/reset-school-data",
      mobileRoute: "AdminSettingsResetSchoolData",
    }),
  );
  const read = (file: string) =>
    fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");
  const navigator = read("navigation/AppNavigator.tsx");
  const admin = navigator.slice(navigator.indexOf("function AdminNavigator"));
  expect(admin).toMatch(
    /name="AdminSettingsResetSchoolData"\s+component=\{AdminSystemResetScreen\}/,
  );
  expect(read("bootstrap/AppRoot.tsx")).toMatch(
    /<SystemResetProvider>\s*<SystemResetProgressGate>\s*<AppNavigator/,
  );
  expect(read("screens/SystemResetProgressGate.tsx")).not.toContain(
    "AdminScreen",
  );
});
