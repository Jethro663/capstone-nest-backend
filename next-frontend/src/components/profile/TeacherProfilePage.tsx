'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  GraduationCap,
  IdCard,
  Loader2,
  Lock,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  Save,
  Upload,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import {
  sanitizeAddressInput,
  sanitizePhoneLocalInput,
} from '@/lib/input-policy';
import { teacherProfileService } from '@/services/teacher-profile-service';
import type { TeacherProfile } from '@/types/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  mergeUserWithTeacherProfile,
  normalizePhilippinePhone,
  normalizeTeacherProfile,
  resolveUserProfilePicture,
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

type TeacherProfileSectionKey = 'identity' | 'contact' | 'employment';

const FIELD_LIMITS = {
  phone: 11,
  address: 180,
} as const;

const EDITABLE_FIELD_LABELS = {
  phone: 'Contact Number',
  address: 'Home Address',
} as const;

const SCHOOL_MANAGED_FIELD_LABELS = {
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  department: 'Department',
  specialization: 'Specialization',
  employeeId: 'Employee ID',
} as const;

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
    gender: String(user?.gender ?? '').trim(),
    phone: sanitizePhoneLocalInput(
      String(user?.phone ?? user?.contactNumber ?? ''),
      FIELD_LIMITS.phone,
    ),
    address: sanitizeAddressInput(String(user?.address ?? ''), FIELD_LIMITS.address),
    department: String(user?.department ?? '').trim(),
    specialization: String(user?.specialization ?? '').trim(),
    employeeId: String(user?.employeeId ?? '').trim(),
    profilePicture: String(user?.profilePicture ?? ''),
  };
}

function getMissingTeacherEditableFields(
  values: Pick<TeacherProfileForm, 'phone' | 'address'>,
): string[] {
  return (Object.entries(EDITABLE_FIELD_LABELS) as Array<
    [keyof typeof EDITABLE_FIELD_LABELS, string]
  >)
    .filter(([field]) => String(values[field] ?? '').trim() === '')
    .map(([, label]) => label);
}

function getPendingTeacherSchoolManagedFields(
  values: Pick<
    TeacherProfileForm,
    'dateOfBirth' | 'gender' | 'department' | 'specialization' | 'employeeId'
  >,
): string[] {
  return (Object.entries(SCHOOL_MANAGED_FIELD_LABELS) as Array<
    [keyof typeof SCHOOL_MANAGED_FIELD_LABELS, string]
  >)
    .filter(([field]) => String(values[field] ?? '').trim() === '')
    .map(([, label]) => label);
}

const baselineCardClass =
  'w-full rounded-[1.5rem] border border-[#d7deea] bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.38)]';
const editableFieldClass =
  'h-[44px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[0.95rem] text-[#0f2748] shadow-none focus-visible:ring-0 focus-visible:border-[#afbed6]';
const readonlyFieldClass =
  'h-[44px] rounded-full border border-[#cdd8e6] bg-[#f2f6fb] px-4 text-[0.95rem] font-medium text-[#284567] shadow-none';

export default function TeacherProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, setUser, refreshAuth } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [form, setForm] = useState<TeacherProfileForm>(() => toFormState(user));
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<TeacherProfileSectionKey, boolean>>({
    identity: false,
    contact: true,
    employment: false,
  });

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
  const avatarSrc = form.profilePicture || resolveUserProfilePicture(user);
  const departmentLine = form.department || 'Pending school record';
  const roleLine = `Teacher | ${departmentLine}`;
  const editableMissingFields = getMissingTeacherEditableFields({
    phone: form.phone,
    address: form.address,
  });
  const pendingSchoolManagedFields = getPendingTeacherSchoolManagedFields({
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    department: form.department,
    specialization: form.specialization,
    employeeId: form.employeeId,
  });
  const profileAlertItems = [
    ...editableMissingFields,
    ...pendingSchoolManagedFields,
  ];

  const handleFieldChange = (field: keyof TeacherProfileForm, value: string) => {
    if (field === 'phone') {
      setForm((current) => ({
        ...current,
        phone: sanitizePhoneLocalInput(value, FIELD_LIMITS.phone),
      }));
      return;
    }

    if (field === 'address') {
      setForm((current) => ({
        ...current,
        address: sanitizeAddressInput(value, FIELD_LIMITS.address),
      }));
    }
  };

  const toggleSection = (section: TeacherProfileSectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const handleOpenAlerts = () => {
    if (profileAlertItems.length === 0) return;
    setAlertsDialogOpen(true);
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
    const missing = getMissingTeacherEditableFields({
      phone: form.phone,
      address: form.address,
    });

    if (missing.length > 0) {
      setAlertsDialogOpen(true);
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
        phone: normalizePhilippinePhone(form.phone) ?? form.phone,
        contactNumber: normalizePhilippinePhone(form.phone) ?? form.phone,
        address: form.address,
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
      <div className="w-full space-y-4 pb-4">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="rounded-[1.5rem] border border-[#1d345f] bg-[#12254a] px-6 py-5 text-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.66)] lg:px-7"
        >
          <div className="flex items-start gap-4">
            <div className="inline-flex h-[54px] w-[54px] items-center justify-center rounded-[1rem] bg-[#ef0018]">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight lg:text-[1.95rem]">
                  My Profile
                </h1>
                {profileAlertItems.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="student-profile-missing-button h-9 rounded-full px-3"
                    onClick={handleOpenAlerts}
                    aria-label={`View ${profileAlertItems.length} profile alerts`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>{profileAlertItems.length} alert{profileAlertItems.length === 1 ? '' : 's'}</span>
                  </Button>
                ) : null}
              </div>
              <p className="text-[0.95rem] text-[#8fb1dd]">Manage your teacher account</p>
            </div>
          </div>
        </motion.section>

        <Tabs defaultValue="profile" className="space-y-4">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.04, ease: 'easeOut' }}
            className="flex justify-start"
          >
            <TabsList className="teacher-tab-list h-auto flex-wrap justify-start">
              <TabsTrigger value="profile" className="teacher-tab min-w-[144px] px-5 py-3 text-sm font-semibold">
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="teacher-tab min-w-[144px] px-5 py-3 text-sm font-semibold">
                Security
              </TabsTrigger>
            </TabsList>
          </motion.section>

          <TabsContent value="profile" className="mt-0">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.06, ease: 'easeOut' }}
              className={baselineCardClass}
            >
              <CardContent className="space-y-4 px-5 py-5 lg:px-6">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_340px]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-[68px] w-[68px] rounded-[1.15rem]">
                        {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                        <AvatarFallback className="rounded-[1.15rem] bg-[#ef0018] text-[2.1rem] font-bold leading-none text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <p className="text-[2rem] font-semibold leading-none tracking-tight text-[#0d2345] lg:text-[2.15rem]">
                          {displayName}
                        </p>
                        <p className="text-[0.98rem] text-[#728bb0]">{roleLine}</p>
                        <p className="text-[0.84rem] text-[#7f99bc]">
                          Contact details can be updated here. Identity records stay school-managed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] border border-[#d7e1ef] bg-[#f8fbff] p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-[0.95rem]">
                        {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                        <AvatarFallback className="rounded-[0.95rem] bg-[#ef0018] text-base font-bold text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-[#12315c]">
                          {form.profilePicture ? 'Picture uploaded' : 'No custom picture uploaded yet'}
                        </p>
                        <p className="text-[0.76rem] text-[#6c84a5]">
                          PNG, JPG, GIF, or WebP up to 5 MB.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[#a12a3b]">
                          Editable here
                        </p>
                        <p className="text-[0.74rem] text-[#7087a6]">
                          You can update this field on this page.
                        </p>
                      </div>

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
                        className="h-[38px] rounded-full border border-[#d2dcec] bg-[#f8fafe] px-4 text-[0.84rem] font-semibold text-[#334e73] hover:bg-[#edf2f9]"
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
                            Change Picture
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <ProfileSection
                    title="School Identity"
                    isOpen={openSections.identity}
                    onToggle={() => toggleSection('identity')}
                  >
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                      <ProfileField label="First Name" icon={UserRound} variant="immutable" note="Cannot be edited here.">
                        <Input className={readonlyFieldClass} value={user?.firstName ?? 'Pending school record'} readOnly />
                      </ProfileField>
                      <ProfileField label="Last Name" icon={UserRound} variant="immutable" note="Cannot be edited here.">
                        <Input className={readonlyFieldClass} value={user?.lastName ?? 'Pending school record'} readOnly />
                      </ProfileField>
                      <ProfileField label="Email" icon={Mail} variant="immutable" note="Cannot be edited here.">
                        <Input className={readonlyFieldClass} value={user?.email ?? 'Pending school record'} readOnly />
                      </ProfileField>
                      <ProfileField label="Date of Birth" icon={IdCard} variant="immutable" note="Cannot be edited here.">
                        <Input
                          aria-label="Date of Birth"
                          className={readonlyFieldClass}
                          value={form.dateOfBirth || 'Pending school record'}
                          readOnly
                        />
                      </ProfileField>
                      <ProfileField label="Gender" icon={UserRound} variant="immutable" note="Cannot be edited here.">
                        <Input
                          aria-label="Gender"
                          className={readonlyFieldClass}
                          value={form.gender || 'Pending school record'}
                          readOnly
                        />
                      </ProfileField>
                    </div>
                  </ProfileSection>

                  <ProfileSection
                    title="Contact Details"
                    isOpen={openSections.contact}
                    onToggle={() => toggleSection('contact')}
                  >
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                      <ProfileField label="Phone" icon={Phone} variant="editable" note="You can update this field on this page.">
                        <Input
                          aria-label="Phone"
                          className={editableFieldClass}
                          value={form.phone}
                          onChange={(event) => handleFieldChange('phone', event.target.value)}
                          placeholder="09XXXXXXXXX"
                          inputMode="tel"
                          maxLength={FIELD_LIMITS.phone}
                        />
                      </ProfileField>
                      <ProfileField
                        label="Home Address"
                        icon={MapPin}
                        variant="editable"
                        note="You can update this field on this page."
                        className="xl:col-span-2"
                      >
                        <Input
                          className={editableFieldClass}
                          value={form.address}
                          onChange={(event) => handleFieldChange('address', event.target.value)}
                          placeholder="Quezon City, Metro Manila"
                          maxLength={FIELD_LIMITS.address}
                        />
                      </ProfileField>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleSaveAttempt}
                        disabled={saving}
                        className="inline-flex h-[44px] min-w-[200px] rounded-full bg-[#ef0018] px-7 text-[0.98rem] font-semibold text-white hover:bg-[#da0016]"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Contact Updates
                          </>
                        )}
                      </Button>
                    </div>
                  </ProfileSection>

                  <ProfileSection
                    title="Employment Details"
                    isOpen={openSections.employment}
                    onToggle={() => toggleSection('employment')}
                  >
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                      <ProfileField label="Department" icon={GraduationCap} variant="immutable" note="Cannot be edited here.">
                        <Input className={readonlyFieldClass} value={form.department || 'Pending school record'} readOnly />
                      </ProfileField>
                      <ProfileField label="Employee ID" icon={IdCard} variant="immutable" note="Cannot be edited here.">
                        <Input className={readonlyFieldClass} value={form.employeeId || 'Pending school record'} readOnly />
                      </ProfileField>
                      <ProfileField label="Specialization" icon={GraduationCap} variant="immutable" note="Cannot be edited here.">
                        <Input className={readonlyFieldClass} value={form.specialization || 'Pending school record'} readOnly />
                      </ProfileField>
                    </div>
                  </ProfileSection>
                </div>
              </CardContent>
            </motion.section>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.06, ease: 'easeOut' }}
              className="w-full"
            >
              <ProfileSecurityCard appearance="teacher" layout="teacher-parity" />
            </motion.section>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={alertsDialogOpen} onOpenChange={setAlertsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--teacher-accent)]">
              <AlertTriangle className="h-5 w-5" />
              Profile Alerts
            </DialogTitle>
            <DialogDescription>
              Review the teacher profile items that still need attention.
            </DialogDescription>
          </DialogHeader>
          <div className="student-note-danger rounded-xl px-4 py-3 text-sm">
            <ul className="space-y-2" aria-label="Teacher profile alerts checklist">
              {profileAlertItems.map((field) => (
                <li key={field} className="flex items-center gap-2 text-[#7d2634]">
                  <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                  <span>{field}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setAlertsDialogOpen(false)} className="teacher-button-solid">
              Review Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Contact Updates</DialogTitle>
            <DialogDescription>
              Save these editable teacher contact details now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} className="teacher-button-solid">
              Yes, Save Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#dde6f2] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'flex w-full items-center justify-between gap-3 py-3 text-left text-[0.9rem] font-semibold text-[#334e73] transition-colors',
          isOpen ? 'text-[#12315c]' : 'hover:text-[#12315c]',
        )}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[#6d84a5] transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen ? <div className="border-t border-[#e2eaf4] pb-4 pt-3">{children}</div> : null}
    </section>
  );
}

function ProfileField({
  label,
  icon: Icon,
  children,
  variant,
  note,
  className,
}: {
  label: string;
  icon: typeof UserRound;
  children: ReactNode;
  variant: 'immutable' | 'editable';
  note: string;
  className?: string;
}) {
  const isImmutable = variant === 'immutable';

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <Label className="flex items-center gap-2 text-[0.88rem] font-semibold text-[#2d4c77]">
          <Icon className="h-4 w-4 text-[#5f7698]" />
          {label}
        </Label>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.08em]',
            isImmutable
              ? 'border-[#c9d7e8] bg-[#eef3fb] text-[#49637e]'
              : 'border-[#f2c3ca] bg-[#fff2f4] text-[#a12a3b]',
          )}
        >
          {isImmutable ? <Lock className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
          {isImmutable ? 'School-managed' : 'Editable here'}
        </span>
      </div>
      <p className="text-[0.72rem] font-medium text-[#7087a6]">{note}</p>
      {children}
    </div>
  );
}
