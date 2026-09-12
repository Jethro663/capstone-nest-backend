import {
  clearResetOperationId,
  readResetOperationId,
  rememberResetOperationId,
} from "./system-reset-session";

const a = "9e84bb50-91f1-4fba-83e0-e1d84643a6d0";
const b = "709de236-c128-4f6a-a4e3-e193ce605f3c";
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState({}, "", "/system-maintenance");
});
afterEach(() => jest.restoreAllMocks());
it("keeps saved A authoritative over a URL containing B", () => {
  rememberResetOperationId(a);
  history.replaceState({}, "", `/system-maintenance?operation=${b}`);
  expect(readResetOperationId()).toBe(a);
});
it("keeps the reviewed UUID after the tab-scoped session store is cleared", () => {
  rememberResetOperationId(a);
  expect(localStorage.getItem("nexora.systemReset.operationId")).toBe(a);
  expect(sessionStorage.getItem("nexora.systemReset.operationId")).toBeNull();

  sessionStorage.clear();

  expect(readResetOperationId()).toBe(a);
});
it("removes a malformed durable recovery record before accepting a new UUID", () => {
  localStorage.setItem("nexora.systemReset.operationId", "not-a-uuid");

  expect(readResetOperationId()).toBeNull();
  expect(localStorage.getItem("nexora.systemReset.operationId")).toBeNull();
  expect(() => rememberResetOperationId(a)).not.toThrow();
  expect(readResetOperationId()).toBe(a);
});
it("does not adopt a public URL as a locally reviewed request", () => {
  history.replaceState({}, "", `/system-maintenance?operation=${b}`);
  expect(readResetOperationId()).toBeNull();
});
it("throws if the operation cannot be durably stored before execute", () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  expect(() => rememberResetOperationId(a)).toThrow();
});
it("reports denied cleanup so callers can complete other cleanup and retry", () => {
  rememberResetOperationId(a);
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  expect(() => clearResetOperationId()).toThrow();
});
