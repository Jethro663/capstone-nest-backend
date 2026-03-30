'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenText,
  ClipboardCheck,
  IdCard,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { sectionService, type TeacherSectionStudentProfile } from '@/services/section-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import './student-profile.css';

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim() ?? '';
  const last = lastName?.trim() ?? '';
  return `${first} ${last}`.trim() || '--';
}

function prettifyStatus(status?: string | null) {
  if (!status) return '--';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function TeacherSectionStudentProfilePage() {
  const params = useParams();
  const sectionId = params.id as string;
  const studentId = params.studentId as string;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<TeacherSectionStudentProfile | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sectionService.getStudentProfileForSection(sectionId, studentId);
      setProfileData(response.data);
    } catch {
      toast.error('Failed to load student profile');
    } finally {
      setLoading(false);
    }
  }, [sectionId, studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const initials = useMemo(() => {
    const first = profileData?.student.firstName?.[0] ?? '';
    const last = profileData?.student.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'S';
  }, [profileData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="teacher-student-profile__error">
        <h2>Student profile is unavailable</h2>
        <Link href={`/dashboard/teacher/sections/${sectionId}/roster`}>
          <ArrowLeft className="h-4 w-4" />
          Back to Section Roster
        </Link>
      </div>
    );
  }

  const studentName = formatName(profileData.student.firstName, profileData.student.lastName);
  const adviserName = profileData.section?.adviser
    ? formatName(profileData.section.adviser.firstName, profileData.section.adviser.lastName)
    : '--';
  const profile = profileData.student.profile;

  return (
    <div className="teacher-student-profile">
      <section className="teacher-student-profile__hero teacher-student-profile__reveal">
        <Link
          href={`/dashboard/teacher/sections/${sectionId}/roster`}
          className="teacher-student-profile__back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Section Roster
        </Link>
        <div className="teacher-student-profile__hero-row">
          <div className="teacher-student-profile__hero-avatar">{initials}</div>
          <div>
            <h1>{studentName}</h1>
            <p>{profileData.sectionInfo.name}</p>
          </div>
          <div className="teacher-student-profile__status-pill">
            {prettifyStatus(profileData.student.status)}
          </div>
        </div>
      </section>

      <section className="teacher-student-profile__stats teacher-student-profile__reveal teacher-student-profile__reveal--delay-1">
        <article>
          <BookOpenText className="h-5 w-5" />
          <strong>{profileData.sectionInfo.gradeLevel || '--'}</strong>
          <span>Grade Level</span>
        </article>
        <article>
          <IdCard className="h-5 w-5" />
          <strong>{profile?.lrn || '--'}</strong>
          <span>LRN</span>
        </article>
        <article>
          <ClipboardCheck className="h-5 w-5" />
          <strong>{profileData.sectionInfo.schoolYear || '--'}</strong>
          <span>School Year</span>
        </article>
        <article>
          <UserRound className="h-5 w-5" />
          <strong>{profileData.section?.roomNumber || '--'}</strong>
          <span>Room</span>
        </article>
      </section>

      <section className="teacher-student-profile__panel teacher-student-profile__reveal teacher-student-profile__reveal--delay-2">
        <header>
          <h2>Student Information</h2>
        </header>
        <div className="teacher-student-profile__student-info">
          <div className="teacher-student-profile__student-profile">
            <Avatar className="h-18 w-18">
              {profile?.profilePicture ? (
                <AvatarImage src={profile.profilePicture} alt={studentName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p>{studentName}</p>
              <small>{profileData.student.email}</small>
            </div>
          </div>
          <div className="teacher-student-profile__info-grid">
            <article>
              <small>First Name</small>
              <p>{profileData.student.firstName || '--'}</p>
            </article>
            <article>
              <small>Middle Name</small>
              <p>{profileData.student.middleName || '--'}</p>
            </article>
            <article>
              <small>Last Name</small>
              <p>{profileData.student.lastName || '--'}</p>
            </article>
            <article>
              <small>Email Address</small>
              <p>{profileData.student.email || '--'}</p>
            </article>
            <article>
              <small>Date of Birth</small>
              <p>{formatDate(profile?.dateOfBirth)}</p>
            </article>
            <article>
              <small>Gender</small>
              <p>{profile?.gender || '--'}</p>
            </article>
            <article>
              <small>Contact Number</small>
              <p>{profile?.phone || '--'}</p>
            </article>
            <article>
              <small>Address</small>
              <p>{profile?.address || '--'}</p>
            </article>
          </div>
        </div>
      </section>

      <div className="teacher-student-profile__panel-grid teacher-student-profile__reveal teacher-student-profile__reveal--delay-3">
        <section className="teacher-student-profile__panel">
          <header>
            <h2>Section and Adviser</h2>
          </header>
          <div className="teacher-student-profile__info-grid">
            <article>
              <small>Section</small>
              <p>{profileData.section?.name || '--'}</p>
            </article>
            <article>
              <small>Grade Level</small>
              <p>{profileData.section?.gradeLevel || '--'}</p>
            </article>
            <article>
              <small>School Year</small>
              <p>{profileData.section?.schoolYear || '--'}</p>
            </article>
            <article>
              <small>Room</small>
              <p>{profileData.section?.roomNumber || '--'}</p>
            </article>
            <article>
              <small>Adviser</small>
              <p>{adviserName}</p>
            </article>
            <article>
              <small>Adviser Email</small>
              <p>{profileData.section?.adviser?.email || '--'}</p>
            </article>
          </div>
        </section>

        <section className="teacher-student-profile__panel">
          <header>
            <h2>Emergency Contact</h2>
          </header>
          <div className="teacher-student-profile__info-grid">
            <article>
              <small>Guardian Name</small>
              <p>{profile?.familyName || '--'}</p>
            </article>
            <article>
              <small>Relationship</small>
              <p>{profile?.familyRelationship || '--'}</p>
            </article>
            <article>
              <small>Contact Number</small>
              <p>{profile?.familyContact || '--'}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
