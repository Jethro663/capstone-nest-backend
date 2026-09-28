import { useQuery } from "@tanstack/react-query";
import { academicStateService } from "../../api/services/academic-state";
import {
  CURRENT_ACADEMIC_STATE_QUERY_KEY,
  useCurrentAcademicState,
} from "../useCurrentAcademicState";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("../../api/services/academic-state", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
  },
}));

describe("useCurrentAcademicState", () => {
  it("shares the canonical current-state query and unwraps the service envelope", async () => {
    const queryResult = { data: { schoolYear: "2040-2041" } };
    jest.mocked(useQuery).mockReturnValue(queryResult as never);
    jest.mocked(academicStateService.getCurrent).mockResolvedValue({
      success: true,
      message: "ok",
      data: { schoolYear: "2040-2041" },
    } as never);

    expect(useCurrentAcademicState()).toBe(queryResult);
    expect(CURRENT_ACADEMIC_STATE_QUERY_KEY).toEqual(["academic", "current"]);

    const options = jest.mocked(useQuery).mock.calls[0][0] as {
      queryKey: readonly string[];
      queryFn: () => Promise<unknown>;
    };
    expect(options.queryKey).toBe(CURRENT_ACADEMIC_STATE_QUERY_KEY);
    await expect(options.queryFn()).resolves.toEqual({
      schoolYear: "2040-2041",
    });
    expect(academicStateService.getCurrent).toHaveBeenCalledTimes(1);
  });
});
