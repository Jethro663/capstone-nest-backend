import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function CompleteProfilePage({ onComplete, onBack }) {
  const { user, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [gender, setGender] = useState(user?.gender || '');
  const [address, setAddress] = useState(user?.city || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [familyName, setFamilyName] = useState(user?.familyName || '');
  const [familyRelationship, setFamilyRelationship] = useState(user?.familyRelationship || '');
  const [familyContact, setFamilyContact] = useState(user?.familyContact || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const dobInitRef = useRef(false);

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];
  const currentYear = new Date().getFullYear();
  const minYear = 1975;
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => String(currentYear - i));
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

  useEffect(() => {
    if (user?.dob) {
      const d = new Date(user.dob);
      if (!Number.isNaN(d.getTime())) {
        dobInitRef.current = true;
        setDobDay(String(d.getDate()));
        setDobMonth(String(d.getMonth() + 1));
        setDobYear(String(d.getFullYear()));
        setTimeout(() => (dobInitRef.current = false), 0);
      }
    }
  }, [user]);

  useEffect(() => {
    if (dobInitRef.current) return;
    if (dobYear) {
      setDobMonth('');
      setDobDay('');
    }
  }, [dobYear]);

  const isValidPHPhone = (value) => {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('09');
  };
  const [phoneValid, setPhoneValid] = useState(false);
  const [familyContactValid, setFamilyContactValid] = useState(false);

  useEffect(() => {
    if (dobYear && dobMonth) {
      const max = daysInMonth(Number(dobYear), Number(dobMonth));
      if (dobDay && Number(dobDay) > max) setDobDay('');
    }
  }, [dobMonth, dobYear]);

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!dobDay || !dobMonth || !dobYear) e.dob = 'Date of birth is required';
    if (!gender) e.gender = 'Gender is required';
    if (!studentId.trim()) e.studentId = 'Student ID is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (!isValidPHPhone(phone)) e.phone = 'Enter a valid 11-digit Philippine number';
    if (!address.trim()) e.address = 'Address is required';
    if (!familyName.trim()) e.familyName = 'Family member name is required';
    if (!familyRelationship.trim()) e.familyRelationship = 'Relationship is required';
    if (!familyContact.trim()) e.familyContact = 'Family contact is required';
    else if (!isValidPHPhone(familyContact)) e.familyContact = 'Enter a valid 11-digit Philippine number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        dob: `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}`,
        gender,
        studentId: studentId.trim(),
        phone: phone.trim(),
        address: address.trim(),
        familyName: familyName.trim(),
        familyRelationship: familyRelationship.trim(),
        familyContact: familyContact.trim(),
      };
      await updateProfile(payload);
      toast.success('Profile saved successfully!');
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Failed to save profile', err);
      toast.error(err?.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px'
  };

  const inputStyle = {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    marginTop: '5px'
  };

  const errorStyle = { color: '#dc2626', fontSize: '12px', marginTop: '4px' };
  const validStyle = { color: '#16a34a', fontSize: '12px', marginTop: '4px' };
  const dobSelectsStyle = { display: 'flex', gap: '10px' };
  const submitBtnStyle = {
    padding: '15px',
    fontSize: '16px',
    backgroundColor: '#dc2626',
    color: 'white',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '30px'
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#f2f2f2',
      minHeight: '100vh'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: 'white',
          borderRadius: '10px',
          padding: '40px',
          maxWidth: '800px',
          width: '100%',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div></div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h2 style={{ fontSize: '28px', marginBottom: '5px', margin: 0 }}>Complete Your Profile</h2>
            <p style={{ marginTop: '5px', marginBottom: 0, color: '#555' }}>All fields are required.</p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            >
              Back
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>

          {/* Name fields */}
          <div style={formGroupStyle}>
            <label>First Name</label>
            <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} />
            {errors.firstName && <span style={errorStyle}>{errors.firstName}</span>}
          </div>

          <div style={formGroupStyle}>
            <label>Middle Name</label>
            <input style={inputStyle} value={middleName} onChange={e => setMiddleName(e.target.value)} />
          </div>

          <div style={formGroupStyle}>
            <label>Last Name</label>
            <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} />
            {errors.lastName && <span style={errorStyle}>{errors.lastName}</span>}
          </div>

          <div style={formGroupStyle}>
            <label>Student ID</label>
            <input style={inputStyle} value={studentId} onChange={e => setStudentId(e.target.value)} />
            {errors.studentId && <span style={errorStyle}>{errors.studentId}</span>}
          </div>

          {/* Date of Birth */}
          <div style={formGroupStyle}>
            <label>Date of Birth</label>
            <div style={dobSelectsStyle}>
              <select style={inputStyle} value={dobYear} onChange={e => setDobYear(e.target.value)}>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select style={inputStyle} value={dobMonth} onChange={e => setDobMonth(e.target.value)} disabled={!dobYear}>
                <option value="">Month</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select style={inputStyle} value={dobDay} onChange={e => setDobDay(e.target.value)} disabled={!dobMonth || !dobYear}>
                <option value="">Day</option>
                {dobYear && dobMonth && Array.from({ length: daysInMonth(Number(dobYear), Number(dobMonth)) }, (_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </div>
            {errors.dob && <span style={errorStyle}>{errors.dob}</span>}
          </div>

          {/* Gender */}
          <div style={formGroupStyle}>
            <label>Gender</label>
            <select style={inputStyle} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <span style={errorStyle}>{errors.gender}</span>}
          </div>

          {/* Phone */}
          <div style={formGroupStyle}>
            <label>Phone</label>
            <input
              style={inputStyle}
              value={phone}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPhone(v);
                setPhoneValid(v.length === 11 && v.startsWith('09'));
              }}
            />
            {errors.phone && <span style={errorStyle}>{errors.phone}</span>}
            {!errors.phone && phone.length > 0 && (
              <span style={phoneValid ? validStyle : errorStyle}>{phoneValid ? 'Valid number' : 'Invalid format'}</span>
            )}
          </div>

          {/* Address */}
          <div style={formGroupStyle}>
            <label>Address</label>
            <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} />
            {errors.address && <span style={errorStyle}>{errors.address}</span>}
          </div>

          {/* Emergency Contact */}
          <fieldset style={{ gridColumn: '1 / -1', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginTop: '20px' }}>
            <legend>Emergency Contact</legend>

            <div style={formGroupStyle}>
              <label>Name</label>
              <input style={inputStyle} value={familyName} onChange={e => setFamilyName(e.target.value)} />
              {errors.familyName && <span style={errorStyle}>{errors.familyName}</span>}
            </div>

            <div style={formGroupStyle}>
              <label>Relationship</label>
              <select style={inputStyle} value={familyRelationship} onChange={e => setFamilyRelationship(e.target.value)}>
                <option value="">Select</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
              {errors.familyRelationship && <span style={errorStyle}>{errors.familyRelationship}</span>}
            </div>

            <div style={formGroupStyle}>
              <label>Contact</label>
              <input
                style={inputStyle}
                value={familyContact}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0,11);
                  setFamilyContact(v);
                  setFamilyContactValid(v.length === 11 && v.startsWith('09'));
                }}
              />
              {errors.familyContact && <span style={errorStyle}>{errors.familyContact}</span>}
              {!errors.familyContact && familyContact.length > 0 && (
                <span style={familyContactValid ? validStyle : errorStyle}>{familyContactValid ? 'Valid number' : 'Invalid format'}</span>
              )}
            </div>
          </fieldset>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSaving}
            style={submitBtnStyle}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </motion.button>

        </form>
      </motion.div>
    </div>
  );
}

export default CompleteProfilePage;
