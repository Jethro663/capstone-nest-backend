import React from "react";
import { AppVersionInfo } from "../AppVersionInfo";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("../../services/update/version-identity", () => ({
  getInstalledNativeVersionInfo: () => ({
    currentNativeVersion: "0.1.16",
    currentVersionCode: 17,
  }),
}));

const TestRenderer = require("react-test-renderer");

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function flattenText(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  const children = Array.isArray(node.children)
    ? node.children
        .map((child: any) =>
          typeof child === "string" ? child : flattenText(child),
        )
        .join(" ")
    : "";
  return children;
}

describe("AppVersionInfo", () => {
  it("renders a subdued information icon and installed version identity", () => {
    let renderer: any;
    TestRenderer.act(() => {
      renderer = TestRenderer.create(<AppVersionInfo color="#64748b" />);
    });

    expect(flattenText(renderer.toJSON())).toContain(
      "Nexora Mobile · v0.1.16 (build 17)",
    );
    expect(
      renderer.root.findByType("MaterialCommunityIcons").props.name,
    ).toBe("information-outline");
  });
});
