import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SystemSettingsShell } from "./SystemSettingsShell";
import { SettingHelp } from "./SettingHelp";

const push = jest.fn();
const usePathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ push }),
}));

describe("SystemSettingsShell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathname.mockReturnValue(
      "/dashboard/admin/system-settings/academic-year",
    );
  });

  it("provides route-backed navigation with the current section identified", () => {
    render(
      <SystemSettingsShell>
        <p>Academic year content</p>
      </SystemSettingsShell>,
    );

    expect(
      screen.getByRole("heading", { name: "System settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/dashboard/admin/system-settings",
    );
    expect(
      screen.getByRole("link", { name: "Academic year" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Assessments & grading" }),
    ).toHaveAttribute(
      "href",
      "/dashboard/admin/system-settings/assessments-grading",
    );
    expect(
      screen.getByRole("link", { name: "Audit & recovery" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Academic year content")).toBeInTheDocument();
  });

  it("uses the mobile section selector for route navigation", () => {
    render(
      <SystemSettingsShell>
        <p>Content</p>
      </SystemSettingsShell>,
    );

    fireEvent.change(screen.getByLabelText("Settings section"), {
      target: {
        value: "/dashboard/admin/system-settings/year-transition",
      },
    });

    expect(push).toHaveBeenCalledWith(
      "/dashboard/admin/system-settings/year-transition",
    );
  });

  it("opens the four-page guide and supports forward, backward, and close controls", async () => {
    render(
      <SystemSettingsShell>
        <p>Content</p>
      </SystemSettingsShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "System settings help" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Admin guide: System settings",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Read the active state")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("Test an assessment safely")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByText("Page 1 of 4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close guide" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Admin guide: System settings",
        }),
      ).not.toBeInTheDocument();
    });
  });
});

describe("SettingHelp", () => {
  it("reveals essential setting guidance by click without requiring hover", async () => {
    render(
      <SettingHelp label="Active grading period">
        Only assessments in this period can be released or started.
      </SettingHelp>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "About active grading period" }),
    );

    expect(
      await screen.findByText(
        "Only assessments in this period can be released or started.",
      ),
    ).toBeInTheDocument();
  });
});
