import { useEffect, useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { authApi } from '@/api/services/auth';
import { useProfile, useProfileAvatarMutation, useProfileUpdateMutation } from '@/api/hooks';
import type { StudentTabParamList } from '@/navigation/types';
import { useAuth } from '@/providers/AuthProvider';
import { ActionCard, AppButton, HeroCard, InlineNotice, Screen, SectionHeader, TextField } from '@/shared/components/ui';
import {
  getMissingStudentProfileFields,
  isStudentProfileLocked,
  mergeUserWithStudentProfile,
  normalizePhilippinePhone,
  normalizeStudentProfile,
} from '@/shared/utils/helpers';

type Props = BottomTabScreenProps<StudentTabParamList, 'Profile'>;

type ProfileForm = {
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  familyName: string;
  familyRelationship: string;
  familyContact: string;
};

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ProfileScreen(_: Props) {
  const { user, logout, updateLocalUser } = useAuth();
  const profileQuery = useProfile();
  const profile = normalizeStudentProfile(profileQuery.data ?? null);
  const updateMutation = useProfileUpdateMutation(user?.id || user?.userId);
  const avatarMutation = useProfileAvatarMutation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const mergedUser = useMemo(() => mergeUserWithStudentProfile(user, profile), [profile, user]);
  const [form, setForm] = useState<ProfileForm>({
    dateOfBirth: mergedUser?.dateOfBirth ?? mergedUser?.dob ?? '',
    gender: mergedUser?.gender ?? '',
    phone: mergedUser?.phone ?? '',
    address: mergedUser?.address ?? '',
    familyName: mergedUser?.familyName ?? '',
    familyRelationship: mergedUser?.familyRelationship ?? '',
    familyContact: mergedUser?.familyContact ?? '',
  });

  useEffect(() => {
    setForm({
      dateOfBirth: mergedUser?.dateOfBirth ?? mergedUser?.dob ?? '',
      gender: mergedUser?.gender ?? '',
      phone: mergedUser?.phone ?? '',
      address: mergedUser?.address ?? '',
      familyName: mergedUser?.familyName ?? '',
      familyRelationship: mergedUser?.familyRelationship ?? '',
      familyContact: mergedUser?.familyContact ?? '',
    });
  }, [
    mergedUser?.address,
    mergedUser?.dateOfBirth,
    mergedUser?.dob,
    mergedUser?.familyContact,
    mergedUser?.familyName,
    mergedUser?.familyRelationship,
    mergedUser?.gender,
    mergedUser?.phone,
  ]);

  const locked = isStudentProfileLocked(mergedUser);

  async function saveProfile() {
    setSaveError(null);
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
      setSaveError(`Missing required fields: ${missing.join(', ')}`);
      return;
    }

    const normalizedPhone = normalizePhilippinePhone(form.phone);
    const normalizedGuardianPhone = normalizePhilippinePhone(form.familyContact);
    if (!normalizedPhone || !normalizedGuardianPhone) {
      setSaveError('Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.');
      return;
    }

    const updatedProfile = await updateMutation.mutateAsync({
      dob: form.dateOfBirth,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      phone: normalizedPhone,
      address: form.address,
      familyName: form.familyName,
      familyRelationship: form.familyRelationship,
      familyContact: normalizedGuardianPhone,
    });
    await updateLocalUser(mergeUserWithStudentProfile(user, normalizeStudentProfile(updatedProfile)));
  }

  async function pickAvatar() {
    if (locked) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      mediaTypes: ['images'],
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const response = await avatarMutation.mutateAsync({
      uri: asset.uri,
      name: asset.fileName ?? 'profile.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
    await updateLocalUser(mergeUserWithStudentProfile(user, normalizeStudentProfile(response.profile)));
  }

  async function changePassword() {
    setSecurityMessage(null);
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setSecurityMessage('Fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityMessage('New password and confirmation do not match.');
      return;
    }
    await authApi.changePassword(passwordForm);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setSecurityMessage('Password updated successfully.');
  }

  return (
    <Screen>
      <HeroCard
        eyebrow="Student Profile"
        title={`${user?.firstName ?? 'Student'} ${user?.lastName ?? ''}`.trim() || 'Student Profile'}
        subtitle={locked ? 'Your student details are finalized and read-only.' : 'Complete the remaining required student details and lock your profile.'}
        right={
          <View className="items-center gap-3">
            {mergedUser?.profilePicture ? (
              <Image source={{ uri: mergedUser.profilePicture }} className="h-20 w-20 rounded-full bg-slate-200" />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-50">
                <Text className="text-2xl font-black text-brand-700">
                  {(user?.firstName?.[0] ?? 'S').toUpperCase()}
                </Text>
              </View>
            )}
            <AppButton
              title={locked ? 'Avatar Locked' : 'Change Picture'}
              variant="secondary"
              onPress={() => void pickAvatar()}
              disabled={locked}
              loading={avatarMutation.isPending}
            />
          </View>
        }
      />

      <View className="mt-7 gap-4">
        <ActionCard>
          <SectionHeader title="Basic Identity" subtitle="Identity fields are inherited from the account record." />
          <View className="mt-4 gap-4">
            <TextField label="First Name" value={user?.firstName ?? ''} editable={false} />
            <TextField label="Middle Name" value={user?.middleName ?? ''} editable={false} />
            <TextField label="Last Name" value={user?.lastName ?? ''} editable={false} />
            <TextField label="Email" value={user?.email ?? ''} editable={false} />
            <TextField label="LRN" value={mergedUser?.lrn ?? ''} editable={false} />
            <TextField label="Grade Level" value={mergedUser?.gradeLevel ?? ''} editable={false} />
          </View>
        </ActionCard>

        <ActionCard>
          <SectionHeader title="Student Details" subtitle="Required fields lock after the first complete save." />
          <View className="mt-4 gap-4">
            {locked ? (
              <InlineNotice tone="success" text="Your student details are complete and locked." />
            ) : (
              <InlineNotice tone="warning" text="Complete all required fields before saving. Once complete, the student profile becomes read-only." />
            )}
            {saveError ? <InlineNotice tone="danger" text={saveError} /> : null}
            <TextField
              label="Date Of Birth"
              value={form.dateOfBirth}
              onChangeText={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))}
              placeholder="YYYY-MM-DD"
              editable={!locked}
            />
            <TextField
              label="Gender"
              value={form.gender}
              onChangeText={(value) => setForm((current) => ({ ...current, gender: value }))}
              placeholder="Male or Female"
              editable={!locked}
            />
            <TextField
              label="Contact Number"
              value={form.phone}
              onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
              placeholder="09XXXXXXXXX"
              editable={!locked}
            />
            <TextField
              label="Home Address"
              value={form.address}
              onChangeText={(value) => setForm((current) => ({ ...current, address: value }))}
              editable={!locked}
            />
            <TextField
              label="Guardian Name"
              value={form.familyName}
              onChangeText={(value) => setForm((current) => ({ ...current, familyName: value }))}
              editable={!locked}
            />
            <TextField
              label="Relationship"
              value={form.familyRelationship}
              onChangeText={(value) => setForm((current) => ({ ...current, familyRelationship: value }))}
              placeholder="Mother, Father, Guardian"
              editable={!locked}
            />
            <TextField
              label="Guardian Contact"
              value={form.familyContact}
              onChangeText={(value) => setForm((current) => ({ ...current, familyContact: value }))}
              placeholder="09XXXXXXXXX"
              editable={!locked}
            />
            <AppButton
              title={locked ? 'Profile Locked' : 'Save And Lock Profile'}
              onPress={() => void saveProfile()}
              disabled={locked}
              loading={updateMutation.isPending}
            />
          </View>
        </ActionCard>

        <ActionCard>
          <SectionHeader title="Security" subtitle="Password change and session management." />
          <View className="mt-4 gap-4">
            {securityMessage ? <InlineNotice tone="neutral" text={securityMessage} /> : null}
            <TextField
              label="Current Password"
              value={passwordForm.oldPassword}
              onChangeText={(value) => setPasswordForm((current) => ({ ...current, oldPassword: value }))}
              secureTextEntry
            />
            <TextField
              label="New Password"
              value={passwordForm.newPassword}
              onChangeText={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
              secureTextEntry
            />
            <TextField
              label="Confirm Password"
              value={passwordForm.confirmPassword}
              onChangeText={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
              secureTextEntry
            />
            <AppButton title="Change Password" onPress={() => void changePassword()} />
            <AppButton title="Log Out" variant="danger" onPress={() => void logout()} />
          </View>
        </ActionCard>
      </View>
    </Screen>
  );
}
