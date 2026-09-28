import { useQuery } from "@tanstack/react-query";
import { academicStateService } from "../api/services/academic-state";

export const CURRENT_ACADEMIC_STATE_QUERY_KEY = [
  "academic",
  "current",
] as const;

export function useCurrentAcademicState() {
  return useQuery({
    queryKey: CURRENT_ACADEMIC_STATE_QUERY_KEY,
    queryFn: async () => (await academicStateService.getCurrent()).data,
    staleTime: 60_000,
  });
}
