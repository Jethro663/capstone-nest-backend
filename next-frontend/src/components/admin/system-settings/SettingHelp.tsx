"use client";

import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SettingHelp({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About ${label.toLowerCase()}`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--admin-outline)] bg-white text-[var(--admin-text-muted)] transition-colors hover:border-[var(--admin-outline-strong)] hover:text-[var(--admin-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2"
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] border-[var(--admin-outline)] text-sm leading-6 shadow-lg"
      >
        <p className="font-semibold text-[var(--admin-text-strong)]">{label}</p>
        <div className="mt-1 text-[var(--admin-text-muted)]">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
