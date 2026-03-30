'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { teacherProfileService } from '@/services/teacher-profile-service';
import type { TeacherProfile } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import {
  getMissingTeacherProfileFields,
  isTeacherProfileComplete,
  mergeUserWithTeacherProfile,
  normalizePhilippinePhone,
  normalizeTeacherProfile,
} from '@/utils/profile';
import { cn } from '@/utils/cn';

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

const baselineCardClass =
  'mx-auto w-full max-w-[860px] rounded-[1.65rem] border border-[#d7deea] bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.38)]';
const fieldClass =
  'h-[46px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[1.02rem] text-[#0f2748] shadow-none focus-visible:ring-0 focus-visible:border-[#afbed6]';

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
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email ?? 'Teacher';
  const roleLine = form.department ? `Teacher · ${form.department}` : 'Teacher';
  const isComplete = isTeacherProfileComplete({
    ...user,
    ...profile,
    ...form,
  });

  const coverageStats = useMemo(
    () => [
      { label: 'Department', value: form.department || '--' },
      { label: 'Specialization', value: form.specialization || '--' },
      { label: 'Employee ID', value: form.employeeId || '--' },
    ],
    [form.department, form.employeeId, form.specialization],
  );

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
      <div className="mx-auto w-full max-w-[1260px] space-y-5 pb-8">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="rounded-[1.65rem] border border-[#1d345f] bg-[#12254a] px-8 py-7 text-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.66)]"
        >
          <div className="flex items-start gap-5">
            <div className="inline-flex h-[56px] w-[56px] items-center justify-center rounded-[1.2rem] bg-[#ef0018]">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-[2.04rem] font-semibold leading-tight tracking-tight">My Profile</h1>
              <p className="text-[1.02rem] text-[#8fb1dd]">Manage your teacher account</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04, ease: 'easeOut' }}
          className={baselineCardClass}
        >
          <CardContent className="space-y-5 px-6 py-6 md:px-7">
            <div className="flex items-center gap-4">
              <div className="inline-flex h-[74px] w-[74px] items-center justify-center rounded-[1.25rem] bg-[#ef0018] text-[2.55rem] font-bold leading-none text-white">
                {initials}
              </div>
              <div className="space-y-0.5">
                <p className="text-[2.7rem] font-semibold leading-none tracking-tight text-[#0d2345]">
                  {displayName}
                </p>
                <p className="text-[1.16rem] text-[#728bb0]">{roleLine}</p>
                <p className="text-[1.08rem] text-[#7f99bc]">{user?.email || 'No email set'}</p>
              </div>
            </div>

            <div className="h-px w-full bg-[#e3e8f0]" />

            <div className="grid grid-cols-1 gap-x-5 gap-y-3.5 md:grid-cols-2">
              <ProfileField label="First Name" icon={UserRound}>
                <Input className={fieldClass} value={user?.firstName ?? ''} readOnly />
              </ProfileField>
              <ProfileField label="Last Name" icon={UserRound}>
                <Input className={fieldClass} value={user?.lastName ?? ''} readOnly />
              </ProfileField>
              <ProfileField label="Email" icon={Mail}>
                <Input className={fieldClass} value={user?.email ?? ''} readOnly />
              </ProfileField>
              <ProfileField label="Phone" icon={Phone}>
                <Input
                  className={fieldClass}
                  value={form.phone}
                  onChange={(event) => handleFieldChange('phone', event.target.value)}
                  placeholder="+63 912 345 6789"
                />
              </ProfileField>
              <ProfileField label="Address" icon={MapPin}>
                <Input
                  className={fieldClass}
                  value={form.address}
                  onChange={(event) => handleFieldChange('address', event.target.value)}
                  placeholder="Quezon City, Metro Manila"
                />
              </ProfileField>
              <ProfileField label="Department" icon={GraduationCap}>
                <Input
                  className={fieldClass}
                  value={form.department}
                  onChange={(event) => handleFieldChange('department', event.target.value)}
                />
              </ProfileField>
              <ProfileField label="Employee ID" icon={IdCard}>
                <Input
                  className={fieldClass}
                  value={form.employeeId}
                  onChange={(event) => handleFieldChange('employeeId', event.target.value)}
                />
              </ProfileField>
              <ProfileField label="Specialization" icon={GraduationCap}>
                <Input
                  className={fieldClass}
                  value={form.specialization}
                  onChange={(event) => handleFieldChange('specialization', event.target.value)}
                />
              </ProfileField>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleSaveAttempt}
                disabled={saving}
                className="inline-flex h-[46px] min-w-[188px] rounded-full bg-[#ef0018] px-8 text-[1.04rem] font-semibold text-white hover:bg-[#da0016]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.08, ease: 'easeOut' }}
          className="mx-auto w-full max-w-[860px]"
        >
          <ProfileSecurityCard appearance="teacher" layout="teacher-parity" />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.12, ease: 'easeOut' }}
          className="mx-auto grid w-full max-w-[860px] gap-4 md:grid-cols-[1.3fr_0.7fr]"
        >
          <Card className="rounded-[1.35rem] border border-[#d9e0eb] bg-white shadow-[0_10px_24px_-22px_rgba(15,23,42,0.34)]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[1.05rem] font-semibold text-[#14325e]">
                  <CalendarDays className="h-4 w-4 text-[#ef0018]" />
                  Additional Teacher Details
                </h3>

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
                  className="h-[38px] rounded-full border border-[#d2dcec] bg-[#f8fafe] px-4 text-[0.86rem] font-semibold text-[#334e73] hover:bg-[#edf2f9]"
                  variant="outline"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Change Avatar
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[0.82rem] font-medium text-[#2d4c77]">Date of Birth</Label>
                  <Input
                    type="date"
                    className={fieldClass}
                    value={form.dateOfBirth}
                    onChange={(event) => handleFieldChange('dateOfBirth', event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[0.82rem] font-medium text-[#2d4c77]">Gender</Label>
                  <select
                    value={form.gender}
                    onChange={(event) => handleFieldChange('gender', event.target.value)}
                    className={cn(fieldClass, 'w-full pr-10')}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div
                className={cn(
                  'rounded-xl border px-3 py-2 text-[0.84rem]',
                  isComplete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700',
                )}
              >
                {isComplete
                  ? 'Teacher profile requirements are complete.'
                  : 'Complete required teacher details before saving.'}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-[1.35rem] border border-[#d9e0eb] bg-white shadow-[0_10px_24px_-22px_rgba(15,23,42,0.34)]">
              <CardContent className="space-y-3 p-5">
                <h3 className="flex items-center gap-2 text-[1.05rem] font-semibold text-[#14325e]">
                  <BriefcaseBusiness className="h-4 w-4 text-[#ef0018]" />
                  Coverage Snapshot
                </h3>
                <div className="space-y-2">
                  {coverageStats.map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#e2e8f1] bg-[#f8fafd] px-3 py-2">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#7a90ad]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[0.93rem] font-medium text-[#12315c]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.35rem] border border-[#d9e0eb] bg-white shadow-[0_10px_24px_-22px_rgba(15,23,42,0.34)]">
              <CardContent className="space-y-2 p-5">
                <h3 className="flex items-center gap-2 text-[1.05rem] font-semibold text-[#14325e]">
                  <ShieldCheck className="h-4 w-4 text-[#ef0018]" />
                  Privacy Note
                </h3>
                <p className="text-[0.84rem] leading-relaxed text-[#5d7394]">
                  Your profile information is visible to administrators and relevant staff to support official school records.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.section>
      </div>

      <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--teacher-accent)]">
              <AlertTriangle className="h-5 w-5" />
              Missing Required Fields
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

function ProfileField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="inline-flex items-center gap-2 text-[1.02rem] font-medium text-[#2d4c77]">
        <Icon className="h-4 w-4 text-[#5f7698]" />
        {label}
      </p>
      {children}
    </div>
  );
}
