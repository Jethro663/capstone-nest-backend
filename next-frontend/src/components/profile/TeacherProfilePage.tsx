'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, BriefcaseBusiness, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { teacherProfileService } from '@/services/teacher-profile-service';
import type { TeacherProfile } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import { ProfilePageFrame } from '@/components/profile/ProfilePageFrame';
import {
  getMissingTeacherProfileFields,
  isTeacherProfileComplete,
  mergeUserWithTeacherProfile,
  normalizePhilippinePhone,
  normalizeTeacherProfile,
} from '@/utils/profile';

type TeacherProfileForm = {
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  department: string;
  specialization: string;
  employeeId: string;
  profilePicture: string;
};

function toDateInputValue(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.slice(0, 10);
}

function toFormState(
  user: ReturnType<typeof mergeUserWithTeacherProfile>,
): TeacherProfileForm {
  return {
    dateOfBirth: toDateInputValue(user?.dateOfBirth ?? user?.dob),
    gender: String(user?.gender ?? ''),
    phone: String(user?.phone ?? user?.contactNumber ?? ''),
    address: String(user?.address ?? ''),
    department: String(user?.department ?? ''),
    specialization: String(user?.specialization ?? ''),
    employeeId: String(user?.employeeId ?? ''),
    profilePicture: String(user?.profilePicture ?? ''),
  };
}

export default function TeacherProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, setUser, refreshAuth } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [form, setForm] = useState<TeacherProfileForm>(() => toFormState(user));
  const [loadingProfile, setLoadingProfile] = useState(true);
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
        const response = await teacherProfileService.getMine();
        const normalizedProfile = normalizeTeacherProfile(response.data);

        if (!mounted) return;

        setProfile(normalizedProfile);
        const mergedUser = mergeUserWithTeacherProfile(user, normalizedProfile);
        setForm(toFormState(mergedUser));

        if (mergedUser) {
          setUser(mergedUser);
        }
      } catch {
        if (mounted) {
          toast.error('Failed to load teacher profile');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile && user) {
      setForm(toFormState(user));
    }
  }, [profile, user]);

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'T';
  const isComplete = isTeacherProfileComplete({
    ...user,
    ...profile,
    ...form,
  });

  const handleFieldChange = (field: keyof TeacherProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleChooseAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      setUploadingAvatar(true);
      const response = await teacherProfileService.uploadAvatar(file);
      const normalizedProfile = normalizeTeacherProfile(response.data.profile);
      setProfile(normalizedProfile);
      setForm((current) => ({
        ...current,
        profilePicture: response.data.profilePicture,
      }));

      const mergedUser = mergeUserWithTeacherProfile(user, normalizedProfile);
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
    const missing = getMissingTeacherProfileFields({
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      phone: form.phone,
      address: form.address,
      department: form.department,
      specialization: form.specialization,
      employeeId: form.employeeId,
    });

    if (missing.length > 0) {
      setMissingFields(missing);
      setMissingDialogOpen(true);
      return false;
    }

    if (!normalizePhilippinePhone(form.phone)) {
      toast.error('Teacher contact number must be a valid Philippine mobile number');
      return false;
    }

    return true;
  };

  const handleSaveAttempt = () => {
    if (!validateBeforeConfirm()) return;
    setConfirmDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!user?.id) return;

    try {
      setConfirmDialogOpen(false);
      setSaving(true);

      const dto = {
        dob: form.dateOfBirth,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        phone: normalizePhilippinePhone(form.phone) ?? form.phone,
        contactNumber: normalizePhilippinePhone(form.phone) ?? form.phone,
        address: form.address,
        department: form.department,
        specialization: form.specialization,
        employeeId: form.employeeId,
        profilePicture: form.profilePicture || undefined,
      };

      const response = await teacherProfileService.update(user.id, dto);
      const mergedUser = mergeUserWithTeacherProfile(
        user,
        normalizeTeacherProfile({
          ...profile,
          ...response.data,
          ...dto,
        }),
      );

      if (mergedUser) {
        setUser(mergedUser);
      }

      await refreshAuth();
      const latestProfile = await teacherProfileService.getMine();
      const normalizedProfile = normalizeTeacherProfile(latestProfile.data);
      setProfile(normalizedProfile);
      const finalUser = mergeUserWithTeacherProfile(mergedUser, normalizedProfile);
      setForm(toFormState(finalUser));

      toast.success('Teacher profile saved');
      router.refresh();
    } catch {
      toast.error('Failed to update teacher profile');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--teacher-accent)]" />
      </div>
    );
  }

  return (
    <>
      <ProfilePageFrame
        email={user?.email}
        roleLabel="Teacher"
        title="Teacher Profile"
        subtitle={
          isComplete
            ? 'Your teacher profile is complete. Keep it updated so sections, reports, and admin records stay accurate.'
            : 'Complete your teacher details to match the same profile coverage expected across the platform.'
        }
        initials={initials}
        avatarSrc={form.profilePicture || user?.profilePicture}
        appearance="teacher"
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
              disabled={uploadingAvatar}
              className="teacher-button-solid rounded-xl font-black gap-2"
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
            <p className="text-[11px] font-semibold text-[var(--teacher-text-muted)]">
              PNG, JPG, GIF, or WebP up to 5 MB.
            </p>
          </div>
        }
        left={
          <div className="space-y-6">
            <Card className="teacher-panel teacher-panel-hover overflow-hidden rounded-[1.5rem]">
              <div className="border-b border-[var(--teacher-outline)] bg-white/55 px-6 py-4">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--teacher-text-strong)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--teacher-accent)]" /> Teacher Information
                </h3>
              </div>
              <CardContent className="space-y-6 p-6">
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    isComplete ? 'teacher-soft-panel text-[var(--teacher-text-strong)]' : 'student-note-danger'
                  }`}
                >
                  {isComplete
                    ? 'Required teacher details are complete and ready for roster, reports, and admin coverage.'
                    : 'Complete all required teacher details before saving so the rest of the dashboard has full profile coverage.'}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    ['First Name', user?.firstName ?? ''],
                    ['Middle Name', user?.middleName ?? ''],
                    ['Last Name', user?.lastName ?? ''],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                        {label}
                      </Label>
                      <Input className="teacher-input rounded-xl" value={value} disabled />
                    </div>
                  ))}
                </div>

                <div className="space-y-4 border-t border-[var(--teacher-outline)] pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--teacher-accent)]">
                    Personal Details
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                        Date of Birth
                      </Label>
                      <Input
                        type="date"
                        className="teacher-input rounded-xl"
                        value={form.dateOfBirth}
                        onChange={(event) => handleFieldChange('dateOfBirth', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                        Gender
                      </Label>
                      <select
                        value={form.gender}
                        onChange={(event) => handleFieldChange('gender', event.target.value)}
                        className="teacher-input flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                        Contact Number
                      </Label>
                      <Input
                        className="teacher-input rounded-xl"
                        value={form.phone}
                        onChange={(event) => handleFieldChange('phone', event.target.value)}
                        placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                        Employee ID
                      </Label>
                      <Input
                        className="teacher-input rounded-xl"
                        value={form.employeeId}
                        onChange={(event) => handleFieldChange('employeeId', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                      Home Address
                    </Label>
                    <Input
                      className="teacher-input rounded-xl"
                      value={form.address}
                      onChange={(event) => handleFieldChange('address', event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t border-[var(--teacher-outline)] pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--teacher-accent)]">
                    Teaching Details
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                        Department
                      </Label>
                      <Input
                        className="teacher-input rounded-xl"
                        value={form.department}
                        onChange={(event) => handleFieldChange('department', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-[var(--teacher-text-muted)]">
                        Specialization
                      </Label>
                      <Input
                        className="teacher-input rounded-xl"
                        value={form.specialization}
                        onChange={(event) => handleFieldChange('specialization', event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveAttempt}
                  disabled={saving}
                  className="teacher-button-solid w-full rounded-xl font-black transition-all gap-2 md:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Profile Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        }
        right={
          <div className="space-y-6">
            <ProfileSecurityCard appearance="teacher" />
            <Card className="teacher-panel overflow-hidden rounded-[1.5rem]">
              <div className="border-b border-[var(--teacher-outline)] bg-white/55 px-6 py-4">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--teacher-text-strong)]">
                  <BriefcaseBusiness className="h-4 w-4 text-[var(--teacher-accent)]" /> Coverage Snapshot
                </h3>
              </div>
              <CardContent className="grid gap-3 p-6">
                <SnapshotStat label="Department" value={form.department || '--'} />
                <SnapshotStat label="Specialization" value={form.specialization || '--'} />
                <SnapshotStat label="Employee ID" value={form.employeeId || '--'} />
              </CardContent>
            </Card>
          </div>
        }
      />

      <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--teacher-accent)]">
              <AlertTriangle className="h-5 w-5" /> Missing Required Fields
            </DialogTitle>
            <DialogDescription>Please complete the missing teacher details before saving.</DialogDescription>
          </DialogHeader>
          <div className="student-note-danger rounded-xl px-4 py-3 text-sm">
            Please fill up missing: {missingFields.join(', ')}
          </div>
          <DialogFooter>
            <Button onClick={() => setMissingDialogOpen(false)} className="teacher-button-solid">
              Review Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Teacher Details</DialogTitle>
            <DialogDescription>
              Save these teacher profile details now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} className="teacher-button-solid">
              Yes, Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SnapshotStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--teacher-outline)] bg-white/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--teacher-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-[var(--teacher-text-strong)]">{value}</p>
    </div>
  );
}
