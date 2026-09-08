import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewAssignmentWizard } from "./NewAssignmentWizard";
import { assessmentService } from "@/services/assessment-service";
jest.mock("@/services/assessment-service", () => ({
  assessmentService: {
    getCreationContext: jest.fn(),
    getPendingCreation: jest.fn(),
    createFromSetup: jest.fn(),
  },
}));
const context = {
  classId: "class",
  schoolYear: "2026-2027",
  defaultPeriod: "Q1",
  periods: [
    {
      key: "Q1",
      label: "Term 1",
      canPrepare: true,
      canRelease: true,
      workbook: null,
    },
  ],
  categories: [{ key: "written_work", label: "Written Work" }],
};
describe("NewAssignmentWizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(assessmentService.getCreationContext)
      .mockResolvedValue(context as never);
    jest.mocked(assessmentService.getPendingCreation).mockReturnValue(null);
    jest
      .mocked(assessmentService.createFromSetup)
      .mockResolvedValue({ assessment: { id: "saved" } } as never);
  });
  it("opens without creating and can close before choosing a format", async () => {
    const close = jest.fn();
    render(
      <NewAssignmentWizard
        classId="class"
        actorId="teacher"
        onClose={close}
        onCreated={jest.fn()}
      />,
    );
    await screen.findByRole("button", { name: /Question assignment/ });
    expect(assessmentService.createFromSetup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(close).toHaveBeenCalled();
  });
  it("advances format, supports Back, and skips without reserving a slot", async () => {
    const created = jest.fn();
    render(
      <NewAssignmentWizard
        classId="class"
        actorId="teacher"
        onClose={jest.fn()}
        onCreated={created}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /File upload assignment/ }),
    );
    await screen.findByRole("heading", { name: "Class record setup" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /File upload assignment/ }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Skip setup & start editing" }),
    );
    await waitFor(() => expect(created).toHaveBeenCalledWith("saved"));
    expect(assessmentService.createFromSetup).toHaveBeenCalledWith(
      "teacher",
      expect.objectContaining({
        settings: { title: "", type: "file_upload", quarter: "Q1" },
        action: "save",
      }),
    );
  });
  it("shows upload revisions instead of max attempts and creates with chosen setup", async () => {
    render(
      <NewAssignmentWizard
        classId="class"
        actorId="teacher"
        onClose={jest.fn()}
        onCreated={jest.fn()}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /File upload assignment/ }),
    );
    fireEvent.change(await screen.findByLabelText("Class-record category"), {
      target: { value: "written_work" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(await screen.findByLabelText("Assignment name"), {
      target: { value: "Portfolio" },
    });
    expect(screen.queryByLabelText("Maximum attempts")).not.toBeInTheDocument();
    expect(screen.getByText(/latest submission is graded/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Create file upload assignment" }),
    );
    await waitFor(() =>
      expect(assessmentService.createFromSetup).toHaveBeenCalledWith(
        "teacher",
        expect.objectContaining({
          settings: expect.objectContaining({
            title: "Portfolio",
            classRecordCategory: "written_work",
            type: "file_upload",
          }),
        }),
      ),
    );
  });
});
