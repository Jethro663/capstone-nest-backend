'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile, changePassword } from '@/lib/auth-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  // Profile form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [lrn, setLrn] = useState(user?.lrn || '');
  const [dob, setDob] = useState(user?.dob || user?.dateOfBirth || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [familyName, setFamilyName] = useState(user?.familyName || '');
  const [familyRelationship, setFamilyRelationship] = useState(user?.familyRelationship || '');
  const [familyContact, setFamilyContact] = useState(user?.familyContact || '');
  const [saving, setSaving] = useState(false);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const isStudent = user?.roles?.[0] === 'student';

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const dto: Record<string, string | undefined> = {
        firstName,
        middleName: middleName || undefined,
        lastName,
      };
      if (isStudent) {
        dto.lrn = lrn || undefined;
        dto.dob = dob || undefined;
        dto.gender = gender || undefined;
        dto.phone = phone || undefined;
        dto.address = address || undefined;
        dto.familyName = familyName || undefined;
        dto.familyRelationship = familyRelationship || undefined;
        dto.familyContact = familyContact || undefined;
      }
      const res = await updateProfile(dto);
      if (res.data?.user) setUser(res.data.user);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setChangingPw(true);
      await changePassword({ oldPassword, password: newPassword, confirmPassword });
      toast.success('Password changed');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          {user?.email} • <Badge variant="secondary">{String(user?.roles?.[0] || '')}</Badge>
        </p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div><Label>Middle Name</Label><Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} /></div>
            <div><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          </div>

          {isStudent && (
            <>
              <Separator />
              <p className="text-sm font-medium">Student Profile</p>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>LRN</Label><Input value={lrn} onChange={(e) => setLrn(e.target.value)} /></div>
                <div><Label>Date of Birth</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gender</Label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              </div>
              <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <Separator />
              <p className="text-sm font-medium">Guardian / Family</p>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Name</Label><Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} /></div>
                <div><Label>Relationship</Label><Input value={familyRelationship} onChange={(e) => setFamilyRelationship(e.target.value)} /></div>
                <div><Label>Contact</Label><Input value={familyContact} onChange={(e) => setFamilyContact(e.target.value)} /></div>
              </div>
            </>
          )}

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Current Password</Label><Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
          </div>
          <Button variant="outline" onClick={handleChangePassword} disabled={changingPw}>
            {changingPw ? 'Changing...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
