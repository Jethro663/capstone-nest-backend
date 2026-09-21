// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { mobileBrand } from "../../../theme/mobileBrand";
import { MobileAction } from "../MobileAction";
import { MobileAppBar } from "../MobileAppBar";
import { MobileFilterSheet } from "../MobileFilterSheet";
import { MobileOverflowAction } from "../MobileOverflowAction";
import { MobileScoreState } from "../MobileScoreState";
import { MobileSegmentedTabs } from "../MobileSegmentedTabs";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    Modal: ({ visible, children, ...props }: Record<string, unknown>) =>
      visible ? ReactRuntime.createElement("Modal", props, children) : null,
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
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

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 18, left: 0 }),
}));

describe("shared mobile design system", () => {
  it("uses the approved navy frame and red intent tokens", () => {
    expect(mobileBrand.navy).toBe("#0C1D3A");
    expect(mobileBrand.red).toBe("#DC2626");
    expect(mobileBrand.minTarget).toBe(44);
  });

  it("renders one navy app bar with accessible navigation and refresh actions", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MobileAppBar
          title="Assessments"
          navigationLabel="Back"
          navigationIcon="arrow-left"
          onNavigationPress={jest.fn()}
          onRefresh={jest.fn()}
        />,
      );
    });

    const bar = renderer!.root.findByProps({ testID: "mobile-app-bar" });
    expect(bar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: mobileBrand.navy }),
      ]),
    );
    const back = renderer!.root
      .findByProps({ accessibilityLabel: "Back" })
      .findByType("Pressable");
    const refresh = renderer!.root
      .findByProps({ accessibilityLabel: "Refresh Assessments" })
      .findByType("Pressable");
    expect(back.props.style.minWidth).toBe(44);
    expect(refresh.props.style.minWidth).toBe(44);
    expect(back.props.style.backgroundColor).toBe(mobileBrand.inverseSurface);
    expect(refresh.props.style.backgroundColor).toBe(mobileBrand.inverseSurface);
  });

  it("keeps four action variants visually distinct and accessible", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <MobileAction label="Save" variant="primary" onPress={jest.fn()} />
          <MobileAction label="Preview" variant="secondary" onPress={jest.fn()} />
          <MobileAction label="Cancel" variant="tertiary" onPress={jest.fn()} />
          <MobileAction label="More" variant="icon" icon="dots-horizontal" onPress={jest.fn()} />
        </>,
      );
    });

    for (const label of ["Save", "Preview", "Cancel", "More"]) {
      expect(renderer!.root.findByProps({ accessibilityLabel: label }).props.style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it("opens one compact filter trigger and selects from a bottom sheet", () => {
    const onSelect = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MobileFilterSheet
          label="Filter status"
          activeKey="all"
          options={[
            { key: "all", label: "All", count: 12 },
            { key: "draft", label: "Draft", count: 3 },
          ]}
          onSelect={onSelect}
        />,
      );
    });

    const trigger = renderer!.root.findByProps({ accessibilityLabel: "Filter status: All" });
    expect(trigger.props.style.minHeight).toBeGreaterThanOrEqual(44);
    act(() => trigger.props.onPress());
    const draft = renderer!.root.findByProps({ accessibilityLabel: "Draft, 3 results" });
    expect(draft.props.accessibilityState).toEqual({ selected: false });
    act(() => draft.props.onPress());
    expect(onSelect).toHaveBeenCalledWith("draft");
  });

  it("separates persistent tabs, overflow actions, and score states", () => {
    const onSelect = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <MobileSegmentedTabs
            accessibilityLabel="Assessment sections"
            activeKey="overview"
            items={[{ key: "overview", label: "Overview" }, { key: "analytics", label: "Analytics" }]}
            onSelect={onSelect}
          />
          <MobileOverflowAction accessibilityLabel="More actions for Module 1" onPress={jest.fn()} />
          <MobileScoreState score={18} maximum={20} state="returned" />
        </>,
      );
    });

    act(() => renderer!.root.findByProps({ accessibilityLabel: "Analytics" }).props.onPress());
    expect(onSelect).toHaveBeenCalledWith("analytics");
    const overflow = renderer!.root.findAllByProps({ accessibilityLabel: "More actions for Module 1" }).find((node) => node.type === "Pressable");
    expect(overflow).toBeTruthy();
    expect(overflow.props.style).toEqual(expect.objectContaining({ width: 44, height: 44 }));
    expect(renderer!.root.findByProps({ testID: "mobile-score-state" })).toBeTruthy();
  });
});
