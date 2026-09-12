import { Suspense } from "react";
import { ResetSchoolData } from "@/components/admin/system-settings/ResetSchoolData";

export default function ResetSchoolDataPage() {
  return (
    <Suspense fallback={<p role="status">Loading reset settings…</p>}>
      <ResetSchoolData />
    </Suspense>
  );
}
