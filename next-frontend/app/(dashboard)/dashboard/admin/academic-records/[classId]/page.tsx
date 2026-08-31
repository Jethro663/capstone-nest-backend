"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { TeacherClassRecordWorkbook } from "@/components/teacher/class-record/TeacherClassRecordWorkbook";
import { useTeacherClassRecord } from "@/hooks/use-teacher-class-record";
export default function AcademicRecordPage() {
  const { classId } = useParams<{ classId: string }>();
  const state = useTeacherClassRecord(classId);
  return (
    <AdminPageShell
      title="Academic records"
      description="Review period eligibility, verified grades, annual sources and remediation evidence."
      actions={
        <Link
          className="text-sm underline"
          href="/dashboard/admin/system-settings"
        >
          Academic controls
        </Link>
      }
    >
      {state.recordsStatus === "error" && (
        <p role="alert">
          The class records could not be loaded. Refresh to retry.
        </p>
      )}
      <TeacherClassRecordWorkbook state={state} />
    </AdminPageShell>
  );
}
