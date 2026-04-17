import {
  studentParityRouteInventory,
  studentSupportRouteInventory,
} from "../../screens/screen-flow";
import {
  studentMountedStackRouteNames,
  studentParityRouteNames,
  studentStackRouteNames,
  studentSupportRouteNames,
  studentTabRouteNames,
} from "../../navigation/student-route-manifest";
import type { MainTabParamList, RootStackParamList } from "../../navigation/types";

describe("student parity navigation", () => {
  it("keeps the required student route set typed across tabs and stack routes", () => {
    const tabRoutes: ReadonlyArray<keyof MainTabParamList> = studentTabRouteNames;
    const stackRoutes: ReadonlyArray<keyof RootStackParamList> = studentStackRouteNames;
    const supportRoutes: ReadonlyArray<keyof RootStackParamList> = studentSupportRouteNames;

    expect(tabRoutes).toEqual(studentTabRouteNames);
    expect(stackRoutes).toEqual(studentStackRouteNames);
    expect(supportRoutes).toEqual(studentSupportRouteNames);

    expect(studentParityRouteNames).toEqual([...studentTabRouteNames, ...studentStackRouteNames]);
    expect(studentMountedStackRouteNames).toEqual([...studentStackRouteNames, ...studentSupportRouteNames]);

    expect(studentParityRouteInventory.map((route) => route.name)).toEqual(studentParityRouteNames);
    expect(studentSupportRouteInventory.map((route) => route.name)).toEqual(studentSupportRouteNames);
  });
});
