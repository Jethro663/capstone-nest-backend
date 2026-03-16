'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/lib/auth-service';
import { profileService } from '@/services/profile-service';
import type { AcademicSummary, StudentProfile } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import { ProfilePageFrame } from '@/components/profile/ProfilePageFrame';
import {
  getMissingStudentProfileFields,
  isStudentProfileLocked,
  mergeUserWithStudentProfile,
  normalizePhilippinePhone,
  normalizeStudentProfile,
} from '@/utils/profile';

type StudentProfileForm = {
  lrn: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  familyName: string;
  familyRelationship: string;
  familyContact: string;
  gradeLevel: string;
  profilePicture: string;
};

function toFormState(user: ReturnType<typeof mergeUserWithStudentProfile>): StudentProfileForm {
  return {
    lrn: String(user?.lrn ?? ''),
    dateOfBirth: String(user?.dateOfBirth ?? user?.dob ?? ''),
    gender: String(user?.gender ?? ''),
    phone: String(user?.phone ?? ''),
    address: String(user?.address ?? ''),
    familyName: String(user?.familyName ?? ''),
    familyRelationship: String(user?.familyRelationship ?? ''),
    familyContact: String(user?.familyContact ?? ''),
    gradeLevel: String(user?.gradeLevel ?? ''),
    profilePicture: String(user?.profilePicture ?? ''),
  };
}

export default function StudentProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, setUser, refreshAuth } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [academicSummary, setAcademicSummary] = useState<AcademicSummary | null>(null);
  const [form, setForm] = useState<StudentProfileForm>(() => toFormState(user));
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoadingProfile(true);
        const response = await profileService.getMine();
        const normalizedProfile = normalizeStudentProfile(response.data);
        const academicSummaryResponse = await profileService.getAcademicSummary();

        if (!mounted) return;

        setProfile(normalizedProfile);
        setAcademicSummary(academicSummaryResponse.data);
        const mergedUser = mergeUserWithStudentProfile(user, normalizedProfile);
        setForm(toFormState(mergedUser));
        setIsLocked(isStudentProfileLocked(mergedUser));

        if (mergedUser) {
          setUser(mergedUser);
        }
      } catch {
        if (mounted) {
          toast.error('Failed to load student profile');
        }
      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
    // Initial profile fetch should run once on mount; subsequent state refreshes are explicit after saves/uploads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile && user) {
      setForm(toFormState(user));
      setIsLocked(isStudentProfileLocked(user));
    }
  }, [profile, user]);

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'S';

  const handleFieldChange = (field: keyof StudentProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleChooseAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (isLocked) {
      toast.error('Profile picture is locked once your profile is completed');
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await profileService.uploadAvatar(file);
      const normalizedProfile = normalizeStudentProfile(response.data.profile);
      setProfile(normalizedProfile);
      setForm((current) => ({
        ...current,
        profilePicture: response.data.profilePicture,
      }));

      const mergedUser = mergeUserWithStudentProfile(user, normalizedProfile);
      if (mergedUser) {
        setUser(mergedUser);
      }

      toast.success('Profile picture updated');
    } catch {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const validateBeforeConfirm = () => {
    const missing = getMissingStudentProfileFields({
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      phone: form.phone,
      address: form.address,
      familyName: form.familyName,
      familyRelationship: form.familyRelationship,
      familyContact: form.familyContact,
    });

    if (missing.length > 0) {
      setMissingFields(missing);
      setMissingDialogOpen(true);
      return false;
    }

    if (!normalizePhilippinePhone(form.phone)) {
      toast.error('Student contact number must be a valid Philippine mobile number');
      return false;
    }

    if (!normalizePhilippinePhone(form.familyContact)) {
      toast.error('Guardian contact number must be a valid Philippine mobile number');
      return false;
    }

    return true;
  };

  const handleSaveAttempt = () => {
    if (isLocked) return;
    if (!validateBeforeConfirm()) return;
    setConfirmDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    try {
      setConfirmDialogOpen(false);
      setSaving(true);

      const dto = {
        dob: form.dateOfBirth,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        phone: normalizePhilippinePhone(form.phone) ?? form.phone,
        address: form.address,
        familyName: form.familyName,
        familyRelationship: form.familyRelationship,
        familyContact: normalizePhilippinePhone(form.familyContact) ?? form.familyContact,
        profilePicture: form.profilePicture || undefined,
      };

      const response = await updateProfile(dto);
      const mergedUser = mergeUserWithStudentProfile(
        response.data?.user ?? user ?? null,
        normalizeStudentProfile({
          ...profile,
          ...dto,
        }),
      );

      if (mergedUser) {
        setUser(mergedUser);
      }

      await refreshAuth();
      const latestProfile = await profileService.getMine();
      const latestAcademicSummary = await profileService.getAcademicSummary();
      const normalizedProfile = normalizeStudentProfile(latestProfile.data);
      setProfile(normalizedProfile);
      setAcademicSummary(latestAcademicSummary.data);
      const finalUser = mergeUserWithStudentProfile(mergedUser, normalizedProfile);
      setForm(toFormState(finalUser));
      setIsLocked(isStudentProfileLocked(finalUser));

      toast.success('Student profile saved');
      router.refresh();
    } catch {
      toast.error('Failed to update student profile');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--student-accent)]" />
      </div>
    );
  }

  return (
    <>
      <ProfilePageFrame
        email={user?.email}
        roleLabel="Student"
        title="Student Profile"
        subtitle={
          isLocked
            ? 'Your student details have been finalized and are now read-only.'
            : 'Complete the required student details carefully. Once you confirm them, they cannot be changed.'
        }
        initials={initials}
        avatarSrc={form.profilePicture || user?.profilePicture}
        heroAction={
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelected}
            />
            <Button
              type="button"
              onClick={handleChooseAvatar}
              disabled={isLocked || uploadingAvatar}
              className="student-button-solid rounded-xl font-black gap-2"
            >
              {uploadingAvatar ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Change Picture
                </>
              )}
            </Button>
            {isLocked ? (
              <p className="text-[11px] font-semibold text-[var(--student-text-muted)]">Profile picture is locked after confirmation.</p>
            ) : (
              <p className="text-[11px] font-semibold text-[var(--student-text-muted)]">PNG, JPG, GIF, or WebP up to 5 MB.</p>
            )}
          </div>
        }
        left={
          <div className="space-y-6">
            <Card className="student-panel student-panel-hover overflow-hidden rounded-[1.5rem]">
              <div className="border-b border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-6 py-4">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--student-text-strong)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--student-accent)]" /> Student Information
                </h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    isLocked ? 'student-note-success' : 'student-note-danger'
                  }`}
                >
                  {isLocked
                    ? 'Your required student details are complete and locked.'
                    : 'Finish all required details before saving. Once confirmed, these details cannot be changed.'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">First Name</Label>
                    <Input className="student-input rounded-xl" value={user?.firstName ?? ''} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Middle Name</Label>
                    <Input className="student-input rounded-xl" value={user?.middleName ?? ''} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Last Name</Label>
                    <Input className="student-input rounded-xl" value={user?.lastName ?? ''} disabled />
                  </div>
                </div>

                <div className="space-y-4 border-t border-[var(--student-outline)] pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--student-accent)]">Student Identity</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">LRN</Label>
                      <Input className="student-input rounded-xl" value={form.lrn} disabled />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Date of Birth</Label>
                      <Input
                        type="date"
                        className="student-input rounded-xl"
                        value={form.dateOfBirth}
                        onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Gender</Label>
                      <select
                        value={form.gender}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                        disabled={isLocked}
                        className="student-input flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Contact Number</Label>
                      <Input
                        className="student-input rounded-xl"
                        value={form.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        disabled={isLocked}
                        placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Home Address</Label>
                    <Input
                      className="student-input rounded-xl"
                      value={form.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Grade Level</Label>
                    <Input className="student-input rounded-xl" value={form.gradeLevel} disabled />
                  </div>
                </div>

                <div className="space-y-4 border-t border-[var(--student-outline)] pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--student-accent)]">Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Guardian Name</Label>
                      <Input
                        className="student-input rounded-xl"
                        value={form.familyName}
                        onChange={(e) => handleFieldChange('familyName', e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Relationship</Label>
                      <select
                        value={form.familyRelationship}
                        onChange={(e) => handleFieldChange('familyRelationship', e.target.value)}
                        disabled={isLocked}
                        className="student-input flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Contact Number</Label>
                      <Input
                        className="student-input rounded-xl"
                        value={form.familyContact}
                        onChange={(e) => handleFieldChange('familyContact', e.target.value)}
                        disabled={isLocked}
                        placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveAttempt}
                  disabled={isLocked || saving}
                  className="student-button-solid w-full rounded-xl font-black transition-all gap-2 md:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : isLocked ? (
                    'Profile Locked'
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Profile Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <AcademicSummaryPanel academicSummary={academicSummary} />
          </div>
        }
        right={
          <div className="space-y-6">
            <ProfileSecurityCard />
            <AcademicHighlights academicSummary={academicSummary} />
          </div>
        }
      />

      <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--student-accent)]">
              <AlertTriangle className="h-5 w-5" /> Missing Required Fields
            </DialogTitle>
            <DialogDescription>Please fill up the missing student details before saving.</DialogDescription>
          </DialogHeader>
          <div className="student-note-danger rounded-xl px-4 py-3 text-sm">
            Please fill up missing: {missingFields.join(', ')}
          </div>
          <DialogFooter>
            <Button onClick={() => setMissingDialogOpen(false)} className="student-button-solid">
              Review Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Student Details</DialogTitle>
            <DialogDescription>
              Are you sure with the details? This cannot be changed once saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} className="student-button-solid">
              Yes, Save and Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AcademicHighlights({ academicSummary }: { academicSummary: AcademicSummary | null }) {
  const atRiskCount =
    academicSummary?.performanceSummary.filter((item) => item.isAtRisk).length ?? 0;
  const activeInterventions =
    academicSummary?.interventionSummary.filter((item) => item.status === 'active')
      .length ?? 0;

  return (
    <Card className="student-panel student-panel-hover overflow-hidden rounded-[1.5rem]">
      <div className="border-b border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-6 py-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--student-text-strong)]">
          Academic Snapshot
        </h3>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <SnapshotStat label="Current Classes" value={academicSummary?.currentEnrollments.length ?? 0} />
          <SnapshotStat label="At-Risk Subjects" value={atRiskCount} />
          <SnapshotStat label="Active Interventions" value={activeInterventions} />
          <SnapshotStat label="LXP Tracks" value={academicSummary?.lxpProgress.length ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

function SnapshotStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--student-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[var(--student-text-strong)]">{value}</p>
    </div>
  );
}

function AcademicSummaryPanel({ academicSummary }: { academicSummary: AcademicSummary | null }) {
  return (
    <Card className="student-panel student-panel-hover overflow-hidden rounded-[1.5rem]">
      <div className="border-b border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-6 py-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--student-text-strong)]">
          Academic Profile
        </h3>
      </div>
      <CardContent className="space-y-6 p-6">
        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--student-accent)]">
            Enrollment History
          </h4>
          {(academicSummary?.enrollmentHistory.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--student-text-muted)]">No enrollment history available.</p>
          ) : (
            <div className="space-y-2">
              {academicSummary?.enrollmentHistory.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[var(--student-outline)] px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-[var(--student-text-strong)]">
                    {row.class?.subjectName} ({row.class?.subjectCode})
                  </p>
                  <p className="text-[var(--student-text-muted)]">
                    {row.section?.name ?? row.class?.section?.name ?? 'No section'} | {row.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--student-accent)]">
            Performance Snapshot
          </h4>
          {(academicSummary?.performanceSummary.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--student-text-muted)]">No performance analytics available yet.</p>
          ) : (
            <div className="space-y-2">
              {academicSummary?.performanceSummary.map((row) => (
                <div
                  key={`${row.classId}-${row.lastComputedAt}`}
                  className="rounded-2xl border border-[var(--student-outline)] px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--student-text-strong)]">
                      {row.class?.subjectCode ?? 'Class'}
                    </p>
                    <span className={row.isAtRisk ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                      {row.isAtRisk ? 'At Risk' : 'On Track'}
                    </span>
                  </div>
                  <p className="text-[var(--student-text-muted)]">
                    Blended Score: {row.blendedScore ?? '--'} | Threshold: {row.thresholdApplied}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--student-accent)]">
            Intervention & LXP
          </h4>
          {(academicSummary?.interventionSummary.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--student-text-muted)]">
              No intervention records available.
            </p>
          ) : (
            <div className="space-y-2">
              {academicSummary?.interventionSummary.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[var(--student-outline)] px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-[var(--student-text-strong)]">
                    {row.class?.subjectName} ({row.class?.subjectCode})
                  </p>
                  <p className="text-[var(--student-text-muted)]">
                    {row.status} | {row.completedAssignments}/{row.assignmentCount} tasks completed
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--student-accent)]">
            Assessment History
          </h4>
          {(academicSummary?.assessmentHistory.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--student-text-muted)]">No assessment attempts recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {academicSummary?.assessmentHistory.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[var(--student-outline)] px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-[var(--student-text-strong)]">
                    {row.assessment?.title}
                  </p>
                  <p className="text-[var(--student-text-muted)]">
                    Attempt #{row.attemptNumber} | Score: {row.score ?? '--'} | {row.assessment?.class?.subjectCode ?? '--'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
