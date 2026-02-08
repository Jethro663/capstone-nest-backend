import { User } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from '@/contexts/AuthContext';
import profilesService from '@/services/profilesService';

// Helper to format ISO dates cleanly
const formatDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return iso;
  }
};

export function ProfilePage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("about");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Local editable fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('');
  const [familyContact, setFamilyContact] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        console.log('Loading profile for user:', user);
       const res = await profilesService.getProfileByUserId(user.id);
       console.log('API response for profile:', res);
        const data = res?.data || res || null;
        console.log('Loaded profile data:', data);
        console.log('User data:', user);
        if (!mounted) return;
        setProfile(data || null);

        // initialize editable fields from profile or user
        const src = { ...user, ...(data || {}) };
        setFirstName(src.firstName || '');
        setMiddleName(src.middleName || '');
        setLastName(src.lastName || '');
        setDateOfBirth(src.dateOfBirth || src.dob || '');
        setGender(src.gender || '');
        setPhone(src.phone || '');
        setAddress(src.address || '');
        setFamilyName(src.familyName || '');
        setFamilyRelationship(src.familyRelationship || '');
        setFamilyContact(src.familyContact || '');
        setGradeLevel(src.gradeLevel || src.grade || '');

      } catch (err) {
        console.warn('Failed to load profile', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);



  const tabs = [
    { id: "about", label: "About Me" },
    { id: "family", label: "Family" },
  ];

  // Inline Style Objects (kept from original)
  const containerStyle = { padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' };
  const cardStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
  const tabContainerStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

  const fullName = `${firstName} ${middleName ? (middleName + ' ') : ''}${lastName}`.trim();

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ width: '128px', height: '128px', background: 'linear-gradient(135deg, #3b82f6 0%, #4338ca 100%)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={64} color="white" />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#111827', margin: '0 0 0.5rem 0' }}>
              {fullName || user?.email}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '6px' }}>
              {user?.studentId ? `ID: ${user.studentId}` : ''}
            </p>
            <p style={{ marginTop: 0, color: '#111827', fontSize: '1rem' }}>
              Grade: <strong style={{ fontWeight: 800 }}>{gradeLevel || '—'}</strong>
            </p>


          </div>
        </div>
      </div>

      <div style={tabContainerStyle}>
        <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', backgroundColor: '#ffffff' }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', border: 'none', background: 'none', color: activeTab === tab.id ? '#dc2626' : '#6b7280', borderBottom: activeTab === tab.id ? '3px solid #dc2626' : '3px solid transparent', transition: 'all 0.2s ease' }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === "about" && (
            <AboutMeTab
              user={user}
              firstName={firstName}
              middleName={middleName}
              lastName={lastName}
              dateOfBirth={dateOfBirth}
              gender={gender}
              phone={phone}
              address={address}
            />
          )}

          {activeTab === "family" && (
            <FamilyTab
              profile={profile}
              familyName={familyName}
              familyRelationship={familyRelationship}
              familyContact={familyContact}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------
// Tab Components
// --------------------

function AboutMeTab({ user, firstName, middleName, lastName, dateOfBirth, gender, phone, address }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Basic Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Full Name" value={`${firstName} ${middleName ? (middleName + ' ') : ''}${lastName}`} />
          <InfoRow label="Date of Birth" value={dateOfBirth ? formatDate(dateOfBirth) : '—'} />
        </div>
      </section>

      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Contact Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Email" value={user?.email || '—'} />
          <InfoRow label="Phone" value={phone || '—'} />
          <InfoRow label="City" value={address || '—'} />
          <InfoRow label="Country" value={'Philippines'} />
        </div>
      </section>
    </div>
  );
}

function FamilyTab({ profile, familyName, familyRelationship, familyContact }) {
  return (
    <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#111827' }}>{(familyName || '—').toUpperCase()}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
        <div><span style={{ color: '#6b7280' }}>Relationship:</span> {familyRelationship || '—'}</div>
        <div><span style={{ color: '#6b7280' }}>Contact:</span> {familyContact || '—'}</div>
      </div>
    </div>
  );
}

// --------------------
// UI Helpers
// --------------------


function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
      <span style={{ color: '#6b7280', fontSize: '14px' }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

export default ProfilePage;
