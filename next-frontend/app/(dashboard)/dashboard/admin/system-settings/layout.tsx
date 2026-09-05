import type { ReactNode } from "react";
import { SystemSettingsShell } from "@/components/admin/system-settings/SystemSettingsShell";

export default function AdminSystemSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SystemSettingsShell>{children}</SystemSettingsShell>;
}
