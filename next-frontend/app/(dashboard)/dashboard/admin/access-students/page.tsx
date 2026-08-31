"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AdminPageShell,
  AdminSectionCard,
} from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  sectionService,
  type AccessStudentsOverviewGradeBucket,
} from "@/services/section-service";
export default function AdminAccessStudentsPage() {
  const [data, setData] = useState<AccessStudentsOverviewGradeBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [year, setYear] = useState("all");
  const [grade, setGrade] = useState("all");
  const [sectionId, setSectionId] = useState("");
  const [search, setSearch] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sectionService.getAccessStudentsOverview();
      setData(response.data);
      setFailed(false);
    } catch (error) {
      setFailed(true);
      toast.error(
        getApiErrorMessage(error, "Student readiness could not be loaded."),
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const allSections = useMemo(
    () => data.flatMap((bucket) => bucket.sections),
    [data],
  );
  const years = [...new Set(allSections.map((section) => section.schoolYear))]
    .sort()
    .reverse();
  const sections = allSections.filter(
    (section) =>
      (year === "all" || section.schoolYear === year) &&
      (grade === "all" || section.gradeLevel === grade),
  );
  const selected =
    sections.find((section) => section.id === sectionId) ?? sections[0];
  const students = (selected?.students ?? []).filter((student) =>
    `${student.lastName} ${student.firstName} ${student.email} ${student.lrn}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <AdminPageShell
      title="Student academic readiness"
      description="Review complete period and annual evidence for each learner. Outcomes are applied by the verified school-year transition."
      actions={
        <Link
          className="underline text-sm"
          href="/dashboard/admin/system-settings"
        >
          Open academic controls
        </Link>
      }
    >
      <p className="text-sm">
        Promotion, retention and Grade 10 completion are based on every required
        learning area, including remediation and back subjects. A cross-subject
        average cannot authorize an outcome.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          School year{" "}
          <select
            aria-label="School year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="ml-2 h-10 rounded border bg-white px-3"
          >
            <option value="all">All years</option>
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Grade{" "}
          <select
            aria-label="Grade level"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="ml-2 h-10 rounded border bg-white px-3"
          >
            <option value="all">All grades</option>
            {["7", "8", "9", "10"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Section{" "}
          <select
            aria-label="Section"
            value={selected?.id ?? ""}
            onChange={(e) => setSectionId(e.target.value)}
            className="ml-2 h-10 rounded border bg-white px-3"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Grade {section.gradeLevel} · {section.name} ·{" "}
                {section.schoolYear}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Loading…" : "Refresh readiness"}
        </Button>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-red-700">
          Readiness refresh failed. Any visible results may be stale.
        </p>
      )}
      {selected ? (
        <AdminSectionCard
          title={`Grade ${selected.gradeLevel} · ${selected.name}`}
          description={`${selected.schoolYear} · ${selected.studentCount} learners. Outcomes below are previews until the transition commits.`}
        >
          <Input
            aria-label="Search students"
            placeholder="Search name, email or LRN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-3">Learner</th>
                  <th className="p-3">Outcome preview</th>
                  <th className="p-3">Readiness and repairs</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="p-3">
                      {student.lastName}, {student.firstName}
                      <span className="block text-xs">
                        {student.lrn ?? student.email}
                      </span>
                    </td>
                    <td className="p-3">
                      {student.outcome?.replaceAll("_", " ") ??
                        "Incomplete evidence"}
                    </td>
                    <td className="p-3">
                      <p>{student.finalizationLabel}</p>
                      {student.blockers?.length ? (
                        <details>
                          <summary className="cursor-pointer underline">
                            {student.blockers.length} blockers
                          </summary>
                          <ul className="mt-2 space-y-2">
                            {student.blockers.map((blocker, i) => (
                              <li key={`${blocker.code}-${i}`}>
                                {blocker.message}
                                {blocker.classId && (
                                  <Link
                                    className="ml-2 underline"
                                    href={`/dashboard/admin/academic-records/${blocker.classId}`}
                                  >
                                    Open workbook
                                  </Link>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <span className="text-xs">
                          {student.isFinalized
                            ? "Ready for the school-wide transition check"
                            : "No verified outcome yet"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!students.length && (
              <p className="p-3 text-sm">No matching learners.</p>
            )}
          </div>
        </AdminSectionCard>
      ) : (
        <p className="text-sm">
          {loading ? "Loading sections…" : "No sections match these filters."}
        </p>
      )}
    </AdminPageShell>
  );
}
