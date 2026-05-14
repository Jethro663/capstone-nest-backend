"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { SharedAnswerInput } from "./shared-answer-input";

describe("SharedAnswerInput", () => {
  it("renders option images with bounded controls for multiple choice questions", () => {
    const onChange = jest.fn();

    render(
      <SharedAnswerInput
        question={{
          id: "question-1",
          type: "multiple_choice",
          options: [
            {
              id: "option-1",
              text: "Option 1",
              imageUrl: "/api/assessments/questions/images/option-1.png",
              imageDisplayMode: "expanded",
              imageZoom: 120,
              imagePositionX: 25,
              imagePositionY: 70,
            },
            {
              id: "option-2",
              text: "Option 2",
            },
          ],
        }}
        value={undefined}
        onChange={onChange}
      />,
    );

    const optionImage = screen.getByAltText("Option 1 image");
    expect(optionImage).toBeInTheDocument();
    expect(screen.getByText(/120%/i)).toBeInTheDocument();
    expect(optionImage).toHaveStyle({
      objectPosition: "25% 70%",
    });

    fireEvent.click(screen.getByLabelText("Option 1"));
    expect(onChange).toHaveBeenCalledWith("option-1");
  });

  it("shows the correct choice and marks a wrong selected choice after submission", () => {
    render(
      <SharedAnswerInput
        question={{
          id: "question-2",
          type: "multiple_choice",
          options: [
            { id: "option-right", text: "Right option", isCorrect: true },
            { id: "option-wrong", text: "Wrong option", isCorrect: false },
          ],
        }}
        value="option-wrong"
        onChange={jest.fn()}
        showCorrectness
      />,
    );

    expect(screen.getByText("Correct answer")).toBeInTheDocument();
    expect(screen.getByText("Your answer")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) => element?.textContent === "Correct answer: Right option",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Right option")[0].closest("label")).toHaveAttribute(
      "data-answer-state",
      "correct",
    );
    expect(screen.getByText("Wrong option").closest("label")).toHaveAttribute(
      "data-answer-state",
      "wrong-selected",
    );
  });

  it("lists every correct choice for multi-select answer review", () => {
    render(
      <SharedAnswerInput
        question={{
          id: "question-3",
          type: "multiple_select",
          options: [
            { id: "option-a", text: "Alpha", isCorrect: true },
            { id: "option-b", text: "Beta", isCorrect: true },
            { id: "option-c", text: "Gamma", isCorrect: false },
          ],
        }}
        value={["option-c"]}
        onChange={jest.fn()}
        showCorrectness
      />,
    );

    expect(
      screen.getByText(
        (_, element) => element?.textContent === "Correct answer: Alpha, Beta",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Gamma").closest("label")).toHaveAttribute(
      "data-answer-state",
      "wrong-selected",
    );
  });
});
