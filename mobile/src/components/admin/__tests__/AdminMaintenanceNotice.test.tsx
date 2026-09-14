// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AdminMaintenanceNotice } from "../AdminMaintenanceNotice";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = jest.fn();
let maintenance = {
  status: null,
  isCachedOffline: false,
};

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    Pressable: component("Pressable"),
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate, getParent: () => null }),
}));

jest.mock("../../../hooks/useAdminMaintenance", () => ({
  useAdminMaintenance: () => maintenance,
}));

function renderedText(root: TestRenderer.ReactTestInstance) {
  return root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .join(" ");
}

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("react-test-renderer is deprecated")
      ) {
        return;
      }
      originalConsoleError(...(args as Parameters<typeof console.error>));
    });
});

afterAll(() => consoleErrorSpy.mockRestore());

describe("AdminMaintenanceNotice", () => {
  it("shows persistent ON copy for a manual session with no expiry", () => {
    maintenance = {
      status: { active: true, mode: "manual", expiresAt: null },
      isCachedOffline: false,
    };
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<AdminMaintenanceNotice />);
    });

    expect(renderedText(renderer!.root)).toMatch(
      /maintenance access is on.*until turned off, sign-out, or password change/i,
    );
  });
});
