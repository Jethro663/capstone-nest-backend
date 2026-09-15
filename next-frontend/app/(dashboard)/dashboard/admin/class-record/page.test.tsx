import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminClassRecordTransmutationPage from "./page";
import { classRecordService } from "@/services/class-record-service";

jest.mock("@/services/class-record-service", () => ({
  classRecordService: {
    getActiveTransmutationTable: jest.fn(),
    getAllTransmutationTables: jest.fn(),
    previewTransmutationTable: jest.fn(),
    applyTransmutationTable: jest.fn(),
    activateTransmutationTable: jest.fn(),
  },
}));

const mockedService = classRecordService as jest.Mocked<
  typeof classRecordService
>;

describe("AdminClassRecordTransmutationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getActiveTransmutationTable.mockResolvedValue({
      success: true,
      data: {
        id: "active-1",
        title: "Current active table",
        isActive: true,
        bands: [],
      },
    });
    mockedService.getAllTransmutationTables.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it("explains active-year impact and blocks an invalid preview from applying", async () => {
    mockedService.previewTransmutationTable.mockResolvedValue({
      success: true,
      data: {
        title: "INCOMPLETE TABLE",
        filename: "incomplete.csv",
        bandCount: 1,
        isValid: false,
        validationMessage:
          "Transmutation table must cover rounded grade 0 exactly once",
        bands: [
          {
            minInitialGrade: 75,
            maxInitialGrade: 100,
            transmutedGrade: 90,
          },
        ],
      },
    });

    render(<AdminClassRecordTransmutationPage />);

    expect(
      await screen.findByText(/active-year annual records are versioned/i),
    ).toBeInTheDocument();
    const input = document.getElementById(
      "transmutation-pdf-input",
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["75-100,90"], "incomplete.csv")] },
    });

    expect(
      await screen.findByText(/cover rounded grade 0 exactly once/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Confirm & Apply System-Wide/i }),
    ).toBeDisabled();
    expect(mockedService.applyTransmutationTable).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockedService.previewTransmutationTable).toHaveBeenCalled(),
    );
  });
});
