'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
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
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
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
              className="bg-slate-900 hover:bg-red-500 text-white font-black rounded-xl gap-2"
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
              <p className="text-[11px] font-semibold text-slate-500">Profile picture is locked after confirmation.</p>
            ) : (
              <p className="text-[11px] font-semibold text-slate-500">PNG, JPG, GIF, or WebP up to 5 MB.</p>
            )}
          </div>
        }
        left={
          <Card className="border-[1.5px] border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm hover:border-red-200 transition-colors">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-red-500" /> Student Information
              </h3>
            </div>
            <CardContent className="p-6 space-y-6">
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  isLocked ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'
                }`}
              >
                {isLocked
                  ? 'Your required student details are complete and locked.'
                  : 'Finish all required details before saving. Once confirmed, these details cannot be changed.'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">First Name</Label>
                  <Input className="rounded-xl border-slate-200" value={user?.firstName ?? ''} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Middle Name</Label>
                  <Input className="rounded-xl border-slate-200" value={user?.middleName ?? ''} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Last Name</Label>
                  <Input className="rounded-xl border-slate-200" value={user?.lastName ?? ''} disabled />
                </div>
              </div>

              <div className="pt-4 space-y-4 border-t border-slate-50">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">Student Identity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">LRN</Label>
                    <Input className="rounded-xl border-slate-200" value={form.lrn} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Date of Birth</Label>
                    <Input
                      type="date"
                      className="rounded-xl border-slate-200 focus-visible:ring-red-500"
                      value={form.dateOfBirth}
                      onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Gender</Label>
                    <select
                      value={form.gender}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      disabled={isLocked}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Contact Number</Label>
                    <Input
                      className="rounded-xl border-slate-200 focus-visible:ring-red-500"
                      value={form.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      disabled={isLocked}
                      placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Home Address</Label>
                  <Input
                    className="rounded-xl border-slate-200 focus-visible:ring-red-500"
                    value={form.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Grade Level</Label>
                  <Input className="rounded-xl border-slate-200" value={form.gradeLevel} disabled />
                </div>
              </div>

              <div className="pt-4 space-y-4 border-t border-slate-50">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Guardian Name</Label>
                    <Input
                      className="rounded-xl border-slate-200 focus-visible:ring-red-500"
                      value={form.familyName}
                      onChange={(e) => handleFieldChange('familyName', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Relationship</Label>
                    <select
                      value={form.familyRelationship}
                      onChange={(e) => handleFieldChange('familyRelationship', e.target.value)}
                      disabled={isLocked}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label className="text-[10px] font-black uppercase text-slate-400">Contact Number</Label>
                    <Input
                      className="rounded-xl border-slate-200 focus-visible:ring-red-500"
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
                className="w-full md:w-auto bg-slate-900 hover:bg-red-500 text-white font-black rounded-xl transition-all gap-2"
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
        }
        right={<ProfileSecurityCard />}
      />

      <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Missing Required Fields
            </DialogTitle>
            <DialogDescription>Please fill up the missing student details before saving.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            Please fill up missing: {missingFields.join(', ')}
          </div>
          <DialogFooter>
            <Button onClick={() => setMissingDialogOpen(false)} className="bg-slate-900 hover:bg-red-500">
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
            <Button onClick={handleConfirmSave} className="bg-slate-900 hover:bg-red-500">
              Yes, Save and Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
