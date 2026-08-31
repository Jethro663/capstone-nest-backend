import React from "react";
type TestTree = {
  root: {
    findAllByType: (name: string) => Array<{ props: Record<string, any> }>;
  };
  unmount(): void;
};
const TestRenderer = require("react-test-renderer") as {
  create: (element: React.ReactElement) => TestTree;
  act: (callback: () => unknown) => Promise<void>;
};
const { act } = TestRenderer;
import { useQuery } from "@tanstack/react-query";
import { AcademicWorkbook } from "../AcademicWorkbook";
const mockInvalidate = jest.fn().mockResolvedValue(undefined);
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const c = (name: string) => (props: any) =>
    ReactRuntime.createElement(name, props, props.children);
  return { View: c("View"), Text: c("Text"), Alert: { alert: jest.fn() } };
});
jest.mock("../../teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const c = (name: string) => (props: any) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    TeacherActionButton: c("Action"),
    TeacherChip: c("Chip"),
    TeacherInlineField: c("Field"),
    TeacherPanel: c("Panel"),
    teacherTheme: { text: "#142B4F" },
  };
});
jest.mock("../../teacher/MobileClassRecordWorkbook", () => ({
  MobileClassRecordWorkbook: () => null,
}));
jest.mock("../AcademicAnnualPanel", () => ({
  AcademicAnnualPanel: () => null,
}));
jest.mock("../../../api/services/class-record", () => ({ classRecordApi: {} }));
jest.mock("../../../api/services/classes", () => ({ classesApi: {} }));
jest.mock("../../../api/services/academic-state", () => ({
  academicStateService: {},
}));
jest.mock("../../../api/http", () => ({ toAppError: (e: Error) => e }));
jest.mock("../../../lib/academic-workbook-export", () => ({
  exportAcademicCsv: jest.fn(),
}));
const mockQuery = useQuery as jest.Mock;
const policy = {
  id: "policy",
  schoolYear: "2026-2027",
  periods: [
    { key: "Q1", label: "Term 1" },
    { key: "Q2", label: "Term 2" },
    { key: "Q3", label: "Term 3" },
  ],
};
const record = {
  id: "record",
  classId: "class",
  gradingPeriod: "Q1",
  status: "draft",
  revision: 0,
};
function mockEvidence(ready: boolean, stale = false) {
  const values: Record<string, unknown> = {
    class: {
      cls: {
        schoolYear: policy.schoolYear,
        isActive: true,
        subjectName: "Math",
      },
      current: { schoolYear: policy.schoolYear, quarter: "Q1" },
      policy,
    },
    record: {
      sheet: {
        classRecord: record,
        policy,
        academicCapabilities: { canGrade: true, canPrepare: true },
        canReopen: false,
        header: { periodLabel: "Term 1" },
        students: [],
        categories: [],
      },
      roster: { participants: [] },
      readiness: {
        ready,
        blockers: ready
          ? []
          : [{ code: "unknown_roster", message: "Confirm eligibility" }],
      },
    },
  };
  mockQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === "class-records" ? [record] : values[queryKey[1]],
    isError: queryKey[1] === "record" && stale,
    isFetching: false,
  }));
}
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});
it("offers only policy periods and blocks finalization with unknown eligibility", async () => {
  mockEvidence(false);
  let tree!: TestTree;
  await act(async () => {
    tree = TestRenderer.create(<AcademicWorkbook classId="class" />);
  });
  expect(
    tree.root.findAllByType("Action" as any).map((n) => n.props.label),
  ).toEqual(
    expect.arrayContaining(["Term 1", "Create Term 2", "Create Term 3"]),
  );
  expect(
    tree.root
      .findAllByType("Action" as any)
      .some((n) => /Q4|Term 4/.test(n.props.label)),
  ).toBe(false);
  await act(async () => {
    tree.root
      .findAllByType("Chip" as any)
      .find((n) => n.props.label === "readiness")!
      .props.onPress();
  });
  expect(
    tree.root
      .findAllByType("Action" as any)
      .find((n) => n.props.label === "Finalize verified period")!.props
      .disabled,
  ).toBe(true);
  await act(async () => tree.unmount());
});
it("fails closed after readiness refresh errors even if old readiness was true", async () => {
  mockEvidence(true, true);
  let tree!: TestTree;
  await act(async () => {
    tree = TestRenderer.create(<AcademicWorkbook classId="class" />);
  });
  await act(async () => {
    tree.root
      .findAllByType("Chip" as any)
      .find((n) => n.props.label === "readiness")!
      .props.onPress();
  });
  expect(
    tree.root
      .findAllByType("Action" as any)
      .find((n) => n.props.label === "Finalize verified period")!.props
      .disabled,
  ).toBe(true);
  await act(async () => tree.unmount());
});
