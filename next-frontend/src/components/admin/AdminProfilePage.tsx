'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword, updateProfile } from '@/lib/auth-service';
import { useAuth } from '@/providers/AuthProvider';
import { getRoleName } from '@/utils/helpers';

function PasswordField({
  id,
  label,
  value,
  visible,
  onVisibilityToggle,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onVisibilityToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="admin-profile-label">
        {label}
      </Label>
      <div className="admin-profile-password">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          className="admin-input h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="admin-profile-eye"
          onClick={onVisibilityToggle}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function roleDisplayName(roleName: string) {
  if (!roleName) return 'Administrator';
  return roleName[0].toUpperCase() + roleName.slice(1);
}

export function AdminProfilePage() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] ?? 'A';
    const last = user?.lastName?.[0] ?? 'R';
    return `${first}${last}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  const roleName = useMemo(
    () => roleDisplayName(getRoleName(user?.roles?.[0])),
    [user?.roles],
  );

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required.');
      return;
    }

    try {
      setSavingProfile(true);
      const response = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      const nextUser = response.data?.user;
      if (nextUser) {
        setUser(nextUser);
      } else if (user) {
        setUser({ ...user, firstName: firstName.trim(), lastName: lastName.trim() });
      }
      toast.success('Profile updated.');
    } catch (error: unknown) {
      const message =
        (error as { message?: string })?.message ?? 'Failed to update profile.';
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    try {
      setUpdatingPassword(true);
      await changePassword({
        oldPassword: currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated.');
    } catch (error: unknown) {
      const message =
        (error as { message?: string })?.message ?? 'Failed to update password.';
      toast.error(message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <AdminPageShell
      badge="Admin Profile"
      title="My Profile"
      description="Manage your account details"
      icon={UserRound}
    >
      <div className="admin-profile-wrap">
        <section className="admin-profile-card">
          <div className="admin-profile-identity">
            <div className="admin-profile-avatar">{initials}</div>
            <div className="space-y-1">
              <p className="admin-profile-name">
                {[firstName, lastName].filter(Boolean).join(' ') || 'Administrator'}
              </p>
              <p className="admin-profile-email">{user?.email ?? '-'}</p>
              <span className="admin-profile-role-pill">{roleName}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="admin-profile-section-title">Account Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-profile-first-name" className="admin-profile-label">
                  First Name
                </Label>
                <Input
                  id="admin-profile-first-name"
                  className="admin-input h-11"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-profile-last-name" className="admin-profile-label">
                  Last Name
                </Label>
                <Input
                  id="admin-profile-last-name"
                  className="admin-input h-11"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-profile-email" className="admin-profile-label">
                  Email
                </Label>
                <Input
                  id="admin-profile-email"
                  className="admin-input h-11 text-[var(--admin-text-muted)]"
                  value={user?.email ?? ''}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-profile-role" className="admin-profile-label">
                  Role
                </Label>
                <Input
                  id="admin-profile-role"
                  className="admin-input h-11 text-[var(--admin-text-muted)]"
                  value={roleName}
                  disabled
                />
              </div>
            </div>
            <Button
              className="admin-button-solid admin-profile-action"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              <Save className="h-4 w-4" />
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </section>

        <section className="admin-profile-card">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-[var(--admin-text-muted)]" />
            <h2 className="admin-profile-section-title">Password &amp; Security</h2>
          </div>
          <div className="space-y-4">
            <PasswordField
              id="admin-current-password"
              label="Current Password"
              value={currentPassword}
              visible={showCurrentPassword}
              onVisibilityToggle={() => setShowCurrentPassword((current) => !current)}
              onChange={setCurrentPassword}
            />
            <PasswordField
              id="admin-new-password"
              label="New Password"
              value={newPassword}
              visible={showNewPassword}
              onVisibilityToggle={() => setShowNewPassword((current) => !current)}
              onChange={setNewPassword}
            />
            <PasswordField
              id="admin-confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              visible={showConfirmPassword}
              onVisibilityToggle={() => setShowConfirmPassword((current) => !current)}
              onChange={setConfirmPassword}
            />
            <Button
              variant="outline"
              className="admin-profile-password-button"
              onClick={handleUpdatePassword}
              disabled={updatingPassword}
            >
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
