import { redirect } from "next/navigation";

export default function RetiredAdminDemoModePage() {
  redirect("/dashboard/admin/system-settings/maintenance-access");
}
