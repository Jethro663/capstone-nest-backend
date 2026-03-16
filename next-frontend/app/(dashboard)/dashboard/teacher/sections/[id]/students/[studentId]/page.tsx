'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sectionService, type TeacherSectionStudentProfile } from '@/services/section-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  );
}

export default function TeacherSectionStudentProfilePage() {
  const params = useParams();
  const router = useRouter();
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
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>
        <Card>
          <CardContent className="p-6 text-muted-foreground">Student profile not found.</CardContent>
        </Card>
      </div>
    );
  }

  const studentName = `${profileData.student.firstName || ''} ${profileData.student.lastName || ''}`.trim();

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/roster`)}
      >
        ← Back to Section Roster
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border">
              {profileData.student.profile?.profilePicture ? (
                <AvatarImage src={profileData.student.profile.profilePicture} alt={studentName} />
              ) : null}
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{studentName || 'Student Profile'}</h1>
              <p className="text-sm text-muted-foreground">{profileData.student.email}</p>
              <p className="text-sm text-muted-foreground">{profileData.sectionInfo.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="First Name" value={profileData.student.firstName} />
            <InfoRow label="Middle Name" value={profileData.student.middleName} />
            <InfoRow label="Last Name" value={profileData.student.lastName} />
            <InfoRow label="LRN" value={profileData.student.profile?.lrn} />
            <InfoRow label="Grade Level" value={profileData.student.profile?.gradeLevel} />
            <InfoRow label="Date of Birth" value={formatDate(profileData.student.profile?.dateOfBirth)} />
            <InfoRow label="Gender" value={profileData.student.profile?.gender} />
            <InfoRow label="Contact Number" value={profileData.student.profile?.phone} />
            <div className="sm:col-span-2">
              <InfoRow label="Address" value={profileData.student.profile?.address} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section & Adviser</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Section" value={profileData.section?.name} />
            <InfoRow label="Grade Level" value={profileData.section?.gradeLevel} />
            <InfoRow label="School Year" value={profileData.section?.schoolYear} />
            <InfoRow label="Room" value={profileData.section?.roomNumber || '—'} />
            <InfoRow
              label="Adviser"
              value={
                profileData.section?.adviser
                  ? `${profileData.section.adviser.firstName || ''} ${profileData.section.adviser.lastName || ''}`.trim()
                  : '—'
              }
            />
            <InfoRow label="Adviser Email" value={profileData.section?.adviser?.email} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoRow label="Guardian Name" value={profileData.student.profile?.familyName} />
            <InfoRow label="Relationship" value={profileData.student.profile?.familyRelationship} />
            <InfoRow label="Contact Number" value={profileData.student.profile?.familyContact} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
