'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
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
import { updateProfile } from '@/lib/auth-service';
import { profileService } from '@/services/profile-service';
import type { StudentProfile } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import {
  getMissingStudentProfileFields,
  isStudentProfileLocked,
  mergeUserWithStudentProfile,
  normalizePhilippinePhone,
  normalizeStudentProfile,
} from '@/utils/profile';
import { cn } from '@/utils/cn';

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

function toDateInputValue(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.slice(0, 10);
}

function toFormState(user: ReturnType<typeof mergeUserWithStudentProfile>): StudentProfileForm {
  return {
    lrn: String(user?.lrn ?? ''),
    dateOfBirth: toDateInputValue(user?.dateOfBirth ?? user?.dob),
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

const fieldClass = 'student-profile-input';

export default function StudentProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, setUser, refreshAuth } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
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

        if (!mounted) return;

        setProfile(normalizedProfile);
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
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email ?? 'Student';
  const roleLine = form.gradeLevel ? `Student - Grade ${form.gradeLevel}` : 'Student';

  const missingRequiredFields = getMissingStudentProfileFields({
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    phone: form.phone,
    address: form.address,
    familyName: form.familyName,
    familyRelationship: form.familyRelationship,
    familyContact: form.familyContact,
  });
  const isComplete = missingRequiredFields.length === 0;

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
    if (missingRequiredFields.length > 0) {
      setMissingFields(missingRequiredFields);
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
      const normalizedProfile = normalizeStudentProfile(latestProfile.data);
      setProfile(normalizedProfile);
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
      <div className="student-profile-page mx-auto w-full max-w-[1260px] space-y-5 pb-8">
        <section className="student-profile-header">
          <div className="student-profile-header__copy">
            <span className="student-profile-header__icon" aria-hidden="true">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <h1>My Profile</h1>
              <p>
                {isLocked
                  ? 'Your student details are finalized and read-only.'
                  : 'Review and confirm your required student information.'}
              </p>
            </div>
          </div>
        </section>

        <section className="student-profile-card">
          <CardContent className="space-y-5 px-6 py-6 md:px-7">
            <div className="student-profile-identity-row">
              <div className="student-profile-identity-main">
                <div className="student-profile-avatar">{initials}</div>
                <div className="space-y-0.5">
                  <p className="student-profile-name">{displayName}</p>
                  <p className="student-profile-role-line">{roleLine}</p>
                  <p className="student-profile-email">{user?.email || 'No email set'}</p>
                </div>
              </div>

              <div className="student-profile-identity-actions">
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
                  className="student-profile-avatar-button"
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
                <p className="student-profile-avatar-help">PNG, JPG, GIF, or WebP up to 5 MB.</p>
              </div>
            </div>

            <div className="student-profile-divider" />

            <div
              className={cn(
                'student-profile-alert',
                isLocked ? 'student-profile-alert--locked' : 'student-profile-alert--open',
              )}
            >
              {isLocked
                ? 'Your required student details are complete and locked.'
                : 'Complete and review all required details before saving. This will lock your profile after confirmation.'}
            </div>

            <div className="student-profile-section space-y-3.5">
              <h3 className="student-profile-section__title">Student Identity</h3>
              <div className="grid grid-cols-1 gap-x-5 gap-y-3.5 md:grid-cols-2">
                <ProfileField label="First Name" icon={UserRound}>
                  <Input className={fieldClass} value={user?.firstName ?? ''} readOnly />
                </ProfileField>
                <ProfileField label="Middle Name" icon={UserRound}>
                  <Input className={fieldClass} value={user?.middleName ?? ''} readOnly />
                </ProfileField>
                <ProfileField label="Last Name" icon={UserRound}>
                  <Input className={fieldClass} value={user?.lastName ?? ''} readOnly />
                </ProfileField>
                <ProfileField label="Email" icon={Mail}>
                  <Input className={fieldClass} value={user?.email ?? ''} readOnly />
                </ProfileField>
                <ProfileField label="LRN" icon={IdCard}>
                  <Input className={fieldClass} value={form.lrn} readOnly />
                </ProfileField>
                <ProfileField label="Grade Level" icon={GraduationCap}>
                  <Input className={fieldClass} value={form.gradeLevel} readOnly />
                </ProfileField>
                <ProfileField label="Date of Birth" icon={IdCard}>
                  <Input
                    type="date"
                    className={fieldClass}
                    value={form.dateOfBirth}
                    onChange={(event) => handleFieldChange('dateOfBirth', event.target.value)}
                    disabled={isLocked}
                  />
                </ProfileField>
                <ProfileField label="Gender" icon={UserRound}>
                  <select
                    value={form.gender}
                    onChange={(event) => handleFieldChange('gender', event.target.value)}
                    disabled={isLocked}
                    className={cn(fieldClass, 'w-full pr-10 disabled:cursor-not-allowed disabled:opacity-60')}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </ProfileField>
                <ProfileField label="Student Contact Number" icon={Phone}>
                  <Input
                    className={fieldClass}
                    value={form.phone}
                    onChange={(event) => handleFieldChange('phone', event.target.value)}
                    disabled={isLocked}
                    placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                  />
                </ProfileField>
                <ProfileField label="Home Address" icon={MapPin}>
                  <Input
                    className={fieldClass}
                    value={form.address}
                    onChange={(event) => handleFieldChange('address', event.target.value)}
                    disabled={isLocked}
                  />
                </ProfileField>
              </div>
            </div>

            <div className="student-profile-section space-y-3.5">
              <h3 className="student-profile-section__title">Emergency Contact</h3>
              <div className="grid grid-cols-1 gap-x-5 gap-y-3.5 md:grid-cols-3">
                <ProfileField label="Guardian Name" icon={UserRound}>
                  <Input
                    className={fieldClass}
                    value={form.familyName}
                    onChange={(event) => handleFieldChange('familyName', event.target.value)}
                    disabled={isLocked}
                  />
                </ProfileField>
                <ProfileField label="Relationship" icon={UserRound}>
                  <select
                    value={form.familyRelationship}
                    onChange={(event) => handleFieldChange('familyRelationship', event.target.value)}
                    disabled={isLocked}
                    className={cn(fieldClass, 'w-full pr-10 disabled:cursor-not-allowed disabled:opacity-60')}
                  >
                    <option value="">Select</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </ProfileField>
                <ProfileField label="Guardian Contact Number" icon={Phone}>
                  <Input
                    className={fieldClass}
                    value={form.familyContact}
                    onChange={(event) => handleFieldChange('familyContact', event.target.value)}
                    disabled={isLocked}
                    placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                  />
                </ProfileField>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleSaveAttempt}
                disabled={isLocked || saving}
                className="student-profile-save-button"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isLocked ? (
                  'Profile Locked'
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Profile Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </section>

        <section className="student-profile-support-grid">
          <ProfileSecurityCard appearance="student" />

          <Card className="student-profile-support-card">
            <CardContent className="space-y-3 p-5">
              <h3 className="student-profile-support-title">
                <ShieldCheck className="h-4 w-4" />
                Profile Status
              </h3>
              <div
                className={cn(
                  'student-profile-status-chip',
                  isComplete
                    ? 'student-profile-status-chip--complete'
                    : 'student-profile-status-chip--incomplete',
                )}
              >
                {isComplete
                  ? 'All required student details are complete.'
                  : `${missingRequiredFields.length} required field(s) still need attention.`}
              </div>
              <p className="student-profile-support-text">
                Your profile information is visible to administrators and relevant staff to support
                official school records.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

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

function ProfileField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof UserRound;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="student-profile-field-label">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      {children}
    </div>
  );
}
