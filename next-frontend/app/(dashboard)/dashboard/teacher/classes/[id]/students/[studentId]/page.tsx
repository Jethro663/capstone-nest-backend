'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenText,
  ClipboardCheck,
  IdCard,
  LineChart,
  Medal,
} from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import type {
  TeacherClassStudentOverview,
  TeacherStudentAssessmentHistoryItem,
} from '@/types/class';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import './student-overview.css';

function formatFullName(data: TeacherClassStudentOverview | null) {
  const first = data?.student.firstName?.trim() ?? '';
  const last = data?.student.lastName?.trim() ?? '';
  return `${first} ${last}`.trim() || 'Student';
}

function formatInitials(data: TeacherClassStudentOverview | null) {
  const first = data?.student.firstName?.trim().charAt(0) ?? '';
  const last = data?.student.lastName?.trim().charAt(0) ?? '';
  return `${first}${last}`.toUpperCase() || 'ST';
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toPercent(value: number | null | undefined) {
  if (typeof value !== 'number') return '--';
  return `${value.toFixed(1)}%`;
}

function prettifyStatus(status?: string | null) {
  if (!status) return '--';
  return status
    .toLowerCase()
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function HistorySection({
  title,
  items,
  tone,
}: {
  title: string;
  items: TeacherStudentAssessmentHistoryItem[];
  tone: 'finished' | 'late' | 'pending';
}) {
  return (
    <section className="teacher-student-overview__history-group">
      <header>
        <h3>{title}</h3>
        <span>{items.length}</span>
      </header>
      {items.length === 0 ? (
        <div className="teacher-student-overview__empty-row">No records.</div>
      ) : (
        <div className="teacher-student-overview__history-list">
          {items.map((item) => (
            <article
              key={`${tone}-${item.assessmentId}`}
              className="teacher-student-overview__history-item"
            >
              <div>
                <p>{item.title}</p>
                <small>
                  {item.type.replace(/_/g, ' ')} · Due {formatDate(item.dueDate)}
                </small>
              </div>
              <div className="teacher-student-overview__history-meta">
                <span data-tone={tone}>{item.statusLabel}</span>
                <small>
                  {item.submittedAt
                    ? `Submitted ${formatDate(item.submittedAt)}`
                    : 'Not submitted'}
                </small>
                <strong>
                  {item.score !== null && item.score !== undefined
                    ? `${item.score}/${item.totalPoints ?? '--'}`
                    : '--'}
                </strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function TeacherStudentProfilePage() {
  const params = useParams();
  const classId = params.id as string;
  const studentId = params.studentId as string;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<TeacherClassStudentOverview | null>(
    null,
  );

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await classService.getStudentOverviewForClass(
        classId,
        studentId,
      );
      setOverview(response.data);
    } catch {
      toast.error('Failed to load student overview');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [classId, studentId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const fullName = useMemo(() => formatFullName(overview), [overview]);
  const initials = useMemo(() => formatInitials(overview), [overview]);
  const profile = overview?.student.profile;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
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
      <section className="teacher-student-overview__hero">
        <Link
          href={`/dashboard/teacher/classes/${classId}?view=students`}
          className="teacher-student-overview__back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Class
        </Link>
        <div className="teacher-student-overview__hero-row">
          <div className="teacher-student-overview__hero-avatar">{initials}</div>
          <div>
            <h1>{fullName}</h1>
            <p>{overview.classInfo.sectionLabel}</p>
          </div>
          <div className="teacher-student-overview__status-pill">
            {prettifyStatus(overview.student.status)}
          </div>
        </div>
      </section>

      <section className="teacher-student-overview__stats">
        <article>
          <LineChart className="h-5 w-5" />
          <strong>{toPercent(overview.standing.overallGradePercent)}</strong>
          <span>Current Grade</span>
        </article>
        <article>
          <BookOpenText className="h-5 w-5" />
          <strong>{overview.classInfo.sectionLabel.replace(/^Grade\s+\d+\s+-\s+/i, '')}</strong>
          <span>Section</span>
        </article>
        <article>
          <IdCard className="h-5 w-5" />
          <strong>{profile?.lrn || '--'}</strong>
          <span>LRN</span>
        </article>
        <article>
          <ClipboardCheck className="h-5 w-5" />
          <strong>{prettifyStatus(overview.student.status)}</strong>
          <span>Status</span>
        </article>
      </section>

      <section className="teacher-student-overview__panel">
        <header>
          <h2>Student Information</h2>
        </header>
        <div className="teacher-student-overview__student-info">
          <div className="teacher-student-overview__student-profile">
            <Avatar className="h-18 w-18">
              {profile?.profilePicture ? (
                <AvatarImage src={profile.profilePicture} alt={fullName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p>{fullName}</p>
              <small>{overview.student.email}</small>
            </div>
          </div>
          <div className="teacher-student-overview__info-grid">
            <article>
              <small>Full Name</small>
              <p>{fullName}</p>
            </article>
            <article>
              <small>Email Address</small>
              <p>{overview.student.email}</p>
            </article>
            <article>
              <small>LRN</small>
              <p>{profile?.lrn || '--'}</p>
            </article>
            <article>
              <small>Section</small>
              <p>{overview.classInfo.sectionLabel}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="teacher-student-overview__panel">
        <header>
          <h2>Academic Standing</h2>
          <small>
            {overview.standing.gradingPeriod
              ? `Period: ${overview.standing.gradingPeriod.toUpperCase()}`
              : 'No grading period data'}
          </small>
        </header>
        <div className="teacher-student-overview__overall">
          <div>
            <span>Overall Grade</span>
            <strong>{toPercent(overview.standing.overallGradePercent)}</strong>
          </div>
          <div className="teacher-student-overview__overall-track">
            <div
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, overview.standing.overallGradePercent ?? 0),
                )}%`,
              }}
            />
          </div>
        </div>
        <div className="teacher-student-overview__components">
          <article>
            <span>Written Work</span>
            <strong>{toPercent(overview.standing.components.writtenWorkPercent)}</strong>
          </article>
          <article>
            <span>Performance Task</span>
            <strong>{toPercent(overview.standing.components.performanceTaskPercent)}</strong>
          </article>
          <article>
            <span>Quarterly Exam</span>
            <strong>{toPercent(overview.standing.components.quarterlyExamPercent)}</strong>
          </article>
        </div>
      </section>

      <section className="teacher-student-overview__panel">
        <header className="teacher-student-overview__history-heading">
          <h2>Assessment History</h2>
          <Medal className="h-5 w-5" />
        </header>
        <div className="teacher-student-overview__history-grid">
          <HistorySection
            title="Finished"
            items={overview.history.finished}
            tone="finished"
          />
          <HistorySection title="Late" items={overview.history.late} tone="late" />
          <HistorySection
            title="Pending / Not Started"
            items={overview.history.pending}
            tone="pending"
          />
        </div>
      </section>
    </div>
  );
}
