import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudentLxpExperience from "./StudentLxpExperience";
import { lxpService } from "@/services/lxp-service";

const searchParamsState: Record<string, string | null> = {
  tab: null,
  mode: null,
  classId: null,
};

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/student/lxp",
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsState[key] ?? null,
    toString: () => "",
  }),
}));

jest.mock("@/components/student/ja/StudentJaWorkspace", () => ({
  __esModule: true,
  default: () => <div data-testid="student-ja-workspace">JA Workspace</div>,
}));

jest.mock("@/services/lxp-service", () => ({
  lxpService: {
    getEligibility: jest.fn(),
    getOverview: jest.fn(),
    getPlaylist: jest.fn(),
    completeCheckpoint: jest.fn(),
    submitEvaluation: jest.fn(),
  },
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

const eligibilityResponse = {
  data: {
    threshold: 74,
    eligibleClasses: [
      {
        classId: "class-1",
        class: {
          id: "class-1",
          subjectName: "Math",
          subjectCode: "MATH",
          section: {
            id: "section-1",
            name: "Section A",
            gradeLevel: "10",
          },
        },
        interventionCaseId: "case-1",
        isAtRisk: true,
        blendedScore: 60,
        thresholdApplied: 74,
        openedAt: "2026-04-20T00:00:00.000Z",
      },
    ],
  },
};

const overviewResponse = {
  data: {
    selectedClass: {
      classId: "class-1",
      subjectName: "Math",
      subjectCode: "MATH",
      section: {
        id: "section-1",
        name: "Section A",
        gradeLevel: "10",
      },
      blendedScore: 60,
      thresholdApplied: 74,
      lastComputedAt: "2026-04-20T00:00:00.000Z",
    },
    interventionStatus: {
      caseId: "case-1",
      status: "active",
      code: "needs_attention",
      label: "Needs attention",
      message: "Focus needed",
      openedAt: "2026-04-20T00:00:00.000Z",
      closedAt: null,
      triggerScore: 60,
      thresholdApplied: 74,
    },
    progress: {
      xpTotal: 10,
      starsTotal: 2,
      streakDays: 1,
      checkpointsCompleted: 0,
      totalCheckpoints: 1,
      completionPercent: 0,
      lastActivityAt: null,
    },
    subjectMastery: [],
    recommendedAction: null,
    upcomingAssessments: [],
    recentActivity: [],
    weakFocusItems: [],
  },
};

const playlistResponse = {
  data: {
    interventionCase: {
      id: "case-1",
      status: "active",
      openedAt: "2026-04-20T00:00:00.000Z",
      thresholdApplied: 74,
      triggerScore: 60,
    },
    progress: {
      xpTotal: 10,
      starsTotal: 2,
      streakDays: 1,
      checkpointsCompleted: 0,
      completionPercent: 0,
    },
    checkpoints: [],
  },
};

describe("StudentLxpExperience tab navigation", () => {
  const panelForHeading = (heading: string): HTMLElement => {
    const panel = screen.getByText(heading).closest('[role="tabpanel"]');
    expect(panel).not.toBeNull();
    return panel as HTMLElement;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsState.tab = null;
    searchParamsState.mode = null;
    searchParamsState.classId = null;
    mockedLxpService.getEligibility.mockResolvedValue(eligibilityResponse as never);
    mockedLxpService.getOverview.mockResolvedValue(overviewResponse as never);
    mockedLxpService.getPlaylist.mockResolvedValue(playlistResponse as never);
  });

  it("switches to roadmap content when roadmap tab is clicked", async () => {
    render(<StudentLxpExperience />);

    await screen.findByText("Math Recovery Snapshot");

    const overviewPanel = panelForHeading("Math Recovery Snapshot");
    const roadmapPanel = panelForHeading("Recovery Roadmap");

    expect(overviewPanel).not.toHaveAttribute("hidden");
    expect(roadmapPanel).toHaveAttribute("hidden");

    const roadmapTab = await screen.findByRole("tab", { name: "Roadmap" });
    fireEvent.mouseDown(roadmapTab, { button: 0 });

    await waitFor(() => {
      expect(roadmapPanel).not.toHaveAttribute("hidden");
    });
    expect(overviewPanel).toHaveAttribute("hidden");
  });

  it("honors initial ja tab query on first render", async () => {
    searchParamsState.tab = "ja";
    searchParamsState.mode = "ask";

    render(<StudentLxpExperience />);

    expect(await screen.findByTestId("student-ja-workspace")).toBeInTheDocument();
  });
});
