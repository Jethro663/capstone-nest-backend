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
import { classRecordApi } from "../../../api/services/class-record";
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
jest.mock("../../admin/AdminMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const c = (name: string) => (props: any) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    AdminButton: c("Action"),
    AdminChip: c("Chip"),
    AdminField: c("Field"),
    AdminSection: c("Panel"),
    adminTheme: { text: "#172033" },
  };
});
jest.mock("../../teacher/MobileClassRecordWorkbook", () => ({
  MobileClassRecordWorkbook: () => null,
}));
jest.mock("../../ui/MobileFilterSheet", () => ({
  MobileFilterSheet: (props: object) =>
    React.createElement("FilterSheet", props),
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
function mockEvidence(
  ready: boolean,
  stale = false,
  withScoreEvidence = false,
  withoutRecords = false,
) {
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
        students: withScoreEvidence
          ? [
              {
                studentId: "student-1",
                firstName: "Ana",
                lastName: "Cruz",
                accountState: "archived",
                eligibility: "eligible",
                categories: [
                  {
                    categoryId: "written",
                    scores: [5],
                    bonusPoints: [0],
                    bonusReasons: [null],
                    effectiveScores: [5],
                    scoreStatuses: ["recorded"],
                    scoreReasons: [null],
                  },
                ],
              },
            ]
          : [],
        categories: withScoreEvidence
          ? [
              {
                id: "written",
                name: "Written Work",
                weight: 30,
                items: [{ id: "item-1", title: "Quiz", hps: 10, order: 1 }],
              },
            ]
          : [],
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
    data: queryKey[0] === "class-records"
      ? (withoutRecords ? [] : [record])
      : withoutRecords && queryKey[1] === "record" ? undefined : values[queryKey[1]],
    isError: queryKey[1] === "record" && stale,
    isFetching: false,
  }));
}
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});
it("selects the current policy period when no workbook exists", async () => {
  mockEvidence(false, false, false, true);
  let tree!: TestTree;
  await act(async () => {
    tree = TestRenderer.create(<AcademicWorkbook classId="class" />);
  });
  expect(tree.root.findAllByType("FilterSheet" as any)
    .find((node) => node.props.label === "Grading period")!.props.activeKey).toBe("Q1");
  expect(tree.root.findAllByType("Action" as any)
    .some((node) => node.props.label === "Create Term 1")).toBe(true);
  await act(async () => tree.unmount());
});
it("offers only policy periods and blocks finalization with unknown eligibility", async () => {
  mockEvidence(false);
  let tree!: TestTree;
  await act(async () => {
    tree = TestRenderer.create(<AcademicWorkbook classId="class" />);
  });
  const periods = tree.root.findAllByType("FilterSheet" as any)
    .find((node) => node.props.label === "Grading period")!;
  expect(periods.props.options.map((option: { label: string }) => option.label))
    .toEqual(expect.arrayContaining(["Term 1", "Term 2 · Not created", "Term 3 · Not created"]));
  expect(
    tree.root
      .findAllByType("Action" as any)
      .some((n) => /Q4|Term 4/.test(n.props.label)),
  ).toBe(false);
  await act(async () => {
    tree.root.findAllByType("FilterSheet" as any)
      .find((node) => node.props.label === "Record view")!
      .props.onSelect("readiness");
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
    tree.root.findAllByType("FilterSheet" as any)
      .find((node) => node.props.label === "Record view")!
      .props.onSelect("readiness");
  });
  expect(
    tree.root
      .findAllByType("Action" as any)
      .find((n) => n.props.label === "Finalize verified period")!.props
      .disabled,
  ).toBe(true);
  await act(async () => tree.unmount());
});
it("requires a reason and sends explicit bonus evidence for a manual score", async () => {
  mockEvidence(true, false, true);
  const recordScore = jest.fn().mockResolvedValue(undefined);
  (classRecordApi as any).recordScore = recordScore;
  let tree!: TestTree;
  await act(async () => {
    tree = TestRenderer.create(<AcademicWorkbook classId="class" admin />);
  });

  await act(async () => {
    tree.root
      .findAllByType("FilterSheet" as any)
      .find((node) => node.props.label === "Learner")!
      .props.onSelect("student-1");
    tree.root
      .findAllByType("FilterSheet" as any)
      .find((node) => node.props.label === "Assessment item")!
      .props.onSelect("item-1");
  });

  const field = (label: string) =>
    tree.root
      .findAllByType("Field" as any)
      .find((node) => node.props.label === label)!;
  await act(async () => {
    field("Recorded score (blank is missing)").props.onChangeText("5");
    field("Bonus points (optional)").props.onChangeText("2");
  });
  expect(
    tree.root
      .findAllByType("Action" as any)
      .find((node) => node.props.label === "Save explicit score")!.props
      .disabled,
  ).toBe(true);

  await act(async () => {
    field("Bonus reason (required)").props.onChangeText(
      "Corrected teacher scoring omission",
    );
  });
  const save = tree.root
    .findAllByType("Action" as any)
    .find((node) => node.props.label === "Save explicit score")!;
  expect(save.props.disabled).toBe(false);
  await act(async () => save.props.onPress());

  expect(recordScore).toHaveBeenCalledWith("item-1", {
    studentId: "student-1",
    status: "recorded",
    score: 5,
    bonusPoints: 2,
    bonusReason: "Corrected teacher scoring omission",
  });
  await act(async () => tree.unmount());
});
it("sends a manual credited score with its excused reason", async () => {
  mockEvidence(true, false, true);
  const recordScore = jest.fn().mockResolvedValue(undefined);
  (classRecordApi as any).recordScore = recordScore;
  let tree!: TestTree;
  await act(async () => {
    tree = TestRenderer.create(<AcademicWorkbook classId="class" admin />);
  });

  await act(async () => {
    tree.root
      .findAllByType("FilterSheet" as any)
      .find((node) => node.props.label === "Learner")!
      .props.onSelect("student-1");
    tree.root
      .findAllByType("FilterSheet" as any)
      .find((node) => node.props.label === "Assessment item")!
      .props.onSelect("item-1");
  });

  const field = (label: string) =>
    tree.root
      .findAllByType("Field" as any)
      .find((node) => node.props.label === label)!;
  await act(async () => {
    field("Manual credited score for exemption").props.onChangeText("8");
    field("Exemption or correction reason").props.onChangeText(
      "Winner of the Division Science Fair",
    );
  });
  const save = tree.root
    .findAllByType("Action" as any)
    .find((node) => node.props.label === "Save score and mark excused")!;
  expect(save.props.disabled).toBe(false);
  await act(async () => save.props.onPress());

  expect(recordScore).toHaveBeenCalledWith("item-1", {
    studentId: "student-1",
    status: "excused_with_score",
    score: 8,
    reason: "Winner of the Division Science Fair",
  });
  await act(async () => tree.unmount());
});
