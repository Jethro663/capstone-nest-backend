// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { TeacherAiJobsPanel } from "../teacher-assessments/TeacherAiJobsPanel";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Pressable: component("Pressable"),
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    TeacherPanel: ({ title, subtitle, children }: any) =>
      ReactRuntime.createElement(
        "TeacherPanel",
        null,
        ReactRuntime.createElement("Text", null, title),
        ReactRuntime.createElement("Text", null, subtitle),
        children,
      ),
    TeacherEmpty: ({ title, subtitle }: any) =>
      ReactRuntime.createElement(
        "TeacherEmpty",
        null,
        ReactRuntime.createElement("Text", null, title),
        ReactRuntime.createElement("Text", null, subtitle),
      ),
    teacherTheme: {
      text: "#fff",
      subtext: "#bbb",
      muted: "#999",
      border: "#333",
      surface2: "#222",
      red: "#f00",
      redSoft: "#300",
      redLine: "#600",
      active: "#444",
    },
  };
});

const jobs = [
  {
    jobId: "job-approved",
    jobType: "quiz_generation",
    classId: "class-1",
    title: "Fractions checkpoint",
    status: "approved",
    progressPercent: 100,
    statusMessage: null,
    errorMessage: null,
    outputId: "output-1",
    assessmentId: "assessment-1",
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z",
  },
  {
    jobId: "job-processing",
    jobType: "quiz_generation",
    classId: "class-2",
    title: "Geometry review",
    status: "processing",
    progressPercent: 60,
    statusMessage: "Writing questions",
    errorMessage: null,
    outputId: null,
    assessmentId: null,
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:01:00.000Z",
  },
];

function flatten(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) =>
      typeof child === "string"
        ? child
        : flatten(child as TestRenderer.ReactTestInstance),
    )
    .join(" ");
}

it("shows named web jobs with resume, assessment, and delete actions", async () => {
  const onResume = jest.fn();
  const onOpenAssessment = jest.fn();
  const onRequestDelete = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = TestRenderer.create(
      <TeacherAiJobsPanel
        jobs={jobs as never}
        classNames={{ "class-1": "MATH-7A", "class-2": "MATH-7B" }}
        loading={false}
        error={false}
        onRefresh={jest.fn()}
        onResume={onResume}
        onOpenAssessment={onOpenAssessment}
        onRequestDelete={onRequestDelete}
      />,
    );
  });

  const root = renderer!.root;
  expect(flatten(root)).toContain("Fractions checkpoint");
  expect(flatten(root)).not.toContain("job-approved");
  expect(flatten(root)).toContain("Approved");
  expect(flatten(root)).toContain("Processing");

  const press = (label: string) =>
    root.find(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
    ).props.onPress();
  press("Resume Fractions checkpoint");
  press("Open Fractions checkpoint assessment");
  press("Delete Geometry review job");

  expect(onResume).toHaveBeenCalledWith(jobs[0]);
  expect(onOpenAssessment).toHaveBeenCalledWith(jobs[0]);
  expect(onRequestDelete).toHaveBeenCalledWith(jobs[1]);
});
