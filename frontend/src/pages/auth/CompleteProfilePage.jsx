import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * CompleteProfilePage
 * A full form that collects all profile details for new users.
 * - Does client-side validation
 * - Calls `updateProfile` from AuthContext
 * - Calls optional `onComplete` callback after successful save
 *
 * Usage:
 * <CompleteProfilePage onComplete={() => navigate('/dashboard')} />
 */
export function CompleteProfilePage({ onComplete }) {
  const { user, updateProfile } = useAuth();

  // Pre-fill from user when available
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  // Date of birth split into Day / Month / Year selects
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [gender, setGender] = useState(user?.gender || '');
  // Address replaces separate city + country fields
  const [address, setAddress] = useState(user?.city || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [familyName, setFamilyName] = useState(user?.familyName || '');
  const [familyRelationship, setFamilyRelationship] = useState(user?.familyRelationship || '');
  const [familyContact, setFamilyContact] = useState(user?.familyContact || '');

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const dobInitRef = useRef(false);

  useEffect(() => {
    // Initialize DOB select values from user.dob when available
    if (user?.dob) {
      const d = new Date(user.dob);
      if (!Number.isNaN(d.getTime())) {
        dobInitRef.current = true;
        setDobDay(String(d.getDate()));
        setDobMonth(String(d.getMonth() + 1));
        setDobYear(String(d.getFullYear()));
        // Clear the init flag on next tick so later user changes are detected
        setTimeout(() => (dobInitRef.current = false), 0);
      }
    }
  }, [user]);

  // When year changes by the user, reset month and day to enforce selection order
  useEffect(() => {
    if (dobInitRef.current) return;
    if (dobYear) {
      // user selected a year — reset month and day to force re-selection in order
      setDobMonth('');
      setDobDay('');
    }
  }, [dobYear]);

  const isValidPHPhone = (value) => {
    const digits = (value || '').replace(/\D/g, '');
    // Enforce exactly 11 digits starting with 09
    return digits.length === 11 && digits.startsWith('09');
  };

  // Real-time validity state for phone inputs
  const [phoneValid, setPhoneValid] = useState(false);
  const [familyContactValid, setFamilyContactValid] = useState(false);

  // Month labels and year range for DOB selects
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];
  const currentYear = new Date().getFullYear();
  const minYear = 1975; // minimum allowed year
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => String(currentYear - i));

  // Helper: number of days in a given month/year
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

  // Ensure selected day remains valid when month/year change
  useEffect(() => {
    if (dobYear && dobMonth) {
      const max = daysInMonth(Number(dobYear), Number(dobMonth));
      if (dobDay && Number(dobDay) > max) {
        setDobDay('');
      }
    }
  }, [dobMonth, dobYear]);

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';

    // DOB validation (must be a valid past or today's date)
    if (!dobDay || !dobMonth || !dobYear) {
      e.dob = 'Date of birth is required';
    } else {
      const y = Number(dobYear);
      if (y < minYear) {
        e.dob = `Year must be ${minYear} or later`;
      } else {
        const m = Number(dobMonth) - 1;
        const d = Number(dobDay);
        const date = new Date(y, m, d);
        if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) {
          e.dob = 'Invalid date of birth';
        } else if (date > new Date()) {
          e.dob = 'Date of birth cannot be in the future';
        }
      }
    }

    if (!gender) e.gender = 'Gender is required';
    if (!studentId.trim()) e.studentId = 'Student ID is required';

    // Phone validations: numeric only, exactly 11 digits and starts with 09
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (!isValidPHPhone(phone)) e.phone = 'Enter a valid 11-digit Philippine mobile number (e.g. 09123456789)';

    if (!address.trim()) e.address = 'Address is required';
    if (!familyName.trim()) e.familyName = 'Family member name is required';
    if (!familyRelationship.trim()) e.familyRelationship = 'Relationship is required';
    if (!familyContact.trim()) e.familyContact = 'Family contact is required';
    else if (!isValidPHPhone(familyContact)) e.familyContact = 'Enter a valid 11-digit Philippine mobile number (e.g. 09123456789)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };  

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSaving(true);

    try {
      // Prepare payload
      const payload = {
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        dob: `${dobYear}-${String(dobMonth).padStart(2,'0')}-${String(dobDay).padStart(2,'0')}`,
        gender,
        studentId: studentId.trim(),
        phone: phone.trim(),
        address: address.trim(), // stored as 'city' in backend (repurposed as address)
        familyName: familyName.trim(),
        familyRelationship: familyRelationship.trim(),
        familyContact: familyContact.trim(),
      };

      await updateProfile(payload);

      toast.success('Profile saved successfully!');

      if (typeof onComplete === 'function') {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to save profile', err);
      toast.error((err && err.message) || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">Please fill out your profile to continue. All fields are required.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Name fields */}
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              {errors.firstName && <p className="text-sm text-[#dc2626]">{errors.firstName}</p>}
            </div>

            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              {errors.lastName && <p className="text-sm text-[#dc2626]">{errors.lastName}</p>}
            </div>

            <div>
              <Label htmlFor="studentId">Student ID</Label>
              <Input id="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
              {errors.studentId && <p className="text-sm text-[#dc2626]">{errors.studentId}</p>}
            </div>

            <div>
              <Label>Date of Birth</Label>
              <div className="flex gap-2">
                <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} className="rounded-md border p-2 w-1/3">
                  <option value="">Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} className={`rounded-md border p-2 w-1/3 ${!dobYear ? 'opacity-50' : ''}`} disabled={!dobYear} aria-disabled={!dobYear}>
                  <option value="">Month</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} className={`rounded-md border p-2 w-1/3 ${!dobMonth ? 'opacity-50' : ''}`} disabled={!dobMonth || !dobYear} aria-disabled={!dobMonth || !dobYear}>
                  <option value="">Day</option>
                  {dobYear && dobMonth ? Array.from({ length: daysInMonth(Number(dobYear), Number(dobMonth)) }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  )) : null}
                </select>
              </div>
              {errors.dob && <p className="text-sm text-[#dc2626]">{errors.dob}</p>}
            </div> 

            <div>
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-md border p-2">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="text-sm text-[#dc2626]">{errors.gender}</p>}
            </div>



            {/* Contact */}
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                maxLength={11}
                placeholder="09123456789"
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0,11);
                  setPhone(v);
                  setPhoneValid(v.length === 11 && v.startsWith('09'));
                }}
              />
              {errors.phone && <p className="text-sm text-[#dc2626]">{errors.phone}</p>}
              {!errors.phone && phone.length > 0 && (
                phoneValid ? <p className="text-sm text-green-600">Valid number</p> : <p className="text-sm text-[#dc2626]">Invalid format</p>
              )}
            </div>   

            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              {errors.address && <p className="text-sm text-[#dc2626]">{errors.address}</p>}
            </div>


            {/* Emergency Contact */}
            <div className="md:col-span-2 border border-gray-200 rounded-md p-4 bg-white">
              <h4 className="font-semibold mb-3 text-sm text-gray-700">Emergency Contact</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="familyName">Name</Label>
                  <Input id="familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
                  {errors.familyName && <p className="text-sm text-[#dc2626]">{errors.familyName}</p>}
                </div>

                <div>
                  <Label htmlFor="familyRelationship">Relationship</Label>
                  <select
                    id="familyRelationship"
                    value={familyRelationship}
                    onChange={(e) => setFamilyRelationship(e.target.value)}
                    className="w-full rounded-md border p-2"
                  >
                    <option value="">Select</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.familyRelationship && <p className="text-sm text-[#dc2626]">{errors.familyRelationship}</p>}
                </div>

                <div>
                  <Label htmlFor="familyContact">Contact</Label>
                  <Input
                    id="familyContact"
                    type="tel"
                    maxLength={11}
                    placeholder="09123456789"
                    value={familyContact}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0,11);
                      setFamilyContact(v);
                      setFamilyContactValid(v.length === 11 && v.startsWith('09'));
                    }}
                  />
                  {errors.familyContact && <p className="text-sm text-[#dc2626]">{errors.familyContact}</p>}
                  {!errors.familyContact && familyContact.length > 0 && (
                    familyContactValid ? <p className="text-sm text-green-600">Valid number</p> : <p className="text-sm text-[#dc2626]">Invalid format</p>
                  )}
                </div> 
              </div>
            </div>

            {/* Submit */}
            <div className="md:col-span-2 flex gap-3 justify-end mt-2">
              <Button type="submit" className="bg-[#dc2626] hover:bg-[#b91c1c] text-white" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CompleteProfilePage;
