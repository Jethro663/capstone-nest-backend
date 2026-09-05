import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AcademicStateAlignmentRecovery } from "./AcademicStateAlignmentRecovery";
import { academicGradingService } from "@/services/academic-grading-service";

jest.mock("@/services/academic-grading-service", () => ({
  academicGradingService: {
    previewStateAlignment: jest.fn(),
    executeStateAlignment: jest.fn(),
  },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));

const candidate = {
  id: "00000000-0000-4000-8000-000000000001",
  subjectCode: "AP-7",
  subjectName: "Araling Panlipunan",
  sectionId: "00000000-0000-4000-8000-000000000002",
  sectionName: "Demo7",
  sectionSchoolYear: "2026-2027",
  teacherId: "teacher",
  teacherName: "Teacher One",
  isActive: true,
  counts: {
    enrollments: 20,
    assessments: 3,
    attempts: 18,
    classRecords: 1,
    finalizedRecords: 1,
    finalGradeRows: 16,
    legacyEvidenceRows: 16,
    periodRevisionRows: 0,
  },
};
const preview = (selected: boolean) => ({
  input: {
    sourceSchoolYear: "2027-2028",
    targetSchoolYear: "2026-2027",
    targetQuarter: "Q1" as const,
    classIds: selected ? [candidate.id] : [],
  },
  state: {
    id: "state",
    schoolYear: "2027-2028",
    quarter: "Q1" as const,
    version: 4,
  },
  policies: [],
  proposedPolicies: [],
  candidates: [candidate],
  selectedClasses: selected ? [candidate] : [],
  sections: [],
  movedSectionIds: [],
  ambiguousCounts: {
    periodRevisions: 0,
    externalGrades: 0,
    annualSelections: 0,
    annualGrades: 0,
    yearOutcomes: 0,
  },
  requiredConfirmations: selected
    ? [
        { code: "ALIGN_STATE", text: "ALIGN 2027-2028 TO 2026-2027 Q1" },
        {
          code: "RESULT_BEARING_EVIDENCE",
          text: "MOVE 16 LEGACY EVIDENCE ROWS TO 2026-2027",
        },
      ]
    : [],
  blockers: selected
    ? []
    : [{ code: "class_selection_required", message: "Select classes" }],
  warnings: selected
    ? [{ code: "result_bearing_evidence", message: "Result-bearing" }]
    : [],
  safeToApply: selected,
  manifestHash: selected ? "a".repeat(64) : "b".repeat(64),
});

describe("AcademicStateAlignmentRecovery", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts unchecked and requires a fresh reviewed preview plus exact confirmations", async () => {
    const service = academicGradingService as jest.Mocked<
      typeof academicGradingService
    >;
    service.previewStateAlignment
      .mockResolvedValueOnce({ success: true, message: "", data: preview(false) })
      .mockResolvedValueOnce({ success: true, message: "", data: preview(true) });
    service.executeStateAlignment.mockResolvedValue({
      success: true,
      message: "",
      data: {
        auditEventId: "audit-id",
        movedClassIds: [candidate.id],
        movedSectionIds: [],
        updatedLegacyEvidenceRows: 16,
      },
    });
    const onChanged = jest.fn().mockResolvedValue(undefined);

    render(
      <AcademicStateAlignmentRecovery
        schoolYear="2027-2028"
        onChanged={onChanged}
      />,
    );

    expect(service.previewStateAlignment).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("checkbox", {
        name: /AP-7.*Araling Panlipunan/i,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /preview alignment candidates/i }),
    );
    const checkbox = await screen.findByRole("checkbox", {
      name: /AP-7.*Araling Panlipunan/i,
    });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(/16 legacy evidence rows/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select all reviewed/i }));
    fireEvent.click(screen.getByRole("button", { name: /preview selected repair/i }));
    await screen.findByText("ALIGN 2027-2028 TO 2026-2027 Q1");

    fireEvent.change(screen.getByLabelText(/confirmation ALIGN_STATE/i), {
      target: { value: "ALIGN 2027-2028 TO 2026-2027 Q1" },
    });
    fireEvent.change(
      screen.getByLabelText(/confirmation RESULT_BEARING_EVIDENCE/i),
      { target: { value: "MOVE 16 LEGACY EVIDENCE ROWS TO 2026-2027" } },
    );
    fireEvent.change(screen.getByLabelText(/alignment reason/i), {
      target: { value: "School-approved correction" },
    });
    fireEvent.change(screen.getByLabelText(/current admin password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed every selected/i }));
    fireEvent.click(screen.getByRole("button", { name: /apply alignment repair/i }));

    await waitFor(() => expect(service.executeStateAlignment).toHaveBeenCalled());
    expect(await screen.findByText(/audit-id/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });
});
