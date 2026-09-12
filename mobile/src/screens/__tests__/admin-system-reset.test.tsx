import React from "react";
const { act, create } = require("react-test-renderer");
import { AdminSystemResetScreen } from "../AdminSystemResetScreen";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    Text: "Text",
    View: "View",
    Pressable: "Pressable",
    BackHandler: { addEventListener: () => ({ remove: jest.fn() }) },
    Alert: { alert: jest.fn() },
  };
});
jest.mock("@react-navigation/native", () => ({ useFocusEffect: jest.fn() }));
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "709de236-c128-4f6a-a4e3-e193ce605f3c"),
}));
jest.mock("../../components/admin/AdminMobilePrimitives", () => {
  const ReactRuntime = require("react");
  return Object.fromEntries(
    [
      "AdminScreen",
      "AdminSection",
      "AdminNotice",
      "AdminDataRow",
      "AdminField",
      "AdminChip",
      "AdminButton",
    ].map((name) => [
      name,
      (props: any) => ReactRuntime.createElement(name, props, props.children),
    ]),
  );
});
jest.mock("../../api/errors", () => ({
  normalizeApiError: (error: Error) => ({ message: error.message }),
}));
const codes = [
  "OTHER_ACCOUNTS_REMOVED",
  "SCHOOL_CONTENT_REMOVED",
  "FILES_AND_INDEXES_REMOVED",
  "AUDIT_AND_SETTINGS_RETAINED",
  "SIGN_IN_AGAIN",
];
const capability = {
  available: true,
  active: false,
  environment: "staging",
  blockers: [],
  retainedAdmin: {
    id: "admin",
    email: "admin@example.test",
    displayName: "Administrator",
  },
  acknowledgements: codes.map((code) => ({ code, label: code })),
};
const policy = {
  schoolYear: "2026-2027",
  periods: [
    { key: "T1", label: "First Term" },
    { key: "T2", label: "Second Term" },
  ],
};
const preview = {
  actor: capability.retainedAdmin,
  environment: "staging",
  schoolYear: "2026-2027",
  period: "T1",
  policy,
  expiresAt: "2099-01-01",
  generatedAt: "2026-09-12",
  confirmation: "RESET SCHOOL DATA",
  previewToken: "secret-preview",
  counts: { users: 5 },
  external: {},
  tables: [],
  schemaHash: "schema",
  catalogVersion: 1,
  epoch: 1,
};
let offline = false;
jest.mock("../../hooks/useAdminNetworkStatus", () => ({
  useAdminNetworkStatus: () => ({ isOffline: offline }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: string[] }) => ({
    data: options.queryKey.includes("policy") ? { policy } : capability,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: jest.fn(),
  }),
}));
jest.mock("../../api/services/system-reset", () => ({
  systemResetApi: {
    capability: jest.fn(),
    policy: jest.fn(),
    preview: jest.fn(),
    execute: jest.fn(),
  },
}));
const reset = {
  operationId: null as string | null,
  progress: "unknown",
  ready: true,
  storageError: null,
  begin: jest.fn().mockResolvedValue(undefined),
  forget: jest.fn().mockResolvedValue(undefined),
  show: jest.fn(),
  checkOwnedOperation: jest.fn(),
};
jest.mock("../../providers/SystemResetProvider", () => ({
  useSystemReset: () => reset,
}));
const api = jest.requireMock("../../api/services/system-reset").systemResetApi;
const alert = jest.requireMock("react-native").Alert.alert;
let renderer: any;
let root: any;
const button = (label: string) =>
  root
    .findAllByType("AdminButton")
    .find((node: any) => node.props.label === label);
const field = (label: string) =>
  root
    .findAllByType("AdminField")
    .find((node: any) => node.props.label === label);
beforeEach(async () => {
  jest.clearAllMocks();
  offline = false;
  capability.available = true;
  reset.operationId = null;
  reset.progress = "unknown";
  reset.begin.mockResolvedValue(undefined);
  reset.checkOwnedOperation.mockRejectedValue({ response: { status: 404 } });
  api.preview.mockResolvedValue(preview);
  api.execute.mockResolvedValue({
    operationId: "709de236-c128-4f6a-a4e3-e193ce605f3c",
    status: "running",
    phase: "draining",
  });
  await act(async () => {
    renderer = create(
      <AdminSystemResetScreen
        navigation={
          {
            canGoBack: () => false,
            navigate: jest.fn(),
            goBack: jest.fn(),
          } as never
        }
        route={{} as never}
      />,
    );
  });
  root = renderer.root;
});
afterEach(async () => {
  await act(async () => renderer.unmount());
});
async function review() {
  await act(async () => field("School year").props.onChangeText("2026-2027"));
  await act(async () =>
    root
      .findAllByType("AdminChip")
      .find((n: any) => n.props.label === "First Term")
      .props.onPress(),
  );
  await act(async () => button("Preview reset").props.onPress());
}
async function approve() {
  await review();
  await act(async () => button("Continue to confirmation").props.onPress());
  await act(async () => {
    field("Reason").props.onChangeText("Remove school evaluation fixtures");
    field("Current password").props.onChangeText("my-current-password");
    field("Exact confirmation").props.onChangeText("RESET SCHOOL DATA");
  });
  for (const code of codes)
    await act(async () =>
      root
        .findAllByType("Pressable")
        .find((n: any) => n.props.accessibilityLabel === code)
        .props.onPress(),
    );
}
it("uses server term choices and shows the retained account and audit warning", async () => {
  await review();
  expect(api.preview).toHaveBeenCalledWith({
    schoolYear: "2026-2027",
    period: "T1",
  });
  const notices = root
    .findAllByType("AdminNotice")
    .map((n: any) => `${n.props.title} ${n.props.description}`)
    .join(" ");
  expect(notices).toContain("admin@example.test");
  expect(notices).toContain("not total historical or forensic erasure");
});
it("requires the complete review and prevents offline execution", async () => {
  await approve();
  expect(button("Reset school data permanently").props.disabled).toBe(false);
  offline = true;
  await act(async () =>
    renderer.update(
      <AdminSystemResetScreen
        navigation={
          {
            canGoBack: () => true,
            navigate: jest.fn(),
            goBack: jest.fn(),
          } as never
        }
        route={{} as never}
      />,
    ),
  );
  expect(button("Reset school data permanently").props.disabled).toBe(true);
  expect(api.execute).not.toHaveBeenCalled();
});
it("persists known operation before execute and reuses the same reviewed request after uncertainty", async () => {
  await approve();
  api.execute.mockRejectedValueOnce(new Error("Network response lost"));
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  const choices = alert.mock.calls[0][2];
  await act(async () =>
    choices.find((c: any) => c.style === "destructive").onPress(),
  );
  expect(reset.begin).toHaveBeenCalledWith(
    "709de236-c128-4f6a-a4e3-e193ce605f3c",
  );
  expect(reset.begin.mock.invocationCallOrder[0]).toBeLessThan(
    api.execute.mock.invocationCallOrder[0],
  );
  const first = api.execute.mock.calls[0][0];
  await act(async () => button("Retry same request").props.onPress());
  expect(api.execute).toHaveBeenLastCalledWith(first);
});

it("prevents a second destructive press while the first request is in flight", async () => {
  await approve();
  let finish: (value: unknown) => void = () => {};
  api.execute.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  const destructive = alert.mock.calls[0][2].find(
    (choice: any) => choice.style === "destructive",
  );
  await act(async () => {
    destructive.onPress();
    destructive.onPress();
  });
  expect(api.execute).toHaveBeenCalledTimes(1);
  await act(async () =>
    finish({ operationId: "709de236-c128-4f6a-a4e3-e193ce605f3c" }),
  );
});

it("checks expiry again when the native confirmation is finally pressed", async () => {
  await approve();
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  const clock = jest
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse("2100-01-01"));
  try {
    await act(async () =>
      alert.mock.calls[0][2]
        .find((choice: any) => choice.style === "destructive")
        .onPress(),
    );
    expect(api.execute).not.toHaveBeenCalled();
  } finally {
    clock.mockRestore();
  }
});

it("removes the reviewed preview when the target year changes", async () => {
  await review();
  await act(async () => field("School year").props.onChangeText("2027-2028"));
  expect(button("Continue to confirmation")).toBeUndefined();
  expect(button("Preview reset").props.disabled).toBe(true);
});

it("clears pending tracking after a definite first-request rejection", async () => {
  await approve();
  api.execute.mockRejectedValueOnce({
    response: { status: 400 },
    message: "Request validation failed.",
  });
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  await act(async () =>
    alert.mock.calls[0][2]
      .find((choice: any) => choice.style === "destructive")
      .onPress(),
  );
  expect(reset.forget).toHaveBeenCalledTimes(1);
  expect(field("Current password").props.value).toBe("");
  expect(button("Retry same request")).toBeUndefined();
});

it("retains the known ID on a first-attempt conflict and retries only the same request", async () => {
  await approve();
  api.execute.mockRejectedValueOnce({
    response: { status: 409 },
    message: "An older request with this key may already have been accepted.",
  });
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  await act(async () =>
    alert.mock.calls[0][2]
      .find((choice: any) => choice.style === "destructive")
      .onPress(),
  );
  expect(reset.forget).not.toHaveBeenCalled();
  const original = api.execute.mock.calls[0][0];
  expect(reset.begin).toHaveBeenCalledWith(original.idempotencyKey);
  await act(async () => button("Retry same request").props.onPress());
  expect(api.execute).toHaveBeenLastCalledWith(original);
  expect(
    reset.begin.mock.calls.every(([id]) => id === original.idempotencyKey),
  ).toBe(true);
});

async function rerender() {
  await act(async () =>
    renderer.update(
      <AdminSystemResetScreen
        navigation={
          {
            canGoBack: () => true,
            navigate: jest.fn(),
            goBack: jest.fn(),
          } as never
        }
        route={{} as never}
      />,
    ),
  );
  root = renderer.root;
}

it("clears password and every approval when the native alert is canceled", async () => {
  await approve();
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  await act(async () =>
    alert.mock.calls[0][2]
      .find((choice: any) => choice.style === "cancel")
      .onPress?.(),
  );
  expect(button("Reset school data permanently")).toBeUndefined();
  await act(async () => button("Continue to confirmation").props.onPress());
  for (const label of ["Reason", "Current password", "Exact confirmation"])
    expect(field(label).props.value).toBe("");
  expect(
    root
      .findAllByType("Pressable")
      .filter((node: any) => node.props.accessibilityRole === "checkbox")
      .every((node: any) => node.props.accessibilityState.checked === false),
  ).toBe(true);
  expect(button("Reset school data permanently").props.disabled).toBe(true);
});

it.each(["offline", "capability", "pending"])(
  "rechecks latest %s state when the original native callback is pressed",
  async (change) => {
    await approve();
    await act(async () =>
      button("Reset school data permanently").props.onPress(),
    );
    const confirm = alert.mock.calls[0][2].find(
      (choice: any) => choice.style === "destructive",
    ).onPress;
    if (change === "offline") offline = true;
    if (change === "capability") capability.available = false;
    if (change === "pending")
      reset.operationId = "809de236-c128-4f6a-a4e3-e193ce605f3c";
    await rerender();
    await act(async () => confirm());
    expect(reset.begin).not.toHaveBeenCalled();
    expect(api.execute).not.toHaveBeenCalled();
  },
);

it("never posts if storing the operation ID fails", async () => {
  await approve();
  reset.begin.mockRejectedValueOnce(new Error("Storage denied"));
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  await act(async () =>
    alert.mock.calls[0][2]
      .find((choice: any) => choice.style === "destructive")
      .onPress(),
  );
  expect(api.execute).not.toHaveBeenCalled();
});

it("does not post when connectivity changes while operation persistence is pending", async () => {
  await approve();
  let stored: () => void = () => {};
  reset.begin.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        stored = resolve;
      }),
  );
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  await act(async () =>
    alert.mock.calls[0][2]
      .find((choice: any) => choice.style === "destructive")
      .onPress(),
  );
  offline = true;
  await rerender();
  await act(async () => stored());
  expect(api.execute).not.toHaveBeenCalled();
});

it("native dismissal clears approval without dropping a saved recovery UUID", async () => {
  const savedId = "809de236-c128-4f6a-a4e3-e193ce605f3c";
  reset.operationId = savedId;
  await rerender();
  await act(async () => button("Review again with saved ID").props.onPress());
  await approve();
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  await act(async () => alert.mock.calls[0][3].onDismiss());
  expect(button("Reset school data permanently")).toBeUndefined();
  expect(reset.operationId).toBe(savedId);
  expect(reset.forget).not.toHaveBeenCalled();
});

it("reviews a restored unknown request using the saved UUID even after an ambiguous 404 and a racing acceptance", async () => {
  // A remounted screen has no preview, password, request payload or uncertain flag.
  const savedId = "809de236-c128-4f6a-a4e3-e193ce605f3c";
  reset.operationId = savedId;
  await rerender();
  await act(async () => button("Check saved request").props.onPress());
  expect(reset.forget).not.toHaveBeenCalled();
  await act(async () => button("Review again with saved ID").props.onPress());
  await approve();
  const operations = new Set([savedId]); // The original request wins acceptance before this POST.
  api.execute.mockImplementationOnce(
    async (input: { idempotencyKey: string }) => {
      if (operations.has(input.idempotencyKey))
        throw {
          response: { status: 409 },
          message: "A different request already uses this UUID",
        };
      operations.add(input.idempotencyKey);
      return { operationId: input.idempotencyKey, status: "running" };
    },
  );
  await act(async () =>
    button("Reset school data permanently").props.onPress(),
  );
  await act(async () =>
    alert.mock.calls[0][2]
      .find((choice: any) => choice.style === "destructive")
      .onPress(),
  );
  expect(api.execute.mock.calls[0][0].idempotencyKey).toBe(savedId);
  expect(jest.requireMock("expo-crypto").randomUUID).not.toHaveBeenCalled();
  expect(operations.size).toBe(1);
  expect(reset.forget).not.toHaveBeenCalled();
  expect(reset.operationId).toBe(savedId);
  expect(button("View reset progress")).toBeDefined();
});
