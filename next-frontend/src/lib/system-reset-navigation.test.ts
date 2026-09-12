import {
  markResetEntrySource,
  returnFromReset,
} from "./system-reset-navigation";

it("pops an actual app entry and replaces for an unproven direct link", () => {
  const router = { back: jest.fn(), replace: jest.fn() };
  history.pushState({}, "", "/dashboard/admin/system-settings/academic-year");
  markResetEntrySource("/dashboard/admin/system-settings/academic-year");
  returnFromReset(router, "/dashboard/admin/system-settings/academic-year");
  expect(router.back).toHaveBeenCalledTimes(1);
  returnFromReset(router, "/dashboard/admin/system-settings/academic-year");
  expect(router.replace).toHaveBeenCalledWith(
    "/dashboard/admin/system-settings",
  );
});
