'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  IdCard,
  Lock,
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
import {
  sanitizeAddressInput,
  sanitizePersonNameInput,
  sanitizePhoneLocalInput,
} from '@/lib/input-policy';
import { profileService } from '@/services/profile-service';
import type { StudentProfile } from '@/types/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getMissingStudentProfileFields,
  isStudentProfileLocked,
  mergeUserWithStudentProfile,
  normalizePhilippinePhone,
  normalizeStudentProfile,
  resolveUserProfilePicture,
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

type ProfileGuideScreen = 'overview' | 'identity' | 'editing' | 'account';

const FIELD_LIMITS = {
  phone: 11,
  address: 180,
  familyName: 80,
  familyContact: 11,
} as const;

const NAME_LIKE_REGEX = /^[a-zA-Z\s.'-]*$/;

function getInlineFieldError(form: StudentProfileForm) {
  const errors: Partial<Record<keyof StudentProfileForm, string>> = {};
  if (form.familyName && !NAME_LIKE_REGEX.test(form.familyName)) {
    errors.familyName = 'Guardian name can only use letters and basic punctuation.';
  }
  if (form.phone && !normalizePhilippinePhone(form.phone)) {
    errors.phone = 'Use 09XXXXXXXXX or +639XXXXXXXXX.';
  }
  if (form.familyContact && !normalizePhilippinePhone(form.familyContact)) {
    errors.familyContact = 'Use 09XXXXXXXXX or +639XXXXXXXXX.';
  }
  return errors;
}

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
    phone: sanitizePhoneLocalInput(String(user?.phone ?? ''), FIELD_LIMITS.phone),
    address: sanitizeAddressInput(String(user?.address ?? ''), FIELD_LIMITS.address),
    familyName: sanitizePersonNameInput(
      String(user?.familyName ?? ''),
      FIELD_LIMITS.familyName,
    ),
    familyRelationship: String(user?.familyRelationship ?? ''),
    familyContact: sanitizePhoneLocalInput(
      String(user?.familyContact ?? ''),
      FIELD_LIMITS.familyContact,
    ),
    gradeLevel: String(user?.gradeLevel ?? ''),
    profilePicture: String(user?.profilePicture ?? ''),
  };
}

const profileGuidePages: Array<{
  title: string;
  description: string;
  screen: ProfileGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'default' | 'caution';
  }>;
}> = [
  {
    title: 'Get oriented on your profile page',
    description: 'This first view shows your profile workspace, the tabs, and the warning indicators that tell you what needs attention.',
    screen: 'overview',
    reminder: 'Simple rule: check the warning indicators first, then move to the part of the page that needs your action.',
    steps: [
      {
        action: 'Read',
        body: 'Use the top heading to confirm you are inside your student profile page.',
      },
      {
        action: 'Open',
        body: 'Use the red warning badge beside your name when you need a quick list of missing required details.',
      },
      {
        action: 'Switch',
        body: 'Move between the Profile and Account tabs depending on whether you are editing details or reviewing account tools.',
      },
    ],
  },
  {
    title: 'Know which fields you can and cannot change',
    description: 'The identity block mixes school-managed data and editable student details, so you should check the badges before typing.',
    screen: 'identity',
    reminder: 'If a field says School-managed, it is controlled by the school record and cannot be edited from this page.',
    steps: [
      {
        action: 'Check',
        body: 'Read the School-managed badge on first name, last name, email, LRN, and grade level before trying to edit them.',
      },
      {
        action: 'Review',
        body: 'Confirm the student picture, name, and grade line so you know you are editing the correct account.',
      },
      {
        action: 'Use',
        body: 'Choose Change Picture only when you want to replace the visible avatar for this account.',
      },
    ],
  },
  {
    title: 'Complete your editable profile details',
    description: 'The profile form is where you fill in the personal and emergency-contact details required before your profile can lock.',
    screen: 'editing',
    reminder: 'Finish every required field before saving, because the page will block the save flow until the missing items are completed.',
    steps: [
      {
        action: 'Fill',
        body: 'Complete date of birth, gender, contact number, home address, and guardian details in the editable form sections.',
      },
      {
        action: 'Check',
        body: 'Watch the phone and guardian fields for validation feedback so the entered numbers stay in the accepted format.',
      },
      {
        action: 'Save',
        body: 'Use Save Profile Changes after reviewing everything carefully.',
      },
      {
        action: 'Stop',
        body: 'If the warning dialog appears, finish the missing fields first before trying to save again.',
        tone: 'caution',
      },
    ],
  },
  {
    title: 'Use the account tools and history shortcuts',
    description: 'The Account tab keeps your password tools and learning-history shortcuts in one place after your profile details are reviewed.',
    screen: 'account',
    reminder: 'Use the Account tab for security and record-review tools, not for editing the main profile form.',
    steps: [
      {
        action: 'Open',
        body: 'Go to the Account tab when you need password controls or support tools instead of editable profile fields.',
      },
      {
        action: 'Review',
        body: 'Check the profile status card to confirm whether all required details are already complete.',
      },
      {
        action: 'Visit',
        body: 'Use View Transcript and Assessment History to open your academic record pages from the same workspace.',
      },
    ],
  },
];

const fieldClass = 'student-profile-input';
const readonlyFieldClass = 'student-profile-input student-profile-input--readonly';

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);
  const inlineErrors = useMemo(() => getInlineFieldError(form), [form]);

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
  const avatarSrc = form.profilePicture || resolveUserProfilePicture(user);
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
  const activeGuidePage = profileGuidePages[helpPage];

  const handleFieldChange = (field: keyof StudentProfileForm, value: string) => {
    let nextValue = value;
    if (field === 'phone' || field === 'familyContact') {
      nextValue = sanitizePhoneLocalInput(
        value,
        field === 'phone' ? FIELD_LIMITS.phone : FIELD_LIMITS.familyContact,
      );
    } else if (field === 'familyName') {
      nextValue = sanitizePersonNameInput(value, FIELD_LIMITS.familyName);
    } else if (field === 'address') {
      nextValue = sanitizeAddressInput(value, FIELD_LIMITS.address);
    }
    setForm((current) => ({ ...current, [field]: nextValue }));
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

  const handleOpenMissingDetails = () => {
    if (missingRequiredFields.length === 0) return;
    setMissingFields(missingRequiredFields);
    setMissingDialogOpen(true);
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
            <div className="student-profile-header__main">
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
            <div className="student-profile-header__actions">
              <button
                type="button"
                className="student-profile-help-button"
                onClick={() => {
                  setHelpPage(0);
                  setHelpOpen(true);
                }}
                aria-label="Profile help"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <Tabs defaultValue="profile" className="space-y-5">
          <section className="flex justify-start">
            <TabsList className="student-tab-list h-auto flex-wrap justify-start">
              <TabsTrigger value="profile" className="student-tab min-w-[144px] px-5 py-3 text-sm font-semibold">
                Profile
              </TabsTrigger>
              <TabsTrigger value="account" className="student-tab min-w-[144px] px-5 py-3 text-sm font-semibold">
                Account
              </TabsTrigger>
            </TabsList>
          </section>

          <TabsContent value="profile" className="mt-0">
            <section className="student-profile-card">
              <CardContent className="space-y-5 px-6 py-6 md:px-7">
                <div className="student-profile-identity-row">
                  <div className="student-profile-identity-main">
                    <Avatar className="student-profile-avatar">
                      {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                      <AvatarFallback className="student-profile-avatar">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <div className="student-profile-name-row">
                        <p className="student-profile-name">{displayName}</p>
                        {isComplete ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            className="student-profile-missing-button"
                            onClick={handleOpenMissingDetails}
                            aria-label={`View ${missingRequiredFields.length} missing profile field details`}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span>{missingRequiredFields.length} missing</span>
                          </Button>
                        )}
                      </div>
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
                    <ProfileField label="First Name" icon={UserRound} immutable>
                      <Input className={readonlyFieldClass} value={user?.firstName ?? ''} readOnly />
                    </ProfileField>
                    <ProfileField label="Middle Name" icon={UserRound} immutable>
                      <Input className={readonlyFieldClass} value={user?.middleName ?? ''} readOnly />
                    </ProfileField>
                    <ProfileField label="Last Name" icon={UserRound} immutable>
                      <Input className={readonlyFieldClass} value={user?.lastName ?? ''} readOnly />
                    </ProfileField>
                    <ProfileField label="Email" icon={Mail} immutable>
                      <Input className={readonlyFieldClass} value={user?.email ?? ''} readOnly />
                    </ProfileField>
                    <ProfileField label="LRN" icon={IdCard} immutable>
                      <Input className={readonlyFieldClass} value={form.lrn} readOnly />
                    </ProfileField>
                    <ProfileField label="Grade Level" icon={GraduationCap} immutable>
                      <Input className={readonlyFieldClass} value={form.gradeLevel} readOnly />
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
                        placeholder="09XXXXXXXXX"
                        maxLength={FIELD_LIMITS.phone}
                        inputMode="tel"
                      />
                      {inlineErrors.phone ? <p className="text-xs text-rose-600">{inlineErrors.phone}</p> : null}
                    </ProfileField>
                    <ProfileField label="Home Address" icon={MapPin}>
                      <Input
                        className={fieldClass}
                        value={form.address}
                        onChange={(event) => handleFieldChange('address', event.target.value)}
                        disabled={isLocked}
                        maxLength={FIELD_LIMITS.address}
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
                        maxLength={FIELD_LIMITS.familyName}
                      />
                      {inlineErrors.familyName ? <p className="text-xs text-rose-600">{inlineErrors.familyName}</p> : null}
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
                        placeholder="09XXXXXXXXX"
                        maxLength={FIELD_LIMITS.familyContact}
                        inputMode="tel"
                      />
                      {inlineErrors.familyContact ? <p className="text-xs text-rose-600">{inlineErrors.familyContact}</p> : null}
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
          </TabsContent>

          <TabsContent value="account" className="mt-0">
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard/student/transcript')}
                    >
                      View Transcript
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard/student/assessment-history')}
                    >
                      Assessment History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog student-profile-guide-dialog">
          <DialogHeader>
            <DialogTitle>Student guide: My Profile</DialogTitle>
            <DialogDescription>
              Read this one page at a time. Each example points to the exact part of the profile page being explained.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
            <span>
              Page {helpPage + 1} of {profileGuidePages.length}
            </span>
            <div>
              {profileGuidePages.map((page, index) => (
                <button
                  key={page.title}
                  type="button"
                  className={index === helpPage ? 'is-active' : undefined}
                  onClick={() => setHelpPage(index)}
                  aria-label={`Open guide page ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="teacher-intervention-workspace__manual-layout">
            <StudentProfileGuideScreenshot
              screen={activeGuidePage.screen}
              missingCount={Math.max(missingRequiredFields.length, 2)}
            />

            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">Student instruction manual</p>
              <h3>{activeGuidePage.title}</h3>
              <p>{activeGuidePage.description}</p>

              <div className="route-guide-steps">
                {activeGuidePage.steps.map((step, index) => (
                  <div
                    key={`${activeGuidePage.title}-${step.action}-${index}`}
                    className={cn('route-guide-step', step.tone ? `is-${step.tone}` : undefined)}
                  >
                    <span className="route-guide-step__index">{index + 1}</span>
                    <div>
                      <strong>{step.action}</strong>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="teacher-intervention-workspace__manual-reminder">{activeGuidePage.reminder}</p>
            </section>
          </div>

          <DialogFooter>
            <div className="teacher-intervention-workspace__manual-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHelpPage((current) => Math.max(0, current - 1))}
                disabled={helpPage === 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous page
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setHelpOpen(false)}
                aria-label="Close guide"
              >
                Close guide
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setHelpPage((current) => Math.min(profileGuidePages.length - 1, current + 1))
                }
                disabled={helpPage === profileGuidePages.length - 1}
                aria-label="Next page"
                className="student-button-solid"
              >
                Next page
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--student-accent)]">
              <AlertTriangle className="h-5 w-5" /> Missing Required Fields
            </DialogTitle>
            <DialogDescription>Please fill up the missing student details before saving.</DialogDescription>
          </DialogHeader>
          <div className="student-note-danger rounded-xl px-4 py-3 text-sm">
            <p className="student-profile-missing-checklist-copy">Please fill up the following details:</p>
            <ul className="student-profile-missing-checklist" aria-label="Missing student details checklist">
              {missingFields.map((field) => (
                <li key={field} className="student-profile-missing-checklist__item">
                  <span className="student-profile-missing-checklist__marker" aria-hidden="true" />
                  <span>{field}</span>
                </li>
              ))}
            </ul>
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

function StudentProfileGuideScreenshot({
  screen,
  missingCount,
}: {
  screen: ProfileGuideScreen;
  missingCount: number;
}) {
  return (
    <div className={cn('teacher-intervention-workspace__manual-shot student-profile-guide-shot', `is-${screen}`)}>
      <div className="teacher-intervention-workspace__manual-window">
        <span />
        <span />
        <span />
      </div>

      {screen === 'overview' ? (
        <>
          <div className="student-profile-guide-shell">
            <div className="student-profile-guide-shell__header">
              <div>
                <small>Profile page</small>
                <strong>My Profile</strong>
              </div>
              <span className="student-profile-guide-shell__help">?</span>
            </div>
            <div className="student-profile-guide-shell__tabs">
              <b>Profile</b>
              <span>Account</span>
            </div>
            <div className="student-profile-guide-shell__hero">
              <div className="student-profile-guide-shell__avatar">JC</div>
              <div className="student-profile-guide-shell__title">
                <strong>Jamie Cruz</strong>
                <span>{missingCount} missing</span>
              </div>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-help">
            Profile help
          </em>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-tabs">
            Page tabs
          </em>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-alert">
            Missing-fields alert
          </em>
        </>
      ) : null}

      {screen === 'identity' ? (
        <>
          <div className="student-profile-guide-shell">
            <div className="student-profile-guide-shell__section-head">
              <small>Student identity</small>
              <strong>School-managed fields</strong>
            </div>
            <div className="student-profile-guide-shell__grid">
              {['First Name', 'Email', 'LRN', 'Grade Level'].map((label) => (
                <div key={label} className="student-profile-guide-shell__field">
                  <span>{label}</span>
                  <b>School-managed</b>
                </div>
              ))}
            </div>
            <div className="student-profile-guide-shell__picture-row">
              <span className="student-profile-guide-shell__avatar is-small">JC</span>
              <b className="student-profile-guide-shell__picture-button">Change Picture</b>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-badge">
            School-managed badge
          </em>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-picture">
            Picture action
          </em>
        </>
      ) : null}

      {screen === 'editing' ? (
        <>
          <div className="student-profile-guide-shell">
            <div className="student-profile-guide-shell__section-head">
              <small>Editable details</small>
              <strong>Complete required information</strong>
            </div>
            <div className="student-profile-guide-shell__form">
              {['Date of Birth', 'Gender', 'Contact Number', 'Home Address'].map((label) => (
                <div key={label} className="student-profile-guide-shell__input-row">
                  <span>{label}</span>
                  <i />
                </div>
              ))}
            </div>
            <div className="student-profile-guide-shell__notice">Missing fields will block saving.</div>
            <b className="student-profile-guide-shell__save">Save Profile Changes</b>
          </div>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-form">
            Editable form
          </em>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-save">
            Save button
          </em>
        </>
      ) : null}

      {screen === 'account' ? (
        <>
          <div className="student-profile-guide-shell">
            <div className="student-profile-guide-shell__tabs">
              <span>Profile</span>
              <b>Account</b>
            </div>
            <div className="student-profile-guide-shell__account-grid">
              <section>
                <small>Security</small>
                <strong>Password card</strong>
                <p />
                <p className="is-short" />
              </section>
              <section>
                <small>Status</small>
                <strong>Transcript and history</strong>
                <div className="student-profile-guide-shell__shortcut-row">
                  <b>View Transcript</b>
                  <b>Assessment History</b>
                </div>
              </section>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-security">
            Security card
          </em>
          <em className="teacher-intervention-workspace__manual-pin student-profile-guide-pin is-student-guide-shortcuts">
            Record shortcuts
          </em>
        </>
      ) : null}
    </div>
  );
}

function ProfileField({
  label,
  icon: Icon,
  children,
  immutable = false,
}: {
  label: string;
  icon: typeof UserRound;
  children: ReactNode;
  immutable?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="student-profile-field-label">
          <Icon className="h-4 w-4" />
          {label}
        </Label>
        {immutable ? (
          <span className="student-profile-immutable-badge">
            <Lock className="h-3.5 w-3.5" />
            School-managed
          </span>
        ) : null}
      </div>
      {immutable ? <p className="student-profile-immutable-note">Not editable by students.</p> : null}
      {children}
    </div>
  );
}
