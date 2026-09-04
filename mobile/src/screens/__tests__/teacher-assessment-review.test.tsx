import React from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { TeacherAssessmentReviewScreen } from "../TeacherAssessmentReviewScreen";
import {
  useAssessmentResult,
  useTeacherReturnGradeMutation,
  useTeacherUnreturnGradeMutation,
} from "../../api/hooks";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: any) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Alert: { alert: jest.fn() },
    Image: component("Image"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View"),
  };
});

type TestNode = { props: Record<string, any> };
type TestTree = {
  root: {
    findAllByType: (type: unknown) => TestNode[];
    findByProps: (props: Record<string, unknown>) => TestNode;
  };
};
const TestRenderer = require("react-test-renderer") as {
  create: (element: React.ReactElement) => TestTree;
  act: (callback: () => unknown) => Promise<void>;
};
const { act } = TestRenderer;

jest.mock("../../api/hooks", () => ({
  useAssessmentResult: jest.fn(),
  useTeacherReturnGradeMutation: jest.fn(),
  useTeacherUnreturnGradeMutation: jest.fn(),
}));
jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: {
    openAttemptSubmissionAttachmentFile: jest.fn(),
    downloadAttemptSubmissionAttachmentFile: jest.fn(),
  },
}));
jest.mock("../../api/http", () => ({
  toAppError: (error: Error) => error,
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => ({
  TeacherActionButton: ({ label, onPress, disabled }: any) => (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
    />
  ),
  TeacherChip: ({ label, onPress }: any) => (
    <Pressable accessibilityLabel={label} onPress={onPress} />
  ),
  TeacherPanel: ({ children }: any) => <View>{children}</View>,
  TeacherScreen: ({ children }: any) => <View>{children}</View>,
  TeacherStats: ({ items }: any) => (
    <View>
      {items.map((item: any) => (
        <Text key={item.label}>{item.value}</Text>
      ))}
    </View>
  ),
  stripRichText: (value: string) => value,
  teacherTheme: {
    active: "#fff",
    amber: "#a00",
    border: "#ddd",
    dim: "#999",
    green: "#080",
    muted: "#666",
    red: "#a00",
    redSoft: "#fee",
    text: "#111",
  },
}));

const mockedUseAssessmentResult = useAssessmentResult as jest.Mock;
const mockedUseReturnGrade = useTeacherReturnGradeMutation as jest.Mock;
const mockedUseUnreturnGrade = useTeacherUnreturnGradeMutation as jest.Mock;

describe("TeacherAssessmentReviewScreen bonus evidence", () => {
  it("requires a bonus reason and sends the explicit bounded-score fields", async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockedUseAssessmentResult.mockReturnValue({
      data: {
        score: 50,
        scorePercent: 50,
        scoreBreakdown: {
          basePoints: 5,
          bonusPoints: 0,
          awardedPoints: 5,
          possiblePoints: 10,
          effectivePoints: 5,
          scorePercent: 50,
          wasCapped: false,
          bonusReason: null,
        },
        passed: false,
        isReturned: false,
        attemptNumber: 1,
        assessment: {
          id: "assessment-1",
          title: "Ten-point quiz",
          type: "quiz",
          totalPoints: 10,
          rubricCriteria: [],
        },
        responses: [],
      },
      isRefetching: false,
      refetch: jest.fn(),
    });
    mockedUseReturnGrade.mockReturnValue({ mutateAsync, isPending: false });
    mockedUseUnreturnGrade.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    let renderer!: TestTree;

    await act(async () => {
      renderer = TestRenderer.create(
        <TeacherAssessmentReviewScreen
          navigation={{ goBack: jest.fn() } as never}
          route={
            {
              key: "TeacherAssessmentReview",
              name: "TeacherAssessmentReview",
              params: { assessmentId: "assessment-1", attemptId: "attempt-1" },
            } as never
          }
        />,
      );
    });

    const bonusInput = renderer.root
      .findAllByType(TextInput)
      .find((node: TestNode) => node.props.placeholder === "0")!;
    await act(async () => bonusInput.props.onChangeText("2"));
    const returnButton = renderer.root.findByProps({
      accessibilityLabel: "Return grade",
    });
    await act(async () => returnButton.props.onPress());
    expect(alert).toHaveBeenCalledWith(
      "Bonus reason required",
      "Explain why the bonus points were added.",
    );
    expect(mutateAsync).not.toHaveBeenCalled();

    const reasonInput = renderer.root
      .findAllByType(TextInput)
      .find(
        (node: TestNode) =>
          node.props.placeholder === "Reason for bonus (required)",
      )!;
    await act(async () =>
      reasonInput.props.onChangeText("Corrected teacher scoring omission"),
    );
    await act(async () => returnButton.props.onPress());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        bonusPoints: 2,
        bonusReason: "Corrected teacher scoring omission",
      }),
    );
    expect(
      renderer.root
        .findAllByType(Text)
        .some((node: TestNode) =>
          String(node.props.children).includes("5/10 · 50%"),
        ),
    ).toBe(true);
  });
});
