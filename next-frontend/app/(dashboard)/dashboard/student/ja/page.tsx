import { redirect } from "next/navigation";

interface StudentJaRedirectPageProps {
  searchParams?: {
    mode?: string | string[];
    classId?: string | string[];
  };
}

function readSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function StudentJaRedirectPage({
  searchParams,
}: StudentJaRedirectPageProps) {
  const mode = readSingle(searchParams?.mode);
  const classId = readSingle(searchParams?.classId);
  const params = new URLSearchParams({ tab: "ja" });

  if (mode) params.set("mode", mode);
  if (classId) params.set("classId", classId);

  redirect(`/dashboard/student/lxp?${params.toString()}`);
}

