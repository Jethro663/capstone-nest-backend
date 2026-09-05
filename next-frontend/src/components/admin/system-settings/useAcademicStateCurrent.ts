"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { academicStateService } from "@/services/academic-state-service";
import type { AcademicStateCurrent } from "@/types/academic-state";

export function useAcademicStateCurrent() {
  const [current, setCurrent] = useState<AcademicStateCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await academicStateService.getCurrent();
      setCurrent(response.data);
    } catch (requestError) {
      setCurrent(null);
      setError(
        getApiErrorMessage(
          requestError,
          "The active academic state could not be loaded.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { current, loading, error, refresh };
}
