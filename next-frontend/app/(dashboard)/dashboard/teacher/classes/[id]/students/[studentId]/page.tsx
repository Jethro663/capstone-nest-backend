"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { classService } from "@/services/class-service";
import { boundAcademicPercentage } from "@/lib/academic-score";
import type { Enrollment, TeacherClassStudentOverview } from "@/types/class";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AssessmentHistoryWorklist,
  type AssessmentHistoryView,
} from "./_components/assessment-history-worklist";
import "./student-overview.css";

function formatFullName(data: TeacherClassStudentOverview | null) {
  const first = data?.student.firstName?.trim() ?? "";
  const last = data?.student.lastName?.trim() ?? "";
  return `${first} ${last}`.trim() || "Student";
}

function formatInitials(data: TeacherClassStudentOverview | null) {
  const first = data?.student.firstName?.trim().charAt(0) ?? "";
  const last = data?.student.lastName?.trim().charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "ST";
}

function toPercent(value: number | null | undefined) {
  if (typeof value !== "number") return "--";
  return `${boundAcademicPercentage(value).toFixed(1)}%`;
}

function prettifyStatus(status?: string | null) {
  if (!status) return "--";
  return status
    .toLowerCase()
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function parseHistoryView(value: string | null): AssessmentHistoryView {
  if (value === "finished" || value === "all") return value;
  return "attention";
}

function isValidHistoryView(value: string | null) {
  return value === "attention" || value === "finished" || value === "all";
}

function isValidHistoryPage(value: string | null) {
  if (value === null) return true;
  if (!/^[1-9]\d*$/.test(value)) return false;
  return Number.isSafeInteger(Number(value));
}

function parseHistoryPage(value: string | null) {
  return isValidHistoryPage(value) ? Number(value ?? "1") : 1;
}

export default function TeacherStudentProfilePage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = params.id as string;
  const studentId = params.studentId as string;
  const searchParamsString = searchParams.toString();
  const historyParam = searchParams.get("history");
  const pageParam = searchParams.get("page");
  const hasInvalidHistoryView =
    historyParam !== null && !isValidHistoryView(historyParam);
  const hasInvalidHistoryPage = !isValidHistoryPage(pageParam);
  const activeHistoryView = parseHistoryView(historyParam);
  const requestedHistoryPage = hasInvalidHistoryView
    ? 1
    : parseHistoryPage(pageParam);

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<TeacherClassStudentOverview | null>(
    null,
  );
  const [roster, setRoster] = useState<Enrollment[] | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await classService.getStudentOverviewForClass(
        classId,
        studentId,
      );
      setOverview(response.data);
    } catch {
      toast.error("Failed to load student overview");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [classId, studentId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    let active = true;
    setRoster(null);

    void classService
      .getEnrollments(classId)
      .then((response) => {
        if (active) setRoster(response.data ?? []);
      })
      .catch(() => {
        if (active) setRoster(null);
      });

    return () => {
      active = false;
    };
  }, [classId]);

  const navigateHistory = useCallback(
    (
      view: AssessmentHistoryView,
      page: number,
      mode: "push" | "replace" = "push",
    ) => {
      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.set("history", view);
      nextParams.set("page", String(page));
      router[mode](`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    if (hasInvalidHistoryView || hasInvalidHistoryPage) {
      navigateHistory(activeHistoryView, 1, "replace");
    }
  }, [
    activeHistoryView,
    hasInvalidHistoryPage,
    hasInvalidHistoryView,
    navigateHistory,
  ]);

  const handleHistoryViewChange = useCallback(
    (view: AssessmentHistoryView) => navigateHistory(view, 1, "push"),
    [navigateHistory],
  );

  const handleHistoryPageChange = useCallback(
    (page: number, mode: "push" | "replace") =>
      navigateHistory(activeHistoryView, page, mode),
    [activeHistoryView, navigateHistory],
  );

  const fullName = useMemo(() => formatFullName(overview), [overview]);
  const initials = useMemo(() => formatInitials(overview), [overview]);
  const profile = overview?.student.profile;
  const rosterIndex =
    roster?.findIndex((entry) => entry.studentId === studentId) ?? -1;
  const previousStudent = rosterIndex > 0 ? roster?.[rosterIndex - 1] : null;
  const nextStudent =
    roster && rosterIndex >= 0 && rosterIndex < roster.length - 1
      ? roster[rosterIndex + 1]
      : null;
  const hasRosterPosition = Boolean(roster?.length && rosterIndex >= 0);

  const studentHref = useCallback(
    (targetStudentId: string) => {
      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.set("history", activeHistoryView);
      nextParams.set("page", "1");
      return `/dashboard/teacher/classes/${classId}/students/${targetStudentId}?${nextParams.toString()}`;
    },
    [activeHistoryView, classId, searchParamsString],
  );

  if (loading) {
    return (
      <div className="teacher-student-overview teacher-student-overview--loading">
        <Skeleton className="teacher-student-overview__head-skeleton" />
        <div className="teacher-student-overview__workspace">
          <Skeleton className="teacher-student-overview__rail-skeleton" />
          <Skeleton className="teacher-student-overview__history-skeleton" />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="teacher-student-overview__error">
        <h2>Student overview is unavailable</h2>
        <Link href={`/dashboard/teacher/classes/${classId}?view=students`}>
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="teacher-student-overview">
      <header className="teacher-student-overview__page-head">
        <Link
          href={`/dashboard/teacher/classes/${classId}?view=students`}
          className="teacher-student-overview__back"
        >
          <ArrowLeft aria-hidden="true" />
          Back to Class
        </Link>

        <div className="teacher-student-overview__page-context">
          <span className="teacher-student-overview__period">
            {overview.standing.gradingPeriod
              ? `Period: ${overview.standing.gradingPeriod.toUpperCase()}`
              : "No grading period data"}
          </span>

          {hasRosterPosition ? (
            <nav
              className="teacher-student-overview__roster-nav"
              aria-label="Student roster navigation"
            >
              <span>
                Student {rosterIndex + 1} of {roster?.length}
              </span>
              {previousStudent ? (
                <Link
                  href={studentHref(previousStudent.studentId)}
                  aria-label="Previous student"
                >
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </Link>
              ) : (
                <span aria-label="Previous student" aria-disabled="true">
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </span>
              )}
              {nextStudent ? (
                <Link
                  href={studentHref(nextStudent.studentId)}
                  aria-label="Next student"
                >
                  Next
                  <ChevronRight aria-hidden="true" />
                </Link>
              ) : (
                <span aria-label="Next student" aria-disabled="true">
                  Next
                  <ChevronRight aria-hidden="true" />
                </span>
              )}
            </nav>
          ) : null}
        </div>
      </header>

      <div className="teacher-student-overview__workspace">
        <aside className="teacher-student-overview__learner-rail">
          <div className="teacher-student-overview__student-profile">
            <Avatar className="teacher-student-overview__avatar">
              {profile?.profilePicture ? (
                <AvatarImage src={profile.profilePicture} alt={fullName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <span className="teacher-student-overview__eyebrow">
                Learner overview
              </span>
              <h1>{fullName}</h1>
              <p>{overview.student.email}</p>
            </div>
            <span className="teacher-student-overview__status-pill">
              {prettifyStatus(overview.student.status)}
            </span>
          </div>

          <dl className="teacher-student-overview__student-details">
            <div>
              <dt>Section</dt>
              <dd>{overview.classInfo.sectionLabel}</dd>
            </div>
            <div>
              <dt>LRN</dt>
              <dd>{profile?.lrn || "--"}</dd>
            </div>
          </dl>

          <section
            className="teacher-student-overview__standing"
            aria-labelledby="standing-heading"
          >
            <div className="teacher-student-overview__overall">
              <span id="standing-heading">Overall Grade</span>
              <strong>
                {toPercent(overview.standing.overallGradePercent)}
              </strong>
            </div>
            <div
              className="teacher-student-overview__overall-track"
              role="progressbar"
              aria-label="Overall grade"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overview.standing.overallGradePercent ?? undefined}
            >
              <div
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, overview.standing.overallGradePercent ?? 0),
                  )}%`,
                }}
              />
            </div>

            <dl className="teacher-student-overview__grade-components">
              <div>
                <dt>Written Work</dt>
                <dd>
                  {toPercent(overview.standing.components.writtenWorkPercent)}
                </dd>
              </div>
              <div>
                <dt>Performance Task</dt>
                <dd>
                  {toPercent(
                    overview.standing.components.performanceTaskPercent,
                  )}
                </dd>
              </div>
              <div>
                <dt>Quarterly Exam</dt>
                <dd>
                  {toPercent(overview.standing.components.quarterlyExamPercent)}
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        <AssessmentHistoryWorklist
          history={overview.history}
          activeView={activeHistoryView}
          requestedPage={requestedHistoryPage}
          onViewChange={handleHistoryViewChange}
          onPageChange={handleHistoryPageChange}
        />
      </div>
    </div>
  );
}
