'use client';

import { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  User, 
  Lock, 
  Mail, 
  Sparkles, 
  Save, 
  ShieldCheck, 
  Phone, 
  Home, 
  Users 
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile, changePassword } from '@/lib/auth-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// --- Framer Motion Configs ---
const fContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
  }
};

const fItem: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: 'spring', stiffness: 300, damping: 24 } 
  }
};

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
      await changePassword({ oldPassword, newPassword: newPassword, confirmPassword });
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
    <motion.div 
      className="max-w-4xl mx-auto space-y-8 p-6 md:p-10"
      initial="hidden"
      animate="visible"
      variants={fContainer}
    >
      {/* --- HERO SECTION --- */}
      <motion.section 
        variants={fItem} 
        className="relative overflow-hidden rounded-[1.5rem] border-[1.5px] border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="absolute top-0 right-0 w-32 h-full bg-red-500/5 -skew-x-12 translate-x-8" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500">
              <Sparkles className="h-3 w-3" /> Account Settings
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">My Profile</h1>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <Mail className="h-3.5 w-3.5" /> {user?.email} 
              <span className="text-slate-200">|</span>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                {String(user?.roles?.[0] || 'User')}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="h-12 w-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200">
                <User className="h-6 w-6" />
             </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Left Side: Basic Info */}
        <motion.div variants={fItem} className="md:col-span-8 space-y-6">
          <Card className="border-[1.5px] border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm hover:border-red-200 transition-colors">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-red-500" /> Basic Information
              </h3>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">First Name</Label>
                  <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Middle Name</Label>
                  <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Last Name</Label>
                  <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              {isStudent && (
                <>
                  <div className="pt-4 space-y-4 border-t border-slate-50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">Student Identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400">LRN</Label>
                        <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={lrn} onChange={(e) => setLrn(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Date of Birth</Label>
                        <Input type="date" className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={dob} onChange={(e) => setDob(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Gender</Label>
                        <select value={gender} onChange={(e) => setGender(e.target.value)} className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Contact Number
                        </Label>
                        <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                        <Home className="h-3 w-3" /> Home Address
                      </Label>
                      <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                  </div>

                  <div className="pt-4 space-y-4 border-t border-slate-50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Guardian Name</Label>
                        <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Relationship</Label>
                        <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={familyRelationship} onChange={(e) => setFamilyRelationship(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Contact #</Label>
                        <Input className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={familyContact} onChange={(e) => setFamilyContact(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="w-full md:w-auto bg-slate-900 hover:bg-red-500 text-white font-black rounded-xl transition-all gap-2"
              >
                {saving ? 'Updating...' : <><Save className="h-4 w-4" /> Save Profile Changes</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Side: Security */}
        <motion.div variants={fItem} className="md:col-span-4 space-y-6">
          <Card className="border-[1.5px] border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm hover:border-red-200 transition-colors">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-500" /> Security
              </h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">Current Password</Label>
                <Input type="password" name="old-password" stroke-width="2" className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">New Password</Label>
                <Input type="password" name="new-password" stroke-width="2" className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">Confirm New Password</Label>
                <Input type="password" name="confirm-password" stroke-width="2" className="rounded-xl border-slate-200 focus-visible:ring-red-500" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button 
                variant="outline" 
                onClick={handleChangePassword} 
                disabled={changingPw}
                className="w-full border-slate-200 font-bold hover:border-red-500 hover:text-red-500 transition-all rounded-xl mt-2"
              >
                {changingPw ? 'Processing...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>

          {/* Help Box */}
          <div className="bg-red-50 border-[1.5px] border-red-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <Users className="h-5 w-5" />
              <p className="font-black text-xs uppercase tracking-widest">Privacy Note</p>
            </div>
            <p className="text-xs text-red-700/80 leading-relaxed font-medium">
              Your profile information is visible to your teachers and administrators to help manage your academic records.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}