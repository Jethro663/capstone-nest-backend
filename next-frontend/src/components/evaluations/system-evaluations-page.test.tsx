import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SystemEvaluationsPage } from "./system-evaluations-page";
import { lxpService } from "@/services/lxp-service";
import { classService } from "@/services/class-service";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/services/lxp-service", () => ({
  lxpService: {
    getEvaluations: jest.fn(),
    getSystemEvaluationCampaigns: jest.fn(),
    createSystemEvaluationCampaign: jest.fn(),
  },
}));

jest.mock("@/services/class-service", () => ({
  classService: { getAll: jest.fn() },
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;
const mockedClassService = classService as jest.Mocked<typeof classService>;

describe("SystemEvaluationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLxpService.getEvaluations.mockResolvedValue({
      data: { count: 0, rows: [] },
    } as Awaited<ReturnType<typeof lxpService.getEvaluations>>);
    mockedLxpService.getSystemEvaluationCampaigns.mockResolvedValue({
      data: {
        campaigns: [],
        count: 0,
        page: 1,
        limit: 6,
        total: 0,
        totalPages: 1,
      },
    } as Awaited<ReturnType<typeof lxpService.getSystemEvaluationCampaigns>>);
    mockedLxpService.createSystemEvaluationCampaign.mockResolvedValue({
      data: { id: "campaign-1", assignmentCount: 0 },
    } as Awaited<ReturnType<typeof lxpService.createSystemEvaluationCampaign>>);
    mockedClassService.getAll.mockResolvedValue({
      success: true,
      message: "Classes loaded",
      data: {
        data: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            subjectName: "Mathematics",
            subjectCode: "MATH-7",
            sectionId: "section-1",
            section: { id: "section-1", name: "Bonifacio", gradeLevel: "7" },
            teacherId: "teacher-1",
            schoolYear: "2026-2027",
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
      },
    });
  });

  it("creates active system evaluation campaigns from the admin page", async () => {
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review module and assessment feedback."
        variant="admin"
      />,
    );

    fireEvent.change(await screen.findByLabelText("Campaign title"), {
      target: { value: "System Pulse" },
    });
    fireEvent.change(screen.getByLabelText("Starts at"), {
      target: { value: "2026-05-01T08:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    await waitFor(() =>
      expect(
        mockedLxpService.createSystemEvaluationCampaign,
      ).toHaveBeenCalledTimes(1),
    );
    const payload =
      mockedLxpService.createSystemEvaluationCampaign.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        formType: "system",
        audienceRole: "student",
        title: "System Pulse",
        status: "active",
      }),
    );
    expect(payload).not.toHaveProperty("classId");
  });

  it("shows the backend campaign rejection instead of replacing it", async () => {
    mockedLxpService.createSystemEvaluationCampaign.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: "Campaign end date must be after start date." },
      },
    });
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );

    fireEvent.change(await screen.findByLabelText("Campaign title"), {
      target: { value: "System Pulse" },
    });
    fireEvent.change(screen.getByLabelText("Starts at"), {
      target: { value: "2026-05-01T08:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Campaign end date must be after start date.",
      ),
    );
    expect(screen.getByLabelText("Campaign title")).toHaveValue("System Pulse");
  });

  it("blocks a campaign whose end time is not after its start time", async () => {
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );

    fireEvent.change(await screen.findByLabelText("Campaign title"), {
      target: { value: "System Pulse" },
    });
    fireEvent.change(screen.getByLabelText("Starts at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    expect(
      await screen.findByText("End time must be after start time."),
    ).toBeInTheDocument();
    expect(
      mockedLxpService.createSystemEvaluationCampaign,
    ).not.toHaveBeenCalled();
  });

  it("enforces the backend campaign title limit before submitting", async () => {
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );

    const title = await screen.findByLabelText("Campaign title");
    expect(title).toHaveAttribute("maxLength", "160");
    fireEvent.change(title, { target: { value: "x".repeat(161) } });
    fireEvent.change(screen.getByLabelText("Starts at"), {
      target: { value: "2026-05-01T08:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    expect(
      await screen.findByText(
        "Campaign title must be 160 characters or fewer.",
      ),
    ).toBeInTheDocument();
    expect(
      mockedLxpService.createSystemEvaluationCampaign,
    ).not.toHaveBeenCalled();
  });

  it("requires a selected class when class-scoped delivery is chosen", async () => {
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );

    fireEvent.change(await screen.findByLabelText("Campaign scope"), {
      target: { value: "class" },
    });
    expect(await screen.findByLabelText("Class")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Campaign title"), {
      target: { value: "Class pulse" },
    });
    fireEvent.change(screen.getByLabelText("Starts at"), {
      target: { value: "2026-05-01T08:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    expect(
      await screen.findByText("Select a class for class-scoped delivery."),
    ).toBeInTheDocument();
    expect(
      mockedLxpService.createSystemEvaluationCampaign,
    ).not.toHaveBeenCalled();
  });

  it("submits only the selected class ID for class-scoped delivery", async () => {
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );

    fireEvent.change(await screen.findByLabelText("Campaign scope"), {
      target: { value: "class" },
    });
    fireEvent.change(await screen.findByLabelText("Class"), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.change(screen.getByLabelText("Campaign title"), {
      target: { value: "Class pulse" },
    });
    fireEvent.change(screen.getByLabelText("Starts at"), {
      target: { value: "2026-05-01T08:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    await waitFor(() =>
      expect(
        mockedLxpService.createSystemEvaluationCampaign,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: "11111111-1111-4111-8111-111111111111",
        }),
      ),
    );
  });

  it("reports how many evaluation assignments were created", async () => {
    mockedLxpService.createSystemEvaluationCampaign.mockResolvedValueOnce({
      data: { id: "campaign-1", assignmentCount: 3 },
    } as Awaited<ReturnType<typeof lxpService.createSystemEvaluationCampaign>>);
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );

    await waitFor(() => {
      expect(mockedLxpService.getEvaluations).toHaveBeenCalledTimes(1);
      expect(
        mockedLxpService.getSystemEvaluationCampaigns,
      ).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(await screen.findByLabelText("Campaign title"), {
      target: { value: "System Pulse" },
    });
    fireEvent.change(screen.getByLabelText("Starts at"), {
      target: { value: "2026-05-01T08:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends at"), {
      target: { value: "2026-05-20T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Evaluation campaign created with 3 assignments.",
      ),
    );
    expect(mockedLxpService.getEvaluations).toHaveBeenCalledTimes(2);
    expect(mockedLxpService.getSystemEvaluationCampaigns).toHaveBeenCalledTimes(
      2,
    );
  });

  it("places required-field guidance beside the campaign controls", async () => {
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Create Campaign" }),
    );

    expect(screen.getByText("Enter a campaign title.")).toBeInTheDocument();
    expect(screen.getByText("Choose a start time.")).toBeInTheDocument();
    expect(screen.getByText("Choose an end time.")).toBeInTheDocument();
    expect(
      mockedLxpService.createSystemEvaluationCampaign,
    ).not.toHaveBeenCalled();
  });

  it("requests campaign pages from the server instead of slicing one fetch-all response", async () => {
    mockedLxpService.getSystemEvaluationCampaigns.mockResolvedValue({
      data: {
        campaigns: [],
        count: 7,
        page: 1,
        limit: 6,
        total: 7,
        totalPages: 2,
      },
    } as Awaited<ReturnType<typeof lxpService.getSystemEvaluationCampaigns>>);

    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review"
        variant="admin"
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Next campaigns" }),
    );

    await waitFor(() =>
      expect(
        mockedLxpService.getSystemEvaluationCampaigns,
      ).toHaveBeenLastCalledWith({ page: 2, limit: 6 }),
    );
  });
});
