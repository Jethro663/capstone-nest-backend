import { fireEvent, render, screen } from "@testing-library/react";
import { StudentJaReplayPicker } from "@/components/student/ja/StudentJaReplayPicker";

describe("StudentJaReplayPicker", () => {
  it("shows Replay states and wires assessment selection", () => {
    const onSelectAttempt = jest.fn();

    render(
      <StudentJaReplayPicker
        attempts={[
          {
            attemptId: "attempt-1",
            assessmentId: "assessment-1",
            assessmentTitle: "Fractions quiz",
            submittedAt: "2026-08-29T00:00:00.000Z",
            score: 70,
            passed: false,
            isReplayCompleted: false,
          },
          {
            attemptId: "attempt-2",
            assessmentId: "assessment-2",
            assessmentTitle: "Decimals quiz",
            submittedAt: "2026-08-28T00:00:00.000Z",
            score: 90,
            passed: true,
            isReplayCompleted: true,
            replayScore: 100,
          },
        ]}
        disabled={false}
        onSelectAttempt={onSelectAttempt}
      />,
    );

    expect(screen.getByText(/JA Replay Pending/)).toBeInTheDocument();
    expect(screen.getByText("Replay Score: 100%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Fractions quiz/i }));
    expect(onSelectAttempt).toHaveBeenCalledWith("attempt-1");
  });

  it("keeps the empty state calm and explicit", () => {
    render(
      <StudentJaReplayPicker
        attempts={[]}
        disabled={false}
        onSelectAttempt={jest.fn()}
      />,
    );

    expect(screen.getByText(/No class assessments found/i)).toBeInTheDocument();
  });
});
