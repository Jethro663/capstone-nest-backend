"use client";

import type { ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AcademicStateView({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-lg border border-[var(--admin-outline)] bg-white p-5 text-sm text-[var(--admin-text-muted)]"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading the academic state…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        aria-label={error}
        className="rounded-lg border border-red-200 bg-red-50 p-5"
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-red-900">
              Academic state unavailable
            </p>
            <p className="mt-1 text-sm leading-6 text-red-800">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 border-red-300 bg-white text-red-800 hover:bg-red-100"
              aria-label="Retry current state"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
