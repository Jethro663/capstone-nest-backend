// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  ROLE_DRAWER_GROUPS,
  ROLE_DRAWER_PROFILE_DESTINATION,
  flattenRoleDrawerDestinations,
} from "../../../navigation/role-drawer-model";
import { teacherDrawerRouteNames } from "../../../navigation/teacher-route-manifest";
import {
  RoleHeaderNavigationButton,
  RoleDrawerProvider,
  RoleMenuButton,
} from "../RoleNavigationDrawer";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  return {
    Image: component("Image"),
    Modal: ({ visible, children, ...props }: Record<string, unknown>) =>
      visible ? ReactRuntime.createElement("Modal", props, children) : null,
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    View: component("View"),
    useWindowDimensions: () => ({ width: 400, height: 840 }),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 20, left: 0 }),
}));

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("react-test-renderer is deprecated")) return;
    originalConsoleError(...(args as Parameters<typeof console.error>));
  });
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("role drawer destination contracts", () => {
  it("groups every approved teacher destination without the redundant More route", () => {
    expect(ROLE_DRAWER_GROUPS.teacher.map((group) => group.label)).toEqual([
      "Teaching",
      "Content & records",
      "Insights & support",
    ]);
    expect(flattenRoleDrawerDestinations("teacher").map((item) => item.label)).toEqual([
      "Home",
      "My Classes",
      "My Sections",
      "Assessments",
      "Calendar",
      "Lessons",
      "Nexora Library",
      "Class Record",
      "Announcements",
      "Reports",
      "Interventions",
      "Performance",
      "Evaluations",
    ]);
    expect(flattenRoleDrawerDestinations("teacher").some((item) => item.route === "TeacherMore")).toBe(false);
    expect(flattenRoleDrawerDestinations("teacher").every((item) => item.kind === "tab")).toBe(true);
  });

  it("preserves the existing student and admin tab destinations", () => {
    expect(flattenRoleDrawerDestinations("student").map((item) => item.route)).toEqual([
      "Dashboard",
      "Classes",
      "Assessments",
      "StudentCalendar",
      "JA",
      "Announcements",
    ]);
    expect(flattenRoleDrawerDestinations("admin").map((item) => item.route)).toEqual([
      "Home",
      "Classes",
      "Assessments",
      "Academic",
    ]);
    expect(ROLE_DRAWER_PROFILE_DESTINATION).toMatchObject({
      label: "Profile",
      route: "Profile",
      kind: "tab",
    });
  });

  it("keeps the teacher navigator in the exact order shown by the drawer", () => {
    expect([
      ...flattenRoleDrawerDestinations("teacher").map((item) => item.route),
      ROLE_DRAWER_PROFILE_DESTINATION.route,
    ]).toEqual(teacherDrawerRouteNames);
  });
});

describe("RoleDrawerProvider", () => {
  it("opens from a 44px hamburger, renders an 84% drawer, navigates, and closes", () => {
    const onNavigate = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <RoleDrawerProvider role="teacher" activeRouteName="Home" onNavigate={onNavigate}>
          <RoleMenuButton />
        </RoleDrawerProvider>,
      );
    });

    const trigger = renderer!.root.findByProps({ accessibilityLabel: "Open navigation menu" });
    expect(trigger.props.style).toMatchObject({ width: 44, height: 44 });

    act(() => trigger.props.onPress());

    const drawer = renderer!.root.findByProps({ testID: "role-navigation-drawer" });
    expect(drawer.props.style.width).toBe(336);
    expect(renderer!.root.findByProps({ accessibilityLabel: "Close navigation menu" })).toBeTruthy();

    const classes = renderer!.root.findByProps({ accessibilityLabel: "Go to My Classes" });
    act(() => classes.props.onPress());

    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ label: "My Classes", route: "Classes", kind: "tab" }),
    );
    expect(renderer!.root.findAllByProps({ testID: "role-navigation-drawer" })).toHaveLength(0);
  });

  it("falls back to Back outside a root drawer context", () => {
    const onBackPress = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <RoleHeaderNavigationButton onBackPress={onBackPress} />,
      );
    });

    const back = renderer!.root.findByProps({ accessibilityLabel: "Back" });
    act(() => back.props.onPress());
    expect(onBackPress).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findAllByProps({ accessibilityLabel: "Open navigation menu" })).toHaveLength(0);
  });

  it("prefers the hamburger inside a drawer context even when Back is available", () => {
    const onBackPress = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <RoleDrawerProvider
          role="teacher"
          activeRouteName="TeacherCalendar"
          onNavigate={jest.fn()}
        >
          <RoleHeaderNavigationButton onBackPress={onBackPress} />
        </RoleDrawerProvider>,
      );
    });

    const menu = renderer!.root.findByProps({ accessibilityLabel: "Open navigation menu" });
    act(() => menu.props.onPress());

    expect(renderer!.root.findByProps({ testID: "role-navigation-drawer" })).toBeTruthy();
    expect(renderer!.root.findAllByProps({ accessibilityLabel: "Back" })).toHaveLength(0);
    expect(onBackPress).not.toHaveBeenCalled();
  });
});
